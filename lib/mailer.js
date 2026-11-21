import fs from 'fs';
import net from 'net';
import tls from 'tls';
import { site } from '../data/site.js';
import { formatDisplayDate, formatUSD } from './format.js';

export function loadEnvFile(envPath) {
  if (!envPath || !fs.existsSync(envPath)) return;
  let content = '';
  try {
    content = fs.readFileSync(envPath, 'utf8');
  } catch {
    return;
  }
  const lines = content.split(/\r?\n/);
  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;
    const eqIdx = line.indexOf('=');
    if (eqIdx === -1) continue;
    const key = line.slice(0, eqIdx).trim();
    if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(key)) continue;
    if (process.env[key] !== undefined && process.env[key] !== '') continue;
    let val = line.slice(eqIdx + 1).trim();
    if (
      (val.startsWith('"') && val.endsWith('"') && val.length >= 2) ||
      (val.startsWith("'") && val.endsWith("'") && val.length >= 2)
    ) {
      val = val.slice(1, -1);
    }
    process.env[key] = val;
  }
}

function cleanHeaderValue(value) {
  return String(value || '')
    .replace(/[\r\n]+/g, ' ')
    .trim();
}

function extractAddress(fromOrAddr) {
  const cleaned = cleanHeaderValue(fromOrAddr);
  const match = cleaned.match(/<([^<>]+)>/);
  return (match ? match[1] : cleaned).trim();
}

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function formatBttTimestamp(iso) {
  try {
    const dt = new Date(iso || Date.now());
    const btt = new Date(dt.getTime() + 6 * 3600 * 1000);
    return `${btt.toISOString().slice(0, 16).replace('T', ' ')} BTT`;
  } catch {
    return String(iso || '');
  }
}

export function getEmailConfig(env = process.env) {
  const resendApiKey = (env.RESEND_API_KEY || '').trim();
  const smtpHost = (env.SMTP_HOST || '').trim();
  const smtpPort = Number(env.SMTP_PORT || 465);
  const smtpSecureRaw = String(env.SMTP_SECURE ?? '').trim().toLowerCase();
  const smtpSecure = smtpSecureRaw ? smtpSecureRaw !== 'false' && smtpSecureRaw !== '0' : smtpPort === 465;
  const smtpUser = (env.SMTP_USER || '').trim();
  const smtpPass = (env.SMTP_PASS || '').trim();
  const adminTo = (env.ADMIN_NOTIFICATION_EMAIL || '').trim() || smtpUser;
  const sendGuestCopy = !['0', 'false', 'no'].includes(
    String(env.SEND_GUEST_CONFIRMATION ?? '1').trim().toLowerCase()
  );

  let provider = 'none';
  if (resendApiKey) {
    provider = 'resend';
  } else if (smtpHost && smtpUser && smtpPass) {
    provider = 'smtp';
  } else if (smtpHost && (smtpHost === '127.0.0.1' || smtpHost === 'localhost') && !smtpSecure) {
    provider = 'smtp';
  }

  const defaultFrom =
    provider === 'smtp' && smtpUser
      ? `${site.name} <${smtpUser}>`
      : `${site.name} <onboarding@resend.dev>`;
  const from = (env.EMAIL_FROM || '').trim() || defaultFrom;

  return {
    configured: provider !== 'none' && Boolean(adminTo),
    provider,
    adminTo,
    from,
    sendGuestCopy,
    resendApiKey,
    resendApiUrl: (env.RESEND_API_URL || 'https://api.resend.com/emails').trim(),
    smtp: {
      host: smtpHost,
      port: Number.isFinite(smtpPort) && smtpPort > 0 ? smtpPort : 465,
      secure: smtpSecure,
      user: smtpUser,
      pass: smtpPass,
    },
  };
}

