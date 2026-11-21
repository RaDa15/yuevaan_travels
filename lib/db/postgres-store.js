import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import {
  ALLOWED_STATUSES,
  DEFAULT_PAYMENT,
  DEFAULT_OVERRIDE,
  getPermissionsForRole,
  hashPassword,
  normalizeChecklist,
  normalizePayment,
  normalizeQuoteOverride,
  normalizeRole,
  ROLES,
  sanitizeUser,
  verifyPassword,
} from '../admin-store.js';
import { DEFAULT_CHECKLIST } from '../admin-analytics.js';
import {
  getDefaultSiteSettings,
  POSTGRES_SCHEMA_SQL,
  validateSiteSettingsPatch,
} from './schema.js';

function rowToInquiry(row) {
  return {
    reference: row.reference,
    receivedAt: row.received_at instanceof Date ? row.received_at.toISOString() : String(row.received_at),
    type: row.type,
    fullName: row.full_name,
    email: row.email,
    phone: row.phone || '',
    notes: row.notes || '',
    tourSlug: row.tour_slug || undefined,
    tourTitle: row.tour_title || undefined,
    startDate: row.start_date || undefined,
    endDate: row.end_date || undefined,
    adults: row.adults ?? undefined,
    children: row.children ?? undefined,
    youngChildren: row.young_children ?? undefined,
    estimatedAdultTotalUSD: row.estimated_adult_total_usd ?? undefined,
    dob: row.dob || undefined,
    nationality: row.nationality || undefined,
    dates: row.dates || undefined,
    party: row.party || undefined,
    source: row.source || '/plan-my-trip',
    status: ALLOWED_STATUSES.has(row.status) ? row.status : 'new',
    internalNotes: row.internal_notes || '',
    assignedUserId: row.assigned_user_id || '',
    firstResponseAt: row.first_response_at
      ? row.first_response_at instanceof Date
        ? row.first_response_at.toISOString()
        : String(row.first_response_at)
      : '',
    emailStatus: row.email_status || 'not_configured',
    emailProvider: row.email_provider || 'none',
    emailError: row.email_error || '',
    emailSentAt: row.email_sent_at
      ? row.email_sent_at instanceof Date
        ? row.email_sent_at.toISOString()
        : String(row.email_sent_at)
      : '',
    guestEmailSent: Boolean(row.guest_email_sent),
    checklist: normalizeChecklist(row.checklist),
    quoteOverride: normalizeQuoteOverride(row.quote_override),
    payment: normalizePayment(row.payment),
    confirmationOverride:
      row.confirmation_override && typeof row.confirmation_override === 'object'
        ? { ...DEFAULT_OVERRIDE, ...row.confirmation_override }
        : { ...DEFAULT_OVERRIDE },
    activity: Array.isArray(row.activity) ? row.activity : [],
    updatedAt: row.updated_at instanceof Date ? row.updated_at.toISOString() : String(row.updated_at),
  };
}

function rowToUser(row) {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    role: normalizeRole(row.role),
    active: row.active !== false,
    passwordSalt: row.password_salt,
    passwordHash: row.password_hash,
    envSynced: Boolean(row.env_synced),
    createdAt: row.created_at instanceof Date ? row.created_at.toISOString() : String(row.created_at),
    lastLoginAt: row.last_login_at
      ? row.last_login_at instanceof Date
        ? row.last_login_at.toISOString()
        : String(row.last_login_at)
      : '',
  };
}

