import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { CHECKLIST_STEPS, DEFAULT_CHECKLIST } from './admin-analytics.js';
import { getDefaultSiteSettings, validateSiteSettingsPatch } from './db/schema.js';

export const ALLOWED_STATUSES = new Set(['new', 'contacted', 'quoted', 'confirmed', 'archived']);

export const ROLES = ['super_admin', 'manager', 'reservation', 'finance'];

export const ROLE_LABELS = {
  super_admin: 'Owner',
  manager: 'Desk Manager',
  reservation: 'Reservations',
  finance: 'Finance',
};

export function normalizeRole(rawRole) {
  const r = String(rawRole || '').trim().toLowerCase();
  if (r === 'agent') return 'reservation';
  if (r === 'viewer_ops') return 'finance';
  if (ROLES.includes(r)) return r;
  return 'reservation';
}

export const ROLE_PERMISSIONS = {
  super_admin: [
    'analytics:view',
    'team:view',
    'users:manage',
    'audit:read',
    'settings:manage',
    'backup:download',
    'emails:send',
  ],
  manager: [
    'analytics:view',
    'team:view',
    'bookings:inbox',
    'bookings:read_all',
    'bookings:write',
    'bookings:assign',
    'bookings:confirm_override',
    'checklist:write',
    'emails:send',
    'emails:logs',
    'export:csv',
    'audit:read',
  ],
  reservation: [
    'bookings:inbox',
    'bookings:read_own_and_unassigned',
    'bookings:claim',
    'bookings:write',
    'checklist:write',
    'emails:send',
  ],
  finance: [
    'finance:view',
    'bookings:read_all',
    'finance:verify_payment',
    'finance:sdf_remit',
    'export:finance_csv',
  ],
};

export const DEFAULT_PAYMENT = {
  depositVerified: false,
  depositVerifiedBy: '',
  depositVerifiedAt: '',
  depositPaidUsd: 0,
  wireReference: '',
  paymentMethod: '',
  financeNotes: '',
};

export const DEFAULT_OVERRIDE = {
  used: false,
  reason: '',
  actorName: '',
  at: '',
};

export function getPermissionsForRole(role) {
  const norm = normalizeRole(role);
  return ROLE_PERMISSIONS[norm] || [];
}

export function hasPermission(role, permission) {
  return getPermissionsForRole(role).includes(permission);
}

export function hashPassword(plain, saltHex = null) {
  const salt = saltHex || crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(String(plain), salt, 64, { N: 16384, r: 8, p: 1 }).toString('hex');
  return { salt, hash };
}

export function verifyPassword(plain, salt, expectedHash) {
  if (!plain || !salt || !expectedHash) return false;
  try {
    const derived = crypto.scryptSync(String(plain), salt, 64, { N: 16384, r: 8, p: 1 });
    const expected = Buffer.from(expectedHash, 'hex');
    return derived.length === expected.length && crypto.timingSafeEqual(derived, expected);
  } catch {
    return false;
  }
}

export function sanitizeUser(user) {
  if (!user) return null;
  const role = normalizeRole(user.role);
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role,
    roleLabel: ROLE_LABELS[role] || role,
    active: user.active !== false,
    createdAt: user.createdAt,
    lastLoginAt: user.lastLoginAt || '',
    envSynced: Boolean(user.envSynced),
  };
}

export function normalizeChecklist(raw) {
  const out = { ...DEFAULT_CHECKLIST };
  if (raw && typeof raw === 'object') {
    for (const step of CHECKLIST_STEPS) {
      if (typeof raw[step.key] === 'boolean') {
        out[step.key] = raw[step.key];
      }
    }
  }
  return out;
}

export function normalizeQuoteOverride(raw) {
  const out = { finalQuotedUsd: null, depositPaidUsd: null };
  if (raw && typeof raw === 'object') {
    if (raw.finalQuotedUsd !== null && raw.finalQuotedUsd !== undefined && raw.finalQuotedUsd !== '') {
      const n = Number(raw.finalQuotedUsd);
      if (Number.isFinite(n) && n >= 0) out.finalQuotedUsd = Math.round(n);
    }
    if (raw.depositPaidUsd !== null && raw.depositPaidUsd !== undefined && raw.depositPaidUsd !== '') {
      const n = Number(raw.depositPaidUsd);
      if (Number.isFinite(n) && n >= 0) out.depositPaidUsd = Math.round(n);
    }
  }
  return out;
}