function buildMimeMessage({ from, to, replyTo, subject, text, html }) {
  const boundary = `ybt_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
  const headers = [
    `From: ${cleanHeaderValue(from)}`,
    `To: ${cleanHeaderValue(to)}`,
    replyTo ? `Reply-To: ${cleanHeaderValue(replyTo)}` : null,
    `Subject: ${cleanHeaderValue(subject)}`,
    `Date: ${new Date().toUTCString()}`,
    `Message-ID: <${Date.now()}.${Math.random().toString(36).slice(2)}@yuevaantravels.bt>`,
    'MIME-Version: 1.0',
    `Content-Type: multipart/alternative; boundary="${boundary}"`,
  ].filter(Boolean);

  const body = [
    `--${boundary}`,
    'Content-Type: text/plain; charset=utf-8',
    'Content-Transfer-Encoding: base64',
    '',
    Buffer.from(text, 'utf8').toString('base64').replace(/.{1,76}/g, '$&\r\n').trim(),
    `--${boundary}`,
    'Content-Type: text/html; charset=utf-8',
    'Content-Transfer-Encoding: base64',
    '',
    Buffer.from(html, 'utf8').toString('base64').replace(/.{1,76}/g, '$&\r\n').trim(),
    `--${boundary}--`,
  ].join('\r\n');

  return `${headers.join('\r\n')}\r\n\r\n${body}`;
}

function createSmtpReader(socket) {
  let buffer = '';
  const waiters = [];
  let closedError = null;

  const flush = () => {
    while (waiters.length > 0) {
      const lines = buffer.split('\r\n');
      if (lines.length < 2) return;
      let completeIdx = -1;
      for (let i = 0; i < lines.length - 1; i++) {
        if (/^\d{3} /.test(lines[i])) {
          completeIdx = i;
          break;
        }
      }
      if (completeIdx === -1) return;
      const chunkLines = lines.slice(0, completeIdx + 1);
      buffer = lines.slice(completeIdx + 1).join('\r\n');
      const fullText = chunkLines.join('\n');
      const code = Number(chunkLines[chunkLines.length - 1].slice(0, 3));
      const next = waiters.shift();
      next.resolve({ code, text: fullText });
    }
  };

  const onData = (chunk) => {
    buffer += chunk.toString('utf8');
    flush();
  };

  const onError = (err) => {
    closedError = err;
    while (waiters.length > 0) {
      waiters.shift().reject(err);
    }
  };

  const onClose = () => {
    if (!closedError) closedError = new Error('SMTP connection closed unexpectedly.');
    while (waiters.length > 0) {
      waiters.shift().reject(closedError);
    }
  };

  socket.on('data', onData);
  socket.on('error', onError);
  socket.on('close', onClose);

  return {
    readResponse() {
      if (closedError) return Promise.reject(closedError);
      return new Promise((resolve, reject) => {
        waiters.push({ resolve, reject });
        flush();
      });
    },
    detach() {
      socket.off('data', onData);
      socket.off('error', onError);
      socket.off('close', onClose);
    },
  };
}

async function sendViaSmtp(config, message) {
  const { host, port, secure, user, pass } = config.smtp;
  const timeoutMs = 12000;

  let socket = await new Promise((resolve, reject) => {
    const conn = secure
      ? tls.connect({ host, port, servername: host })
      : net.connect({ host, port });
    const onErr = (err) => {
      conn.destroy();
      reject(err);
    };
    conn.setTimeout(timeoutMs, () => {
      conn.destroy();
      reject(new Error(`SMTP connection timed out (${host}:${port})`));
    });
    conn.once('error', onErr);
    conn.once(secure ? 'secureConnect' : 'connect', () => {
      conn.off('error', onErr);
      resolve(conn);
    });
  });

  let reader = createSmtpReader(socket);

  const sendCommand = async (cmd, expectedCodes) => {
    socket.write(`${cmd}\r\n`);
    const res = await reader.readResponse();
    if (!expectedCodes.includes(res.code)) {
      throw new Error(`SMTP error on "${cmd.split(' ')[0]}": ${res.code} ${res.text}`);
    }
    return res;
  };

  try {
    const greeting = await reader.readResponse();
    if (greeting.code !== 220) {
      throw new Error(`SMTP greeting rejected: ${greeting.code} ${greeting.text}`);
    }

    let ehlo = await sendCommand('EHLO yuevaantravels.bt', [250]);

    if (!secure && /STARTTLS/i.test(ehlo.text)) {
      await sendCommand('STARTTLS', [220]);
      reader.detach();
      socket = await new Promise((resolve, reject) => {
        const tlsSocket = tls.connect({ socket, servername: host });
        tlsSocket.setTimeout(timeoutMs, () => {
          tlsSocket.destroy();
          reject(new Error('SMTP STARTTLS timed out'));
        });
        tlsSocket.once('error', reject);
        tlsSocket.once('secureConnect', () => resolve(tlsSocket));
      });
      reader = createSmtpReader(socket);
      ehlo = await sendCommand('EHLO yuevaantravels.bt', [250]);
    }

    if (user && pass) {
      await sendCommand('AUTH LOGIN', [334]);
      await sendCommand(Buffer.from(user, 'utf8').toString('base64'), [334]);
      await sendCommand(Buffer.from(pass, 'utf8').toString('base64'), [235]);
    }

    const fromAddr = extractAddress(message.from);
    const toAddr = extractAddress(message.to);
    await sendCommand(`MAIL FROM:<${fromAddr}>`, [250]);
    await sendCommand(`RCPT TO:<${toAddr}>`, [250, 251]);
    await sendCommand('DATA', [354]);

    const mime = buildMimeMessage(message);
    const dotStuffed = mime.replace(/\r?\n/g, '\r\n').replace(/^\./gm, '..');
    socket.write(`${dotStuffed}\r\n.\r\n`);
    const dataRes = await reader.readResponse();
    if (dataRes.code !== 250) {
      throw new Error(`SMTP DATA rejected: ${dataRes.code} ${dataRes.text}`);
    }

    try {
      await sendCommand('QUIT', [221]);
    } catch {}
  } finally {
    reader.detach();
    socket.end();
    socket.destroy();
  }
}

async function sendViaResend(config, message) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 12000);
  try {
    const res = await fetch(config.resendApiUrl, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${config.resendApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: cleanHeaderValue(message.from),
        to: [extractAddress(message.to)],
        reply_to: message.replyTo ? extractAddress(message.replyTo) : undefined,
        subject: cleanHeaderValue(message.subject),
        text: message.text,
        html: message.html,
      }),
      signal: controller.signal,
    });
    if (!res.ok) {
      const errBody = await res.text().catch(() => '');
      throw new Error(`Resend HTTP ${res.status}: ${errBody.slice(0, 200)}`);
    }
  } finally {
    clearTimeout(timer);
  }
}

export async function sendMailMessage(message, env = process.env) {
  const config = getEmailConfig(env);
  if (config.provider === 'none') {
    throw new Error('Email transport is not configured.');
  }
  const fullMessage = {
    ...message,
    from: message.from || config.from,
  };
  if (config.provider === 'resend') {
    await sendViaResend(config, fullMessage);
  } else {
    await sendViaSmtp(config, fullMessage);
  }
}

function buildPartyLabel(record) {
  if (record.type !== 'booking') return record.party || 'Not specified';
  const parts = [`${record.adults} adult${record.adults > 1 ? 's' : ''}`];
  if (record.children > 0) parts.push(`${record.children} child${record.children > 1 ? 'ren' : ''}`);
  if (record.youngChildren > 0) {
    parts.push(`${record.youngChildren} young child${record.youngChildren > 1 ? 'ren' : ''}`);
  }
  return parts.join(', ');
}

function phoneDigits(phone) {
  return String(phone || '').replace(/[^\d]/g, '');
}

function getBookingDuration(record) {
  if (Number.isFinite(record.days) && Number.isFinite(record.nights)) {
    return { days: record.days, nights: record.nights };
  }
  if (record.startDate && record.endDate) {
    const startMs = Date.parse(`${record.startDate}T00:00:00Z`);
    const endMs = Date.parse(`${record.endDate}T00:00:00Z`);
    if (Number.isFinite(startMs) && Number.isFinite(endMs) && endMs >= startMs) {
      const nights = Math.round((endMs - startMs) / 86400000);
      return { days: nights + 1, nights };
    }
  }
  return null;
}

function getBookingEstimatedUsd(record) {
  if (Number.isFinite(record.estimatedAdultTotalUSD)) return record.estimatedAdultTotalUSD;
  if (Number.isFinite(record.estimatedTotalUsd)) return record.estimatedTotalUsd;
  return null;
}

export function buildAdminNotificationEmail(record, adminTo, siteConfig = site) {
  const isBooking = record.type === 'booking';
  const subject = isBooking
    ? `[Yuevaan Booking] ${record.reference} — ${record.tourTitle} (${record.fullName})`
    : `[Yuevaan Inquiry] ${record.reference} — ${record.fullName}`;

  const partyLabel = buildPartyLabel(record);
  const duration = isBooking ? getBookingDuration(record) : null;
  const datesLabel = isBooking
    ? `${formatDisplayDate(record.startDate)} – ${formatDisplayDate(record.endDate)}${duration ? ` (${duration.days}D/${duration.nights}N)` : ''}`
    : record.dates || 'Flexible / not specified';
  const estUsd = isBooking ? getBookingEstimatedUsd(record) : null;
  const estimatedLabel = estUsd !== null ? formatUSD(estUsd) : null;
  const digits = phoneDigits(record.phone);
  const guestWaUrl = digits.length >= 7 ? `https://wa.me/${digits}` : '';

  const rows = [
    ['Reference', record.reference],
    ['Request Type', isBooking ? 'Tour Booking Request' : 'General Travel Inquiry'],
    ['Received', formatBttTimestamp(record.receivedAt)],
    isBooking ? ['Tour', record.tourTitle] : null,
    ['Travel Dates', datesLabel],
    ['Travellers', partyLabel],
    estimatedLabel ? ['Estimated Adult Subtotal', estimatedLabel] : null,
    ['Lead Traveller', record.fullName],
    ['Email', record.email],
    ['Phone / WhatsApp', record.phone || 'Not provided'],
    record.nationality ? ['Nationality', record.nationality] : null,
    record.dob ? ['Date of Birth', record.dob] : null,
    ['Notes', record.notes || 'None'],
  ].filter(Boolean);

  const text = [
    `New ${isBooking ? 'Booking Request' : 'Inquiry'} — ${siteConfig.name}`,
    '='.repeat(48),
    ...rows.map(([k, v]) => `${k}: ${v}`),
    '',
    guestWaUrl ? `WhatsApp Guest: ${guestWaUrl}` : null,
    `Reply directly to this email to answer ${record.fullName} (${record.email}).`,
  ]
    .filter((x) => x !== null)
    .join('\n');

  const htmlRows = rows
    .map(
      ([label, val]) =>
        `<tr><td style="padding:10px 14px;border-bottom:1px solid #E7E1D8;color:#5B6577;font-size:13px;font-weight:600;width:190px;vertical-align:top;">${escapeHtml(label)}</td><td style="padding:10px 14px;border-bottom:1px solid #E7E1D8;color:#0F172A;font-size:14px;white-space:pre-wrap;">${escapeHtml(val)}</td></tr>`
    )
    .join('');

  const html = `<!DOCTYPE html>
<html lang="en">
<body style="margin:0;padding:24px;background:#FAF8F5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;color:#0F172A;">
  <div style="max-width:640px;margin:0 auto;background:#FFFFFF;border:1px solid #E7E1D8;border-radius:16px;overflow:hidden;">
    <div style="background:#0F172A;color:#FAF8F5;padding:22px 26px;">
      <div style="font-size:11px;letter-spacing:0.14em;text-transform:uppercase;color:#C9D1DC;">${escapeHtml(siteConfig.name)} · Thimphu Desk</div>
      <h1 style="margin:6px 0 0;font-size:22px;font-weight:700;color:#FAF8F5;">${isBooking ? 'New Booking Request' : 'New Travel Inquiry'} · ${escapeHtml(record.reference)}</h1>
    </div>
    <div style="padding:22px 26px;">
      <table style="width:100%;border-collapse:collapse;">${htmlRows}</table>
      <div style="margin-top:22px;display:flex;gap:12px;flex-wrap:wrap;">
        <a href="mailto:${encodeURIComponent(record.email)}?subject=${encodeURIComponent(`Re: ${record.reference} — ${siteConfig.name}`)}" style="display:inline-block;padding:11px 18px;border-radius:999px;background:#0067B1;color:#FFFFFF;text-decoration:none;font-size:14px;font-weight:600;">Reply to Guest</a>
        ${guestWaUrl ? `<a href="${guestWaUrl}" style="display:inline-block;padding:11px 18px;border-radius:999px;background:#15803D;color:#FFFFFF;text-decoration:none;font-size:14px;font-weight:600;margin-left:8px;">WhatsApp Guest</a>` : ''}
      </div>
    </div>
  </div>
</body>
</html>`;

  return {
    to: adminTo,
    replyTo: record.email,
    subject,
    text,
    html,
  };
}

