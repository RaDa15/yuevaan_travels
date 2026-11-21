import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { site } from './data/site.js';
import { addNightsUTC, formatDisplayDate } from './lib/format.js';
import { validateBookingInput, validateInquiryInput } from './lib/validation.js';
import {
  getEmailConfig,
  loadEnvFile,
  sendInquiryEmails,
  sendTestNotificationEmail,
} from './lib/mailer.js';
import {
  ALLOWED_STATUSES,
  hasPermission,
  ROLE_LABELS,
  ROLE_PERMISSIONS,
} from './lib/admin-store.js';
import {
  computeDashboardAnalytics,
  computeFinanceSummary,
  computeTeamPerformance,
} from './lib/admin-analytics.js';
import { getDefaultDataStore } from './lib/db/index.js';
import { mergeSiteConfigWithSettings } from './lib/db/schema.js';
import { invalidateSiteConfigCache } from './lib/site-settings.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

if (!process.env.NODE_TEST_CONTEXT && process.env.DISABLE_DOTENV !== '1') {
  loadEnvFile(path.join(__dirname, '.env'));
}

const PORT = Number(process.env.PORT || 8081);
const ADMIN_PORT = Number(process.env.ADMIN_PORT || 0);
const PUBLIC_DIR = path.resolve(__dirname, 'public');
const PUBLIC_PREFIX = PUBLIC_DIR.endsWith(path.sep) ? PUBLIC_DIR : PUBLIC_DIR + path.sep;
const STATIC_DIR = path.resolve(__dirname, process.env.STATIC_DIR || './out');
const STATIC_PREFIX = STATIC_DIR.endsWith(path.sep) ? STATIC_DIR : STATIC_DIR + path.sep;
const INQUIRIES_DIR = path.resolve(__dirname, process.env.INQUIRIES_DIR || './.data');
const INQUIRIES_LOG = path.join(INQUIRIES_DIR, 'inquiries.ndjson');
const WEBHOOK_URL = (process.env.INQUIRY_WEBHOOK_URL || '').trim();
const TRUST_PROXY = process.env.TRUST_PROXY === '1' || process.env.TRUST_PROXY === 'true';

const dataStore = getDefaultDataStore({
  inquiriesDir: INQUIRIES_DIR,
  databaseUrl: process.env.DATABASE_URL || '',
});

const RATE_WINDOW_MS = 10 * 60 * 1000;
const RATE_MAX_HITS = 5;
const ipHits = new Map();
const adminLoginHits = new Map();

const ADMIN_COOKIE_NAME = 'yuevaan_admin_session';
const ADMIN_SESSION_TTL_MS = 12 * 60 * 60 * 1000;
const REF_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.mjs': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.xml': 'application/xml; charset=utf-8',
  '.txt': 'text/plain; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
  '.woff': 'font/woff',
  '.mp4': 'video/mp4',
  '.webm': 'video/webm',
};

function getFilmOrigin() {
  const filmUrl = (process.env.NEXT_PUBLIC_FILM_URL || '').trim();
  if (!filmUrl) return '';
  try {
    return new URL(filmUrl).origin;
  } catch {
    return '';
  }
}

const FILM_ORIGIN = getFilmOrigin();
const CSP_HEADER = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline' https://unpkg.com",
  "style-src 'self' 'unsafe-inline' https://unpkg.com https://fonts.googleapis.com",
  "img-src 'self' data: blob: https://server.arcgisonline.com https://s3.amazonaws.com",
  "connect-src 'self' https://server.arcgisonline.com https://s3.amazonaws.com https://unpkg.com",
  "worker-src 'self' blob:",
  `media-src 'self'${FILM_ORIGIN ? ' ' + FILM_ORIGIN : ''}`,
  `frame-src 'self'${FILM_ORIGIN ? ' ' + FILM_ORIGIN : ''}`,
  "font-src 'self' https://fonts.gstatic.com",
  "frame-ancestors 'self'",
].join('; ');

const SECURITY_HEADERS = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'SAMEORIGIN',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
  'Content-Security-Policy': CSP_HEADER,
};

const LEGACY_REDIRECTS = new Map([
  ['/index.html', '/'],
  ['/about.html', '/about'],
  ['/contact.html', '/contact'],
  ['/destinations.html', '/destinations'],
  ['/experiences.html', '/experiences'],
  ['/legal.html', '/legal'],
  ['/tours.html', '/tours'],
  ['/plan-my-trip.html', '/plan-my-trip'],
  ['/plan-your-trip.html', '/travel-guide'],
  ['/plan-your-trip', '/travel-guide'],
  ['/travel-guide.html', '/travel-guide'],
  ['/experiences/adventure-activities.html', '/experiences/adventure-activities'],
  ['/experiences/bird-watching.html', '/experiences/bird-watching'],
  ['/experiences/cultural-experiences.html', '/experiences/cultural-experiences'],
  ['/experiences/festivals-events.html', '/experiences/festivals-events'],
  ['/experiences/local-experiences.html', '/experiences/local-experiences'],
  ['/experiences/nature-wildlife.html', '/experiences/nature-wildlife'],
  ['/experiences/photography-tours.html', '/experiences/photography-tours'],
  ['/experiences/spiritual-experiences.html', '/experiences/spiritual-experiences'],
  ['/experiences/trekking-hiking.html', '/experiences/trekking-hiking'],
  ['/packages/package-ancient-dzongs.html', '/packages/ancient-dzongs'],
  ['/packages/package-black-necked-crane.html', '/packages/black-necked-crane'],
  ['/packages/package-brokpa-nomad.html', '/packages/brokpa-nomad'],
  ['/packages/package-bumthang-cultural-trek.html', '/packages/bumthang-cultural-trek'],
  ['/packages/package-central-spiritual-odyssey.html', '/packages/central-spiritual-odyssey'],
  ['/packages/package-chele-la-biking.html', '/packages/chele-la-biking'],
  ['/packages/package-crane-birding.html', '/packages/crane-birding'],
  ['/packages/package-dagala-trek.html', '/packages/dagala-trek'],
  ['/packages/package-druk-path-trek.html', '/packages/druk-path-trek'],
  ['/packages/package-farmhouse-living.html', '/packages/farmhouse-living'],
  ['/packages/package-golden-hour-photo.html', '/packages/golden-hour-photo'],
  ['/packages/package-himalayan-light-photo.html', '/packages/himalayan-light-photo'],
  ['/packages/package-jambay-lhakhang-drup.html', '/packages/jambay-lhakhang-drup'],
  ['/packages/package-jomolhari-trek.html', '/packages/jomolhari-trek'],
  ['/packages/package-lingmethang-birding.html', '/packages/lingmethang-birding'],
  ['/packages/package-manas-birding.html', '/packages/manas-birding'],
  ['/packages/package-monastic-pilgrimage.html', '/packages/monastic-pilgrimage'],
  ['/packages/package-owl-trek.html', '/packages/owl-trek'],
  ['/packages/package-paro-tshechu.html', '/packages/paro-tshechu'],
  ['/packages/package-rivers-and-passes.html', '/packages/rivers-and-passes'],
  ['/packages/package-royal-manas-wilderness.html', '/packages/royal-manas-wilderness'],
  ['/packages/package-spiritual-retreat.html', '/packages/spiritual-retreat'],
  ['/packages/package-thimphu-tshechu.html', '/packages/thimphu-tshechu'],
  ['/packages/package-western-bhutan.html', '/packages/western-bhutan'],
  ['/maps/druk-map.html', '/maps/druk-path-trek-map.html'],
  ['/maps/dagala-map.html', '/maps/dagala-thousand-lakes-trek-map.html'],
  ['/maps/jomolhari-map.html', '/maps/jomolhari-base-camp-trek-map.html'],
  ['/maps/bumdrak-map.html', '/maps/bumdrak-trek-map.html'],
  ['/maps/kila-map.html', '/maps/chele-la-kila-goemba-trek-map.html'],
  ['/maps/lungchutse-map.html', '/maps/dochula-lungchutse-trek-map.html'],
]);

function loadTourCatalogue() {
  const candidates = [
    path.join(PUBLIC_DIR, 'tour-catalogue.json'),
    path.join(STATIC_DIR, 'tour-catalogue.json'),
  ];
  for (const p of candidates) {
    if (fs.existsSync(p)) {
      try {
        const list = JSON.parse(fs.readFileSync(p, 'utf8'));
        return new Map(list.map((item) => [item.slug, item]));
      } catch {}
    }
  }
  return new Map();
}

const tourCatalogue = loadTourCatalogue();

function getClientIp(req) {
  if (TRUST_PROXY && typeof req.headers['x-forwarded-for'] === 'string') {
    const parts = req.headers['x-forwarded-for']
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
    if (parts.length > 0) return parts[parts.length - 1];
  }
  return req.socket?.remoteAddress || 'unknown';
}

function pruneRateMap(map, now) {
  if (map.size < 2000) return;
  for (const [k, tsList] of map.entries()) {
    const active = tsList.filter((ts) => now - ts < RATE_WINDOW_MS);
    if (active.length === 0) map.delete(k);
    else map.set(k, active);
  }
  if (map.size >= 5000) {
    const oldestKey = map.keys().next().value;
    if (oldestKey !== undefined) map.delete(oldestKey);
  }
}

