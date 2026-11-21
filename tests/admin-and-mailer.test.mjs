import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import http from 'http';
import net from 'net';
import os from 'os';
import {
  buildAdminNotificationEmail,
  buildGuestConfirmationEmail,
  getEmailConfig,
  sendInquiryEmails,
  sendTestNotificationEmail,
} from '../lib/mailer.js';
import { getBookingDateBounds } from '../lib/format.js';
import {
  computeBhutanBreakdown,
  computeDashboardAnalytics,
  computeFinanceSummary,
  computePortalAlerts,
  computeTeamPerformance,
  formatCsvCell,
} from '../lib/admin-analytics.js';
import {
  getDefaultSiteSettings,
  POSTGRES_SCHEMA_SQL,
  validateSiteSettingsPatch,
} from '../lib/db/schema.js';
import { normalizeRole } from '../lib/admin-store.js';

function startMockSmtpServer() {
  const received = [];
  const server = net.createServer((socket) => {
    let stage = 'cmd';
    let buffer = '';
    const session = { authUser: '', authPass: '', mailFrom: '', rcptTo: '', rawData: '' };

    socket.write('220 mock-smtp.local ESMTP Ready\r\n');

    socket.on('data', (chunk) => {
      buffer += chunk.toString('utf8');
      while (true) {
        if (stage === 'data') {
          const endIdx = buffer.indexOf('\r\n.\r\n');
          if (endIdx === -1) return;
          session.rawData = buffer.slice(0, endIdx);
          buffer = buffer.slice(endIdx + 5);
          received.push({ ...session });
          stage = 'cmd';
          socket.write('250 2.0.0 OK queued\r\n');
          continue;
        }

        const nl = buffer.indexOf('\r\n');
        if (nl === -1) return;
        const line = buffer.slice(0, nl);
        buffer = buffer.slice(nl + 2);

        if (stage === 'auth_user') {
          session.authUser = Buffer.from(line, 'base64').toString('utf8');
          stage = 'auth_pass';
          socket.write('334 UGFzc3dvcmQ6\r\n');
        } else if (stage === 'auth_pass') {
          session.authPass = Buffer.from(line, 'base64').toString('utf8');
          stage = 'cmd';
          socket.write('235 2.7.0 Authentication successful\r\n');
        } else if (line.startsWith('EHLO')) {
          socket.write('250-mock-smtp.local\r\n250 AUTH LOGIN\r\n');
        } else if (line === 'AUTH LOGIN') {
          stage = 'auth_user';
          socket.write('334 VXNlcm5hbWU6\r\n');
        } else if (line.startsWith('MAIL FROM:')) {
          session.mailFrom = line.slice('MAIL FROM:'.length).trim();
          socket.write('250 OK\r\n');
        } else if (line.startsWith('RCPT TO:')) {
          session.rcptTo = line.slice('RCPT TO:'.length).trim();
          socket.write('250 OK\r\n');
        } else if (line === 'DATA') {
          stage = 'data';
          socket.write('354 End data with <CR><LF>.<CR><LF>\r\n');
        } else if (line === 'QUIT') {
          socket.write('221 Bye\r\n');
          socket.end();
        } else {
          socket.write('250 OK\r\n');
        }
      }
    });
  });

  return new Promise((resolve) => {
    server.listen(0, '127.0.0.1', () => {
      resolve({ server, port: server.address().port, received });
    });
  });
}

function startMockResendServer() {
  const requests = [];
  const server = http.createServer((req, res) => {
    const chunks = [];
    req.on('data', (c) => chunks.push(c));
    req.on('end', () => {
      const bodyStr = Buffer.concat(chunks).toString('utf8');
      let json = null;
      try {
        json = JSON.parse(bodyStr);
      } catch {}
      requests.push({
        method: req.method,
        url: req.url,
        auth: req.headers.authorization || '',
        body: json,
      });
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ id: `re_msg_${requests.length}` }));
    });
  });

  return new Promise((resolve) => {
    server.listen(0, '127.0.0.1', () => {
      resolve({ server, port: server.address().port, requests });
    });
  });
}

test('lib/db/schema.js validates Bhutan statutory settings patches & defines all 6 PostgreSQL tables', () => {
  for (const tbl of ['site_settings', 'users', 'sessions', 'inquiries', 'email_logs', 'audit_logs']) {
    assert.ok(POSTGRES_SCHEMA_SQL.includes(`CREATE TABLE IF NOT EXISTS ${tbl}`), `Missing table ${tbl}`);
  }

  assert.equal(normalizeRole('agent'), 'reservation');
  assert.equal(normalizeRole('viewer_ops'), 'finance');
  assert.equal(normalizeRole('manager'), 'manager');
  assert.equal(normalizeRole('super_admin'), 'super_admin');

  const defaults = getDefaultSiteSettings();
  const { settings, diff } = validateSiteSettingsPatch(
    {
      fees: { sdf: { internationalUsdPerNight: 125, indianNuPerNight: 1400 }, visaUsd: 50 },
      licence: { number: '9999999' },
      slaHours: 12,
    },
    defaults
  );
  assert.equal(settings.fees.sdf.internationalUsdPerNight, 125);
  assert.equal(settings.fees.sdf.indianNuPerNight, 1400);
  assert.equal(settings.fees.visaUsd, 50);
  assert.equal(settings.licence.number, '9999999');
  assert.equal(settings.slaHours, 12);
  assert.deepEqual(diff['fees.sdf.internationalUsdPerNight'], { before: 100, after: 125 });

  assert.throws(
    () => validateSiteSettingsPatch({ fees: { sdf: { childAgeMin: 12, childAgeMax: 10 } } }, defaults),
    /less than/
  );
  assert.throws(
    () => validateSiteSettingsPatch({ fees: { sdf: { validUntil: 'bad-date' } } }, defaults),
    /YYYY-MM-DD/
  );
});