export function buildGuestConfirmationEmail(record, replyToEmail, siteConfig = site) {
  const isBooking = record.type === 'booking';
  const subject = `We received your Bhutan travel request (${record.reference}) — ${siteConfig.name}`;
  const partyLabel = buildPartyLabel(record);
  const duration = isBooking ? getBookingDuration(record) : null;
  const estUsd = isBooking ? getBookingEstimatedUsd(record) : null;
  const datesLabel = isBooking
    ? `${formatDisplayDate(record.startDate)} – ${formatDisplayDate(record.endDate)}${duration ? ` (${duration.days} days)` : ''}`
    : record.dates || 'Flexible dates';
  const waHref = `https://wa.me/${siteConfig.contact.whatsappNumber}?text=${encodeURIComponent(
    `Hi ${siteConfig.name}, following up on my reference ${record.reference}.`
  )}`;

  const text = [
    `Kuzuzangpo la ${record.fullName},`,
    '',
    `Thank you for reaching out to ${siteConfig.name}. We have logged your ${isBooking ? 'booking request' : 'inquiry'} under reference ${record.reference}.`,
    '',
    isBooking ? `Tour: ${record.tourTitle}` : null,
    `Dates: ${datesLabel}`,
    `Travellers: ${partyLabel}`,
    estUsd !== null
      ? `Estimated Adult Subtotal: ${formatUSD(estUsd)} (SDF & visa included; final quote confirmed within ${siteConfig.slaHours || 24}h)`
      : null,
    '',
    `A licensed travel designer from our Thimphu desk will reply within ${siteConfig.slaHours || 24} hours with a tailored day-by-day proposal.`,
    '',
    `Need an instant answer? WhatsApp us at ${siteConfig.contact.whatsappLabel}: ${waHref}`,
    `Email: ${siteConfig.contact.email}`,
    '',
    `${siteConfig.name} · Thimphu, Kingdom of Bhutan`,
    `${siteConfig.licence.authority} Licence: ${siteConfig.licence.number}`,
  ]
    .filter((x) => x !== null)
    .join('\n');

  const html = `<!DOCTYPE html>
<html lang="en">
<body style="margin:0;padding:24px;background:#FAF8F5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;color:#0F172A;">
  <div style="max-width:600px;margin:0 auto;background:#FFFFFF;border:1px solid #E7E1D8;border-radius:16px;overflow:hidden;">
    <div style="background:#0F172A;color:#FAF8F5;padding:24px 28px;">
      <div style="font-size:11px;letter-spacing:0.14em;text-transform:uppercase;color:#C9D1DC;">${escapeHtml(siteConfig.name)}</div>
      <h1 style="margin:8px 0 0;font-size:22px;font-weight:700;color:#FAF8F5;">Your Bhutan request is received</h1>
      <div style="margin-top:10px;display:inline-block;padding:5px 12px;border-radius:999px;background:#16213A;border:1px solid #2A3650;font-size:13px;font-weight:700;color:#FAF8F5;">REFERENCE: ${escapeHtml(record.reference)}</div>
    </div>
    <div style="padding:24px 28px;line-height:1.6;font-size:15px;color:#334155;">
      <p style="margin:0 0 14px;">Kuzuzangpo la <strong>${escapeHtml(record.fullName)}</strong>,</p>
      <p style="margin:0 0 16px;">Thank you for contacting ${escapeHtml(siteConfig.name)}. Our licensed trip designers in Thimphu have received your request and will send your tailored quote within <strong>${siteConfig.slaHours || 24} hours</strong>.</p>
      <div style="background:#F3EFE8;border:1px solid #E7E1D8;border-radius:12px;padding:16px 18px;margin-bottom:18px;font-size:14px;color:#0F172A;">
        ${isBooking ? `<div><strong>Tour:</strong> ${escapeHtml(record.tourTitle)}</div>` : ''}
        <div><strong>Dates:</strong> ${escapeHtml(datesLabel)}</div>
        <div><strong>Travellers:</strong> ${escapeHtml(partyLabel)}</div>
        ${estUsd !== null ? `<div><strong>Estimated Adult Subtotal:</strong> ${escapeHtml(formatUSD(estUsd))} (incl. SDF &amp; visa)</div>` : ''}
      </div>
      <p style="margin:0 0 18px;">Nothing is due now — you can adjust dates, hotels, and pacing until everything is right.</p>
      <a href="${waHref}" style="display:inline-block;padding:11px 20px;border-radius:999px;background:#15803D;color:#FFFFFF;text-decoration:none;font-size:14px;font-weight:600;">Chat on WhatsApp (${escapeHtml(siteConfig.contact.whatsappLabel)})</a>
      <p style="margin:22px 0 0;font-size:12px;color:#5B6577;">${escapeHtml(siteConfig.name)} · Norzin Lam, Thimphu, Bhutan · Licence ${escapeHtml(siteConfig.licence.number)}</p>
    </div>
  </div>
</body>
</html>`;

  return {
    to: record.email,
    replyTo: replyToEmail || siteConfig.contact.email,
    subject,
    text,
    html,
  };
}