function checkRateLimit(ip) {
  const now = Date.now();
  pruneRateMap(ipHits, now);
  const prev = (ipHits.get(ip) || []).filter((ts) => now - ts < RATE_WINDOW_MS);
  if (prev.length >= RATE_MAX_HITS) {
    const retryAfter = Math.ceil((RATE_WINDOW_MS - (now - prev[0])) / 1000);
    return { allowed: false, retryAfter: Math.max(1, retryAfter) };
  }
  prev.push(now);
  ipHits.set(ip, prev);
  return { allowed: true, retryAfter: 0 };
}

function thimphuDateStamp(now = new Date()) {
  const btt = new Date(now.getTime() + 6 * 3600 * 1000);
  return btt.toISOString().slice(0, 10).replace(/-/g, '');
}

function loadUsedRefsForDay(dateStamp) {
  const used = new Set();
  if (!fs.existsSync(INQUIRIES_LOG)) return used;
  try {
    const prefix = `YBT-${dateStamp}-`;
    const lines = fs.readFileSync(INQUIRIES_LOG, 'utf8').split('\n');
    for (const line of lines) {
      if (!line) continue;
      const idx = line.indexOf(prefix);
      if (idx !== -1) used.add(line.slice(idx, idx + 17));
    }
  } catch {}
  return used;
}

export function generateReference(now = new Date(), existingSet = null) {
  const stamp = thimphuDateStamp(now);
  const used = existingSet || loadUsedRefsForDay(stamp);
  for (let attempt = 0; attempt < 50; attempt++) {
    let code = '';
    for (let i = 0; i < 4; i++) {
      code += REF_ALPHABET[Math.floor(Math.random() * REF_ALPHABET.length)];
    }
    const candidate = `YBT-${stamp}-${code}`;
    if (!used.has(candidate)) {
      used.add(candidate);
      return candidate;
    }
  }
  return `YBT-${stamp}-ZZZZ`;
}

function sendJson(res, statusCode, payload, extraHeaders = {}) {
  const body = JSON.stringify(payload);
  res.writeHead(statusCode, {
    ...SECURITY_HEADERS,
    ...extraHeaders,
    'Content-Type': 'application/json; charset=utf-8',
    'Content-Length': Buffer.byteLength(body),
    'Cache-Control': 'no-store',
  });
  res.end(body);
}

function sendErrorResponse(req, res, isForm, statusCode, code, message, field, extraHeaders = {}) {
  if (isForm) {
    const fallback = '/contact';
    const refUrl = req.headers.referer;
    let targetPath = fallback;
    if (refUrl) {
      try {
        const rawPath = new URL(refUrl).pathname || fallback;
        if (rawPath === '/plan-my-trip' || rawPath === '/contact') {
          targetPath = rawPath;
        }
      } catch {}
    }
    const sep = targetPath.includes('?') ? '&' : '?';
    res.writeHead(303, {
      ...SECURITY_HEADERS,
      Location: `${targetPath}${sep}error=${encodeURIComponent(field || code)}`,
    });
    res.end();
    return;
  }
  sendJson(res, statusCode, { ok: false, error: { code, message, field: field || undefined } }, extraHeaders);
}

function sendNotFound(res) {
  const fallback =
    '<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"><title>404 — Not Found</title></head><body><h1>404</h1><p>Not Found</p></body></html>';
  res.writeHead(404, {
    ...SECURITY_HEADERS,
    'Content-Type': 'text/html; charset=utf-8',
    'Content-Length': Buffer.byteLength(fallback),
    'Cache-Control': 'no-store',
  });
  res.end(fallback);
}

function isAllowedOrigin(req) {
  let siteUrl = null;
  try {
    siteUrl = new URL(site.url);
  } catch {}
  let reqHost = { hostname: '', port: '' };
  try {
    const parsedHost = new URL(`http://${String(req.headers.host || 'localhost')}`);
    reqHost = {
      hostname: parsedHost.hostname.replace(/^\[|\]$/g, '').toLowerCase(),
      port: parsedHost.port || '',
    };
  } catch {}
  const isLoopback = (h) => h === 'localhost' || h === '127.0.0.1' || h === '::1';

  const checkHeader = (headerVal) => {
    if (!headerVal) return null;
    try {
      const parsed = new URL(headerVal);
      const h = parsed.hostname.replace(/^\[|\]$/g, '').toLowerCase();
      const p = parsed.port || '';
      if (isLoopback(h) && isLoopback(reqHost.hostname)) return true;
      if (reqHost.hostname && h === reqHost.hostname && p === reqHost.port) return true;
      if (siteUrl && h === siteUrl.hostname.toLowerCase() && p === (siteUrl.port || '')) return true;
      return false;
    } catch {
      return false;
    }
  };

  if (req.headers.origin) return checkHeader(req.headers.origin);
  if (req.headers.referer) return checkHeader(req.headers.referer);
  return true;
}

function forwardWebhookAsync(record) {
  if (!WEBHOOK_URL) return;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 5000);

  const summaryText =
    record.type === 'booking'
      ? `New booking request ${record.reference} — ${record.tourTitle}, ${formatDisplayDate(record.startDate)}, ${record.adults} adults — ${record.fullName} <${record.email}>`
      : `New inquiry ${record.reference} — ${record.fullName} <${record.email}>`;

  const body = {
    text: summaryText,
    reference: record.reference,
    type: record.type,
    tourTitle: record.tourTitle || undefined,
    startDate: record.startDate || undefined,
    party:
      record.type === 'booking'
        ? { adults: record.adults, children: record.children, youngChildren: record.youngChildren }
        : record.party,
    fullName: record.fullName,
    email: record.email,
    phone: record.phone,
  };

  fetch(WEBHOOK_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    signal: controller.signal,
  })
    .then((r) => {
      if (!r.ok) console.error(`Webhook non-2xx for ${record.reference}: HTTP ${r.status}`);
    })
    .catch((err) => {
      console.error(`Webhook delivery failed for ${record.reference}: ${err.message}`);
    })
    .finally(() => clearTimeout(timer));
}

function parseCookies(cookieHeader) {
  const out = {};
  if (!cookieHeader) return out;
  for (const part of String(cookieHeader).split(';')) {
    const idx = part.indexOf('=');
    if (idx === -1) continue;
    const k = part.slice(0, idx).trim();
    const v = part.slice(idx + 1).trim();
    if (k) out[k] = decodeURIComponent(v);
  }
  return out;
}

async function resolveAdminAuth(req) {
  const cookies = parseCookies(req.headers.cookie);
  const token = cookies[ADMIN_COOKIE_NAME];
  return dataStore.resolveSessionAsync(token);
}

function checkAdminLoginLimit(ip) {
  const now = Date.now();
  const prev = (adminLoginHits.get(ip) || []).filter((ts) => now - ts < RATE_WINDOW_MS);
  if (prev.length >= 10) {
    adminLoginHits.set(ip, prev);
    const retryAfter = Math.ceil((RATE_WINDOW_MS - (now - prev[0])) / 1000);
    return { allowed: false, retryAfter: Math.max(1, retryAfter) };
  }
  return { allowed: true, retryAfter: 0 };
}

function recordFailedAdminLogin(key) {
  const now = Date.now();
  pruneRateMap(adminLoginHits, now);
  const prev = (adminLoginHits.get(key) || []).filter((ts) => now - ts < RATE_WINDOW_MS);
  prev.push(now);
  adminLoginHits.set(key, prev);
}

async function getCurrentLiveSiteConfig() {
  const stored = await dataStore.getSiteSettingsAsync();
  return mergeSiteConfigWithSettings(stored);
}

async function sendInquiryEmailsAsync(record, triggeredBy = 'auto') {
  try {
    const liveSite = await getCurrentLiveSiteConfig();
    const result = await sendInquiryEmails(record, process.env, liveSite);
    if (result.status === 'not_configured') return result;

    await dataStore.updateInquiryMetaAsync(
      record.reference,
      {
        emailStatus: result.status,
        emailProvider: result.provider,
        emailError: result.error || '',
        emailSentAt: result.status === 'sent' ? result.attemptedAt : '',
        guestEmailSent: Boolean(result.guestSent),
      },
      {
        actorName: triggeredBy === 'auto' ? 'Auto-Mailer' : triggeredBy,
        kind: result.status === 'sent' ? 'email_sent' : 'email_failed',
        message:
          result.status === 'sent'
            ? `Email sent via ${String(result.provider || '').toUpperCase()}${result.guestSent ? ' (Admin + Guest)' : ' (Admin)'}`
            : `Email failed: ${result.error || 'Unknown error'}`,
      }
    );
    if (Array.isArray(result.attempts)) {
      for (const attempt of result.attempts) {
        await dataStore.appendEmailLogAsync({
          reference: record.reference,
          triggeredBy,
          ...attempt,
        });
      }
    }
    if (result.status === 'failed') {
      console.error(`Email delivery failed for ${record.reference}: ${result.error}`);
    } else if (result.status === 'sent') {
      console.log(`Email sent for ${record.reference} via ${result.provider} (guest copy: ${result.guestSent})`);
    }
    return result;
  } catch (err) {
    console.error(`Unexpected email error for ${record.reference}:`, err.message);
    return { status: 'failed', provider: 'none', adminSent: false, guestSent: false, error: err.message };
  }
}