test('lib/mailer.js builds safe admin + guest emails with computed duration & estimatedAdultTotalUSD', () => {
  const rec = {
    reference: 'YBT-20261119-TEST',
    receivedAt: '2026-11-19T05:00:00.000Z',
    type: 'booking',
    tourSlug: 'owl-trek',
    tourTitle: 'Owl Trek Bumthang',
    startDate: '2027-04-05',
    endDate: '2027-04-16',
    adults: 2,
    children: 1,
    youngChildren: 0,
    estimatedAdultTotalUSD: 7900,
    fullName: '<script>Pema</script>',
    email: 'guest@example.com',
    phone: '+975 77611423',
    nationality: 'United Kingdom',
    dob: '1990-01-15',
    notes: 'Vegetarian meals please',
  };

  const adminMsg = buildAdminNotificationEmail(rec, 'pemachoda288@gmail.com');
  assert.equal(adminMsg.to, 'pemachoda288@gmail.com');
  assert.equal(adminMsg.replyTo, 'guest@example.com');
  assert.match(adminMsg.subject, /YBT-20261119-TEST/);
  assert.match(adminMsg.text, /12D\/11N/);
  assert.match(adminMsg.text, /US\$7,900/);
  assert.doesNotMatch(adminMsg.text, /undefined/);
  assert.match(adminMsg.html, /&lt;script&gt;Pema&lt;\/script&gt;/);
  assert.doesNotMatch(adminMsg.html, /<script>Pema<\/script>/);

  const guestMsg = buildGuestConfirmationEmail(rec, 'pemachoda288@gmail.com');
  assert.equal(guestMsg.to, 'guest@example.com');
  assert.equal(guestMsg.replyTo, 'pemachoda288@gmail.com');
  assert.match(guestMsg.text, /12 days/);
  assert.match(guestMsg.text, /US\$7,900/);
  assert.match(guestMsg.html, /wa\.me\/97577611423/);
  assert.doesNotMatch(guestMsg.text, /undefined/);
});

test('lib/mailer.js sends admin + guest emails via SMTP AUTH LOGIN', async () => {
  const mockSmtp = await startMockSmtpServer();
  try {
    const env = {
      SMTP_HOST: '127.0.0.1',
      SMTP_PORT: String(mockSmtp.port),
      SMTP_SECURE: 'false',
      SMTP_USER: 'pemachoda288@gmail.com',
      SMTP_PASS: 'app-pass-16chars',
      ADMIN_NOTIFICATION_EMAIL: 'pemachoda288@gmail.com',
      SEND_GUEST_CONFIRMATION: '1',
    };

    const cfg = getEmailConfig(env);
    assert.equal(cfg.configured, true);
    assert.equal(cfg.provider, 'smtp');

    const result = await sendInquiryEmails(
      {
        reference: 'YBT-20261119-SMTP',
        receivedAt: '2026-11-19T05:00:00.000Z',
        type: 'booking',
        tourTitle: 'Western Bhutan Highlights Tour',
        startDate: '2027-01-18',
        endDate: '2027-01-24',
        adults: 2,
        children: 0,
        youngChildren: 0,
        estimatedAdultTotalUSD: 4900,
        fullName: 'Pema Choda',
        email: 'traveller@example.com',
        phone: '+975 77611423',
        notes: 'Window seat preference',
      },
      env
    );

    assert.equal(result.status, 'sent');
    assert.equal(result.provider, 'smtp');
    assert.equal(result.adminSent, true);
    assert.equal(result.guestSent, true);
    assert.equal(mockSmtp.received.length, 2);

    const [adminMail, guestMail] = mockSmtp.received;
    assert.equal(adminMail.authUser, 'pemachoda288@gmail.com');
    assert.equal(adminMail.authPass, 'app-pass-16chars');
    assert.equal(adminMail.rcptTo, '<pemachoda288@gmail.com>');
    assert.match(adminMail.rawData, /Reply-To: traveller@example\.com/);
    assert.match(adminMail.rawData, /Subject: \[Yuevaan Booking\] YBT-20261119-SMTP/);

    assert.equal(guestMail.rcptTo, '<traveller@example.com>');
    assert.match(guestMail.rawData, /Reply-To: pemachoda288@gmail\.com/);
    assert.match(guestMail.rawData, /YBT-20261119-SMTP/);
  } finally {
    mockSmtp.server.close();
  }
});