export async function sendInquiryEmails(record, env = process.env, siteConfig = site) {
  const config = getEmailConfig(env);
  const attemptedAt = new Date().toISOString();

  if (!config.configured) {
    return {
      status: 'not_configured',
      provider: config.provider,
      adminSent: false,
      guestSent: false,
      error: 'Configure SMTP_HOST/SMTP_USER/SMTP_PASS (Gmail App Password) or RESEND_API_KEY in .env.',
      attemptedAt,
    };
  }

  let adminSent = false;
  let guestSent = false;
  const errors = [];
  const attempts = [];

  const adminMsg = buildAdminNotificationEmail(record, config.adminTo, siteConfig);
  try {
    await sendMailMessage(adminMsg, env);
    adminSent = true;
    attempts.push({
      kind: 'admin',
      to: adminMsg.to,
      subject: adminMsg.subject,
      provider: config.provider,
      status: 'sent',
      error: '',
      at: new Date().toISOString(),
    });
  } catch (err) {
    errors.push(`Admin email failed: ${err.message}`);
    attempts.push({
      kind: 'admin',
      to: adminMsg.to,
      subject: adminMsg.subject,
      provider: config.provider,
      status: 'failed',
      error: err.message,
      at: new Date().toISOString(),
    });
  }

  if (config.sendGuestCopy && record.email) {
    const guestMsg = buildGuestConfirmationEmail(record, config.adminTo, siteConfig);
    try {
      await sendMailMessage(guestMsg, env);
      guestSent = true;
      attempts.push({
        kind: 'guest',
        to: guestMsg.to,
        subject: guestMsg.subject,
        provider: config.provider,
        status: 'sent',
        error: '',
        at: new Date().toISOString(),
      });
    } catch (err) {
      errors.push(`Guest confirmation failed: ${err.message}`);
      attempts.push({
        kind: 'guest',
        to: guestMsg.to,
        subject: guestMsg.subject,
        provider: config.provider,
        status: 'failed',
        error: err.message,
        at: new Date().toISOString(),
      });
    }
  }

  return {
    status: adminSent ? 'sent' : 'failed',
    provider: config.provider,
    adminSent,
    guestSent,
    error: errors.join(' | '),
    attemptedAt,
    attempts,
  };
}

