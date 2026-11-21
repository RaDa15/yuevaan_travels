import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import http from 'http';
import os from 'os';
import { validateBookingInput, validateInquiryInput } from '../lib/validation.js';
import { getBookingDateBounds } from '../lib/format.js';
import { tours } from '../data/tours.js';

const tmpDataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'yuevaan-test-'));
process.env.DISABLE_DOTENV = '1';
process.env.DATABASE_URL = '';
process.env.INQUIRIES_DIR = tmpDataDir;
process.env.INQUIRY_WEBHOOK_URL = 'http://127.0.0.1:59999/dead-webhook';
process.env.TRUST_PROXY = '1';

const { createAppServer, generateReference, prepareNextApp } = await import('../server.js');

const allSlugs = tours.map((t) => t.slug);

test('BR-09 generateReference produces 1000 unique valid references for a single day', () => {
  const seen = new Set();
  const now = new Date('2026-11-17T06:00:00Z');
  for (let i = 0; i < 1000; i++) {
    const ref = generateReference(now, seen);
    assert.match(ref, /^YBT-\d{8}-[A-HJ-NP-Z2-9]{4}$/);
  }
  assert.equal(seen.size, 1000);
});

test('Business Rules §5 validation rejects underage lead traveller and bad dates', () => {
  const bounds = getBookingDateBounds();
  const res = validateBookingInput(
    {
      tourSlug: 'owl-trek',
      startDate: bounds.defaultStart,
      adults: 2,
      children: 0,
      youngChildren: 0,
      fullName: 'Young Traveller',
      email: 'young@example.com',
      dob: '2015-01-01',
      nationality: 'United Kingdom',
      phoneCode: '+44',
      phoneNumber: '7700900123',
      agreeTerms: true,
    },
    allSlugs
  );
  assert.equal(res.valid, false);
  assert.equal(res.errors.dob, 'The lead traveller must be 18 or older.');

  const inq = validateInquiryInput({ fullName: 'A', email: 'bad', phone: '12' });
  assert.equal(inq.valid, false);
  assert.ok(inq.errors.fullName);
  assert.ok(inq.errors.email);
  assert.ok(inq.errors.phone);
});