test('lib/mailer.js sends via Resend HTTPS API when RESEND_API_KEY is configured', async () => {
  const mockResend = await startMockResendServer();
  try {
    const env = {
      RESEND_API_KEY: 're_test_secret_key',
      RESEND_API_URL: `http://127.0.0.1:${mockResend.port}/emails`,
      ADMIN_NOTIFICATION_EMAIL: 'pemachoda288@gmail.com',
      SEND_GUEST_CONFIRMATION: '0',
    };

    const result = await sendInquiryEmails(
      {
        reference: 'YBT-20261119-RSND',
        receivedAt: '2026-11-19T05:00:00.000Z',
        type: 'inquiry',
        fullName: 'Karma Dorji',
        email: 'karma@example.com',
        phone: '+975 17123456',
        dates: 'Oct 2027',
        party: 'Couple (2 adults)',
        notes: 'Interested in festivals',
      },
      env
    );

    assert.equal(result.status, 'sent');
    assert.equal(result.provider, 'resend');
    assert.equal(result.adminSent, true);
    assert.equal(result.guestSent, false);
    assert.equal(mockResend.requests.length, 1);
    assert.equal(mockResend.requests[0].auth, 'Bearer re_test_secret_key');
    assert.deepEqual(mockResend.requests[0].body.to, ['pemachoda288@gmail.com']);
    assert.equal(mockResend.requests[0].body.reply_to, 'karma@example.com');

    const testRes = await sendTestNotificationEmail(env);
    assert.equal(testRes.ok, true);
    assert.equal(testRes.provider, 'resend');
    assert.equal(mockResend.requests.length, 2);
  } finally {
    mockResend.server.close();
  }
});

test('lib/admin-analytics.js computes Bhutan SDF/visa breakdown, 6-chart series, team performance & finance summary', () => {
  const intlBooking = {
    reference: 'YBT-20261118-INTL',
    receivedAt: '2026-11-17T06:00:00.000Z',
    type: 'booking',
    status: 'new',
    assignedUserId: 'usr-res-1',
    tourSlug: 'owl-trek',
    tourTitle: 'Owl Trek Bumthang',
    startDate: '2026-11-26',
    endDate: '2026-12-07',
    adults: 2,
    children: 1,
    youngChildren: 1,
    estimatedAdultTotalUSD: 7900,
    nationality: 'United Kingdom',
    fullName: 'Alice Sterling',
    email: 'alice@example.com',
    emailStatus: 'sent',
    payment: { depositVerified: false, depositPaidUsd: 0 },
    checklist: { passportReceived: true, depositReceived: false },
  };

  const indianBooking = {
    reference: 'YBT-20261119-INDI',
    receivedAt: '2026-11-19T05:00:00.000Z',
    type: 'booking',
    status: 'confirmed',
    assignedUserId: 'usr-res-1',
    firstResponseAt: '2026-11-19T07:00:00.000Z',
    tourSlug: 'western-bhutan',
    tourTitle: 'Western Bhutan Highlights Tour',
    startDate: '2026-12-01',
    endDate: '2026-12-07',
    adults: 2,
    children: 1,
    youngChildren: 0,
    estimatedAdultTotalUSD: 4900,
    nationality: 'India',
    fullName: 'Rohan Sharma',
    email: 'rohan@example.com',
    emailStatus: 'failed',
    emailError: 'SMTP timeout',
    payment: { depositVerified: true, depositPaidUsd: 2000 },
    checklist: { passportReceived: true, depositReceived: true, sdfRemitted: false, visaApproved: false },
  };

  const intlBd = computeBhutanBreakdown(intlBooking);
  assert.equal(intlBd.nights, 11);
  assert.equal(intlBd.tariff, 'international');
  assert.equal(intlBd.sdfUsd, 2750);
  assert.equal(intlBd.visaUsd, 160);
  assert.equal(intlBd.estimatedAgencyNetUsd, 7900 - 2910);

  const indBd = computeBhutanBreakdown(indianBooking);
  assert.equal(indBd.tariff, 'indian');
  assert.equal(indBd.sdfNu, 18000);
  assert.equal(indBd.visaUsd, 0);
  assert.equal(indBd.depositPaidUsd, 2000);
  assert.equal(indBd.balanceDueUsd, 2900);

  const now = new Date('2026-11-19T12:00:00.000Z');
  const analytics = computeDashboardAnalytics([intlBooking, indianBooking], 30, now);
  assert.equal(analytics.kpis.total, 2);
  assert.equal(analytics.kpis.awaitingReply, 1);
  assert.equal(analytics.kpis.slaOverdueCount, 1);
  assert.equal(analytics.kpis.confirmedCount, 1);
  assert.equal(analytics.kpis.confirmedUsd, 4900);
  assert.equal(analytics.kpis.medianResponseHours, 2);

  const teamPerf = computeTeamPerformance([intlBooking, indianBooking], [
    { id: 'usr-res-1', name: 'Tenzin', role: 'reservation', roleLabel: 'Reservations' },
  ]);
  assert.equal(teamPerf.unassignedCount, 0);
  assert.equal(teamPerf.members[0].assigned, 2);
  assert.equal(teamPerf.members[0].confirmed, 1);
  assert.equal(teamPerf.members[0].avgResponseHours, 2);

  const fin = computeFinanceSummary([intlBooking, indianBooking]);
  assert.equal(fin.confirmedValueUsd, 4900);
  assert.equal(fin.totalDepositsUsd, 2000);
  assert.equal(fin.intlSdfPayableUsd, 2750);
  assert.equal(fin.indianSdfPayableNu, 18000);
  assert.equal(fin.visaPayableUsd, 160);
  assert.equal(fin.verifiedCount, 1);

  const alerts = computePortalAlerts([intlBooking, indianBooking], now);
  assert.equal(alerts.some((a) => a.category === 'sla' && a.reference === 'YBT-20261118-INTL'), true);
  assert.equal(alerts.some((a) => a.category === 'email' && a.reference === 'YBT-20261119-INDI'), true);
  assert.equal(alerts.some((a) => a.category === 'operations' && a.reference === 'YBT-20261119-INDI'), true);

  // Security F-06 regression: CSV formula triggers neutralized
  assert.equal(formatCsvCell('=CMD()'), `"'=CMD()"`);
  assert.equal(formatCsvCell('+1+1'), `"'+1+1"`);
  assert.equal(formatCsvCell('-2+3'), `"'-2+3"`);
  assert.equal(formatCsvCell('@SUM(A1)'), `"'@SUM(A1)"`);
  assert.equal(formatCsvCell('Alice "Bob"'), `"Alice ""Bob"""`);
});