export async function sendTestNotificationEmail(env = process.env, siteConfig = site) {
  const config = getEmailConfig(env);
  const subject = `[Test] Automatic booking emails are active — ${siteConfig.name}`;
  if (!config.configured) {
    return {
      ok: false,
      provider: config.provider,
      adminTo: config.adminTo,
      subject,
      error: 'Email is not configured yet. Add SMTP_USER + SMTP_PASS (Gmail App Password) or RESEND_API_KEY in .env.',
    };
  }

  try {
    await sendMailMessage(
      {
        to: config.adminTo,
        replyTo: config.adminTo,
        subject,
        text: `Success! Automatic booking notifications for ${siteConfig.name} are working via ${config.provider.toUpperCase()} (${config.from} -> ${config.adminTo}).\n\nSent at: ${formatBttTimestamp()}`,
        html: `<div style="font-family:sans-serif;padding:20px;background:#FAF8F5;color:#0F172A;"><div style="max-width:520px;background:#FFFFFF;border:1px solid #E7E1D8;border-radius:14px;padding:24px;"><h2 style="margin:0 0 10px;color:#0F172A;">Automatic booking emails are active</h2><p style="margin:0 0 10px;color:#334155;">Notifications for <strong>${escapeHtml(siteConfig.name)}</strong> are successfully sending via <strong>${escapeHtml(config.provider.toUpperCase())}</strong> to <strong>${escapeHtml(config.adminTo)}</strong>.</p><p style="margin:0;font-size:13px;color:#5B6577;">Timestamp: ${escapeHtml(formatBttTimestamp())}</p></div></div>`,
      },
      env
    );
    return { ok: true, provider: config.provider, adminTo: config.adminTo, subject, error: '' };
  } catch (err) {
    return { ok: false, provider: config.provider, adminTo: config.adminTo, subject, error: err.message };
  }
}