function readJsonBody(req, maxBytes = 64 * 1024) {
  const ctype = String(req.headers['content-type'] || '').toLowerCase();
  if (!ctype.includes('application/json')) {
    req.resume();
    const err = new Error('Content-Type must be application/json.');
    err.statusCode = 415;
    return Promise.reject(err);
  }
  return new Promise((resolve, reject) => {
    const chunks = [];
    let total = 0;
    req.on('data', (chunk) => {
      total += chunk.length;
      if (total > maxBytes) {
        req.resume();
        const err = new Error('Payload too large');
        err.statusCode = 413;
        reject(err);
        return;
      }
      chunks.push(chunk);
    });
    req.on('end', () => {
      try {
        const raw = Buffer.concat(chunks).toString('utf8');
        const parsed = raw ? JSON.parse(raw) : {};
        if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
          throw new Error('JSON body must be an object');
        }
        resolve(parsed);
      } catch {
        const err = new Error('Malformed JSON payload');
        err.statusCode = 400;
        reject(err);
      }
    });
    req.on('error', reject);
  });
}

function getSafeEmailSummary() {
  const cfg = getEmailConfig();
  return {
    configured: cfg.configured,
    provider: cfg.provider,
    adminTo: cfg.adminTo || '',
    from: cfg.from || '',
    sendGuestCopy: cfg.sendGuestCopy,
  };
}

function sendForbidden(res, adminHeaders, message = 'Your role does not have permission for this action.') {
  sendJson(res, 403, { ok: false, error: { code: 'FORBIDDEN', message } }, adminHeaders);
}

function canUserAccessInquiry(user, inquiry) {
  if (!user || !inquiry) return false;
  if (hasPermission(user.role, 'bookings:read_all')) return true;
  if (hasPermission(user.role, 'bookings:read_own_and_unassigned')) {
    return !inquiry.assignedUserId || inquiry.assignedUserId === user.id;
  }
  return false;
}

