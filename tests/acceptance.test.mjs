import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import os from 'node:os';
import { validateCatalogData } from '../scripts/check-data.mjs';
import { getBookingDateBounds } from '../lib/format.js';
import { tours } from '../data/tours.js';
import { regions } from '../data/regions.js';
import { experiences } from '../data/experiences.js';
import { reviews } from '../data/reviews.js';
import { treks } from '../data/treks.js';
import { site } from '../data/site.js';

const rootDir = path.resolve('c:\\Users\\Pema\\Desktop\\Yuevaan IT Technologies\\yuevaan-travels');
const nextDir = path.join(rootDir, '.next');
const publicDir = path.join(rootDir, 'public');

function walkFiles(dir) {
  const results = [];
  if (!fs.existsSync(dir)) return results;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) results.push(...walkFiles(full));
    else results.push(full);
  }
  return results;
}

test('AC-08: validateCatalogData (BR-18) fails with slug and field on bad tour data', () => {
  const brokenOwl = tours.map((t) =>
    t.slug === 'owl-trek' ? { ...t, itinerary: t.itinerary.slice(0, 6) } : t
  );
  const errs1 = validateCatalogData({
    tours: brokenOwl,
    regions,
    experiences,
    reviews,
    treks,
    publicDir,
  });
  assert.ok(errs1.some((e) => e.includes('owl-trek') && e.includes('itinerary has 6 days, expected 12')));

  const badNights = tours.map((t) => (t.slug === 'owl-trek' ? { ...t, nights: 12 } : t));
  assert.ok(
    validateCatalogData({ tours: badNights, regions, experiences, reviews, treks, publicDir }).some(
      (e) => e.includes('owl-trek') && e.includes('nights')
    )
  );

  const badRegion = tours.map((t) =>
    t.slug === 'owl-trek' ? { ...t, regions: ['mars-bhutan'] } : t
  );
  assert.ok(
    validateCatalogData({ tours: badRegion, regions, experiences, reviews, treks, publicDir }).some(
      (e) => e.includes('owl-trek') && e.includes('regions')
    )
  );

  const badMap = tours.map((t) =>
    t.slug === 'owl-trek' ? { ...t, maps: ['nonexistent-map'] } : t
  );
  assert.ok(
    validateCatalogData({ tours: badMap, regions, experiences, reviews, treks, publicDir }).some(
      (e) => e.includes('owl-trek') && e.includes('maps')
    )
  );

  const badImage = tours.map((t) =>
    t.slug === 'owl-trek' ? { ...t, heroImage: '/images/does-not-exist.jpg' } : t
  );
  assert.ok(
    validateCatalogData({ tours: badImage, regions, experiences, reviews, treks, publicDir }).some(
      (e) => e.includes('owl-trek') && e.includes('heroImage')
    )
  );

  const dupSlug = [...tours, tours[0]];
  assert.ok(
    validateCatalogData({ tours: dupSlug, regions, experiences, reviews, treks, publicDir }).some((e) =>
      e.includes('duplicate slug')
    )
  );
});

