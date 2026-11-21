import test from 'node:test';
import assert from 'node:assert/strict';
import {
  formatUSD,
  formatDuration,
  addNightsUTC,
  formatDisplayDate,
  getBookingDateBounds,
  parseDestinationSpec,
  parseGradeSpec,
  parseCompoundSpec,
  parseHighestPointSpec,
  parseGroupSizeSpec,
} from '../lib/format.js';
import { getTour, toursByRegion, toursByCategory, popularTours, reviewsByTour } from '../lib/selectors.js';
import {
  getAllRegionExperienceParams,
  getAllSiteParams,
  getRegionExperienceData,
  getSiteItineraryData,
} from '../lib/siteItineraries.js';
import { experiences } from '../data/experiences.js';

test('BR-01 formatUSD formats whole USD without space or decimals', () => {
  assert.equal(formatUSD(2450), 'US$2,450');
  assert.equal(formatUSD(13230), 'US$13,230');
});

test('BR-02 formatDuration derives long, short, and meta labels', () => {
  assert.equal(formatDuration(12, 11, 'long'), '12 Days / 11 Nights');
  assert.equal(formatDuration(12, 11, 'short'), '12D/11N');
  assert.equal(formatDuration(12, 11, 'meta'), '12 days / 11 nights · Private trip');
});

test('BR-04 addNightsUTC & formatDisplayDate compute UTC departure cleanly', () => {
  const end = addNightsUTC('2027-04-05', 11);
  assert.equal(end, '2027-04-16');
  assert.equal(formatDisplayDate(end), 'Fri 16 Apr 2027');
});

test('BR-07 getBookingDateBounds computes +60 default, +14 min, +730 max', () => {
  const bounds = getBookingDateBounds(new Date('2026-11-17T08:00:00Z'));
  assert.equal(bounds.defaultStart, '2027-01-16');
  assert.equal(bounds.minStart, '2026-12-01');
  assert.equal(bounds.maxStart, '2028-11-16');
});

test('BR-08 getTour falls back cleanly to custom on unknown slug', () => {
  assert.equal(getTour('xyz').slug, 'custom');
  assert.equal(getTour('').slug, 'custom');
  assert.equal(getTour('owl-trek').slug, 'owl-trek');
});

test('BR-10 toursByRegion sorts southern-bhutan by reviewCount descending', () => {
  const southern = toursByRegion('southern-bhutan').map((t) => t.slug);
  assert.deepEqual(southern, ['royal-manas-wilderness', 'manas-birding']);
});

test('BR-11 toursByCategory sorts festivals-events and trekking-hiking accurately', () => {
  const festivals = toursByCategory('festivals-events').map((t) => t.slug);
  assert.deepEqual(festivals, ['thimphu-tshechu', 'paro-tshechu', 'jambay-lhakhang-drup']);
  const treks = toursByCategory('trekking-hiking');
  assert.equal(treks.length, 5);
});

test('BR-12 popularTours returns 6 ranked tours starting with western-bhutan', () => {
  const pop = popularTours();
  assert.equal(pop.length, 6);
  assert.equal(pop[0].slug, 'western-bhutan');
  assert.deepEqual(
    pop.map((t) => t.popularRank),
    [1, 2, 3, 4, 5, 6]
  );
});

test('BR-17 trekking-hiking omits southern-bhutan', () => {
  const trekExp = experiences.find((e) => e.slug === 'trekking-hiking');
  assert.equal(trekExp.regions['southern-bhutan'], undefined);
});

test('BR-20 reviewsByTour isolates tour-specific reviews', () => {
  assert.ok(reviewsByTour('western-bhutan').length >= 1);
  assert.equal(reviewsByTour('owl-trek').length, 0);
});

test('D-20 siteItineraries resolves all 31 category pages and 92 site itinerary pages', () => {
  const catParams = getAllRegionExperienceParams();
  assert.equal(catParams.length, 31);

  const siteParams = getAllSiteParams();
  assert.equal(siteParams.length, 92);

  const uniqueKeys = new Set(siteParams.map((p) => `${p.region}/${p.category}/${p.site}`));
  assert.equal(uniqueKeys.size, 92);

  const bwWest = getRegionExperienceData('western-bhutan', 'bird-watching');
  assert.ok(bwWest);
  assert.equal(bwWest.sites.length, 4);
  assert.ok(bwWest.matchingTours.some((t) => t.slug === 'crane-birding'));

  const lampelri = getSiteItineraryData('western-bhutan', 'bird-watching', 'lampelri-royal-botanical-park');
  assert.ok(lampelri);
  assert.equal(lampelri.matchedTours[0].tour.slug, 'crane-birding');
  assert.deepEqual(lampelri.matchedTours[0].matchedDayNumbers, [6]);

  for (const p of siteParams) {
    const details = getSiteItineraryData(p.region, p.category, p.site);
    assert.ok(details, `Missing site details for ${p.region}/${p.category}/${p.site}`);
    assert.ok(details.matchedTours.length >= 1, `No matched tours for ${p.region}/${p.category}/${p.site}`);
  }
});

test('D-22 Trip Facts spec parsers split destination, grade level, stay/transport, elevation, and group size', () => {
  assert.deepEqual(parseDestinationSpec('Western Bhutan (Paro Valley)'), {
    primary: 'Paro Valley',
    secondary: 'Western Bhutan',
  });
  assert.deepEqual(parseDestinationSpec('Western Bhutan (Central Bhutan)'), {
    primary: 'Western Bhutan',
    secondary: '+ Central Bhutan',
  });
  assert.deepEqual(parseGradeSpec('Moderate High Trek'), {
    primary: 'Moderate High Trek',
    level: 4,
  });
  assert.deepEqual(parseGradeSpec('Strenuous High Altitude Trek'), {
    primary: 'Strenuous High Altitude Trek',
    level: 5,
  });
  assert.deepEqual(parseCompoundSpec('Wilderness Camps & Heritage Hotels'), {
    primary: 'Wilderness Camps',
    secondary: '+ Heritage Hotels',
  });
  assert.deepEqual(parseHighestPointSpec('4,200 m · Simkotra Pass'), {
    primary: '4,200 m',
    secondary: 'Simkotra Pass · 13,780 ft',
  });
  assert.deepEqual(parseGroupSizeSpec('Private / 1–12 Trekkers'), {
    primary: 'Private, 1–12',
    secondary: 'trekkers per group',
  });
});