async function handleAdminRoute(req, res, urlPath) {
  const adminHeaders = { 'X-Robots-Tag': 'noindex, nofollow' };
  const origin = req.headers.origin;
  if (origin && isAllowedOrigin(req)) {
    adminHeaders['Access-Control-Allow-Origin'] = origin;
    adminHeaders['Access-Control-Allow-Credentials'] = 'true';
    adminHeaders['Access-Control-Allow-Methods'] = 'GET, POST, PATCH, DELETE, OPTIONS';
    adminHeaders['Access-Control-Allow-Headers'] = 'Content-Type';
  }

  if (req.method === 'OPTIONS') {
    res.writeHead(204, { ...SECURITY_HEADERS, ...adminHeaders });
    res.end();
    return;
  }

  if (req.method !== 'GET' && req.method !== 'HEAD' && !isAllowedOrigin(req)) {
    sendForbidden(res, adminHeaders, 'Cross-origin admin request rejected.');
    return;
  }

  if (urlPath === '/api/admin/session' && req.method === 'GET') {
    const configured = await dataStore.isConfiguredAsync();
    const auth = await resolveAdminAuth(req);
    const authenticated = Boolean(auth);
    const liveSite = authenticated ? await getCurrentLiveSiteConfig() : null;
    sendJson(
      res,
      200,
      {
        ok: true,
        configured,
        authenticated,
        dbEngine: dataStore.engine,
        user: auth ? auth.user : null,
        permissions: auth ? auth.permissions : [],
        roles: ROLE_LABELS,
        rolePermissions: auth ? ROLE_PERMISSIONS : undefined,
        siteConfig: liveSite
          ? {
              name: liveSite.name,
              licence: liveSite.licence,
              contact: liveSite.contact,
              fees: liveSite.fees,
              slaHours: liveSite.slaHours,
            }
          : undefined,
        emailConfig: authenticated ? getSafeEmailSummary() : { configured: getEmailConfig().configured },
      },
      adminHeaders
    );
    return;
  }

  if (urlPath === '/api/admin/login' && req.method === 'POST') {
    if (!(await dataStore.isConfiguredAsync())) {
      sendJson(
        res,
        503,
        {
          ok: false,
          error: {
            code: 'ADMIN_NOT_CONFIGURED',
            message: 'Set ADMIN_PASSWORD in .env and restart npm start to unlock the Admin Portal.',
          },
        },
        adminHeaders
      );
      return;
    }

    const clientIp = getClientIp(req);
    const rate = checkAdminLoginLimit(clientIp);
    if (!rate.allowed) {
      sendJson(
        res,
        429,
        {
          ok: false,
          error: { code: 'RATE_LIMITED', message: 'Too many login attempts. Please wait a few minutes.' },
        },
        { ...adminHeaders, 'Retry-After': String(rate.retryAfter) }
      );
      return;
    }

    let body;
    try {
      body = await readJsonBody(req, 4096);
    } catch (err) {
      sendJson(res, err.statusCode || 400, { ok: false, error: { code: 'INVALID_BODY', message: err.message } }, adminHeaders);
      return;
    }

    const acctKey = `acct:${String(body.email || 'owner').trim().toLowerCase()}`;
    const acctRate = checkAdminLoginLimit(acctKey);
    if (!acctRate.allowed) {
      sendJson(
        res,
        429,
        {
          ok: false,
          error: { code: 'RATE_LIMITED', message: 'Too many login attempts for this account. Please wait a few minutes.' },
        },
        { ...adminHeaders, 'Retry-After': String(acctRate.retryAfter) }
      );
      return;
    }

    const user = await dataStore.authenticateUserAsync({
      email: body.email,
      password: body.password,
    });

    if (!user) {
      recordFailedAdminLogin(clientIp);
      recordFailedAdminLogin(acctKey);
      await dataStore.appendAuditLogAsync({
        actor: { id: 'anonymous', name: String(body.email || 'Unknown'), role: 'anonymous' },
        action: 'login_failed',
        summary: `Failed sign-in attempt from ${clientIp}`,
      });
      sendJson(
        res,
        401,
        { ok: false, error: { code: 'INVALID_CREDENTIALS', message: 'Incorrect email or password.' } },
        adminHeaders
      );
      return;
    }

    const { token } = await dataStore.createSessionAsync({
      userId: user.id,
      ttlMs: ADMIN_SESSION_TTL_MS,
      userAgent: req.headers['user-agent'] || '',
      ipHint: clientIp,
    });

    await dataStore.appendAuditLogAsync({
      actor: user,
      action: 'login_success',
      summary: `Signed in (${ROLE_LABELS[user.role] || user.role})`,
    });

    const liveSite = await getCurrentLiveSiteConfig();
    const isHttps = req.headers['x-forwarded-proto'] === 'https';
    const cookie = `${ADMIN_COOKIE_NAME}=${encodeURIComponent(token)}; HttpOnly; Path=/; SameSite=Lax; Max-Age=${Math.floor(ADMIN_SESSION_TTL_MS / 1000)}${isHttps ? '; Secure' : ''}`;
    sendJson(
      res,
      200,
      {
        ok: true,
        authenticated: true,
        dbEngine: dataStore.engine,
        user,
        permissions: ROLE_PERMISSIONS[user.role] || [],
        siteConfig: {
          name: liveSite.name,
          licence: liveSite.licence,
          contact: liveSite.contact,
          fees: liveSite.fees,
          slaHours: liveSite.slaHours,
        },
        emailConfig: getSafeEmailSummary(),
      },
      { ...adminHeaders, 'Set-Cookie': cookie }
    );
    return;
  }

  if (urlPath === '/api/admin/logout' && req.method === 'POST') {
    const auth = await resolveAdminAuth(req);
    if (auth) {
      await dataStore.revokeSessionAsync(auth.session.id);
      await dataStore.appendAuditLogAsync({
        actor: auth.user,
        action: 'logout',
        summary: 'Signed out of Admin Portal',
      });
    }
    const isHttps = req.headers['x-forwarded-proto'] === 'https';
    const cookie = `${ADMIN_COOKIE_NAME}=; HttpOnly; Path=/; SameSite=Lax; Max-Age=0${isHttps ? '; Secure' : ''}`;
    sendJson(res, 200, { ok: true, authenticated: false }, { ...adminHeaders, 'Set-Cookie': cookie });
    return;
  }

  const auth = await resolveAdminAuth(req);
  if (!auth) {
    sendJson(
      res,
      401,
      { ok: false, error: { code: 'UNAUTHORIZED', message: 'Please sign in to access the Admin Portal.' } },
      adminHeaders
    );
    return;
  }

  const currentUser = auth.user;
  const can = (perm) => hasPermission(currentUser.role, perm);

  // Change own password
  if (urlPath === '/api/admin/account/password' && req.method === 'POST') {
    let body;
    try {
      body = await readJsonBody(req, 4096);
    } catch (err) {
      sendJson(res, err.statusCode || 400, { ok: false, error: { code: 'INVALID_BODY', message: err.message } }, adminHeaders);
      return;
    }
    try {
      await dataStore.changeOwnPasswordAsync(
        currentUser.id,
        body.currentPassword,
        body.newPassword,
        auth.session.id
      );
      await dataStore.appendAuditLogAsync({
        actor: currentUser,
        action: 'password_changed',
        summary: 'Updated own account password',
      });
      sendJson(res, 200, { ok: true, message: 'Password updated successfully.' }, adminHeaders);
    } catch (err) {
      sendJson(
        res,
        err.statusCode || 400,
        { ok: false, error: { code: 'PASSWORD_CHANGE_FAILED', message: err.message } },
        adminHeaders
      );
    }
    return;
  }

  // Live Editable Bhutan Statutory Rates & Agency Reference Settings
  if (urlPath === '/api/admin/settings' && req.method === 'GET') {
    const settings = await dataStore.getSiteSettingsAsync();
    sendJson(res, 200, { ok: true, settings, dbEngine: dataStore.engine }, adminHeaders);
    return;
  }

  if (urlPath === '/api/admin/settings' && req.method === 'PATCH') {
    if (!can('settings:manage')) {
      sendForbidden(res, adminHeaders, 'Only the Owner can edit Bhutan Statutory Rates and Agency Settings.');
      return;
    }
    let body;
    try {
      body = await readJsonBody(req, 16 * 1024);
    } catch (err) {
      sendJson(res, err.statusCode || 400, { ok: false, error: { code: 'INVALID_BODY', message: err.message } }, adminHeaders);
      return;
    }
    try {
      const { settings, diff } = await dataStore.updateSiteSettingsAsync(body, currentUser);
      invalidateSiteConfigCache();
      const changedKeys = Object.keys(diff);
      await dataStore.appendAuditLogAsync({
        actor: currentUser,
        action: 'settings_updated',
        summary:
          changedKeys.length > 0
            ? `Updated Bhutan statutory rates / agency settings (${changedKeys.join(', ')})`
            : 'Saved Bhutan rates & agency settings (no values changed)',
        diff,
      });
      sendJson(res, 200, { ok: true, settings, diff, dbEngine: dataStore.engine }, adminHeaders);
    } catch (err) {
      sendJson(
        res,
        err.statusCode || 400,
        { ok: false, error: { code: 'SETTINGS_INVALID', message: err.message } },
        adminHeaders
      );
    }
    return;
  }

  // Executive & Manager Aggregated Analytics (no raw individual booking PII exposed to Owner)
  if (urlPath === '/api/admin/analytics' && req.method === 'GET') {
    if (!can('analytics:view') && !can('finance:view')) {
      sendForbidden(res, adminHeaders);
      return;
    }
    const urlObj = new URL(req.url, 'http://localhost');
    const rangeDays = Math.min(365, Math.max(7, Number(urlObj.searchParams.get('days') || 30)));
    const allInquiries = await dataStore.listInquiriesAsync();
    const staffDirectory = (await dataStore.listUsersAsync())
      .filter((u) => u.active)
      .map((u) => ({ id: u.id, name: u.name, role: u.role, roleLabel: u.roleLabel }));
    const liveSite = await getCurrentLiveSiteConfig();
    const analytics = computeDashboardAnalytics(allInquiries, rangeDays, new Date(), liveSite.fees);
    const teamPerformance = computeTeamPerformance(allInquiries, staffDirectory);
    const financeSummary = computeFinanceSummary(allInquiries, liveSite.fees);
    // Strip individual upcoming departure records for Owner (aggregates only)
    const safeAnalytics = can('bookings:read_all')
      ? analytics
      : { ...analytics, upcomingDepartures: [] };
    sendJson(
      res,
      200,
      {
        ok: true,
        analytics: safeAnalytics,
        teamPerformance,
        financeSummary,
        dbEngine: dataStore.engine,
        emailConfig: getSafeEmailSummary(),
      },
      adminHeaders
    );
    return;
  }

  // Inquiries List (Owner is excluded; Reservations sees unassigned + own; Manager & Finance see all)
  if (urlPath === '/api/admin/inquiries' && req.method === 'GET') {
    if (!can('bookings:read_all') && !can('bookings:read_own_and_unassigned')) {
      sendForbidden(
        res,
        adminHeaders,
        'Booking enquiries are handled by the Reservations, Manager, and Finance teams. Use Executive Analytics for Owner reporting.'
      );
      return;
    }
    const allInquiries = await dataStore.listInquiriesAsync();
    const visibleInquiries = can('bookings:read_all')
      ? allInquiries
      : allInquiries.filter((r) => !r.assignedUserId || r.assignedUserId === currentUser.id);
    const counts = {
      total: visibleInquiries.length,
      bookings: visibleInquiries.filter((r) => r.type === 'booking').length,
      inquiries: visibleInquiries.filter((r) => r.type === 'inquiry').length,
      new: visibleInquiries.filter((r) => r.status === 'new').length,
      unassigned: visibleInquiries.filter((r) => !r.assignedUserId && r.status !== 'archived').length,
      confirmed: visibleInquiries.filter((r) => r.status === 'confirmed').length,
      pipelineUsd: visibleInquiries
        .filter((r) => r.type === 'booking' && r.status !== 'archived' && Number.isFinite(r.estimatedAdultTotalUSD))
        .reduce((acc, r) => acc + r.estimatedAdultTotalUSD, 0),
    };
    const staffDirectory = (await dataStore.listUsersAsync())
      .filter((u) => u.active)
      .map((u) => ({ id: u.id, name: u.name, role: u.role, roleLabel: u.roleLabel }));
    sendJson(
      res,
      200,
      {
        ok: true,
        inquiries: visibleInquiries,
        counts,
        staffDirectory,
        emailConfig: getSafeEmailSummary(),
      },
      adminHeaders
    );
    return;
  }

  // Bulk Status Update (Manager only)
  if (urlPath === '/api/admin/inquiries/bulk-status' && req.method === 'POST') {
    if (!can('bookings:assign')) {
      sendForbidden(res, adminHeaders, 'Only Desk Managers can perform bulk status updates.');
      return;
    }
    let body;
    try {
      body = await readJsonBody(req, 16 * 1024);
    } catch (err) {
      sendJson(res, err.statusCode || 400, { ok: false, error: { code: 'INVALID_BODY', message: err.message } }, adminHeaders);
      return;
    }
    const refs = Array.isArray(body.references) ? body.references.filter((r) => typeof r === 'string') : [];
    const nextStatus = String(body.status || '').trim().toLowerCase();
    if (refs.length === 0 || !ALLOWED_STATUSES.has(nextStatus)) {
      sendJson(
        res,
        400,
        { ok: false, error: { code: 'INVALID_INPUT', message: 'Provide references array and a valid status.' } },
        adminHeaders
      );
      return;
    }
    const allByRef = new Map((await dataStore.listInquiriesAsync()).map((r) => [r.reference, r]));
    const updatedRefs = [];
    const skippedUnverified = [];
    for (const ref of refs) {
      const existing = allByRef.get(ref);
      if (!existing) continue;
      if (nextStatus === 'confirmed' && !existing.payment?.depositVerified) {
        skippedUnverified.push(ref);
        continue;
      }
      await dataStore.updateInquiryMetaAsync(
        ref,
        { status: nextStatus },
        {
          actorName: currentUser.name,
          kind: 'status_change',
          message: `Bulk status changed to ${nextStatus}`,
        }
      );
      updatedRefs.push(ref);
    }
    await dataStore.appendAuditLogAsync({
      actor: currentUser,
      action: 'bulk_status_update',
      summary: `Set ${updatedRefs.length} request(s) to "${nextStatus}"${skippedUnverified.length ? ` (${skippedUnverified.length} skipped awaiting Finance deposit verification)` : ''}`,
    });
    sendJson(
      res,
      200,
      { ok: true, updatedCount: updatedRefs.length, references: updatedRefs, skippedUnverified },
      adminHeaders
    );
    return;
  }

  // Claim an Unassigned Booking (Reservations / Manager)
  const claimMatch = urlPath.match(/^\/api\/admin\/inquiries\/([A-Z0-9-]+)\/claim$/);
  if (claimMatch && req.method === 'POST') {
    if (!can('bookings:claim') && !can('bookings:assign')) {
      sendForbidden(res, adminHeaders);
      return;
    }
    const ref = claimMatch[1];
    const current = await dataStore.getInquiryAsync(ref);
    if (!current) {
      sendJson(res, 404, { ok: false, error: { code: 'NOT_FOUND', message: 'Booking reference not found.' } }, adminHeaders);
      return;
    }
    if (current.assignedUserId && current.assignedUserId !== currentUser.id && !can('bookings:assign')) {
      sendJson(
        res,
        409,
        { ok: false, error: { code: 'ALREADY_ASSIGNED', message: 'This booking is already claimed by another team member.' } },
        adminHeaders
      );
      return;
    }
    const updated = await dataStore.updateInquiryMetaAsync(
      ref,
      { assignedUserId: currentUser.id },
      {
        actorName: currentUser.name,
        kind: 'claimed',
        message: `Claimed booking into ${currentUser.name}'s desk queue`,
      }
    );
    await dataStore.appendAuditLogAsync({
      actor: currentUser,
      action: 'booking_claimed',
      targetRef: ref,
      summary: `${currentUser.name} claimed ${ref}`,
    });
    sendJson(res, 200, { ok: true, inquiry: updated }, adminHeaders);
    return;
  }

  // Finance Payment Verification & SDF Remittance Endpoint (Finance only)
  const paymentMatch = urlPath.match(/^\/api\/admin\/inquiries\/([A-Z0-9-]+)\/payment$/);
  if (paymentMatch && req.method === 'PATCH') {
    if (!can('finance:verify_payment') && !can('finance:sdf_remit')) {
      sendForbidden(res, adminHeaders, 'Only the Finance role can verify deposits and record SDF remittances.');
      return;
    }
    const ref = paymentMatch[1];
    const current = await dataStore.getInquiryAsync(ref);
    if (!current) {
      sendJson(res, 404, { ok: false, error: { code: 'NOT_FOUND', message: 'Booking reference not found.' } }, adminHeaders);
      return;
    }
    let body;
    try {
      body = await readJsonBody(req, 16 * 1024);
    } catch (err) {
      sendJson(res, err.statusCode || 400, { ok: false, error: { code: 'INVALID_BODY', message: err.message } }, adminHeaders);
      return;
    }

    const paymentPatch = { ...current.payment };
    const checklistPatch = {};
    const quotePatch = {};
    const notes = [];

    if (body.depositPaidUsd !== undefined) {
      const n = Number(body.depositPaidUsd);
      if (!Number.isFinite(n) || n < 0) {
        sendJson(res, 400, { ok: false, error: { code: 'INVALID_AMOUNT', message: 'Deposit amount must be a non-negative number.' } }, adminHeaders);
        return;
      }
      paymentPatch.depositPaidUsd = Math.round(n);
      quotePatch.depositPaidUsd = Math.round(n);
      notes.push(`deposit USD → $${Math.round(n)}`);
    }
    if (body.finalQuotedUsd !== undefined) {
      const n = body.finalQuotedUsd === '' || body.finalQuotedUsd === null ? null : Number(body.finalQuotedUsd);
      if (n !== null && (!Number.isFinite(n) || n < 0)) {
        sendJson(res, 400, { ok: false, error: { code: 'INVALID_AMOUNT', message: 'Quoted USD must be non-negative.' } }, adminHeaders);
        return;
      }
      quotePatch.finalQuotedUsd = n === null ? null : Math.round(n);
    }
    if (body.wireReference !== undefined) {
      paymentPatch.wireReference = String(body.wireReference || '').trim().slice(0, 120);
    }
    if (body.paymentMethod !== undefined) {
      paymentPatch.paymentMethod = String(body.paymentMethod || '').trim().slice(0, 60);
    }
    if (body.financeNotes !== undefined) {
      paymentPatch.financeNotes = String(body.financeNotes || '').slice(0, 1000);
    }
    if (body.depositVerified !== undefined) {
      const verified = Boolean(body.depositVerified);
      paymentPatch.depositVerified = verified;
      paymentPatch.depositVerifiedBy = verified ? currentUser.name : '';
      paymentPatch.depositVerifiedAt = verified ? new Date().toISOString() : '';
      checklistPatch.depositReceived = verified;
      notes.push(verified ? 'verified deposit payment (unlocked Confirmed)' : 'revoked deposit verification');
    }
    if (body.sdfRemitted !== undefined) {
      const remitted = Boolean(body.sdfRemitted);
      checklistPatch.sdfRemitted = remitted;
      notes.push(remitted ? 'marked Bhutan SDF remitted to DoT' : 'unmarked SDF remitted');
    }

    const summary = notes.length > 0 ? notes.join('; ') : 'updated payment ledger';
    const patchObj = { payment: paymentPatch };
    if (Object.keys(checklistPatch).length > 0) patchObj.checklist = checklistPatch;
    if (Object.keys(quotePatch).length > 0) patchObj.quoteOverride = quotePatch;

    const updated = await dataStore.updateInquiryMetaAsync(ref, patchObj, {
      actorName: `${currentUser.name} (Finance)`,
      kind: 'finance_update',
      message: summary,
    });
    await dataStore.appendAuditLogAsync({
      actor: currentUser,
      action: 'finance_payment_updated',
      targetRef: ref,
      summary,
    });
    sendJson(res, 200, { ok: true, inquiry: updated }, adminHeaders);
    return;
  }

  // Test Email (Owner / Manager / Reservations)
  if (urlPath === '/api/admin/test-email' && req.method === 'POST') {
    if (!can('emails:send')) {
      sendForbidden(res, adminHeaders);
      return;
    }
    const liveSite = await getCurrentLiveSiteConfig();
    const result = await sendTestNotificationEmail(process.env, liveSite);
    await dataStore.appendEmailLogAsync({
      reference: 'TEST',
      kind: 'test',
      to: result.adminTo || '',
      subject: result.subject || 'Test Notification',
      provider: result.provider || 'none',
      status: result.ok ? 'sent' : 'failed',
      error: result.error || '',
      triggeredBy: currentUser.name,
    });
    await dataStore.appendAuditLogAsync({
      actor: currentUser,
      action: 'test_email',
      summary: result.ok
        ? `Sent test email to ${result.adminTo} via ${result.provider}`
        : `Test email failed: ${result.error}`,
    });
    sendJson(
      res,
      result.ok ? 200 : 400,
      result.ok
        ? { ok: true, provider: result.provider, adminTo: result.adminTo }
        : { ok: false, error: { code: 'EMAIL_FAILED', message: result.error } },
      adminHeaders
    );
    return;
  }

  // Resend Booking Email (Manager / Reservations with access)
  const resendMatch = urlPath.match(/^\/api\/admin\/inquiries\/([A-Z0-9-]+)\/resend$/);
  if (resendMatch && req.method === 'POST') {
    if (!can('emails:send') || (!can('bookings:read_all') && !can('bookings:read_own_and_unassigned'))) {
      sendForbidden(res, adminHeaders);
      return;
    }
    const ref = resendMatch[1];
    const record = await dataStore.getInquiryAsync(ref);
    if (!record) {
      sendJson(res, 404, { ok: false, error: { code: 'NOT_FOUND', message: 'Booking reference not found.' } }, adminHeaders);
      return;
    }
    if (!canUserAccessInquiry(currentUser, record)) {
      sendForbidden(res, adminHeaders, 'You can only manage unassigned bookings or bookings assigned to you.');
      return;
    }
    const emailResult = await sendInquiryEmailsAsync(record, currentUser.name);
    await dataStore.appendAuditLogAsync({
      actor: currentUser,
      action: 'email_resend',
      targetRef: ref,
      summary: emailResult.status === 'sent' ? `Resent email via ${emailResult.provider}` : `Resend failed: ${emailResult.error}`,
    });
    const updated = await dataStore.getInquiryAsync(ref);
    sendJson(
      res,
      emailResult.status === 'sent' ? 200 : 400,
      {
        ok: emailResult.status === 'sent',
        emailResult,
        inquiry: updated,
        error: emailResult.status === 'sent' ? undefined : { code: 'EMAIL_FAILED', message: emailResult.error },
      },
      adminHeaders
    );
    return;
  }

  // Update Single Booking (Manager / Reservations — enforces 2-step Finance Deposit Confirmation + Audited Manager Override)
  const inquiryItemMatch = urlPath.match(/^\/api\/admin\/inquiries\/([A-Z0-9-]+)$/);
  if (inquiryItemMatch && req.method === 'PATCH') {
    const ref = inquiryItemMatch[1];
    const current = await dataStore.getInquiryAsync(ref);
    if (!current) {
      sendJson(res, 404, { ok: false, error: { code: 'NOT_FOUND', message: 'Booking reference not found.' } }, adminHeaders);
      return;
    }
    if (!canUserAccessInquiry(currentUser, current)) {
      sendForbidden(res, adminHeaders, 'This booking is assigned to another staff member.');
      return;
    }

    let body;
    try {
      body = await readJsonBody(req, 24 * 1024);
    } catch (err) {
      sendJson(res, err.statusCode || 400, { ok: false, error: { code: 'INVALID_BODY', message: err.message } }, adminHeaders);
      return;
    }

    const wantsBookingWrite =
      body.status !== undefined ||
      body.internalNotes !== undefined ||
      body.assignedUserId !== undefined ||
      body.quoteOverride !== undefined;
    const wantsChecklistWrite = body.checklist !== undefined;

    if (wantsBookingWrite && !can('bookings:write')) {
      sendForbidden(res, adminHeaders);
      return;
    }
    if (wantsChecklistWrite && !can('checklist:write')) {
      sendForbidden(res, adminHeaders);
      return;
    }
    if (body.assignedUserId !== undefined && !can('bookings:assign')) {
      sendForbidden(res, adminHeaders, 'Only Desk Managers can reassign bookings to other staff.');
      return;
    }

    const patch = {};
    const changes = [];

    if (body.status !== undefined) {
      const nextStatus = String(body.status).trim().toLowerCase();
      if (!ALLOWED_STATUSES.has(nextStatus)) {
        sendJson(res, 400, { ok: false, error: { code: 'INVALID_STATUS', message: 'Invalid status value.' } }, adminHeaders);
        return;
      }

      // 2-Step Confirmation Gate: moving to "confirmed" requires Finance deposit verification OR audited Manager override
      if (nextStatus === 'confirmed' && current.status !== 'confirmed' && !current.payment?.depositVerified) {
        if (body.overrideConfirm && can('bookings:confirm_override')) {
          const reason = String(body.overrideReason || '').trim().slice(0, 300);
          if (reason.length < 5) {
            sendJson(
              res,
              400,
              {
                ok: false,
                error: {
                  code: 'OVERRIDE_REASON_REQUIRED',
                  message: 'Please provide a brief override reason (at least 5 characters) for the Audit Log.',
                },
              },
              adminHeaders
            );
            return;
          }
          patch.confirmationOverride = {
            used: true,
            reason,
            actorName: currentUser.name,
            at: new Date().toISOString(),
          };
          changes.push(`confirmed via Manager Override ("${reason}")`);
        } else {
          sendJson(
            res,
            400,
            {
              ok: false,
              error: {
                code: 'DEPOSIT_NOT_VERIFIED',
                message: can('bookings:confirm_override')
                  ? 'Finance has not verified the deposit yet. Ask Finance to verify payment or enable Manager Override with a reason.'
                  : 'Cannot mark Confirmed until Finance verifies the deposit payment.',
              },
            },
            adminHeaders
          );
          return;
        }
      } else if (nextStatus !== current.status) {
        changes.push(`status → ${nextStatus}`);
      }
      patch.status = nextStatus;
    }

    if (body.internalNotes !== undefined) {
      const nextNotes = String(body.internalNotes).slice(0, 4000);
      if (nextNotes !== current.internalNotes) changes.push('updated internal notes');
      patch.internalNotes = nextNotes;
    }
    if (body.assignedUserId !== undefined) {
      const nextAssignee = String(body.assignedUserId || '').trim().slice(0, 64);
      if (nextAssignee !== current.assignedUserId) changes.push(nextAssignee ? 'assigned Reservations owner' : 'returned to Unassigned queue');
      patch.assignedUserId = nextAssignee;
    }
    if (body.checklist !== undefined && typeof body.checklist === 'object') {
      // Finance owns depositReceived & sdfRemitted unless Manager overrides; block Reservations from self-verifying deposit
      const safeChecklist = { ...body.checklist };
      if (!can('finance:verify_payment')) delete safeChecklist.depositReceived;
      patch.checklist = safeChecklist;
      changes.push('updated Bhutan visa/permits checklist');
    }
    if (body.quoteOverride !== undefined && typeof body.quoteOverride === 'object') {
      patch.quoteOverride = body.quoteOverride;
      changes.push('updated quoted USD amount');
    }

    const summaryText = changes.length > 0 ? changes.join('; ') : 'saved booking details';
    const updated = await dataStore.updateInquiryMetaAsync(ref, patch, {
      actorName: currentUser.name,
      kind: patch.confirmationOverride?.used ? 'confirmation_override' : 'booking_updated',
      message: summaryText,
    });
    await dataStore.appendAuditLogAsync({
      actor: currentUser,
      action: patch.confirmationOverride?.used ? 'manager_confirm_override' : 'booking_updated',
      targetRef: ref,
      summary: summaryText,
    });
    sendJson(res, 200, { ok: true, inquiry: updated }, adminHeaders);
    return;
  }

  // Delete Booking Record (Manager privacy deletion)
  if (inquiryItemMatch && req.method === 'DELETE') {
    if (!can('bookings:assign')) {
      sendForbidden(res, adminHeaders, 'Only a Desk Manager can permanently purge booking records.');
      return;
    }
    const ref = inquiryItemMatch[1];
    const purged = await dataStore.purgeInquiryAsync(ref);
    if (!purged) {
      sendJson(res, 404, { ok: false, error: { code: 'NOT_FOUND', message: 'Booking reference not found.' } }, adminHeaders);
      return;
    }
    await dataStore.appendAuditLogAsync({
      actor: currentUser,
      action: 'booking_deleted',
      targetRef: ref,
      summary: `Permanently purged booking record ${ref} (privacy deletion)`,
    });
    sendJson(res, 200, { ok: true, deletedReference: ref }, adminHeaders);
    return;
  }

  if (urlPath === '/api/admin/email-logs' && req.method === 'GET') {
    if (!can('emails:logs')) {
      sendForbidden(res, adminHeaders);
      return;
    }
    const logs = await dataStore.listEmailLogsAsync(250);
    sendJson(res, 200, { ok: true, logs, emailConfig: getSafeEmailSummary() }, adminHeaders);
    return;
  }

  if (urlPath === '/api/admin/audit-logs' && req.method === 'GET') {
    if (!can('audit:read')) {
      sendForbidden(res, adminHeaders);
      return;
    }
    const logs = await dataStore.listAuditLogsAsync(250);
    sendJson(res, 200, { ok: true, logs }, adminHeaders);
    return;
  }

  if (urlPath === '/api/admin/users' && req.method === 'GET') {
    if (!can('users:manage')) {
      sendForbidden(res, adminHeaders);
      return;
    }
    sendJson(
      res,
      200,
      {
        ok: true,
        users: await dataStore.listUsersAsync(),
        sessions: await dataStore.listActiveSessionsAsync(),
        roles: ROLE_LABELS,
        rolePermissions: ROLE_PERMISSIONS,
      },
      adminHeaders
    );
    return;
  }

  if (urlPath === '/api/admin/users' && req.method === 'POST') {
    if (!can('users:manage')) {
      sendForbidden(res, adminHeaders);
      return;
    }
    let body;
    try {
      body = await readJsonBody(req, 8192);
    } catch (err) {
      sendJson(res, err.statusCode || 400, { ok: false, error: { code: 'INVALID_BODY', message: err.message } }, adminHeaders);
      return;
    }
    try {
      const created = await dataStore.createUserAsync(body);
      await dataStore.appendAuditLogAsync({
        actor: currentUser,
        action: 'user_created',
        summary: `Created staff account ${created.email} (${created.roleLabel})`,
      });
      sendJson(res, 201, { ok: true, user: created }, adminHeaders);
    } catch (err) {
      sendJson(
        res,
        err.statusCode || 400,
        { ok: false, error: { code: 'USER_CREATE_FAILED', message: err.message } },
        adminHeaders
      );
    }
    return;
  }

  const userMatch = urlPath.match(/^\/api\/admin\/users\/([A-Za-z0-9_-]+)$/);
  if (userMatch && req.method === 'PATCH') {
    if (!can('users:manage')) {
      sendForbidden(res, adminHeaders);
      return;
    }
    let body;
    try {
      body = await readJsonBody(req, 8192);
    } catch (err) {
      sendJson(res, err.statusCode || 400, { ok: false, error: { code: 'INVALID_BODY', message: err.message } }, adminHeaders);
      return;
    }
    try {
      const updated = await dataStore.updateUserAsync(userMatch[1], body);
      await dataStore.appendAuditLogAsync({
        actor: currentUser,
        action: 'user_updated',
        summary: `Updated staff account ${updated.email} (role: ${updated.roleLabel}, active: ${updated.active})`,
      });
      sendJson(res, 200, { ok: true, user: updated }, adminHeaders);
    } catch (err) {
      sendJson(
        res,
        err.statusCode || 400,
        { ok: false, error: { code: 'USER_UPDATE_FAILED', message: err.message } },
        adminHeaders
      );
    }
    return;
  }

  if (urlPath === '/api/admin/sessions' && req.method === 'GET') {
    if (!can('users:manage')) {
      sendForbidden(res, adminHeaders);
      return;
    }
    sendJson(res, 200, { ok: true, sessions: await dataStore.listActiveSessionsAsync() }, adminHeaders);
    return;
  }

  const sessionMatch = urlPath.match(/^\/api\/admin\/sessions\/([A-Za-z0-9_-]+)$/);
  if (sessionMatch && req.method === 'DELETE') {
    if (!can('users:manage')) {
      sendForbidden(res, adminHeaders);
      return;
    }
    const removed = await dataStore.revokeSessionAsync(sessionMatch[1]);
    if (!removed) {
      sendJson(res, 404, { ok: false, error: { code: 'NOT_FOUND', message: 'Session not found.' } }, adminHeaders);
      return;
    }
    await dataStore.appendAuditLogAsync({
      actor: currentUser,
      action: 'session_revoked',
      summary: `Revoked session ${sessionMatch[1]}`,
    });
    sendJson(res, 200, { ok: true, revokedSessionId: sessionMatch[1] }, adminHeaders);
    return;
  }

  if (urlPath === '/api/admin/backup' && req.method === 'GET') {
    if (!can('backup:download')) {
      sendForbidden(res, adminHeaders, 'Only an Owner can download full data backups.');
      return;
    }
    const bundle = await dataStore.buildSanitizedBackupAsync();
    await dataStore.appendAuditLogAsync({
      actor: currentUser,
      action: 'backup_downloaded',
      summary: `Downloaded JSON backup (${bundle.inquiries.length} inquiries, ${bundle.users.length} users)`,
    });
    const payload = JSON.stringify(bundle, null, 2);
    const stamp = new Date().toISOString().slice(0, 10);
    res.writeHead(200, {
      ...SECURITY_HEADERS,
      ...adminHeaders,
      'Content-Type': 'application/json; charset=utf-8',
      'Content-Length': Buffer.byteLength(payload),
      'Content-Disposition': `attachment; filename="yuevaan-backup-${stamp}.json"`,
      'Cache-Control': 'no-store',
    });
    res.end(payload);
    return;
  }

  sendJson(res, 404, { ok: false, error: { code: 'NOT_FOUND', message: 'Admin endpoint not found.' } }, adminHeaders);
}