export function normalizePayment(raw) {
  const out = { ...DEFAULT_PAYMENT };
  if (raw && typeof raw === 'object') {
    out.depositVerified = Boolean(raw.depositVerified);
    out.depositVerifiedBy = String(raw.depositVerifiedBy || '').slice(0, 120);
    out.depositVerifiedAt = String(raw.depositVerifiedAt || '').slice(0, 40);
    const paid = Number(raw.depositPaidUsd || 0);
    out.depositPaidUsd = Number.isFinite(paid) && paid >= 0 ? Math.round(paid) : 0;
    out.wireReference = String(raw.wireReference || '').slice(0, 120);
    out.paymentMethod = String(raw.paymentMethod || '').slice(0, 60);
    out.financeNotes = String(raw.financeNotes || '').slice(0, 1000);
  }
  return out;
}

export function createAdminStore({ inquiriesDir }) {
  const dir = path.resolve(inquiriesDir);
  const inquiriesLog = path.join(dir, 'inquiries.ndjson');
  const inquiriesMeta = path.join(dir, 'inquiry-meta.json');
  const usersFile = path.join(dir, 'users.json');
  const sessionsFile = path.join(dir, 'sessions.json');
  const emailLogsFile = path.join(dir, 'email-logs.ndjson');
  const auditLogsFile = path.join(dir, 'audit.ndjson');
  const siteSettingsFile = path.join(dir, 'site-settings.json');
  const sessionKeyFile = path.join(dir, '.session-key');

  let writeQueue = Promise.resolve();

  const enqueue = (fn) => {
    const task = writeQueue.then(fn);
    writeQueue = task.catch(() => {});
    return task;
  };

  const readJsonSafe = (filePath, fallback) => {
    if (!fs.existsSync(filePath)) return fallback;
    try {
      const parsed = JSON.parse(fs.readFileSync(filePath, 'utf8'));
      return parsed ?? fallback;
    } catch {
      return fallback;
    }
  };

  const writeJsonAtomic = async (filePath, data) => {
    await fs.promises.mkdir(dir, { recursive: true });
    const tmp = `${filePath}.${crypto.randomBytes(4).toString('hex')}.tmp`;
    await fs.promises.writeFile(tmp, JSON.stringify(data, null, 2), { mode: 0o600 });
    await fs.promises.rename(tmp, filePath);
  };

  const appendNdjson = async (filePath, record) => {
    await fs.promises.mkdir(dir, { recursive: true });
    await fs.promises.appendFile(filePath, JSON.stringify(record) + '\n', { mode: 0o600 });
  };

  const readNdjsonNewest = (filePath, limit = 200) => {
    if (!fs.existsSync(filePath)) return [];
    try {
      const lines = fs.readFileSync(filePath, 'utf8').split(/\r?\n/);
      const items = [];
      for (const line of lines) {
        if (!line.trim()) continue;
        try {
          items.push(JSON.parse(line));
        } catch {}
      }
      return items.reverse().slice(0, limit);
    } catch {
      return [];
    }
  };

  const getEnvAdminPassword = () => String(process.env.ADMIN_PASSWORD || '').trim();
  const getEnvOwnerEmail = () =>
    String(process.env.ADMIN_NOTIFICATION_EMAIL || process.env.SMTP_USER || 'owner@yuevaantravels.bt')
      .trim()
      .toLowerCase();

  const getSigningSecret = () => {
    const envSecret = String(process.env.ADMIN_SESSION_SECRET || '').trim();
    if (envSecret.length >= 32) return envSecret;
    if (fs.existsSync(sessionKeyFile)) {
      try {
        const key = fs.readFileSync(sessionKeyFile, 'utf8').trim();
        if (key) return key;
      } catch {}
    }
    fs.mkdirSync(dir, { recursive: true });
    const generated = crypto.randomBytes(32).toString('hex');
    fs.writeFileSync(sessionKeyFile, generated, { mode: 0o600 });
    return generated;
  };

  const signSessionId = (sessionId) => {
    const sig = crypto.createHmac('sha256', getSigningSecret()).update(sessionId).digest('hex');
    return `${sessionId}.${sig}`;
  };

  const verifySignedSessionToken = (token) => {
    if (!token || !token.includes('.')) return null;
    const [sessionId, sigHex] = token.split('.');
    if (!sessionId || !sigHex) return null;
    const expectedHex = signSessionId(sessionId).split('.')[1];
    try {
      const a = Buffer.from(sigHex, 'hex');
      const b = Buffer.from(expectedHex, 'hex');
      if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
      return sessionId;
    } catch {
      return null;
    }
  };

  const readUsersSync = () => {
    const data = readJsonSafe(usersFile, []);
    return Array.isArray(data)
      ? data.map((u) => ({ ...u, role: normalizeRole(u.role) }))
      : [];
  };

  const isConfigured = () => {
    const users = readUsersSync();
    return Boolean(getEnvAdminPassword() || users.some((u) => u.active !== false));
  };

  const ensureBootstrapOwnerAsync = () =>
    enqueue(async () => {
      const users = readUsersSync();
      const envPass = getEnvAdminPassword();
      if (users.length === 0) {
        if (!envPass) return [];
        const { salt, hash } = hashPassword(envPass);
        const owner = {
          id: 'usr_owner',
          name: 'Thimphu Desk Owner',
          email: getEnvOwnerEmail(),
          role: 'super_admin',
          active: true,
          passwordSalt: salt,
          passwordHash: hash,
          envSynced: true,
          createdAt: new Date().toISOString(),
          lastLoginAt: '',
        };
        await writeJsonAtomic(usersFile, [owner]);
        return [owner];
      }
      const owner = users.find((u) => u.envSynced && u.role === 'super_admin');
      if (owner && envPass && !verifyPassword(envPass, owner.passwordSalt, owner.passwordHash)) {
        const { salt, hash } = hashPassword(envPass);
        owner.passwordSalt = salt;
        owner.passwordHash = hash;
        await writeJsonAtomic(usersFile, users);
      }
      return users;
    });

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

    const nowIso = new Date().toISOString();
    await enqueue(async () => {
      const current = readUsersSync();
      const target = current.find((u) => u.id === candidate.id);
      if (target) {
        target.lastLoginAt = nowIso;
        await writeJsonAtomic(usersFile, current);
      }
    });

    return sanitizeUser({ ...candidate, lastLoginAt: nowIso });
  };

  const readSessionsSync = () => {
    const raw = readJsonSafe(sessionsFile, []);
    const now = Date.now();
    return Array.isArray(raw) ? raw.filter((s) => s && s.expiresAt > now) : [];
  };

  const createSessionAsync = ({ userId, ttlMs, userAgent, ipHint }) =>
    enqueue(async () => {
      const sessions = readSessionsSync();
      const id = `ses_${crypto.randomBytes(16).toString('hex')}`;
      const now = Date.now();
      const session = {
        id,
        userId,
        createdAt: new Date(now).toISOString(),
        lastSeenAt: new Date(now).toISOString(),
        expiresAt: now + ttlMs,
        userAgent: String(userAgent || '').slice(0, 140),
        ipHint: String(ipHint || '').slice(0, 64),
      };
      sessions.push(session);
      await writeJsonAtomic(sessionsFile, sessions.slice(-100));
      return { session, token: signSessionId(id) };
    });

  const resolveSessionSync = (token) => {
    const sessionId = verifySignedSessionToken(token);
    if (!sessionId) return null;
    const sessions = readSessionsSync();
    const session = sessions.find((s) => s.id === sessionId);
    if (!session) return null;
    const users = readUsersSync();
    const user = users.find((u) => u.id === session.userId && u.active !== false);
    if (!user) return null;
    return {
      session,
      user: sanitizeUser(user),
      permissions: getPermissionsForRole(user.role),
    };
  };

  const revokeSessionAsync = (sessionId) =>
    enqueue(async () => {
      const sessions = readSessionsSync();
      const next = sessions.filter((s) => s.id !== sessionId);
      const removed = next.length !== sessions.length;
      if (removed) await writeJsonAtomic(sessionsFile, next);
      return removed;
    });

  const listActiveSessionsSync = () => {
    const sessions = readSessionsSync();
    const usersById = new Map(readUsersSync().map((u) => [u.id, sanitizeUser(u)]));
    return sessions
      .map((s) => {
        const u = usersById.get(s.userId);
        return {
          id: s.id,
          userId: s.userId,
          userName: u?.name || 'Unknown User',
          userEmail: u?.email || '',
          userRole: u?.role || '',
          createdAt: s.createdAt,
          expiresAt: new Date(s.expiresAt).toISOString(),
          userAgent: s.userAgent,
          ipHint: s.ipHint,
        };
      })
      .reverse();
  };

  const listUsersSync = () => readUsersSync().map(sanitizeUser);

  const createUserAsync = ({ name, email, role, password }) =>
    enqueue(async () => {
      const cleanName = String(name || '').trim().slice(0, 120);
      const cleanEmail = String(email || '').trim().toLowerCase().slice(0, 160);
      const cleanRole = normalizeRole(role || 'reservation');
      const plain = String(password || '');

      if (cleanName.length < 2) throw Object.assign(new Error('Full name must be at least 2 characters.'), { statusCode: 400 });
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
        throw Object.assign(new Error('Please provide a valid staff email address.'), { statusCode: 400 });
      }
      if (!ROLES.includes(cleanRole)) {
        throw Object.assign(new Error('Invalid role selected.'), { statusCode: 400 });
      }
      if (plain.length < 8) {
        throw Object.assign(new Error('Password must be at least 8 characters long.'), { statusCode: 400 });
      }

      const users = readUsersSync();
      if (users.some((u) => u.email.toLowerCase() === cleanEmail)) {
        throw Object.assign(new Error('A staff account with this email already exists.'), { statusCode: 409 });
      }

      const { salt, hash } = hashPassword(plain);
      const user = {
        id: `usr_${crypto.randomBytes(6).toString('hex')}`,
        name: cleanName,
        email: cleanEmail,
        role: cleanRole,
        active: true,
        passwordSalt: salt,
        passwordHash: hash,
        envSynced: false,
        createdAt: new Date().toISOString(),
        lastLoginAt: '',
      };
      users.push(user);
      await writeJsonAtomic(usersFile, users);
      return sanitizeUser(user);
    });

  const updateUserAsync = (userId, patch) =>
    enqueue(async () => {
      const users = readUsersSync();
      const idx = users.findIndex((u) => u.id === userId);
      if (idx === -1) throw Object.assign(new Error('Staff user not found.'), { statusCode: 404 });

      const target = { ...users[idx] };
      const prevRole = target.role;
      let roleChanged = false;
      let passwordChanged = false;
      const activeOwners = users.filter((u) => u.role === 'super_admin' && u.active !== false);
      const isLastActiveOwner =
        target.role === 'super_admin' && target.active !== false && activeOwners.length <= 1;

      if (patch.name !== undefined) {
        const cleanName = String(patch.name).trim().slice(0, 120);
        if (cleanName.length < 2) throw Object.assign(new Error('Name must be at least 2 characters.'), { statusCode: 400 });
        target.name = cleanName;
      }

      if (patch.role !== undefined) {
        const nextRole = normalizeRole(patch.role);
        if (!ROLES.includes(nextRole)) throw Object.assign(new Error('Invalid role.'), { statusCode: 400 });
        if (isLastActiveOwner && nextRole !== 'super_admin') {
          throw Object.assign(new Error('Cannot demote the last active Owner account.'), { statusCode: 400 });
        }
        roleChanged = nextRole !== prevRole;
        target.role = nextRole;
      }

      if (patch.active !== undefined) {
        const nextActive = Boolean(patch.active);
        if (isLastActiveOwner && !nextActive) {
          throw Object.assign(new Error('Cannot disable the last active Owner account.'), { statusCode: 400 });
        }
        target.active = nextActive;
      }

      if (patch.password !== undefined && String(patch.password).length > 0) {
        const plain = String(patch.password);
        if (plain.length < 8) {
          throw Object.assign(new Error('New password must be at least 8 characters long.'), { statusCode: 400 });
        }
        const { salt, hash } = hashPassword(plain);
        target.passwordSalt = salt;
        target.passwordHash = hash;
        target.envSynced = false;
        passwordChanged = true;
      }

      users[idx] = target;
      await writeJsonAtomic(usersFile, users);
      if (target.active === false || passwordChanged || roleChanged) {
        const sessions = readSessionsSync().filter((s) => s.userId !== userId);
        await writeJsonAtomic(sessionsFile, sessions);
      }
      return sanitizeUser(target);
    });

  const changeOwnPasswordAsync = (userId, currentPassword, newPassword, keepSessionId = null) =>
    enqueue(async () => {
      const users = readUsersSync();
      const idx = users.findIndex((u) => u.id === userId);
      if (idx === -1) throw Object.assign(new Error('Account not found.'), { statusCode: 404 });
      const target = users[idx];
      if (!verifyPassword(currentPassword, target.passwordSalt, target.passwordHash)) {
        throw Object.assign(new Error('Current password is incorrect.'), { statusCode: 400 });
      }
      if (String(newPassword || '').length < 8) {
        throw Object.assign(new Error('New password must be at least 8 characters long.'), { statusCode: 400 });
      }
      const { salt, hash } = hashPassword(newPassword);
      users[idx] = { ...target, passwordSalt: salt, passwordHash: hash, envSynced: false };
      await writeJsonAtomic(usersFile, users);
      const sessions = readSessionsSync().filter(
        (s) => s.userId !== userId || (keepSessionId && s.id === keepSessionId)
      );
      await writeJsonAtomic(sessionsFile, sessions);
      return sanitizeUser(users[idx]);
    });

  const readInquiryMetaSync = () => {
    const parsed = readJsonSafe(inquiriesMeta, {});
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {};
  };

  const createInquiryAsync = (record) =>
    enqueue(async () => {
      await appendNdjson(inquiriesLog, record);
      const stats = await fs.promises.stat(inquiriesLog);
      if (stats.size > 50 * 1024 * 1024) {
        console.warn(`Alert: inquiries log exceeds 50 MB (${stats.size} bytes).`);
      }
      return record;
    });

  const readAllInquiriesSync = () => {
    if (!fs.existsSync(inquiriesLog)) return [];
    const metaMap = readInquiryMetaSync();
    const lines = fs.readFileSync(inquiriesLog, 'utf8').split(/\r?\n/);
    const items = [];
    for (const line of lines) {
      if (!line.trim()) continue;
      try {
        const rec = JSON.parse(line);
        if (!rec || !rec.reference) continue;
        const meta = metaMap[rec.reference] || {};
        items.push({
          ...rec,
          status: ALLOWED_STATUSES.has(meta.status) ? meta.status : 'new',
          internalNotes: typeof meta.internalNotes === 'string' ? meta.internalNotes : '',
          assignedUserId: meta.assignedUserId || '',
          firstResponseAt: meta.firstResponseAt || '',
          updatedAt: meta.updatedAt || rec.receivedAt,
          emailStatus: meta.emailStatus || 'not_configured',
          emailProvider: meta.emailProvider || 'none',
          emailError: meta.emailError || '',
          emailSentAt: meta.emailSentAt || '',
          guestEmailSent: Boolean(meta.guestEmailSent),
          checklist: normalizeChecklist(meta.checklist),
          quoteOverride: normalizeQuoteOverride(meta.quoteOverride),
          payment: normalizePayment(meta.payment),
          confirmationOverride:
            meta.confirmationOverride && typeof meta.confirmationOverride === 'object'
              ? { ...DEFAULT_OVERRIDE, ...meta.confirmationOverride }
              : { ...DEFAULT_OVERRIDE },
          activity: Array.isArray(meta.activity) ? meta.activity : [],
        });
      } catch {}
    }
    return items.reverse();
  };

  const updateInquiryMetaAsync = (reference, patch, activityEvent = null) =>
    enqueue(async () => {
      const all = readInquiryMetaSync();
      const prev =
        all[reference] && typeof all[reference] === 'object'
          ? all[reference]
          : {
              status: 'new',
              internalNotes: '',
              checklist: { ...DEFAULT_CHECKLIST },
              payment: { ...DEFAULT_PAYMENT },
              confirmationOverride: { ...DEFAULT_OVERRIDE },
              activity: [],
            };

      const prevChecklist = normalizeChecklist(prev.checklist);
      const nextChecklist =
        patch.checklist && typeof patch.checklist === 'object'
          ? normalizeChecklist({ ...prevChecklist, ...patch.checklist })
          : prevChecklist;

      const prevQuote = normalizeQuoteOverride(prev.quoteOverride);
      const nextQuote =
        patch.quoteOverride && typeof patch.quoteOverride === 'object'
          ? normalizeQuoteOverride({ ...prevQuote, ...patch.quoteOverride })
          : prevQuote;

      const prevPayment = normalizePayment(prev.payment);
      const nextPayment =
        patch.payment && typeof patch.payment === 'object'
          ? normalizePayment({ ...prevPayment, ...patch.payment })
          : prevPayment;

      const prevOverride =
        prev.confirmationOverride && typeof prev.confirmationOverride === 'object'
          ? { ...DEFAULT_OVERRIDE, ...prev.confirmationOverride }
          : { ...DEFAULT_OVERRIDE };
      const nextOverride =
        patch.confirmationOverride && typeof patch.confirmationOverride === 'object'
          ? { ...prevOverride, ...patch.confirmationOverride }
          : prevOverride;

      const nextStatus = patch.status !== undefined ? patch.status : prev.status || 'new';
      let firstResponseAt = prev.firstResponseAt || '';
      if (!firstResponseAt && prev.status === 'new' && nextStatus !== 'new' && nextStatus !== 'archived') {
        firstResponseAt = new Date().toISOString();
      }

      const prevActivity = Array.isArray(prev.activity) ? prev.activity : [];
      const nextActivity = activityEvent
        ? [
            ...prevActivity,
            {
              id: `act_${crypto.randomBytes(4).toString('hex')}`,
              at: new Date().toISOString(),
              ...activityEvent,
            },
          ].slice(-50)
        : prevActivity;

      const next = {
        ...prev,
        ...patch,
        status: nextStatus,
        firstResponseAt,
        checklist: nextChecklist,
        quoteOverride: nextQuote,
        payment: nextPayment,
        confirmationOverride: nextOverride,
        activity: nextActivity,
        updatedAt: new Date().toISOString(),
      };
      all[reference] = next;
      await writeJsonAtomic(inquiriesMeta, all);
      return readAllInquiriesSync().find((r) => r.reference === reference) || next;
    });

  const purgeInquiryAsync = (reference) =>
    enqueue(async () => {
      if (!fs.existsSync(inquiriesLog)) return false;
      const lines = fs.readFileSync(inquiriesLog, 'utf8').split(/\r?\n/).filter((l) => l.trim());
      const kept = [];
      let found = false;
      for (const line of lines) {
        try {
          const rec = JSON.parse(line);
          if (rec?.reference === reference) {
            found = true;
            continue;
          }
          kept.push(line);
        } catch {
          kept.push(line);
        }
      }
      if (!found) return false;
      const tmp = `${inquiriesLog}.${crypto.randomBytes(4).toString('hex')}.tmp`;
      await fs.promises.writeFile(tmp, kept.length > 0 ? kept.join('\n') + '\n' : '', { mode: 0o600 });
      await fs.promises.rename(tmp, inquiriesLog);

      const meta = readInquiryMetaSync();
      if (meta[reference]) {
        delete meta[reference];
        await writeJsonAtomic(inquiriesMeta, meta);
      }
      return true;
    });

  const appendEmailLogAsync = (entry) =>
    enqueue(async () => {
      await appendNdjson(emailLogsFile, {
        id: `eml_${crypto.randomBytes(5).toString('hex')}`,
        at: new Date().toISOString(),
        ...entry,
      });
    });

  const readEmailLogsSync = (limit = 200) => readNdjsonNewest(emailLogsFile, limit);

  const appendAuditLogAsync = ({ actor, action, targetRef = '', summary = '', diff = null }) =>
    enqueue(async () => {
      await appendNdjson(auditLogsFile, {
        id: `aud_${crypto.randomBytes(5).toString('hex')}`,
        at: new Date().toISOString(),
        actorId: actor?.id || 'system',
        actorName: actor?.name || 'System',
        actorRole: actor?.role || 'system',
        action,
        targetRef,
        summary,
        ...(diff ? { diff } : {}),
      });
    });

  const readAuditLogsSync = (limit = 200) => readNdjsonNewest(auditLogsFile, limit);

  const readSiteSettingsSync = () => {
    const defaults = getDefaultSiteSettings();
    const stored = readJsonSafe(siteSettingsFile, null);
    if (!stored || typeof stored !== 'object') return defaults;
    return {
      ...defaults,
      ...stored,
      licence: { ...defaults.licence, ...(stored.licence || {}) },
      contact: { ...defaults.contact, ...(stored.contact || {}) },
      fees: {
        ...defaults.fees,
        ...(stored.fees || {}),
        sdf: { ...defaults.fees.sdf, ...(stored.fees?.sdf || {}) },
      },
    };
  };

  const updateSiteSettingsAsync = (patch) =>
    enqueue(async () => {
      const current = readSiteSettingsSync();
      const { settings, diff } = validateSiteSettingsPatch(patch, current);
      await writeJsonAtomic(siteSettingsFile, settings);
      return { settings, diff };
    });

  const buildSanitizedBackupSync = () => ({
    exportedAt: new Date().toISOString(),
    schemaVersion: 3,
    engine: 'local-file',
    siteSettings: readSiteSettingsSync(),
    inquiries: readAllInquiriesSync(),
    users: listUsersSync(),
    emailLogs: readEmailLogsSync(500),
    auditLogs: readAuditLogsSync(500),
  });

  return {
    engine: 'local-file',
    inquiriesLog,
    inquiriesMeta,
    init: async () => {},
    isConfigured,
    isConfiguredAsync: async () => isConfigured(),
    ensureBootstrapOwnerAsync,
    authenticateUserAsync,
    createSessionAsync,
    resolveSessionSync,
    resolveSessionAsync: async (token) => resolveSessionSync(token),
    revokeSessionAsync,
    listActiveSessionsSync,
    listActiveSessionsAsync: async () => listActiveSessionsSync(),
    listUsersSync,
    listUsersAsync: async () => listUsersSync(),
    createUserAsync,
    updateUserAsync,
    changeOwnPasswordAsync,
    createInquiryAsync,
    readInquiryMetaSync,
    updateInquiryMetaAsync,
    readAllInquiriesSync,
    listInquiriesAsync: async () => readAllInquiriesSync(),
    getInquiryAsync: async (ref) => readAllInquiriesSync().find((r) => r.reference === ref) || null,
    purgeInquiryAsync,
    appendEmailLogAsync,
    readEmailLogsSync,
    listEmailLogsAsync: async (limit = 200) => readEmailLogsSync(limit),
    appendAuditLogAsync,
    readAuditLogsSync,
    listAuditLogsAsync: async (limit = 200) => readAuditLogsSync(limit),
    getSiteSettingsAsync: async () => readSiteSettingsSync(),
    updateSiteSettingsAsync,
    buildSanitizedBackupSync,
    buildSanitizedBackupAsync: async () => buildSanitizedBackupSync(),
    closeAsync: async () => {},
  };
}
