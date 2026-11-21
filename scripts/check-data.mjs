import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { tours } from '../data/tours.js';
import { regions } from '../data/regions.js';
import { experiences } from '../data/experiences.js';
import { reviews } from '../data/reviews.js';
import { treks } from '../data/treks.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');
const publicDir = path.join(projectRoot, 'public');

const ALLOWED_REGIONS = new Set(['western-bhutan', 'central-bhutan', 'eastern-bhutan', 'southern-bhutan']);
const ALLOWED_EXPERIENCES = new Set([
  'bird-watching',
  'trekking-hiking',
  'nature-wildlife',
  'cultural-experiences',
  'spiritual-experiences',
  'festivals-events',
  'adventure-activities',
  'photography-tours',
  'local-experiences',
]);

export function validateCatalogData({
  tours: tourList,
  regions: regionList,
  experiences: expList,
  reviews: reviewList,
  treks: trekList,
  publicDir: pubDir,
}) {
  const ALLOWED_TREKS = new Set(trekList.map((t) => t.id));
  const errors = [];
  const fail = (slug, field, msg) => errors.push(`${slug}: ${field} — ${msg}`);

  if (regionList.length !== 4) {
    errors.push(`regions: expected 4 regions, found ${regionList.length}`);
  }
  for (const reg of regionList) {
    if (!ALLOWED_REGIONS.has(reg.slug)) fail('regions', reg.slug, 'unknown region slug');
    const heroPath = path.join(pubDir, reg.hero.image.replace(/^\/+/, ''));
    if (!fs.existsSync(heroPath)) fail('regions', reg.slug, `missing hero image ${reg.hero.image}`);
  }

  if (expList.length !== 9) {
    errors.push(`experiences: expected 9 experiences, found ${expList.length}`);
  }
  for (const exp of expList) {
    if (!ALLOWED_EXPERIENCES.has(exp.slug)) fail('experiences', exp.slug, 'unknown experience slug');
    const imgPath = path.join(pubDir, exp.image.src.replace(/^\/+/, ''));
    if (!fs.existsSync(imgPath)) fail('experiences', exp.slug, `missing image ${exp.image.src}`);
  }

  for (const tr of trekList) {
    const mapPath = path.join(pubDir, tr.file.replace(/^\/+/, ''));
    if (!fs.existsSync(mapPath)) fail('treks', tr.id, `missing map file ${tr.file}`);
  }

  const seenSlugs = new Set();
  const seenPopularRanks = new Set();

  for (const tour of tourList) {
    const slug = tour.slug || '(missing)';
    if (!tour.slug || !/^[a-z0-9-]+$/.test(tour.slug)) {
      fail(slug, 'slug', 'must be lowercase kebab-case');
    }
    if (seenSlugs.has(tour.slug)) {
      fail(slug, 'slug', 'duplicate slug');
    }
    seenSlugs.add(tour.slug);

    if (!Number.isInteger(tour.days) || tour.days < 1) {
      fail(slug, 'days', `invalid days (${tour.days})`);
    }
    if (!Number.isInteger(tour.nights) || tour.nights !== tour.days - 1) {
      fail(slug, 'nights', `nights (${tour.nights}) must equal days - 1 (${tour.days - 1})`);
    }
    if (!Number.isInteger(tour.price) || tour.price < 500) {
      fail(slug, 'price', `price (${tour.price}) must be integer >= 500`);
    }

    if (tour.slug !== 'custom') {
      if (!Array.isArray(tour.itinerary) || tour.itinerary.length !== tour.days) {
        fail(slug, 'itinerary', `itinerary has ${tour.itinerary?.length ?? 0} days, expected ${tour.days}`);
      }
    }

    if (!Array.isArray(tour.regions) || tour.regions.length === 0) {
      fail(slug, 'regions', 'must contain at least 1 region');
    } else {
      for (const r of tour.regions) {
        if (!ALLOWED_REGIONS.has(r)) fail(slug, 'regions', `unknown region "${r}"`);
      }
    }

    if (!Array.isArray(tour.categories) || tour.categories.length === 0) {
      fail(slug, 'categories', 'must contain at least 1 category');
    } else {
      for (const c of tour.categories) {
        if (!ALLOWED_EXPERIENCES.has(c)) fail(slug, 'categories', `unknown category "${c}"`);
      }
    }

    if (Array.isArray(tour.includedExperiences)) {
      for (const inc of tour.includedExperiences) {
        if (!ALLOWED_EXPERIENCES.has(inc)) fail(slug, 'includedExperiences', `unknown experience "${inc}"`);
      }
    }

    if (Array.isArray(tour.maps)) {
      for (const m of tour.maps) {
        if (!ALLOWED_TREKS.has(m)) fail(slug, 'maps', `unknown map id "${m}"`);
      }
    }

    if (!tour.heroImage) {
      fail(slug, 'heroImage', 'missing heroImage');
    } else {
      const absHero = path.join(pubDir, tour.heroImage.replace(/^\/+/, ''));
      if (!fs.existsSync(absHero)) {
        fail(slug, 'heroImage', `missing file public/${tour.heroImage.replace(/^\/+/, '')}`);
      }
    }

    if (tour.popularRank !== null && tour.popularRank !== undefined) {
      if (!Number.isInteger(tour.popularRank) || tour.popularRank < 1 || tour.popularRank > 6) {
        fail(slug, 'popularRank', `popularRank must be 1-6, got ${tour.popularRank}`);
      }
      if (seenPopularRanks.has(tour.popularRank)) {
        fail(slug, 'popularRank', `duplicate popularRank ${tour.popularRank}`);
      }
      seenPopularRanks.add(tour.popularRank);
      if (tour.popularRank <= 4 && !tour.homeCard) {
        fail(slug, 'homeCard', `required for popularRank ${tour.popularRank}`);
      }
    }
  }

  if (seenPopularRanks.size !== 6) {
    errors.push(`popularRank: expected 6 ranked popular tours, found ${seenPopularRanks.size}`);
  }

  for (const rev of reviewList) {
    if (rev.tourSlug !== null && !seenSlugs.has(rev.tourSlug)) {
      fail(`review:${rev.id}`, 'tourSlug', `unknown tourSlug "${rev.tourSlug}"`);
    }
  }

  return errors;
}

const isCli = process.argv[1] && path.resolve(process.argv[1]) === __filename;

if (isCli) {
  const errors = validateCatalogData({ tours, regions, experiences, reviews, treks, publicDir });
  if (errors.length > 0) {
    console.error('DATA INTEGRITY CHECK FAILED (BR-18):');
    for (const err of errors) console.error(' -', err);
    process.exit(1);
  }

  const catalogue = tours.map((t) => ({
    slug: t.slug,
    title: t.title,
    nights: t.nights,
    price: t.price,
  }));
  fs.writeFileSync(path.join(publicDir, 'tour-catalogue.json'), JSON.stringify(catalogue, null, 2) + '\n', 'utf8');

  console.log(`check-data PASS: ${tours.length} tours, ${regions.length} regions, ${experiences.length} experiences, ${reviews.length} reviews validated.`);
}