function handleInquiryPost(req, res) {
  const ctype = String(req.headers['content-type'] || '').toLowerCase();
  const isJson = ctype.includes('application/json');
  const isForm = ctype.includes('application/x-www-form-urlencoded');

  if (!isJson && !isForm) {
    sendJson(res, 415, {
      ok: false,
      error: { code: 'UNSUPPORTED_MEDIA_TYPE', message: 'Use application/json or form encoding.' },
    });
    return;
  }

  if (isForm && !isAllowedOrigin(req)) {
    sendJson(res, 403, {
      ok: false,
      error: { code: 'FORBIDDEN_ORIGIN', message: 'Cross-site form submission rejected.' },
    });
    return;
  }

  const clientIp = getClientIp(req);
  const rate = checkRateLimit(clientIp);
  if (!rate.allowed) {
    sendErrorResponse(
      req,
      res,
      isForm,
      429,
      'RATE_LIMITED',
      'Too many submissions. Please wait a few minutes or message us on WhatsApp.',
      null,
      { 'Retry-After': String(rate.retryAfter) }
    );
    return;
  }

  const chunks = [];
  let totalBytes = 0;
  const MAX_BYTES = 64 * 1024;
  let aborted = false;

  const declaredLength = Number(req.headers['content-length'] || 0);
  if (declaredLength > MAX_BYTES) {
    req.resume();
    sendErrorResponse(req, res, isForm, 413, 'PAYLOAD_TOO_LARGE', 'Request exceeds 64 KB.', null, {
      Connection: 'close',
    });
    return;
  }

  req.on('data', (chunk) => {
    if (aborted) return;
    totalBytes += chunk.length;
    if (totalBytes > MAX_BYTES) {
      aborted = true;
      chunks.length = 0;
      req.resume();
      sendErrorResponse(req, res, isForm, 413, 'PAYLOAD_TOO_LARGE', 'Request exceeds 64 KB.', null, {
        Connection: 'close',
      });
      return;
    }
    chunks.push(chunk);
  });

  req.on('end', async () => {
    if (aborted) return;
    const raw = Buffer.concat(chunks).toString('utf8');
    let body;

    try {
      if (isJson) body = JSON.parse(raw || '{}');
      else body = Object.fromEntries(new URLSearchParams(raw));
    } catch {
      sendErrorResponse(req, res, isForm, 400, 'INVALID_JSON', 'Invalid JSON body.');
      return;
    }

    if (typeof body.website === 'string' && body.website.trim() !== '') {
      const dummyRef = `YBT-${thimphuDateStamp()}-0000`;
      if (isForm) {
        res.writeHead(303, { ...SECURITY_HEADERS, Location: `/thank-you?ref=${dummyRef}` });
        res.end();
      } else {
        sendJson(res, 201, { ok: true, reference: dummyRef });
      }
      return;
    }

    const type = body.type === 'booking' ? 'booking' : 'inquiry';
    const source = type === 'booking' ? '/plan-my-trip' : '/contact';
    let record;

    if (type === 'booking') {
      const slugs = [...tourCatalogue.keys()];
      const validation = validateBookingInput(body, slugs);
      if (!validation.valid) {
        sendErrorResponse(
          req,
          res,
          isForm,
          400,
          'VALIDATION_ERROR',
          validation.firstMessage,
          validation.firstField
        );
        return;
      }

      const tourInfo = tourCatalogue.get(validation.sanitized.tourSlug) || {
        slug: 'custom',
        title: 'Custom Tailor-Made Bhutan Journey',
        nights: 6,
        price: 2450,
      };
      const reference = generateReference();
      const endDate = addNightsUTC(validation.sanitized.startDate, tourInfo.nights);
      const estimatedAdultTotalUSD = validation.sanitized.adults * tourInfo.price;

      record = {
        reference,
        receivedAt: new Date().toISOString(),
        type: 'booking',
        fullName: validation.sanitized.fullName,
        email: validation.sanitized.email,
        phone: validation.sanitized.phone,
        notes: validation.sanitized.notes,
        tourSlug: tourInfo.slug,
        tourTitle: tourInfo.title,
        startDate: validation.sanitized.startDate,
        endDate,
        adults: validation.sanitized.adults,
        children: validation.sanitized.children,
        youngChildren: validation.sanitized.youngChildren,
        estimatedAdultTotalUSD,
        dob: validation.sanitized.dob,
        nationality: validation.sanitized.nationality,
        source,
      };
    } else {
      const validation = validateInquiryInput(body);
      if (!validation.valid) {
        sendErrorResponse(
          req,
          res,
          isForm,
          400,
          'VALIDATION_ERROR',
          validation.firstMessage,
          validation.firstField
        );
        return;
      }

      const reference = generateReference();
      record = {
        reference,
        receivedAt: new Date().toISOString(),
        type: 'inquiry',
        fullName: validation.sanitized.fullName,
        email: validation.sanitized.email,
        phone: validation.sanitized.phone,
        notes: validation.sanitized.notes,
        dates: validation.sanitized.dates,
        party: validation.sanitized.party,
        source,
      };
    }

    try {
      await dataStore.createInquiryAsync(record);
    } catch (err) {
      console.error(`Failed storing inquiry ${record.reference}:`, err.message);
      sendJson(res, 500, {
        ok: false,
        error: { code: 'SERVER_ERROR', message: 'Unable to store request right now.' },
      });
      return;
    }

    if (isForm) {
      res.writeHead(303, {
        ...SECURITY_HEADERS,
        Location: `/thank-you?ref=${encodeURIComponent(record.reference)}`,
      });
      res.end();
    } else {
      sendJson(res, 201, { ok: true, reference: record.reference });
    }

    forwardWebhookAsync(record);
    sendInquiryEmailsAsync(record);
  });
}