export function createPostgresStore({ databaseUrl, inquiriesDir }) {
  let pool = null;
  let initialized = false;
  let initPromise = null;
  let cachedSessionKey = '';

  const getEnvAdminPassword = () => String(process.env.ADMIN_PASSWORD || '').trim();
  const getEnvOwnerEmail = () =>
    String(process.env.ADMIN_NOTIFICATION_EMAIL || process.env.SMTP_USER || 'owner@yuevaantravels.bt')
      .trim()
      .toLowerCase();

  const buildSslConfig = () => {
    const sslFlag = String(process.env.DATABASE_SSL || '').trim().toLowerCase();
    if (sslFlag === 'false' || sslFlag === '0' || sslFlag === 'disable') return false;
    if (sslFlag === 'require' || sslFlag === 'true' || sslFlag === '1') {
      return { rejectUnauthorized: false };
    }
    const isLocal = /@(localhost|127\.0\.0\.1|\[::1\])[:/]/i.test(databaseUrl);
    return isLocal ? false : { rejectUnauthorized: false };
  };

  const getPool = async () => {
    if (!pool) {
      const pgMod = await import('pg');
      const Pool = pgMod.Pool || pgMod.default?.Pool;
      pool = new Pool({
        connectionString: databaseUrl,
        ssl: buildSslConfig(),
        max: 10,
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 10000,
      });
    }
    return pool;
  };

  const getSigningSecret = async () => {
    const envSecret = String(process.env.ADMIN_SESSION_SECRET || '').trim();
    if (envSecret.length >= 32) return envSecret;
    if (cachedSessionKey) return cachedSessionKey;
    const p = await getPool();
    const res = await p.query(`SELECT value FROM site_settings WHERE key = 'session_secret'`);
    if (res.rows[0]?.value?.secret) {
      cachedSessionKey = res.rows[0].value.secret;
      return cachedSessionKey;
    }
    cachedSessionKey = crypto.randomBytes(32).toString('hex');
    await p.query(
      `INSERT INTO site_settings (key, value, updated_by) VALUES ('session_secret', $1::jsonb, 'system') ON CONFLICT (key) DO NOTHING`,
      [JSON.stringify({ secret: cachedSessionKey })]
    );
    const recheck = await p.query(`SELECT value FROM site_settings WHERE key = 'session_secret'`);
    if (recheck.rows[0]?.value?.secret) {
      cachedSessionKey = recheck.rows[0].value.secret;
    }
    return cachedSessionKey;
  };

  const signSessionId = async (sessionId) => {
    const secret = await getSigningSecret();
    const sig = crypto.createHmac('sha256', secret).update(sessionId).digest('hex');
    return `${sessionId}.${sig}`;
  };

  const verifySignedSessionToken = async (token) => {
    if (!token || !token.includes('.')) return null;
    const [sessionId, sigHex] = token.split('.');
    if (!sessionId || !sigHex) return null;
    const expectedHex = (await signSessionId(sessionId)).split('.')[1];
    try {
      const a = Buffer.from(sigHex, 'hex');
      const b = Buffer.from(expectedHex, 'hex');
      if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
      return sessionId;
    } catch {
      return null;
    }
  };

  const migrateLocalDataIfEmpty = async (p) => {
    if (!inquiriesDir) return;
    const dir = path.resolve(inquiriesDir);
    const inqLog = path.join(dir, 'inquiries.ndjson');
    const metaFile = path.join(dir, 'inquiry-meta.json');
    const existingCount = Number((await p.query(`SELECT COUNT(*)::int AS cnt FROM inquiries`)).rows[0]?.cnt || 0);
    if (existingCount === 0 && fs.existsSync(inqLog)) {
      let metaMap = {};
      if (fs.existsSync(metaFile)) {
        try {
          metaMap = JSON.parse(fs.readFileSync(metaFile, 'utf8')) || {};
        } catch {}
      }
      const lines = fs.readFileSync(inqLog, 'utf8').split(/\r?\n/).filter((l) => l.trim());
      for (const line of lines) {
        try {
          const rec = JSON.parse(line);
          if (!rec?.reference) continue;
          const meta = metaMap[rec.reference] || {};
          await p.query(
            `INSERT INTO inquiries (
              reference, received_at, type, full_name, email, phone, notes,
              tour_slug, tour_title, start_date, end_date, adults, children, young_children,
              estimated_adult_total_usd, dob, nationality, dates, party, source,
              status, internal_notes, first_response_at, email_status, email_provider,
              email_error, email_sent_at, guest_email_sent, checklist, quote_override,
              payment, confirmation_override, activity, updated_at
            ) VALUES (
              $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,
              $21,$22,$23,$24,$25,$26,$27,$28,$29::jsonb,$30::jsonb,$31::jsonb,$32::jsonb,$33::jsonb,$34
            ) ON CONFLICT (reference) DO NOTHING`,
            [
              rec.reference,
              rec.receivedAt || new Date().toISOString(),
              rec.type || 'inquiry',
              rec.fullName || '',
              rec.email || '',
              rec.phone || '',
              rec.notes || '',
              rec.tourSlug || null,
              rec.tourTitle || null,
              rec.startDate || null,
              rec.endDate || null,
              rec.adults ?? null,
              rec.children ?? null,
              rec.youngChildren ?? null,
              rec.estimatedAdultTotalUSD ?? null,
              rec.dob || null,
              rec.nationality || null,
              rec.dates || null,
              rec.party || null,
              rec.source || '/plan-my-trip',
              ALLOWED_STATUSES.has(meta.status) ? meta.status : 'new',
              meta.internalNotes || '',
              meta.firstResponseAt || null,
              meta.emailStatus || 'not_configured',
              meta.emailProvider || 'none',
              meta.emailError || '',
              meta.emailSentAt || null,
              Boolean(meta.guestEmailSent),
              JSON.stringify(normalizeChecklist(meta.checklist)),
              JSON.stringify(normalizeQuoteOverride(meta.quoteOverride)),
              JSON.stringify(normalizePayment(meta.payment)),
              JSON.stringify(meta.confirmationOverride || DEFAULT_OVERRIDE),
              JSON.stringify(Array.isArray(meta.activity) ? meta.activity : []),
              meta.updatedAt || rec.receivedAt || new Date().toISOString(),
            ]
          );
        } catch {}
      }
    }
  };

  const init = async () => {
    if (initialized) return;
    if (initPromise) return initPromise;
    initPromise = (async () => {
      const p = await getPool();
      await p.query(POSTGRES_SCHEMA_SQL);
      await p.query(
        `INSERT INTO site_settings (key, value, updated_by) VALUES ('main', $1::jsonb, 'system') ON CONFLICT (key) DO NOTHING`,
        [JSON.stringify(getDefaultSiteSettings())]
      );
      await migrateLocalDataIfEmpty(p);
      initialized = true;
    })();
    return initPromise;
  };

  const ensureReady = async () => {
    if (!initialized) await init();
    return getPool();
  };

  const isConfiguredAsync = async () => {
    if (getEnvAdminPassword()) return true;
    const p = await ensureReady();
    const res = await p.query(`SELECT COUNT(*)::int AS cnt FROM users WHERE active = TRUE`);
    return Number(res.rows[0]?.cnt || 0) > 0;
  };

  const ensureBootstrapOwnerAsync = async () => {
    const p = await ensureReady();
    const res = await p.query(`SELECT * FROM users ORDER BY created_at ASC`);
    const users = res.rows.map(rowToUser);
    const envPass = getEnvAdminPassword();

    if (users.length === 0) {
      if (!envPass) return [];
      const { salt, hash } = hashPassword(envPass);
      const ownerRow = await p.query(
        `INSERT INTO users (id, name, email, role, active, password_salt, password_hash, env_synced)
         VALUES ('usr_owner', 'Thimphu Desk Owner', $1, 'super_admin', TRUE, $2, $3, TRUE)
         RETURNING *`,
        [getEnvOwnerEmail(), salt, hash]
      );
      return [rowToUser(ownerRow.rows[0])];
    }

    const owner = users.find((u) => u.envSynced && u.role === 'super_admin');
    if (owner && envPass && !verifyPassword(envPass, owner.passwordSalt, owner.passwordHash)) {
      const { salt, hash } = hashPassword(envPass);
      await p.query(`UPDATE users SET password_salt = $1, password_hash = $2 WHERE id = $3`, [
        salt,
        hash,
        owner.id,
      ]);
      owner.passwordSalt = salt;
      owner.passwordHash = hash;
    }
    return users;
  };

  const authenticateUserAsync = async ({ email, password }) => {
    const plain = String(password || '');
    if (!plain) return null;
    const users = await ensureBootstrapOwnerAsync();
    const cleanEmail = String(email || '').trim().toLowerCase();

    let candidate = null;
    if (cleanEmail) {
      candidate = users.find((u) => u.email.toLowerCase() === cleanEmail);
    } else {
      candidate = users.find((u) => u.role === 'super_admin' && u.active !== false) || users[0] || null;
    }

    if (!candidate || candidate.active === false) return null;
    if (!verifyPassword(plain, candidate.passwordSalt, candidate.passwordHash)) return null;

    const p = await ensureReady();
    const nowIso = new Date().toISOString();
    await p.query(`UPDATE users SET last_login_at = $1 WHERE id = $2`, [nowIso, candidate.id]);
    return sanitizeUser({ ...candidate, lastLoginAt: nowIso });
  };

  const createSessionAsync = async ({ userId, ttlMs, userAgent, ipHint }) => {
    const p = await ensureReady();
    const id = `ses_${crypto.randomBytes(16).toString('hex')}`;
    const now = Date.now();
    const expiresAt = now + ttlMs;
    await p.query(`DELETE FROM sessions WHERE expires_at <= $1`, [now]);
    await p.query(
      `INSERT INTO sessions (id, user_id, created_at, last_seen_at, expires_at, user_agent, ip_hint)
       VALUES ($1, $2, NOW(), NOW(), $3, $4, $5)`,
      [id, userId, expiresAt, String(userAgent || '').slice(0, 140), String(ipHint || '').slice(0, 64)]
    );
    const token = await signSessionId(id);
    return {
      session: { id, userId, expiresAt },
      token,
    };
  };

  const resolveSessionAsync = async (token) => {
    const sessionId = await verifySignedSessionToken(token);
    if (!sessionId) return null;
    const p = await ensureReady();
    const res = await p.query(
      `SELECT s.id AS sid, s.user_id, s.expires_at, u.*
       FROM sessions s
       JOIN users u ON u.id = s.user_id
       WHERE s.id = $1 AND s.expires_at > $2 AND u.active = TRUE`,
      [sessionId, Date.now()]
    );
    if (res.rows.length === 0) return null;
    const row = res.rows[0];
    const user = rowToUser(row);
    return {
      session: { id: row.sid, userId: row.user_id, expiresAt: Number(row.expires_at) },
      user: sanitizeUser(user),
      permissions: getPermissionsForRole(user.role),
    };
  };

  const revokeSessionAsync = async (sessionId) => {
    const p = await ensureReady();
    const res = await p.query(`DELETE FROM sessions WHERE id = $1`, [sessionId]);
    return res.rowCount > 0;
  };

  const listActiveSessionsAsync = async () => {
    const p = await ensureReady();
    const res = await p.query(
      `SELECT s.*, u.name AS user_name, u.email AS user_email, u.role AS user_role
       FROM sessions s
       JOIN users u ON u.id = s.user_id
       WHERE s.expires_at > $1
       ORDER BY s.created_at DESC`,
      [Date.now()]
    );
    return res.rows.map((s) => ({
      id: s.id,
      userId: s.user_id,
      userName: s.user_name,
      userEmail: s.user_email,
      userRole: normalizeRole(s.user_role),
      createdAt: s.created_at instanceof Date ? s.created_at.toISOString() : String(s.created_at),
      expiresAt: new Date(Number(s.expires_at)).toISOString(),
      userAgent: s.user_agent,
      ipHint: s.ip_hint,
    }));
  };

  const listUsersAsync = async () => {
    const p = await ensureReady();
    const res = await p.query(`SELECT * FROM users ORDER BY created_at ASC`);
    return res.rows.map((r) => sanitizeUser(rowToUser(r)));
  };

  const createUserAsync = async ({ name, email, role, password }) => {
    const cleanName = String(name || '').trim().slice(0, 120);
    const cleanEmail = String(email || '').trim().toLowerCase().slice(0, 160);
    const cleanRole = normalizeRole(role || 'reservation');
    const plain = String(password || '');

    if (cleanName.length < 2) throw Object.assign(new Error('Full name must be at least 2 characters.'), { statusCode: 400 });
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      throw Object.assign(new Error('Please provide a valid staff email address.'), { statusCode: 400 });
    }
    if (!ROLES.includes(cleanRole)) throw Object.assign(new Error('Invalid role selected.'), { statusCode: 400 });
    if (plain.length < 8) throw Object.assign(new Error('Password must be at least 8 characters long.'), { statusCode: 400 });

    const p = await ensureReady();
    const dup = await p.query(`SELECT 1 FROM users WHERE LOWER(email) = LOWER($1)`, [cleanEmail]);
    if (dup.rows.length > 0) {
      throw Object.assign(new Error('A staff account with this email already exists.'), { statusCode: 409 });
    }

    const { salt, hash } = hashPassword(plain);
    const id = `usr_${crypto.randomBytes(6).toString('hex')}`;
    const res = await p.query(
      `INSERT INTO users (id, name, email, role, active, password_salt, password_hash, env_synced)
       VALUES ($1, $2, $3, $4, TRUE, $5, $6, FALSE) RETURNING *`,
      [id, cleanName, cleanEmail, cleanRole, salt, hash]
    );
    return sanitizeUser(rowToUser(res.rows[0]));
  };

  const updateUserAsync = async (userId, patch) => {
    const p = await ensureReady();
    const client = await p.connect();
    try {
      await client.query('BEGIN');
      const allRes = await client.query(`SELECT * FROM users`);
      const users = allRes.rows.map(rowToUser);
      const target = users.find((u) => u.id === userId);
      if (!target) throw Object.assign(new Error('Staff user not found.'), { statusCode: 404 });

      const activeOwners = users.filter((u) => u.role === 'super_admin' && u.active);
      const isLastOwner = target.role === 'super_admin' && target.active && activeOwners.length <= 1;

      const nextName = patch.name !== undefined ? String(patch.name).trim().slice(0, 120) : target.name;
      if (nextName.length < 2) throw Object.assign(new Error('Name must be at least 2 characters.'), { statusCode: 400 });

      const nextRole = patch.role !== undefined ? normalizeRole(patch.role) : target.role;
      if (!ROLES.includes(nextRole)) throw Object.assign(new Error('Invalid role.'), { statusCode: 400 });
      if (isLastOwner && nextRole !== 'super_admin') {
        throw Object.assign(new Error('Cannot demote the last active Owner account.'), { statusCode: 400 });
      }

      const nextActive = patch.active !== undefined ? Boolean(patch.active) : target.active;
      if (isLastOwner && !nextActive) {
        throw Object.assign(new Error('Cannot disable the last active Owner account.'), { statusCode: 400 });
      }

      let salt = target.passwordSalt;
      let hash = target.passwordHash;
      let envSynced = target.envSynced;
      let passwordChanged = false;
      const roleChanged = nextRole !== target.role;
      if (patch.password !== undefined && String(patch.password).length > 0) {
        if (String(patch.password).length < 8) {
          throw Object.assign(new Error('New password must be at least 8 characters long.'), { statusCode: 400 });
        }
        const hashed = hashPassword(patch.password);
        salt = hashed.salt;
        hash = hashed.hash;
        envSynced = false;
        passwordChanged = true;
      }

      const updated = await client.query(
        `UPDATE users SET name=$1, role=$2, active=$3, password_salt=$4, password_hash=$5, env_synced=$6
         WHERE id=$7 RETURNING *`,
        [nextName, nextRole, nextActive, salt, hash, envSynced, userId]
      );
      if (!nextActive || passwordChanged || roleChanged) {
        await client.query(`DELETE FROM sessions WHERE user_id = $1`, [userId]);
      }
      await client.query('COMMIT');
      return sanitizeUser(rowToUser(updated.rows[0]));
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  };

  const changeOwnPasswordAsync = async (userId, currentPassword, newPassword, keepSessionId = null) => {
    const p = await ensureReady();
    const res = await p.query(`SELECT * FROM users WHERE id = $1`, [userId]);
    if (res.rows.length === 0) throw Object.assign(new Error('Account not found.'), { statusCode: 404 });
    const target = rowToUser(res.rows[0]);
    if (!verifyPassword(currentPassword, target.passwordSalt, target.passwordHash)) {
      throw Object.assign(new Error('Current password is incorrect.'), { statusCode: 400 });
    }
    if (String(newPassword || '').length < 8) {
      throw Object.assign(new Error('New password must be at least 8 characters long.'), { statusCode: 400 });
    }
    const { salt, hash } = hashPassword(newPassword);
    const updated = await p.query(
      `UPDATE users SET password_salt=$1, password_hash=$2, env_synced=FALSE WHERE id=$3 RETURNING *`,
      [salt, hash, userId]
    );
    if (keepSessionId) {
      await p.query(`DELETE FROM sessions WHERE user_id = $1 AND id <> $2`, [userId, keepSessionId]);
    } else {
      await p.query(`DELETE FROM sessions WHERE user_id = $1`, [userId]);
    }
    return sanitizeUser(rowToUser(updated.rows[0]));
  };

  const createInquiryAsync = async (record) => {
    const p = await ensureReady();
    await p.query(
      `INSERT INTO inquiries (
        reference, received_at, type, full_name, email, phone, notes,
        tour_slug, tour_title, start_date, end_date, adults, children, young_children,
        estimated_adult_total_usd, dob, nationality, dates, party, source,
        checklist, quote_override, payment, confirmation_override, activity
      ) VALUES (
        $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,
        $21::jsonb,$22::jsonb,$23::jsonb,$24::jsonb,$25::jsonb
      )`,
      [
        record.reference,
        record.receivedAt || new Date().toISOString(),
        record.type,
        record.fullName,
        record.email,
        record.phone || '',
        record.notes || '',
        record.tourSlug || null,
        record.tourTitle || null,
        record.startDate || null,
        record.endDate || null,
        record.adults ?? null,
        record.children ?? null,
        record.youngChildren ?? null,
        record.estimatedAdultTotalUSD ?? null,
        record.dob || null,
        record.nationality || null,
        record.dates || null,
        record.party || null,
        record.source || '/plan-my-trip',
        JSON.stringify(DEFAULT_CHECKLIST),
        JSON.stringify({ finalQuotedUsd: null, depositPaidUsd: null }),
        JSON.stringify(DEFAULT_PAYMENT),
        JSON.stringify(DEFAULT_OVERRIDE),
        JSON.stringify([]),
      ]
    );
    return record;
  };

  const listInquiriesAsync = async () => {
    const p = await ensureReady();
    const res = await p.query(`SELECT * FROM inquiries ORDER BY received_at DESC`);
    return res.rows.map(rowToInquiry);
  };

  const getInquiryAsync = async (reference) => {
    const p = await ensureReady();
    const res = await p.query(`SELECT * FROM inquiries WHERE reference = $1`, [reference]);
    return res.rows[0] ? rowToInquiry(res.rows[0]) : null;
  };

  const updateInquiryMetaAsync = async (reference, patch, activityEvent = null) => {
    const p = await ensureReady();
    const client = await p.connect();
    try {
      await client.query('BEGIN');
      const curRes = await client.query(`SELECT * FROM inquiries WHERE reference = $1 FOR UPDATE`, [reference]);
      if (curRes.rows.length === 0) {
        await client.query('ROLLBACK');
        return null;
      }
      const prev = rowToInquiry(curRes.rows[0]);
      const nextStatus = patch.status !== undefined ? patch.status : prev.status;
      const nextNotes = patch.internalNotes !== undefined ? patch.internalNotes : prev.internalNotes;
      const nextAssigned = patch.assignedUserId !== undefined ? (patch.assignedUserId || null) : (prev.assignedUserId || null);
      let firstResponseAt = prev.firstResponseAt || null;
      if (!firstResponseAt && prev.status === 'new' && nextStatus !== 'new' && nextStatus !== 'archived') {
        firstResponseAt = new Date().toISOString();
      }
      const nextChecklist =
        patch.checklist && typeof patch.checklist === 'object'
          ? normalizeChecklist({ ...prev.checklist, ...patch.checklist })
          : prev.checklist;
      const nextQuote =
        patch.quoteOverride && typeof patch.quoteOverride === 'object'
          ? normalizeQuoteOverride({ ...prev.quoteOverride, ...patch.quoteOverride })
          : prev.quoteOverride;
      const nextPayment =
        patch.payment && typeof patch.payment === 'object'
          ? normalizePayment({ ...prev.payment, ...patch.payment })
          : prev.payment;
      const nextOverride =
        patch.confirmationOverride && typeof patch.confirmationOverride === 'object'
          ? { ...prev.confirmationOverride, ...patch.confirmationOverride }
          : prev.confirmationOverride;
      const nextActivity = activityEvent
        ? [
            ...prev.activity,
            { id: `act_${crypto.randomBytes(4).toString('hex')}`, at: new Date().toISOString(), ...activityEvent },
          ].slice(-50)
        : prev.activity;

      const updatedRes = await client.query(
        `UPDATE inquiries SET
          status = $1,
          internal_notes = $2,
          assigned_user_id = $3,
          first_response_at = $4,
          email_status = $5,
          email_provider = $6,
          email_error = $7,
          email_sent_at = $8,
          guest_email_sent = $9,
          checklist = $10::jsonb,
          quote_override = $11::jsonb,
          payment = $12::jsonb,
          confirmation_override = $13::jsonb,
          activity = $14::jsonb,
          updated_at = NOW()
        WHERE reference = $15
        RETURNING *`,
        [
          nextStatus,
          nextNotes,
          nextAssigned,
          firstResponseAt,
          patch.emailStatus !== undefined ? patch.emailStatus : prev.emailStatus,
          patch.emailProvider !== undefined ? patch.emailProvider : prev.emailProvider,
          patch.emailError !== undefined ? patch.emailError : prev.emailError,
          patch.emailSentAt !== undefined ? (patch.emailSentAt || null) : (prev.emailSentAt || null),
          patch.guestEmailSent !== undefined ? Boolean(patch.guestEmailSent) : prev.guestEmailSent,
          JSON.stringify(nextChecklist),
          JSON.stringify(nextQuote),
          JSON.stringify(nextPayment),
          JSON.stringify(nextOverride),
          JSON.stringify(nextActivity),
          reference,
        ]
      );
      await client.query('COMMIT');
      return rowToInquiry(updatedRes.rows[0]);
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  };

  const purgeInquiryAsync = async (reference) => {
    const p = await ensureReady();
    const res = await p.query(`DELETE FROM inquiries WHERE reference = $1`, [reference]);
    return res.rowCount > 0;
  };

  const appendEmailLogAsync = async (entry) => {
    const p = await ensureReady();
    const id = `eml_${crypto.randomBytes(5).toString('hex')}`;
    await p.query(
      `INSERT INTO email_logs (id, at, reference, kind, recipient, subject, provider, status, error, triggered_by)
       VALUES ($1, NOW(), $2, $3, $4, $5, $6, $7, $8, $9)`,
      [
        id,
        entry.reference || '',
        entry.kind || 'admin',
        entry.to || '',
        entry.subject || '',
        entry.provider || 'none',
        entry.status || 'failed',
        entry.error || '',
        entry.triggeredBy || 'auto',
      ]
    );
  };

  const listEmailLogsAsync = async (limit = 200) => {
    const p = await ensureReady();
    const res = await p.query(`SELECT * FROM email_logs ORDER BY at DESC LIMIT $1`, [limit]);
    return res.rows.map((r) => ({
      id: r.id,
      at: r.at instanceof Date ? r.at.toISOString() : String(r.at),
      reference: r.reference,
      kind: r.kind,
      to: r.recipient,
      subject: r.subject,
      provider: r.provider,
      status: r.status,
      error: r.error,
      triggeredBy: r.triggered_by,
    }));
  };

  const appendAuditLogAsync = async ({ actor, action, targetRef = '', summary = '', diff = null }) => {
    const p = await ensureReady();
    const id = `aud_${crypto.randomBytes(5).toString('hex')}`;
    await p.query(
      `INSERT INTO audit_logs (id, at, actor_id, actor_name, actor_role, action, target_ref, summary, diff)
       VALUES ($1, NOW(), $2, $3, $4, $5, $6, $7, $8::jsonb)`,
      [
        id,
        actor?.id || 'system',
        actor?.name || 'System',
        actor?.role || 'system',
        action,
        targetRef,
        summary,
        diff ? JSON.stringify(diff) : null,
      ]
    );
  };

  const listAuditLogsAsync = async (limit = 200) => {
    const p = await ensureReady();
    const res = await p.query(`SELECT * FROM audit_logs ORDER BY at DESC LIMIT $1`, [limit]);
    return res.rows.map((r) => ({
      id: r.id,
      at: r.at instanceof Date ? r.at.toISOString() : String(r.at),
      actorId: r.actor_id,
      actorName: r.actor_name,
      actorRole: r.actor_role,
      action: r.action,
      targetRef: r.target_ref,
      summary: r.summary,
      diff: r.diff || undefined,
    }));
  };

  const getSiteSettingsAsync = async () => {
    const p = await ensureReady();
    const res = await p.query(`SELECT value FROM site_settings WHERE key = 'main'`);
    const defaults = getDefaultSiteSettings();
    if (!res.rows[0]?.value) return defaults;
    return { ...defaults, ...res.rows[0].value };
  };

  const updateSiteSettingsAsync = async (patch, actor) => {
    const current = await getSiteSettingsAsync();
    const { settings, diff } = validateSiteSettingsPatch(patch, current);
    const p = await ensureReady();
    await p.query(
      `INSERT INTO site_settings (key, value, updated_at, updated_by)
       VALUES ('main', $1::jsonb, NOW(), $2)
       ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW(), updated_by = EXCLUDED.updated_by`,
      [JSON.stringify(settings), actor?.name || 'Owner']
    );
    return { settings, diff };
  };

  const buildSanitizedBackupAsync = async () => ({
    exportedAt: new Date().toISOString(),
    schemaVersion: 3,
    engine: 'postgres',
    siteSettings: await getSiteSettingsAsync(),
    inquiries: await listInquiriesAsync(),
    users: await listUsersAsync(),
    emailLogs: await listEmailLogsAsync(500),
    auditLogs: await listAuditLogsAsync(500),
  });

  const closeAsync = async () => {
    if (pool) {
      await pool.end();
      pool = null;
      initialized = false;
      initPromise = null;
    }
  };

  return {
    engine: 'postgres',
    init,
    isConfiguredAsync,
    ensureBootstrapOwnerAsync,
    authenticateUserAsync,
    createSessionAsync,
    resolveSessionAsync,
    revokeSessionAsync,
    listActiveSessionsAsync,
    listUsersAsync,
    createUserAsync,
    updateUserAsync,
    changeOwnPasswordAsync,
    createInquiryAsync,
    listInquiriesAsync,
    getInquiryAsync,
    updateInquiryMetaAsync,
    purgeInquiryAsync,
    appendEmailLogAsync,
    listEmailLogsAsync,
    appendAuditLogAsync,
    listAuditLogsAsync,
    getSiteSettingsAsync,
    updateSiteSettingsAsync,
    buildSanitizedBackupAsync,
    closeAsync,
  };
}