test('4-Role RBAC, Owner Live Bhutan Rates (Dynamic SSR), Finance Deposit Gate, Manager Override & Portal Isolation', async () => {
  const tmpDataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'yuevaan-v2-suite-'));
  const mockResend = await startMockResendServer();

  process.env.DISABLE_DOTENV = '1';
  process.env.DATABASE_URL = '';
  process.env.INQUIRIES_DIR = tmpDataDir;
  process.env.INQUIRY_WEBHOOK_URL = '';
  process.env.TRUST_PROXY = '1';
  process.env.ADMIN_PASSWORD = '';
  process.env.RESEND_API_KEY = 're_v2_test_key';
  process.env.RESEND_API_URL = `http://127.0.0.1:${mockResend.port}/emails`;
  process.env.ADMIN_NOTIFICATION_EMAIL = 'owner@yuevaantravels.bt';
  process.env.SEND_GUEST_CONFIRMATION = '1';

  const { createAppServer, createAdminPortalServer, prepareNextApp } = await import(
    `../server.js?v2Suite=${Date.now()}`
  );
  const { app: nextApp, handler: nextHandler } = await prepareNextApp({ dev: false });
  const server = createAppServer({ nextHandler });
  const portal = createAdminPortalServer({ nextHandler });
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  await new Promise((resolve) => portal.listen(0, '127.0.0.1', resolve));
  const { port } = server.address();
  const { port: portalPort } = portal.address();

  const makeReq = (targetPort) => (method, urlPath, { headers = {}, body = null } = {}) =>
    new Promise((resolve, reject) => {
      const req = http.request({ host: '127.0.0.1', port: targetPort, path: urlPath, method, headers }, (res) => {
        const chunks = [];
        res.on('data', (c) => chunks.push(c));
        res.on('end', () => {
          const text = Buffer.concat(chunks).toString('utf8');
          let json = null;
          try {
            json = JSON.parse(text);
          } catch {}
          resolve({ status: res.statusCode, headers: res.headers, body: text, json });
        });
      });
      req.on('error', reject);
      if (body) req.write(body);
      req.end();
    });

  const request = makeReq(port);
  const portalRequest = makeReq(portalPort);

  try {
    // 1. Refuse login with 503 before ADMIN_PASSWORD is set
    const unconfSession = await request('GET', '/api/admin/session');
    assert.equal(unconfSession.status, 200);
    assert.equal(unconfSession.json.configured, false);
    assert.equal(unconfSession.json.authenticated, false);

    const unconfLogin = await request('POST', '/api/admin/login', {
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password: 'any' }),
    });
    assert.equal(unconfLogin.status, 503);

    // 2. Configure Owner password & sign in
    process.env.ADMIN_PASSWORD = 'owner-master-password';
    assert.equal((await request('GET', '/api/admin/inquiries')).status, 401);

    const ownerLogin = await request('POST', '/api/admin/login', {
      headers: { 'Content-Type': 'application/json', 'X-Forwarded-For': '198.51.100.50' },
      body: JSON.stringify({ password: 'owner-master-password' }),
    });
    assert.equal(ownerLogin.status, 200);
    assert.equal(ownerLogin.json.user.role, 'super_admin');
    const setCookie = String(ownerLogin.headers['set-cookie'] || '');
    assert.match(setCookie, /yuevaan_admin_session=/);
    assert.match(setCookie, /HttpOnly/i);
    const ownerCookie = setCookie.split(';')[0];

    // 3. Owner has NO booking enquiries inbox (403), HAS Executive Analytics (200) & Settings (200)
    const ownerInbox = await request('GET', '/api/admin/inquiries', { headers: { Cookie: ownerCookie } });
    assert.equal(ownerInbox.status, 403, 'Owner must NOT access individual booking enquiries inbox');

    const ownerAnalytics = await request('GET', '/api/admin/analytics?days=30', {
      headers: { Cookie: ownerCookie },
    });
    assert.equal(ownerAnalytics.status, 200);
    assert.equal(ownerAnalytics.json.analytics.upcomingDepartures.length, 0);
    assert.ok(ownerAnalytics.json.teamPerformance);
    assert.ok(ownerAnalytics.json.financeSummary);

    // Prevent disabling last active Owner
    const badDisableOwner = await request('PATCH', `/api/admin/users/${ownerLogin.json.user.id}`, {
      headers: { 'Content-Type': 'application/json', Cookie: ownerCookie },
      body: JSON.stringify({ active: false }),
    });
    assert.equal(badDisableOwner.status, 400);

    // 4. Owner edits Bhutan Statutory Rates & DoT Licence -> instant live update on dynamic public SSR pages!
    const patchRates = await request('PATCH', '/api/admin/settings', {
      headers: { 'Content-Type': 'application/json', Cookie: ownerCookie },
      body: JSON.stringify({
        fees: {
          sdf: { internationalUsdPerNight: 135, indianNuPerNight: 1500 },
          visaUsd: 45,
        },
        licence: { number: '9998888' },
      }),
    });
    assert.equal(patchRates.status, 200);
    assert.equal(patchRates.json.settings.fees.sdf.internationalUsdPerNight, 135);
    assert.equal(patchRates.json.diff['fees.sdf.internationalUsdPerNight'].after, 135);

    const pubSettings = await request('GET', '/api/public/settings');
    assert.equal(pubSettings.status, 200);
    assert.equal(pubSettings.json.fees.sdf.internationalUsdPerNight, 135);
    assert.equal(pubSettings.json.licence.number, '9998888');

    // Dynamic SSR check: /travel-guide & /legal reflect US$135 and Licence 9998888 immediately with zero rebuild!
    const livePlanTrip = await request('GET', '/travel-guide');
    assert.equal(livePlanTrip.status, 200);
    assert.match(livePlanTrip.body, /US\$135/);
    assert.match(livePlanTrip.body, /Nu\.\s*(?:<!--\s*-->)?1,500/);

    const liveLegal = await request('GET', '/legal');
    assert.equal(liveLegal.status, 200);
    assert.ok(liveLegal.body.includes('9998888'));
    assert.match(liveLegal.body, /US\$135/);

    // 5. Owner creates Desk Manager, Reservations #1, Reservations #2 (via legacy 'agent' alias), and Finance
    const createMgr = await request('POST', '/api/admin/users', {
      headers: { 'Content-Type': 'application/json', Cookie: ownerCookie },
      body: JSON.stringify({
        name: 'Karma Manager',
        email: 'karma@yuevaantravels.bt',
        role: 'manager',
        password: 'manager-pass-99',
      }),
    });
    assert.equal(createMgr.status, 201);
    assert.equal(createMgr.json.user.role, 'manager');

    const createRes1 = await request('POST', '/api/admin/users', {
      headers: { 'Content-Type': 'application/json', Cookie: ownerCookie },
      body: JSON.stringify({
        name: 'Tenzin Reservations',
        email: 'tenzin@yuevaantravels.bt',
        role: 'reservation',
        password: 'res1-password-99',
      }),
    });
    assert.equal(createRes1.status, 201);
    assert.equal(createRes1.json.user.role, 'reservation');

    const createRes2 = await request('POST', '/api/admin/users', {
      headers: { 'Content-Type': 'application/json', Cookie: ownerCookie },
      body: JSON.stringify({
        name: 'Dechen Reservations',
        email: 'dechen@yuevaantravels.bt',
        role: 'agent', // legacy alias auto-migrates to 'reservation'
        password: 'res2-password-99',
      }),
    });
    assert.equal(createRes2.status, 201);
    assert.equal(createRes2.json.user.role, 'reservation');

    const createFin = await request('POST', '/api/admin/users', {
      headers: { 'Content-Type': 'application/json', Cookie: ownerCookie },
      body: JSON.stringify({
        name: 'Sonam Finance',
        email: 'sonam@yuevaantravels.bt',
        role: 'finance',
        password: 'finance-pass-88',
      }),
    });
    assert.equal(createFin.status, 201);
    assert.equal(createFin.json.user.role, 'finance');

    // 6. Submit 2 public bookings -> automatic emails sent via mock Resend
    const bounds = getBookingDateBounds();
    const submitBooking = (name, email, ip) =>
      request('POST', '/api/inquiries', {
        headers: { 'Content-Type': 'application/json', 'X-Forwarded-For': ip },
        body: JSON.stringify({
          type: 'booking',
          tourSlug: 'druk-path-trek',
          startDate: bounds.defaultStart,
          adults: 2,
          children: 0,
          youngChildren: 0,
          fullName: name,
          email,
          dob: '1991-03-20',
          nationality: 'Australia',
          phoneCode: '+61',
          phoneNumber: '412345678',
          notes: 'Gluten-free meals',
          agreeTerms: true,
          website: '',
        }),
      });

    const b1 = await submitBooking('Clara Bennett', 'clara@example.com', '198.51.100.51');
    const b2 = await submitBooking('Liam Patel', 'liam@example.com', '198.51.100.52');
    assert.equal(b1.status, 201);
    assert.equal(b2.status, 201);
    const ref1 = b1.json.reference;
    const ref2 = b2.json.reference;

    // Sign in all 4 staff accounts
    const loginStaff = async (email, password, ip) => {
      const r = await request('POST', '/api/admin/login', {
        headers: { 'Content-Type': 'application/json', 'X-Forwarded-For': ip },
        body: JSON.stringify({ email, password }),
      });
      assert.equal(r.status, 200);
      return String(r.headers['set-cookie']).split(';')[0];
    };

    const mgrCookie = await loginStaff('karma@yuevaantravels.bt', 'manager-pass-99', '198.51.100.60');
    const res1Cookie = await loginStaff('tenzin@yuevaantravels.bt', 'res1-password-99', '198.51.100.61');
    const res2Cookie = await loginStaff('dechen@yuevaantravels.bt', 'res2-password-99', '198.51.100.62');
    const finCookie = await loginStaff('sonam@yuevaantravels.bt', 'finance-pass-88', '198.51.100.63');

    // Wait briefly for async email logging
    for (let i = 0; i < 20; i++) {
      const logsRes = await request('GET', '/api/admin/email-logs', { headers: { Cookie: mgrCookie } });
      if (logsRes.json?.logs?.length >= 4) break;
      await new Promise((r) => setTimeout(r, 40));
    }

    // 7. Reservations #1 claims ref1 -> Reservations #2 can no longer access/claim ref1 (scalable 1 -> N seats!)
    const claimRes = await request('POST', `/api/admin/inquiries/${ref1}/claim`, {
      headers: { Cookie: res1Cookie },
    });
    assert.equal(claimRes.status, 200);
    assert.equal(claimRes.json.inquiry.assignedUserId, createRes1.json.user.id);

    const res2List = await request('GET', '/api/admin/inquiries', { headers: { Cookie: res2Cookie } });
    assert.equal(res2List.status, 200);
    assert.equal(res2List.json.inquiries.some((x) => x.reference === ref1), false, 'Claimed lead hidden from other Reservations staff');
    assert.equal(res2List.json.inquiries.some((x) => x.reference === ref2), true, 'Unassigned lead visible to Reservations #2');

    const res2Steal = await request('POST', `/api/admin/inquiries/${ref1}/claim`, {
      headers: { Cookie: res2Cookie },
    });
    assert.equal(res2Steal.status, 409);

    // RBAC checks for Reservations #1
    assert.equal((await request('GET', '/api/admin/users', { headers: { Cookie: res1Cookie } })).status, 403);
    assert.equal((await request('GET', '/api/admin/audit-logs', { headers: { Cookie: res1Cookie } })).status, 403);
    assert.equal((await request('PATCH', '/api/admin/settings', { headers: { 'Content-Type': 'application/json', Cookie: res1Cookie }, body: JSON.stringify({ slaHours: 10 }) })).status, 403);
    assert.equal((await request('DELETE', `/api/admin/inquiries/${ref1}`, { headers: { Cookie: res1Cookie } })).status, 403);

    // Reservations quotes ref1 and updates passport checklist
    const quotePatch = await request('PATCH', `/api/admin/inquiries/${ref1}`, {
      headers: { 'Content-Type': 'application/json', Cookie: res1Cookie },
      body: JSON.stringify({
        status: 'quoted',
        quoteOverride: { finalQuotedUsd: 4600 },
        checklist: { passportReceived: true, depositReceived: true }, // depositReceived ignored for Reservations
      }),
    });
    assert.equal(quotePatch.status, 200);
    assert.equal(quotePatch.json.inquiry.status, 'quoted');
    assert.equal(quotePatch.json.inquiry.checklist.passportReceived, true);
    assert.equal(quotePatch.json.inquiry.checklist.depositReceived, false, 'Reservations cannot self-verify deposit');

    // 8. 2-STEP CONFIRMATION RULE: Reservations CANNOT confirm before Finance verifies deposit
    const blockedConfirm = await request('PATCH', `/api/admin/inquiries/${ref1}`, {
      headers: { 'Content-Type': 'application/json', Cookie: res1Cookie },
      body: JSON.stringify({ status: 'confirmed' }),
    });
    assert.equal(blockedConfirm.status, 400);
    assert.equal(blockedConfirm.json.error.code, 'DEPOSIT_NOT_VERIFIED');

    // Finance cannot directly change booking status or edit settings
    assert.equal(
      (
        await request('PATCH', `/api/admin/inquiries/${ref1}`, {
          headers: { 'Content-Type': 'application/json', Cookie: finCookie },
          body: JSON.stringify({ status: 'confirmed' }),
        })
      ).status,
      403
    );

    // Finance verifies deposit + marks SDF remitted
    const finVerify = await request('PATCH', `/api/admin/inquiries/${ref1}/payment`, {
      headers: { 'Content-Type': 'application/json', Cookie: finCookie },
      body: JSON.stringify({
        depositVerified: true,
        depositPaidUsd: 1500,
        paymentMethod: 'Bank of Bhutan Wire',
        wireReference: 'BOB-2026-901',
        sdfRemitted: true,
      }),
    });
    assert.equal(finVerify.status, 200);
    assert.equal(finVerify.json.inquiry.payment.depositVerified, true);
    assert.equal(finVerify.json.inquiry.payment.depositPaidUsd, 1500);
    assert.equal(finVerify.json.inquiry.checklist.depositReceived, true);
    assert.equal(finVerify.json.inquiry.checklist.sdfRemitted, true);

    // Now Reservations #1 CAN confirm ref1!
    const unlockedConfirm = await request('PATCH', `/api/admin/inquiries/${ref1}`, {
      headers: { 'Content-Type': 'application/json', Cookie: res1Cookie },
      body: JSON.stringify({ status: 'confirmed' }),
    });
    assert.equal(unlockedConfirm.status, 200);
    assert.equal(unlockedConfirm.json.inquiry.status, 'confirmed');

    // 9. DESK MANAGER AUDITED CONFIRMATION OVERRIDE on unverified ref2
    const mgrNoOverride = await request('PATCH', `/api/admin/inquiries/${ref2}`, {
      headers: { 'Content-Type': 'application/json', Cookie: mgrCookie },
      body: JSON.stringify({ status: 'confirmed' }),
    });
    assert.equal(mgrNoOverride.status, 400);
    assert.equal(mgrNoOverride.json.error.code, 'DEPOSIT_NOT_VERIFIED');

    const mgrShortReason = await request('PATCH', `/api/admin/inquiries/${ref2}`, {
      headers: { 'Content-Type': 'application/json', Cookie: mgrCookie },
      body: JSON.stringify({ status: 'confirmed', overrideConfirm: true, overrideReason: 'ok' }),
    });
    assert.equal(mgrShortReason.status, 400);
    assert.equal(mgrShortReason.json.error.code, 'OVERRIDE_REASON_REQUIRED');

    const mgrOverrideOk = await request('PATCH', `/api/admin/inquiries/${ref2}`, {
      headers: { 'Content-Type': 'application/json', Cookie: mgrCookie },
      body: JSON.stringify({
        status: 'confirmed',
        overrideConfirm: true,
        overrideReason: 'VIP repeat guest — Bank of Bhutan SWIFT wire receipt confirmed',
      }),
    });
    assert.equal(mgrOverrideOk.status, 200);
    assert.equal(mgrOverrideOk.json.inquiry.status, 'confirmed');
    assert.equal(mgrOverrideOk.json.inquiry.confirmationOverride.used, true);

    // 10. Audit log, Backup, Session revocation & Manager Privacy Delete
    const auditRes = await request('GET', '/api/admin/audit-logs', { headers: { Cookie: ownerCookie } });
    assert.equal(auditRes.status, 200);
    assert.ok(auditRes.json.logs.some((a) => a.action === 'settings_updated'));
    assert.ok(auditRes.json.logs.some((a) => a.action === 'finance_payment_updated'));
    assert.ok(auditRes.json.logs.some((a) => a.action === 'manager_confirm_override'));

    const backupRes = await request('GET', '/api/admin/backup', { headers: { Cookie: ownerCookie } });
    assert.equal(backupRes.status, 200);
    assert.equal(backupRes.body.includes('passwordHash'), false);
    assert.equal(backupRes.body.includes('passwordSalt'), false);
    assert.equal(backupRes.json.inquiries.length, 2);

    // Revoke Reservations #1 session -> immediate 401
    const sessionsRes = await request('GET', '/api/admin/sessions', { headers: { Cookie: ownerCookie } });
    const res1Sess = sessionsRes.json.sessions.find((s) => s.userEmail === 'tenzin@yuevaantravels.bt');
    assert.ok(res1Sess);
    assert.equal((await request('DELETE', `/api/admin/sessions/${res1Sess.id}`, { headers: { Cookie: ownerCookie } })).status, 200);
    assert.equal((await request('GET', '/api/admin/inquiries', { headers: { Cookie: res1Cookie } })).status, 401);

    // Manager deletes ref2 (privacy purge)
    const delRes = await request('DELETE', `/api/admin/inquiries/${ref2}`, { headers: { Cookie: mgrCookie } });
    assert.equal(delRes.status, 200);

    // 11. Dedicated Admin Portal server isolation checks
    const rootRes = await portalRequest('GET', '/');
    assert.equal(rootRes.status, 302);
    assert.equal(rootRes.headers.location, '/admin');

    const adminRes = await portalRequest('GET', '/admin');
    assert.equal(adminRes.status, 200);
    assert.equal(adminRes.headers['x-robots-tag'], 'noindex, nofollow');
    assert.match(adminRes.body, /Yuevaan Admin Portal/);
    assert.equal(adminRes.body.includes('class="site-header"'), false);
    assert.equal(adminRes.body.includes('class="site-footer"'), false);

    const robotsRes = await portalRequest('GET', '/robots.txt');
    assert.equal(robotsRes.status, 200);
    assert.match(robotsRes.body, /Disallow: \//);

    const touristRes = await portalRequest('GET', '/tours');
    assert.equal(touristRes.status, 302);
    assert.match(touristRes.headers.location, /\/tours$/);

    const metaLeak = await request('GET', '/.data/inquiry-meta.json');
    assert.equal(metaLeak.status, 404);

    // 12. Security regression tests (F-01, F-02, F-03, F-04)
    // F-01: Cross-origin / null-origin Admin mutations rejected with 403; non-JSON Content-Type rejected with 415
    assert.equal(
      (
        await request('POST', '/api/admin/logout', {
          headers: { Origin: 'https://evil.example', Cookie: ownerCookie },
        })
      ).status,
      403
    );
    assert.equal(
      (
        await request('POST', '/api/admin/test-email', {
          headers: { Origin: 'null', Cookie: ownerCookie },
        })
      ).status,
      403
    );
    assert.equal(
      (
        await request('PATCH', '/api/admin/settings', {
          headers: { 'Content-Type': 'text/plain', Cookie: ownerCookie },
          body: JSON.stringify({ slaHours: 12 }),
        })
      ).status,
      415
    );

    // F-02: Password reset revokes active staff sessions immediately; self password change revokes peer sessions
    const finBeforeReset = await request('GET', '/api/admin/inquiries', { headers: { Cookie: finCookie } });
    assert.equal(finBeforeReset.status, 200);
    assert.equal(
      (
        await request('PATCH', `/api/admin/users/${createFin.json.user.id}`, {
          headers: { 'Content-Type': 'application/json', Cookie: ownerCookie },
          body: JSON.stringify({ password: 'new-finance-pass-99' }),
        })
      ).status,
      200
    );
    const finAfterReset = await request('GET', '/api/admin/inquiries', { headers: { Cookie: finCookie } });
    assert.equal(finAfterReset.status, 401);

    const mgrSessA = await loginStaff('karma@yuevaantravels.bt', 'manager-pass-99', '198.51.100.70');
    const mgrSessB = await loginStaff('karma@yuevaantravels.bt', 'manager-pass-99', '198.51.100.71');
    assert.equal(
      (
        await request('POST', '/api/admin/account/password', {
          headers: { 'Content-Type': 'application/json', Cookie: mgrSessB },
          body: JSON.stringify({ currentPassword: 'manager-pass-99', newPassword: 'manager-pass-100' }),
        })
      ).status,
      200
    );
    assert.equal((await request('GET', '/api/admin/inquiries', { headers: { Cookie: mgrSessA } })).status, 401);
    assert.equal((await request('GET', '/api/admin/inquiries', { headers: { Cookie: mgrSessB } })).status, 200);

    // F-03: Per-account login brute-force throttling even across rotated X-Forwarded-For IPs
    for (let i = 0; i < 10; i++) {
      const failR = await request('POST', '/api/admin/login', {
        headers: { 'Content-Type': 'application/json', 'X-Forwarded-For': `203.0.114.${10 + i}` },
        body: JSON.stringify({ email: 'sonam@yuevaantravels.bt', password: 'wrong-password' }),
      });
      assert.equal(failR.status, 401);
    }
    const lockedByAcct = await request('POST', '/api/admin/login', {
      headers: { 'Content-Type': 'application/json', 'X-Forwarded-For': '203.0.114.99' },
      body: JSON.stringify({ email: 'sonam@yuevaantravels.bt', password: 'new-finance-pass-99' }),
    });
    assert.equal(lockedByAcct.status, 429);

    // F-04: Session signing key uses random .session-key instead of deterministic sha256(ADMIN_PASSWORD)
    const sessionKeyPath = path.join(tmpDataDir, '.session-key');
    assert.equal(fs.existsSync(sessionKeyPath), true);
    assert.match(fs.readFileSync(sessionKeyPath, 'utf8').trim(), /^[0-9a-f]{64}$/);
  } finally {
    server.close();
    portal.close();
    mockResend.server.close();
    await nextApp.close();
    fs.rmSync(tmpDataDir, { recursive: true, force: true });
  }
});