function servePublicMediaFile(req, res, filePath) {
  const finalStats = fs.statSync(filePath);
  const ext = path.extname(filePath).toLowerCase();
  const contentType = MIME_TYPES[ext] || 'application/octet-stream';
  const cacheControl = 'public, max-age=604800';
  const range = req.headers.range;

  const pipeStaticStream = (streamOptions) => {
    const stream = fs.createReadStream(filePath, streamOptions);
    const cleanup = () => {
      if (!stream.destroyed) stream.destroy();
    };
    res.once('close', cleanup);
    stream.once('error', () => {
      cleanup();
      if (!res.headersSent) res.writeHead(500, SECURITY_HEADERS);
      if (!res.writableEnded) res.end();
    });
    stream.pipe(res);
  };

  if (range && (ext === '.mp4' || ext === '.webm')) {
    const parts = range.replace(/bytes=/, '').split('-');
    const start = parseInt(parts[0], 10);
    const end = parts[1] ? parseInt(parts[1], 10) : finalStats.size - 1;
    if (Number.isNaN(start) || Number.isNaN(end) || start < 0 || end >= finalStats.size || start > end) {
      res.writeHead(416, {
        ...SECURITY_HEADERS,
        'Content-Range': `bytes */${finalStats.size}`,
      });
      res.end();
      return;
    }
    res.writeHead(206, {
      ...SECURITY_HEADERS,
      'Content-Range': `bytes ${start}-${end}/${finalStats.size}`,
      'Accept-Ranges': 'bytes',
      'Content-Length': end - start + 1,
      'Content-Type': contentType,
      'Cache-Control': cacheControl,
    });
    if (req.method === 'HEAD') {
      res.end();
      return;
    }
    pipeStaticStream({ start, end });
    return;
  }

  res.writeHead(200, {
    ...SECURITY_HEADERS,
    'Content-Type': contentType,
    'Content-Length': finalStats.size,
    'Cache-Control': cacheControl,
    'Accept-Ranges': 'bytes',
  });
  if (req.method === 'HEAD') {
    res.end();
    return;
  }
  pipeStaticStream();
}