test('Server integration: AC-03, AC-27, AC-28, AC-29, AC-30, AC-31, Security & Images', async () => {
  const { app: nextApp, handler: nextHandler } = await prepareNextApp({ dev: false });
  const server = createAppServer({ nextHandler });
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const { port } = server.address();

  const request = (method, urlPath, { headers = {}, body = null } = {}) =>
    new Promise((resolve, reject) => {
      const req = http.request({ host: '127.0.0.1', port, path: urlPath, method, headers }, (res) => {
        const chunks = [];
        res.on('data', (c) => chunks.push(c));
        res.on('end', () =>
          resolve({ status: res.statusCode, headers: res.headers, body: Buffer.concat(chunks).toString('utf8') })
        );
      });
      req.on('error', reject);
      if (body) req.write(body);
      req.end();
    });

  try {
    // 1. Security checks & AC-03
    for (const badPath of [
      '/server.js',
      '/package.json',
      '/.env',
      '/.data/inquiries.ndjson',
      '/Data/inquiries.ndjson',
      '/packages/custom',
      '/nonexistent-xyz',
    ]) {
      const r = await request('GET', badPath);
      assert.equal(r.status, 404, `Expected 404 on ${badPath}, got ${r.status}`);
    }

    const homeRes = await request('GET', '/');
    assert.equal(homeRes.status, 200);
    assert.equal(homeRes.headers['x-content-type-options'], 'nosniff');
    assert.equal(homeRes.headers['x-frame-options'], 'SAMEORIGIN');
    assert.ok(homeRes.headers['content-security-policy']);

    // 2. AC-27 Sitemap = 165 URLs and every route returns 200; /thank-you excluded & noindex
    const sitemapRes = await request('GET', '/sitemap.xml');
    assert.equal(sitemapRes.status, 200);
    const locs = [...sitemapRes.body.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => new URL(m[1]).pathname);
    assert.equal(locs.length, 165);
    assert.ok(!locs.includes('/thank-you'));
    for (const p of locs) {
      const pageRes = await request('GET', p);
      assert.equal(pageRes.status, 200, `Sitemap route ${p} returned ${pageRes.status}`);
    }
    const tyRes = await request('GET', '/thank-you');
    assert.equal(tyRes.status, 200);
    assert.match(tyRes.body, /noindex/i);

    // 3. AC-28 Legacy 301 Redirects + query preservation
    const sampleRedirects = [
      ['/index.html', '/'],
      ['/tours.html', '/tours'],
      ['/experiences/bird-watching.html', '/experiences/bird-watching'],
      ['/packages/package-druk-path-trek.html', '/packages/druk-path-trek'],
      ['/plan-my-trip.html?tour=druk-path-trek', '/plan-my-trip?tour=druk-path-trek'],
      ['/maps/druk-map.html', '/maps/druk-path-trek-map.html'],
    ];
    for (const [oldUrl, expected] of sampleRedirects) {
      const r = await request('GET', oldUrl);
      assert.equal(r.status, 301, `Expected 301 for ${oldUrl}`);
      assert.equal(r.headers.location, expected);
    }

    // 4. Security: cross-origin form post -> 403
    const evilForm = await request('POST', '/api/inquiries', {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Origin: 'https://evil.example',
      },
      body: 'type=inquiry&fullName=Bad+Actor&email=bad@example.com',
    });
    assert.equal(evilForm.status, 403);

    // 5. AC-30 Oversized body -> 413
    const hugeRes = await request('POST', '/api/inquiries', {
      headers: { 'Content-Type': 'application/json', 'X-Forwarded-For': '203.0.113.1' },
      body: 'x'.repeat(70 * 1024),
    });
    assert.equal(hugeRes.status, 413);

    // 6. AC-30 Honeypot -> 201 fake ref, stores nothing
    const spamRes = await request('POST', '/api/inquiries', {
      headers: { 'Content-Type': 'application/json', 'X-Forwarded-For': '203.0.113.2' },
      body: JSON.stringify({
        type: 'inquiry',
        fullName: 'Bot',
        email: 'bot@example.com',
        website: 'http://spam.example',
      }),
    });
    assert.equal(spamRes.status, 201);
    assert.equal(fs.existsSync(path.join(tmpDataDir, 'inquiries.ndjson')), false);

    // 7. AC-29 + AC-31 Schema filtering, authoritative total, dead webhook doesn't block 201
    const bounds = getBookingDateBounds();
    const bookRes = await request('POST', '/api/inquiries', {
      headers: { 'Content-Type': 'application/json', 'X-Forwarded-For': '203.0.113.10' },
      body: JSON.stringify({
        type: 'booking',
        tourSlug: 'owl-trek',
        startDate: bounds.defaultStart,
        adults: 2,
        children: 0,
        youngChildren: 0,
        estimatedAdultTotalUSD: 1,
        isAdmin: true,
        fullName: '<script>alert(1)</script>',
        email: 'eleanor@example.com',
        dob: '1985-06-14',
        nationality: 'United Kingdom',
        phoneCode: '+44',
        phoneNumber: '7700 900123',
        notes: 'Test note',
        agreeTerms: true,
        website: '',
      }),
    });
    assert.equal(bookRes.status, 201);
    const parsedBook = JSON.parse(bookRes.body);
    assert.equal(parsedBook.ok, true);
    assert.match(parsedBook.reference, /^YBT-\d{8}-[A-HJ-NP-Z2-9]{4}$/);

    const logContent = fs.readFileSync(path.join(tmpDataDir, 'inquiries.ndjson'), 'utf8').trim();
    const storedRecord = JSON.parse(logContent);
    assert.equal(storedRecord.estimatedAdultTotalUSD, 7900);
    assert.equal('isAdmin' in storedRecord, false);
    assert.equal(storedRecord.fullName, '<script>alert(1)</script>');

    // 8. AC-30 Rate limiting: 5 max within 10 mins from same IP (1..5 succeed; 6th -> 429)
    for (let i = 1; i <= 5; i++) {
      const okR = await request('POST', '/api/inquiries', {
        headers: { 'Content-Type': 'application/json', 'X-Forwarded-For': '203.0.113.20' },
        body: JSON.stringify({ type: 'inquiry', fullName: `Guest ${i}`, email: `g${i}@example.com` }),
      });
      assert.equal(okR.status, 201);
    }
    const blockedR = await request('POST', '/api/inquiries', {
      headers: { 'Content-Type': 'application/json', 'X-Forwarded-For': '203.0.113.20' },
      body: JSON.stringify({ type: 'inquiry', fullName: 'Guest 6', email: 'g6@example.com' }),
    });
    assert.equal(blockedR.status, 429);
    assert.ok(blockedR.headers['retry-after']);

    // Security F-03 regression: client-prepended X-Forwarded-For cannot bypass rate limit
    const spoofedXffR = await request('POST', '/api/inquiries', {
      headers: { 'Content-Type': 'application/json', 'X-Forwarded-For': '198.51.100.250, 203.0.113.20' },
      body: JSON.stringify({ type: 'inquiry', fullName: 'Spoofed', email: 'spoof@example.com' }),
    });
    assert.equal(spoofedXffR.status, 429);

    // Security F-05 regression: protocol-relative Referer path cannot trigger open redirect on form error
    const openRedirTest = await request('POST', '/api/inquiries', {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Origin: `http://127.0.0.1:${port}`,
        Referer: `http://127.0.0.1:${port}//evil.example/`,
        'X-Forwarded-For': '203.0.113.30',
      },
      body: 'type=inquiry&fullName=X&email=bad',
    });
    assert.equal(openRedirTest.status, 303);
    assert.match(openRedirTest.headers.location, /^\/contact\?error=/);
    assert.equal(openRedirTest.headers.location.startsWith('//'), false);

    // 9. Images <= 250 KB check (AC §4)
    const imagesDir = path.resolve('c:\\Users\\Pema\\Desktop\\Yuevaan IT Technologies\\yuevaan-travels\\public\\images');
    for (const file of fs.readdirSync(imagesDir)) {
      const sz = fs.statSync(path.join(imagesDir, file)).size;
      assert.ok(sz <= 250 * 1024, `Image ${file} is ${sz} bytes (> 250 KB)`);
    }
  } finally {
    server.close();
    await nextApp.close();
    fs.rmSync(tmpDataDir, { recursive: true, force: true });
  }
});