test('Rules §4/§7, BR-15 & AC-33: source code hygiene, zero TS, no saffron in UI, no inline styles', () => {
  const srcDirs = ['app', 'components', 'data', 'lib', 'scripts'];
  for (const dir of srcDirs) {
    for (const file of walkFiles(path.join(rootDir, dir))) {
      assert.ok(!file.endsWith('.ts') && !file.endsWith('.tsx'), `Disallowed TS file: ${file}`);
      const content = fs.readFileSync(file, 'utf8');
      assert.equal(content.includes('--color-saffron'), false, `Found --color-saffron in ${file}`);

      if (dir === 'app' || dir === 'components') {
        if (!file.endsWith('FlightPreloader.jsx')) {
          assert.equal(/#d97706|#f4c44a/i.test(content), false, `Found saffron hex outside aircraft SVG in ${file}`);
        }
        if (file.endsWith('.jsx')) {
          const hasInlineStyle = content.match(/style=\{\{/g);
          if (hasInlineStyle) {
            assert.ok(file.endsWith('Reveal.jsx'), `Disallowed inline style prop in ${file}`);
          }
          if (content.includes('dangerouslySetInnerHTML')) {
            assert.ok(
              file.endsWith(path.join('app', 'layout.jsx')),
              `Disallowed dangerouslySetInnerHTML in ${file}`
            );
          }
          assert.equal(/<article[^>]*onClick/.test(content), false, `Disallowed onClick on <article> in ${file}`);
        }
      }
    }
  }
  const astryxDir = path.join(rootDir, '.agents', 'skills', 'astryx');
  assert.equal(fs.existsSync(astryxDir), false, 'astryx skill must not exist in yuevaan-travels');
});

test('Dynamic SSR HTML, SEO, Accessibility, Faststart MP4s, 48 Legacy 301s & Webhook Privacy', async () => {
  const receivedHooks = [];
  const hookServer = http.createServer((req, res) => {
    const chunks = [];
    req.on('data', (c) => chunks.push(c));
    req.on('end', () => {
      receivedHooks.push(JSON.parse(Buffer.concat(chunks).toString('utf8')));
      res.writeHead(200);
      res.end('ok');
    });
  });
  await new Promise((r) => hookServer.listen(0, '127.0.0.1', r));
  const hookPort = hookServer.address().port;

  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'yuevaan-acc-'));
  process.env.DISABLE_DOTENV = '1';
  process.env.DATABASE_URL = '';
  process.env.INQUIRIES_DIR = tmpDir;
  process.env.INQUIRY_WEBHOOK_URL = `http://127.0.0.1:${hookPort}/webhook`;
  process.env.TRUST_PROXY = '1';

  const { createAppServer, prepareNextApp } = await import(`../server.js?test=${Date.now()}`);
  const { app: nextApp, handler: nextHandler } = await prepareNextApp({ dev: false });
  const appServer = createAppServer({ nextHandler });
  await new Promise((r) => appServer.listen(0, '127.0.0.1', r));
  const { port } = appServer.address();

  const req = (method, urlPath, { headers = {}, body = null } = {}) =>
    new Promise((resolve, reject) => {
      const r = http.request({ host: '127.0.0.1', port, path: urlPath, method, headers }, (res) => {
        const chunks = [];
        res.on('data', (c) => chunks.push(c));
        res.on('end', () =>
          resolve({ status: res.statusCode, headers: res.headers, body: Buffer.concat(chunks).toString('utf8') })
        );
      });
      r.on('error', reject);
      if (body !== null) r.write(body);
      r.end();
    });

  try {
    // 1. Sitemap = 165 URLs, /thank-you excluded, /packages/custom -> 404, robots.txt valid
    const sitemapRes = await req('GET', '/sitemap.xml');
    assert.equal(sitemapRes.status, 200);
    const locMatches = [...sitemapRes.body.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
    assert.equal(locMatches.length, 165, `Expected 165 sitemap URLs, got ${locMatches.length}`);
    assert.equal(locMatches.some((u) => u.includes('/thank-you')), false);

    const robotsRes = await req('GET', '/robots.txt');
    assert.equal(robotsRes.status, 200);
    assert.match(robotsRes.body, /Sitemap:/);

    const customPkgRes = await req('GET', '/packages/custom');
    assert.equal(customPkgRes.status, 404);

    // 2. Crawl all 165 sitemap routes: 200, unique <title>, meta description, canonical, og:image, 1 <h1>, skip link, img alt
    const seenTitles = new Set();
    const pagesByPath = new Map();
    for (const url of locMatches) {
      const pathname = new URL(url).pathname;
      const pageRes = await req('GET', pathname);
      assert.equal(pageRes.status, 200, `Expected 200 for ${pathname}, got ${pageRes.status}`);
      const html = pageRes.body;
      pagesByPath.set(pathname, html);

      const titleMatch = html.match(/<title>([^<]+)<\/title>/);
      assert.ok(titleMatch, `Missing <title> on ${pathname}`);
      assert.equal(seenTitles.has(titleMatch[1]), false, `Duplicate title "${titleMatch[1]}" on ${pathname}`);
      seenTitles.add(titleMatch[1]);
      assert.match(html, /<meta name="description" content="[^"]+"/);
      assert.match(html, /<link rel="canonical" href="[^"]+"/);
      assert.match(html, /<meta property="og:image" content="[^"]+"/);
      assert.equal(/<h5[^>]*footer-col-title/.test(html), false, `Found <h5> footer title on ${pathname}`);

      const h1Count = (html.match(/<h1[\s>]/g) || []).length;
      assert.equal(h1Count, 1, `Expected exact 1 <h1> on ${pathname}, found ${h1Count}`);
      assert.match(html, /href="#main-content"[^>]*class="skip-link"/, `Missing skip link on ${pathname}`);
      assert.match(html, /id="main-content"/, `Missing #main-content on ${pathname}`);

      const imgTags = html.match(/<img\b[^>]*>/g) || [];
      for (const img of imgTags) {
        assert.match(img, /\balt="[^"]*"/, `Missing alt attribute in ${pathname}: ${img}`);
      }
    }

    // All nav hrefs in site.nav resolve to valid routes
    for (const group of [site.nav.destinations, site.nav.experiences, site.nav.travelGuide]) {
      for (const item of group) {
        const cleanPath = item.href.split('#')[0];
        assert.ok(pagesByPath.has(cleanPath), `Broken nav link ${item.href}`);
      }
    }

    const thankYouRes = await req('GET', '/thank-you');
    assert.equal(thankYouRes.status, 200);
    assert.match(thankYouRes.body, /noindex/i);

    // 3. Home checks (AC-06, AC-07, §8.3)
    const homeHtml = pagesByPath.get('/');
    const wIdx = homeHtml.indexOf('/packages/western-bhutan');
    const dIdx = homeHtml.indexOf('/packages/druk-path-trek');
    const aIdx = homeHtml.indexOf('/packages/ancient-dzongs');
    const tIdx = homeHtml.indexOf('/packages/thimphu-tshechu');
    assert.ok(wIdx > 0 && dIdx > 0 && aIdx > 0 && tIdx > 0);
    assert.equal(homeHtml.includes("Royal Manas Wilderness &amp; Tiger's Nest"), false);
    assert.match(homeHtml, /alt="Yuevaan Bhutan Travels"/);
    assert.match(homeHtml, /href="\/plan-my-trip"[^>]*>Plan Your Custom Journey/);
    assert.equal(homeHtml.includes('discover-bhutan_full-film_1080p'), false);
    assert.equal(homeHtml.includes('Discover-Bhutan%20Full-Film'), false);
    assert.ok(homeHtml.includes('/videos/Bhutan-Home-Film%20No-Text%204K.mp4'));

    // Faststart MP4 layout check
    for (const videoName of [
      'Bhutan-Home-Film No-Text 4K.mp4',
      'Discover-Bhutan Full-Film 1080P District-Map.mp4',
    ]) {
      const fd = fs.openSync(path.join(publicDir, 'videos', videoName), 'r');
      const st = fs.fstatSync(fd);
      let off = 0;
      let moovOff = -1;
      let mdatOff = -1;
      while (off + 8 <= st.size) {
        const h = Buffer.alloc(8);
        fs.readSync(fd, h, 0, 8, off);
        const sz = h.readUInt32BE(0);
        const tp = h.slice(4, 8).toString('latin1');
        if (tp === 'moov' && moovOff === -1) moovOff = off;
        if (tp === 'mdat' && mdatOff === -1) mdatOff = off;
        if (sz < 8) break;
        off += sz;
      }
      fs.closeSync(fd);
      assert.ok(moovOff > 0 && mdatOff > moovOff, `${videoName} must place moov before mdat`);
    }

    // 4. Owl Trek, Destinations, Sites, Western Bhutan, Druk Path, Bumthang, Ancient Dzongs, Trekking
    const owlHtml = pagesByPath.get('/packages/owl-trek');
    assert.match(owlHtml, /12 Days \/ 11 Nights/i);
    assert.match(owlHtml, /US\$3,950/);
    assert.match(owlHtml, /Gentle Trek/i);
    assert.match(owlHtml, /3,600 m/);
    assert.equal(owlHtml.includes('<iframe'), false);
    assert.equal(owlHtml.includes('What our guests say'), false);

    const destHtml = pagesByPath.get('/destinations');
    assert.match(destHtml, /data-dest-filter/);
    for (const regSlug of ['western-bhutan', 'central-bhutan', 'eastern-bhutan', 'southern-bhutan']) {
      assert.ok(destHtml.includes(`id="${regSlug}"`), `Missing region section ${regSlug}`);
    }

    const bwSitesHtml = pagesByPath.get('/destinations/western-bhutan/bird-watching');
    for (const siteSlug of [
      'paro-chhu-riverbank',
      'dochula-pass-3-120-m',
      'lampelri-royal-botanical-park',
      'punakha-pho-chhu',
    ]) {
      assert.ok(bwSitesHtml.includes(`/destinations/western-bhutan/bird-watching/${siteSlug}`));
    }
    const lampelriHtml = pagesByPath.get('/destinations/western-bhutan/bird-watching/lampelri-royal-botanical-park');
    assert.match(lampelriHtml, /\/packages\/crane-birding/);
    assert.match(lampelriHtml, /Lampelri Botanical Reserve/);

    const westHtml = pagesByPath.get('/packages/western-bhutan');
    assert.match(westHtml, /Day 6: Bumdrak/);
    assert.match(westHtml, /Day 3: Dochu La/);
    assert.match(westHtml, /What our guests say/);
    assert.match(westHtml, /84 reviews/);
    assert.match(westHtml, /pkg-spec-icon[^>]*><svg[^>]*width="24" height="24"[^>]*stroke-width="1\.75"/);
    assert.match(westHtml, /pkg-specs-row-top/);
    assert.match(westHtml, /Difficulty level 1 of 5/);

    const drukHtml = pagesByPath.get('/packages/druk-path-trek');
    assert.match(drukHtml, /druk-path-trek-map\.html/);
    assert.match(pagesByPath.get('/packages/bumthang-cultural-trek'), /US\$3,950/);
    assert.match(pagesByPath.get('/packages/ancient-dzongs'), /US\$3,300/);

    const trekExpHtml = pagesByPath.get('/experiences/trekking-hiking');
    assert.equal(trekExpHtml.includes('>Bhutan<'), false);
    assert.match(trekExpHtml, /\/maps\/trek-map\.html\?trek=dagala/);
    for (const slug of ['dagala-trek', 'bumthang-cultural-trek', 'owl-trek', 'druk-path-trek', 'jomolhari-trek']) {
      assert.ok(trekExpHtml.includes(`/packages/${slug}`));
    }
    assert.match(pagesByPath.get('/experiences'), /5 tours/);

    // 5. Licence consistency, footer checks, SDF bands
    const travelGuideHtml = pagesByPath.get('/travel-guide');
    const legalHtml = pagesByPath.get('/legal');
    const aboutHtml = pagesByPath.get('/about');
    const contactHtml = pagesByPath.get('/contact');
    for (const page of [legalHtml, aboutHtml, contactHtml]) {
      assert.ok(page.includes(site.licence.number));
    }
    const homeFooter = homeHtml.slice(homeHtml.indexOf('<footer'));
    assert.equal(homeFooter.includes(site.licence.number), false);
    assert.equal(homeFooter.includes('💬'), false);
    assert.equal(homeFooter.includes('✉️'), false);
    assert.ok(homeFooter.includes('https://wa.me/97577611423'));
    assert.ok(homeFooter.includes('+975 77 611 423'));
    assert.match(travelGuideHtml, /US\$100/);
    assert.match(travelGuideHtml, /6–11/);
    assert.match(legalHtml, /6–11/);

    // 6. Security: no server secrets in client JS bundles
    for (const f of walkFiles(path.join(nextDir, 'static'))) {
      if (f.endsWith('.js')) {
        const js = fs.readFileSync(f, 'utf8');
        assert.equal(js.includes('INQUIRY_WEBHOOK_URL'), false);
        assert.equal(js.includes('hooks.slack.com'), false);
        assert.equal(js.includes('postgresql://'), false);
        assert.equal(js.includes('postgres://'), false);
      }
    }

    // 7. All 48 legacy 301 redirects (+ query string variant)
    const expectedRedirects = [
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
      ['/plan-my-trip.html?tour=druk-path-trek', '/plan-my-trip?tour=druk-path-trek'],
      ['/maps/druk-map.html', '/maps/druk-path-trek-map.html'],
      ['/maps/dagala-map.html', '/maps/dagala-thousand-lakes-trek-map.html'],
      ['/maps/jomolhari-map.html', '/maps/jomolhari-base-camp-trek-map.html'],
      ['/maps/bumdrak-map.html', '/maps/bumdrak-trek-map.html'],
      ['/maps/kila-map.html', '/maps/chele-la-kila-goemba-trek-map.html'],
      ['/maps/lungchutse-map.html', '/maps/dochula-lungchutse-trek-map.html'],
      ...experiences.map((e) => [`/experiences/${e.slug}.html`, `/experiences/${e.slug}`]),
      ...tours.filter((t) => t.slug !== 'custom').map((t) => [`/packages/package-${t.slug}.html`, `/packages/${t.slug}`]),
    ];

    assert.equal(expectedRedirects.length, 50);
    for (const [oldUrl, dest] of expectedRedirects) {
      const res = await req('GET', oldUrl);
      assert.equal(res.status, 301, `Expected 301 for ${oldUrl}`);
      assert.equal(res.headers.location, dest);
    }

    // 8. No-JS form-encoded POST (303 redirect) + webhook privacy
    const formBody = new URLSearchParams({
      type: 'booking',
      tourSlug: 'owl-trek',
      startDate: getBookingDateBounds().defaultStart,
      adults: '2',
      children: '0',
      youngChildren: '0',
      fullName: 'Eleanor Vance',
      email: 'eleanor@example.com',
      dob: '1985-06-14',
      nationality: 'United Kingdom',
      phoneCode: '+44',
      phoneNumber: '7700 900123',
      notes: 'Private dietary health info',
      agreeTerms: 'on',
      website: '',
    }).toString();

    const postRes = await req('POST', '/api/inquiries', {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Origin: `http://127.0.0.1:${port}`,
        'X-Forwarded-For': '198.51.100.42',
      },
      body: formBody,
    });
    assert.equal(postRes.status, 303);
    assert.match(postRes.headers.location, /^\/thank-you\?ref=YBT-\d{8}-[A-HJ-NP-Z2-9]{4}$/);

    await new Promise((r) => setTimeout(r, 100));
    assert.equal(receivedHooks.length, 1);
    const hookPayload = receivedHooks[0];
    assert.equal('dob' in hookPayload, false);
    assert.equal('nationality' in hookPayload, false);
    assert.equal('notes' in hookPayload, false);
    assert.match(hookPayload.reference, /^YBT-/);
    assert.equal(hookPayload.tourTitle, 'Owl Trek Bumthang');
  } finally {
    appServer.close();
    hookServer.close();
    await nextApp.close();
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
});

test('AC-05 & §5 Accessibility contracts: reduced-motion, form labels, tabs, header & drawer', () => {
  const globalsCss = fs.readFileSync(path.join(rootDir, 'app', 'globals.css'), 'utf8');
  assert.match(globalsCss, /prefers-reduced-motion:\s*reduce/);

  const bookingSrc = fs.readFileSync(path.join(rootDir, 'components', 'forms', 'BookingForm.jsx'), 'utf8');
  assert.match(bookingSrc, /htmlFor="rtbFullName"/);
  assert.match(bookingSrc, /aria-describedby/);

  const stepperSrc = fs.readFileSync(path.join(rootDir, 'components', 'forms', 'Stepper.jsx'), 'utf8');
  assert.match(stepperSrc, /aria-live="polite"/);
  assert.match(stepperSrc, /aria-label=/);

  const catTabsSrc = fs.readFileSync(path.join(rootDir, 'components', 'destinations', 'CategoryTabs.jsx'), 'utf8');
  assert.match(catTabsSrc, /role="tablist"/);
  assert.match(catTabsSrc, /role="tab"/);
  assert.match(catTabsSrc, /aria-selected=/);
  assert.match(catTabsSrc, /dest-cat-detail-panel is-active/);
  assert.equal(catTabsSrc.includes('dest-cat-spotlight'), false);

  const headerSrc = fs.readFileSync(path.join(rootDir, 'components', 'layout', 'SiteHeader.jsx'), 'utf8');
  assert.match(headerSrc, /handleLinkClick\(e, item\.href, 'experiences'\)/);
  assert.match(headerSrc, /handleLinkClick\(e, item\.href, 'guide'\)/);
  assert.match(headerSrc, /handleLinkClick\(e, item\.href, 'destinations'\)/);

  const drawerSrc = fs.readFileSync(path.join(rootDir, 'components', 'layout', 'MobileDrawer.jsx'), 'utf8');
  assert.match(drawerSrc, /role="dialog"/);
  assert.match(drawerSrc, /aria-modal="true"/);
  assert.match(drawerSrc, /Escape/);
});