export async function prepareNextApp({ dev = false } = {}) {
  const nextMod = await import('next');
  const nextFactory = nextMod.default || nextMod;
  const app = nextFactory({ dev, dir: __dirname });
  await app.prepare();
  return { app, handler: app.getRequestHandler() };
}

export function createAppServer({ adminPortalOnly = false, nextHandler = null } = {}) {
  return http.createServer((req, res) => {
    const startMs = Date.now();
    const rawUrl = req.url || '/';
    const qIdx = rawUrl.indexOf('?');
    const urlPath = qIdx === -1 ? rawUrl : rawUrl.slice(0, qIdx);
    const queryStr = qIdx === -1 ? '' : rawUrl.slice(qIdx);

    res.on('finish', () => {
      const prefix = adminPortalOnly ? '[admin-portal] ' : '';
      console.log(`${prefix}${req.method} ${urlPath} ${res.statusCode} ${Date.now() - startMs}ms`);
    });

    if (urlPath === '/api/public/settings' && req.method === 'GET') {
      getCurrentLiveSiteConfig()
        .then((liveSite) => {
          sendJson(res, 200, {
            ok: true,
            name: liveSite.name,
            licence: liveSite.licence,
            contact: liveSite.contact,
            fees: liveSite.fees,
            slaHours: liveSite.slaHours,
          });
        })
        .catch(() => sendJson(res, 500, { ok: false, error: { code: 'SERVER_ERROR', message: 'Unable to load settings.' } }));
      return;
    }

    if (urlPath.startsWith('/api/admin/')) {
      handleAdminRoute(req, res, urlPath).catch((err) => {
        console.error(`Admin route error on ${urlPath}:`, err.message);
        if (!res.headersSent) {
          sendJson(res, 500, { ok: false, error: { code: 'SERVER_ERROR', message: 'Unexpected server error.' } });
        }
      });
      return;
    }

    if (urlPath === '/api/inquiries') {
      const origin = req.headers.origin;
      if (origin && isAllowedOrigin(req)) {
        res.setHeader('Access-Control-Allow-Origin', origin);
        res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
      }
      if (req.method === 'OPTIONS') {
        res.writeHead(204, SECURITY_HEADERS);
        res.end();
        return;
      }
      if (req.method !== 'POST') {
        sendJson(
          res,
          405,
          { ok: false, error: { code: 'METHOD_NOT_ALLOWED', message: 'POST required.' } },
          { Allow: 'POST' }
        );
        return;
      }
      handleInquiryPost(req, res);
      return;
    }

    if (req.method !== 'GET' && req.method !== 'HEAD') {
      res.writeHead(405, { ...SECURITY_HEADERS, Allow: 'GET, HEAD' });
      res.end('Method Not Allowed');
      return;
    }

    let decodedPath;
    try {
      decodedPath = decodeURIComponent(urlPath);
    } catch {
      res.writeHead(400, SECURITY_HEADERS);
      res.end('Bad Request');
      return;
    }

    if (adminPortalOnly) {
      if (decodedPath === '/' || decodedPath === '/index.html') {
        res.writeHead(302, {
          ...SECURITY_HEADERS,
          'X-Robots-Tag': 'noindex, nofollow',
          Location: '/admin',
          'Cache-Control': 'no-store',
        });
        res.end();
        return;
      }
      if (decodedPath === '/robots.txt') {
        const robots = 'User-agent: *\nDisallow: /\n';
        res.writeHead(200, {
          ...SECURITY_HEADERS,
          'Content-Type': 'text/plain; charset=utf-8',
          'Content-Length': Buffer.byteLength(robots),
          'Cache-Control': 'no-store',
        });
        res.end(req.method === 'HEAD' ? undefined : robots);
        return;
      }
      const isPortalRoute =
        decodedPath === '/admin' ||
        decodedPath === '/admin.html' ||
        decodedPath.startsWith('/admin/') ||
        decodedPath === '/reservation' ||
        decodedPath === '/reservations' ||
        decodedPath === '/manager' ||
        decodedPath === '/finance' ||
        decodedPath === '/owner';
      const allowedPortalPrefix =
        isPortalRoute ||
        decodedPath.startsWith('/_next/') ||
        decodedPath.startsWith('/logos/') ||
        decodedPath.startsWith('/images/') ||
        decodedPath === '/favicon.ico';
      if (!allowedPortalPrefix) {
        const reqHost = String(req.headers.host || 'localhost').split(':')[0];
        res.writeHead(302, {
          ...SECURITY_HEADERS,
          'X-Robots-Tag': 'noindex, nofollow',
          Location: `http://${reqHost}:${PORT}${rawUrl}`,
          'Cache-Control': 'no-store',
        });
        res.end();
        return;
      }
    }

    const redirectTarget = LEGACY_REDIRECTS.get(decodedPath);
    if (redirectTarget) {
      res.writeHead(301, {
        ...SECURITY_HEADERS,
        Location: `${redirectTarget}${queryStr}`,
        'Cache-Control': 'public, max-age=86400',
      });
      res.end();
      return;
    }

    const normalizedSub = (decodedPath === '/' ? '' : decodedPath).replace(/^\/+/, '');
    const lowerSub = normalizedSub.toLowerCase();

    if (
      normalizedSub.startsWith('.') ||
      normalizedSub.includes('/.') ||
      lowerSub.startsWith('data/') ||
      lowerSub.startsWith('.data/') ||
      lowerSub === 'server.js' ||
      lowerSub === 'package.json'
    ) {
      sendNotFound(res);
      return;
    }

    // Fast direct streaming for public videos & static HTML maps (preserves 206 byte ranges)
    if (lowerSub.startsWith('videos/') || lowerSub.startsWith('maps/')) {
      const publicTarget = path.resolve(PUBLIC_DIR, normalizedSub);
      if (publicTarget.startsWith(PUBLIC_PREFIX) && fs.existsSync(publicTarget) && fs.statSync(publicTarget).isFile()) {
        servePublicMediaFile(req, res, publicTarget);
        return;
      }
    }

    if (nextHandler) {
      for (const [k, v] of Object.entries(SECURITY_HEADERS)) {
        res.setHeader(k, v);
      }
      if (
        decodedPath === '/admin' ||
        decodedPath === '/admin.html' ||
        decodedPath === '/reservation' ||
        decodedPath === '/reservations' ||
        decodedPath === '/manager' ||
        decodedPath === '/finance' ||
        decodedPath === '/owner' ||
        decodedPath === '/thank-you'
      ) {
        res.setHeader('X-Robots-Tag', 'noindex, nofollow');
      }
      nextHandler(req, res).catch((err) => {
        console.error(`Next handler error on ${urlPath}:`, err.message);
        if (!res.headersSent) {
          res.writeHead(500, SECURITY_HEADERS);
          res.end('Internal Server Error');
        }
      });
      return;
    }

    // Static fallback when tests instantiate createAppServer() without booting Next
    const staticSub = normalizedSub || 'index.html';
    const candidateBase = path.resolve(STATIC_DIR, staticSub);
    if (candidateBase !== STATIC_DIR && !candidateBase.startsWith(STATIC_PREFIX)) {
      res.writeHead(403, SECURITY_HEADERS);
      res.end('Forbidden');
      return;
    }
    let resolvedFile = null;
    if (fs.existsSync(candidateBase) && fs.statSync(candidateBase).isFile()) {
      resolvedFile = candidateBase;
    } else if (
      (candidateBase + '.html').startsWith(STATIC_PREFIX) &&
      fs.existsSync(candidateBase + '.html') &&
      fs.statSync(candidateBase + '.html').isFile()
    ) {
      resolvedFile = candidateBase + '.html';
    }
    if (!resolvedFile) {
      sendNotFound(res);
      return;
    }
    const extraStaticHeaders =
      decodedPath === '/admin' || decodedPath === '/admin.html' || decodedPath === '/thank-you'
        ? { 'X-Robots-Tag': 'noindex, nofollow' }
        : {};
    const stat = fs.statSync(resolvedFile);
    const ext = path.extname(resolvedFile).toLowerCase();
    res.writeHead(200, {
      ...SECURITY_HEADERS,
      ...extraStaticHeaders,
      'Content-Type': MIME_TYPES[ext] || 'application/octet-stream',
      'Content-Length': stat.size,
      'Cache-Control': ext === '.html' ? 'no-cache' : 'public, max-age=604800',
    });
    if (req.method === 'HEAD') {
      res.end();
      return;
    }
    fs.createReadStream(resolvedFile).pipe(res);
  });
}

export function createAdminPortalServer(options = {}) {
  return createAppServer({ ...options, adminPortalOnly: true });
}

if (process.argv[1] === __filename) {
  (async () => {
    const isDev = process.argv.includes('--dev') || process.env.NEXT_DEV === '1';
    await dataStore.init();
    const { handler: nextHandler } = await prepareNextApp({ dev: isDev });
    const server = createAppServer({ nextHandler });
    server.listen(PORT, async () => {
      const emailCfg = getEmailConfig();
      const configured = await dataStore.isConfiguredAsync();
      console.log(
        `Public Website:  http://localhost:${PORT} (${isDev ? 'Next.js Dev Mode' : 'Dynamic Next.js SSR'})`
      );
      if (ADMIN_PORT && ADMIN_PORT !== PORT) {
        const adminServer = createAdminPortalServer({ nextHandler });
        adminServer.listen(ADMIN_PORT, () => {
          console.log(
            `Admin Portal:    http://localhost:${ADMIN_PORT} (dedicated portal; ${configured ? 'auth configured' : 'set ADMIN_PASSWORD in .env'})`
          );
        });
      } else {
        console.log(
          `Admin Portal:    http://localhost:${PORT}/admin (${configured ? 'auth configured' : 'set ADMIN_PASSWORD in .env'})`
        );
      }
      console.log(
        `Database engine: ${dataStore.engine === 'postgres' ? 'PostgreSQL (connected)' : 'Local .data/ fallback (set DATABASE_URL in .env for PostgreSQL)'}`
      );
      console.log(
        `Automatic email: ${emailCfg.configured ? `${emailCfg.provider.toUpperCase()} -> ${emailCfg.adminTo}` : 'not configured (set SMTP_PASS or RESEND_API_KEY in .env)'}`
      );
    });
  })().catch((err) => {
    console.error('Failed to start Yuevaan Travels server:', err);
    process.exit(1);
  });
}
