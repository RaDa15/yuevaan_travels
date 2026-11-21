import { experiences } from '../data/experiences.js';
import { regions } from '../data/regions.js';
import { tours } from '../data/tours.js';

const regionsBySlug = new Map(regions.map((r) => [r.slug, r]));
const experiencesBySlug = new Map(experiences.map((e) => [e.slug, e]));

const SITE_MATCHERS = {
  'paro chhu riverbank': { primary: ['paro chhu', 'ibisbill', 'riverbank'], fallback: ['paro'] },
  'dochula pass (3,120 m)': { primary: ['dochula', 'dochu la'], fallback: [] },
  'lampelri royal botanical park': { primary: ['lampelri'], fallback: ['dochula', 'thimphu'] },
  'punakha pho chhu': { primary: ['pho chhu', 'white-bellied heron'], fallback: ['punakha'] },
  'phobjikha glacial valley': { primary: ['phobjikha'], fallback: ['gangtey'] },
  'pele la pass (3,420 m)': { primary: ['pele la'], fallback: [] },
  'trongsa gorge': { primary: ['trongsa'], fallback: [] },
  'ura valley': { primary: ['ura'], fallback: ['bumthang'] },
  'lingmethang forest mile': { primary: ['lingmethang'], fallback: [] },
  'bumdeling wildlife sanctuary': { primary: ['bumdeling'], fallback: ['trashiyangtse', 'trashigang', 'lingmethang'] },
  'korphu forests': { primary: ['korphu'], fallback: ['lingmethang', 'trongsa'] },
  'zhemgang subtropical escarpments': { primary: ['zhemgang'], fallback: [] },
  'royal manas national park': { primary: ['royal manas', 'manas'], fallback: [] },
  'foothills': { primary: ['gelephu', 'zhemgang', 'manas'], fallback: [] },
  'classic druk path (paro to thimphu ridge)': {
    primary: ['druk path', 'jimilangtsho', 'simkotra', 'phajoding'],
    fallback: [],
  },
  'taktsang (tiger’s nest) hike': { primary: ['taktsang', "tiger's nest"], fallback: [] },
  'bumdra cliff trek': { primary: ['bumdra', 'bumdrak'], fallback: ['taktsang'] },
  'jomolhari base camp': { primary: ['jomolhari', 'jangothang', 'nyile la', 'lingshi'], fallback: [] },
  'bumthang owl trek': { primary: ['owl trek', 'dhur', 'tharpaling', 'zambhalha'], fallback: ['bumthang'] },
  'gangtey glacial nature trail': { primary: ['gangtey', 'phobjikha'], fallback: [] },
  'ura valley ridge walks': { primary: ['ura', 'bumthang'], fallback: [] },
  'merak & sakteng semi-nomadic brokpa trail': { primary: ['merak', 'sakteng', 'brokpa'], fallback: [] },
  'rodung la historic pass': { primary: ['rodung'], fallback: ['merak', 'trashigang', 'bumthang'] },
  'motithang takin preserve (thimphu)': { primary: ['takin', 'motithang'], fallback: ['thimphu'] },
  'jigme dorji national park': { primary: ['jigme dorji', 'gasa', 'jomolhari', 'lingshi'], fallback: [] },
  'lampelri botanical reserve': { primary: ['lampelri'], fallback: ['dochula'] },
  'phobjikha glacial wetland reserve': { primary: ['phobjikha'], fallback: ['gangtey'] },
  'black mountains national park': {
    primary: ['black mountain', 'black mountains'],
    fallback: ['pele la', 'phobjikha', 'trongsa'],
  },
  'trongsa corridors': { primary: ['trongsa'], fallback: [] },
  'sakteng wildlife sanctuary': { primary: ['sakteng'], fallback: ['merak', 'brokpa'] },
  'bumdeling crane wetland reserve': { primary: ['bumdeling'], fallback: ['trashiyangtse', 'lingmethang'] },
  'royal manas national park (crown jewel sanctuary)': { primary: ['royal manas', 'manas'], fallback: [] },
  'manas river basin': { primary: ['manas'], fallback: [] },
  'punakha dzong': { primary: ['punakha dzong'], fallback: ['punakha'] },
  'paro rinpung dzong': { primary: ['rinpung dzong', 'paro dzong'], fallback: ['paro'] },
  'national institute of zorig chusum (thimphu)': {
    primary: ['zorig chusum', '13 traditional', 'painting school', 'arts and crafts'],
    fallback: ['thimphu'],
  },
  'tashichho dzong': { primary: ['tashichho'], fallback: ['thimphu'] },
  'trongsa dzong (ancestral seat)': { primary: ['trongsa dzong', 'trongsa'], fallback: [] },
  'ta dzong museum of monarchs': { primary: ['ta dzong'], fallback: ['trongsa'] },
  'bumthang sacred valleys': { primary: ['bumthang', 'jakar', 'kurjey', 'jambay'], fallback: [] },
  'yathra weaving': { primary: ['yathra', 'chhume'], fallback: ['bumthang'] },
  'lhuntse dzong': { primary: ['lhuntse'], fallback: ['trashigang', 'mongar'] },
  'khoma royal weaving village': { primary: ['khoma'], fallback: ['trashigang', 'brokpa'] },
  'trashiyangtse dappa woodcrafts': { primary: ['trashiyangtse', 'dappa'], fallback: [] },
  'gelephu mindfulness city masterplan': { primary: ['gelephu'], fallback: [] },
  'southern cultural gateways': { primary: ['southern gateway', 'gelephu', 'phuentsholing'], fallback: [] },
  'tiger’s nest sacred caves': { primary: ['taktsang', "tiger's nest"], fallback: [] },
  'cheri dorjeden monastery': { primary: ['cheri'], fallback: ['thimphu'] },
  'kyichu lhakhang (659 ad)': { primary: ['kyichu'], fallback: ['paro'] },
  'dochula 108 chortens': { primary: ['dochula', 'dochu la', '108'], fallback: [] },
  'kurjey lhakhang (guru rinpoche body imprint)': { primary: ['kurjey'], fallback: ['bumthang'] },
  'jambay lhakhang': { primary: ['jambay lhakhang', 'jambay'], fallback: ['bumthang'] },
  'mebar tsho (burning lake)': { primary: ['mebar tsho', 'burning lake'], fallback: ['bumthang'] },
  'gangtey goenpa': { primary: ['gangtey'], fallback: ['phobjikha'] },
  'chorten kora (nepalese-style stupa)': { primary: ['chorten kora'], fallback: ['trashiyangtse'] },
  'gom kora sacred meditation caves': { primary: ['gom kora', 'gomkora'], fallback: ['trashigang'] },
  'paro tshechu (march/april)': { primary: ['paro tshechu', 'thongdrel'], fallback: [] },
  'thimphu tshechu (september/october)': { primary: ['thimphu tshechu', 'tashichho'], fallback: [] },
  'punakha drubchen': { primary: ['drubchen', 'punakha dzong'], fallback: ['punakha'] },
  'jambay lhakhang drup (midnight fire dance)': {
    primary: ['jambay lhakhang drup', 'mewang', 'fire dance'],
    fallback: ['jambay'],
  },
  'black-necked crane festival (phobjikha)': { primary: ['crane', 'phobjikha', 'gangtey'], fallback: [] },
  'ura yakchoe': { primary: ['ura'], fallback: ['bumthang'] },
  'chorten kora circumambulation festival': { primary: ['chorten kora'], fallback: [] },
  'gomkora tshechu': { primary: ['gom kora', 'gomkora'], fallback: ['trashigang'] },
  'merak achi lhamo': { primary: ['merak', 'brokpa'], fallback: [] },
  'punakha mo chhu & pho chhu rivers': { primary: ['mo chhu', 'pho chhu', 'rafting'], fallback: ['punakha'] },
  'chele la pass (3,988 m)': { primary: ['chele la'], fallback: [] },
  'paro valley archery ranges': { primary: ['archery'], fallback: ['paro'] },
  'manas river rafting safari': { primary: ['manas'], fallback: [] },
  'subtropical jungle mountain biking': { primary: ['manas', 'gelephu', 'zhemgang'], fallback: [] },
  'dochula 108 chortens sunrise': { primary: ['dochula', 'dochu la'], fallback: [] },
  'tiger’s nest dawn clifftop light': { primary: ['taktsang', "tiger's nest"], fallback: [] },
  'punakha dzong river reflection': { primary: ['punakha dzong'], fallback: ['punakha'] },
  'ura stone village': { primary: ['ura'], fallback: ['bumthang'] },
  'phobjikha glacial mist': { primary: ['phobjikha'], fallback: ['gangtey'] },
  'trongsa monastic courtyard portraits': { primary: ['trongsa'], fallback: [] },
  'brokpa yak nomad encampments (merak)': { primary: ['brokpa', 'merak'], fallback: [] },
  'khoma backstrap weavers': { primary: ['khoma'], fallback: ['trashigang'] },
  'chorten kora stupa': { primary: ['chorten kora'], fallback: [] },
  'royal manas subtropical canopy': { primary: ['royal manas', 'manas'], fallback: [] },
  'morning riverboat mist on the manas': { primary: ['manas'], fallback: [] },
  'paro farmhouse homestay': { primary: ['farmhouse'], fallback: ['paro'] },
  'menchu river-stone bath': { primary: ['stone bath', 'hot stone', 'menchu'], fallback: [] },
  'ema datshi cooking class': { primary: ['cooking', 'ema datshi'], fallback: ['farmhouse'] },
  'archery': { primary: ['archery'], fallback: [] },
  'bumthang farmhouse stays': { primary: ['farmhouse', 'bumthang'], fallback: [] },
  'yathra wool weaving': { primary: ['yathra', 'chhume'], fallback: ['bumthang'] },
  'buckwheat noodle (puta) making': { primary: ['buckwheat', 'puta'], fallback: ['bumthang'] },
  'brokpa nomad yak-felt living in merak': { primary: ['brokpa', 'merak'], fallback: [] },
  'desho handmade daphne papermaking': { primary: ['desho'], fallback: ['trashiyangtse', 'trashigang'] },
  'manas eco-camp lodges': { primary: ['manas'], fallback: [] },
  'organic cardamom & citrus farming homestays': { primary: ['gelephu', 'manas', 'zhemgang'], fallback: [] },
};

function normalizeText(value) {
  return (value || '')
    .toLowerCase()
    .replace(/[\u2018\u2019']/g, "'")
    .replace(/\s+/g, ' ')
    .trim();
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function hasTerm(text, term) {
  return new RegExp(`\\b${escapeRegExp(term)}\\b`, 'i').test(text);
}

function buildFallbackTerms(siteName) {
  const clean = siteName.replace(/\(.*?\)/g, ' ');
  return [
    ...new Set(
      normalizeText(clean)
        .replace(/[^a-z0-9\s]/g, ' ')
        .split(/\s+/)
        .filter((word) => word.length >= 4)
    ),
  ];
}

/** Convert a site location label into a deterministic kebab-case URL slug. */
export function slugifySite(name) {
  return (name || '')
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

function evaluateSiteTours(regionSlug, categorySlug, siteName, terms) {
  return tours
    .filter((tour) => tour.slug !== 'custom')
    .map((tour) => {
      const matchedDayNumbers = tour.itinerary
        .map((day, idx) => ({
          dayNum: idx + 1,
          text: normalizeText(`${day.title} ${(day.body || []).join(' ')}`),
        }))
        .filter((day) => terms.some((term) => hasTerm(day.text, term)))
        .map((day) => day.dayNum);

      const metaText = normalizeText(
        [
          ...(tour.places || []),
          tour.title,
          tour.summary,
          ...(tour.highlights || []),
          tour.mapIntro || '',
          ...(tour.maps || []),
        ].join(' ')
      );
      const metaHit = terms.some((term) => hasTerm(metaText, term));
      const isRegionMatch = tour.regions.includes(regionSlug);
      const isCategoryMatch =
        tour.categories.includes(categorySlug) || (tour.includedExperiences || []).includes(categorySlug);

      const score =
        (isCategoryMatch ? 30 : 0) +
        (isRegionMatch ? 20 : 0) +
        matchedDayNumbers.length * 10 +
        (metaHit ? 8 : 0);

      return {
        tour,
        matchedDayNumbers,
        metaHit,
        isRegionMatch,
        isCategoryMatch,
        score,
      };
    })
    .filter((entry) => entry.matchedDayNumbers.length > 0 || entry.metaHit)
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      if (b.tour.reviewCount !== a.tour.reviewCount) return b.tour.reviewCount - a.tour.reviewCount;
      return a.tour.title.localeCompare(b.tour.title);
    });
}

/** Find matching tour packages and day numbers for a specific site in a region & experience. */
export function getToursForSite(regionSlug, categorySlug, siteName) {
  const matcher = SITE_MATCHERS[siteName.toLowerCase()];
  const primaryTerms = matcher?.primary || buildFallbackTerms(siteName);
  const fallbackTerms = matcher?.fallback || [];

  const primaryMatches = evaluateSiteTours(regionSlug, categorySlug, siteName, primaryTerms);
  if (primaryMatches.length > 0) {
    return primaryMatches.map((item) => ({ ...item, matchType: 'exact' }));
  }

  if (fallbackTerms.length > 0) {
    const fallbackMatches = evaluateSiteTours(regionSlug, categorySlug, siteName, fallbackTerms);
    if (fallbackMatches.length > 0) {
      return fallbackMatches.map((item) => ({ ...item, matchType: 'corridor' }));
    }
  }

  return tours
    .filter((tour) => tour.slug !== 'custom' && tour.regions.includes(regionSlug))
    .map((tour) => ({
      tour,
      matchedDayNumbers: [],
      metaHit: false,
      isRegionMatch: true,
      isCategoryMatch:
        tour.categories.includes(categorySlug) || (tour.includedExperiences || []).includes(categorySlug),
      score: 1,
      matchType: 'corridor',
    }));
}

/** Return curated tour packages relevant to a region × experience page. */
export function getToursForRegionExperience(regionSlug, categorySlug) {
  const exact = tours
    .filter(
      (tour) =>
        tour.slug !== 'custom' &&
        tour.regions.includes(regionSlug) &&
        tour.categories.includes(categorySlug)
    )
    .sort((a, b) => b.reviewCount - a.reviewCount || a.title.localeCompare(b.title));

  if (exact.length > 0) return exact;

  return tours
    .filter(
      (tour) =>
        tour.slug !== 'custom' &&
        tour.regions.includes(regionSlug) &&
        (tour.includedExperiences || []).includes(categorySlug)
    )
    .sort((a, b) => b.reviewCount - a.reviewCount || a.title.localeCompare(b.title));
}

/** Return all valid { region, category } pairs for static generation. */
export function getAllRegionExperienceParams() {
  const params = [];
  for (const exp of experiences) {
    for (const regionSlug of Object.keys(exp.regions || {})) {
      params.push({ region: regionSlug, category: exp.slug });
    }
  }
  return params;
}

/** Return all valid { region, category, site } tuples for static generation. */
export function getAllSiteParams() {
  const params = [];
  for (const exp of experiences) {
    for (const [regionSlug, regionDetails] of Object.entries(exp.regions || {})) {
      for (const loc of regionDetails.locations) {
        params.push({
          region: regionSlug,
          category: exp.slug,
          site: slugifySite(loc),
        });
      }
    }
  }
  return params;
}

/** Resolve a region × experience page's sites and matching packages. */
export function getRegionExperienceData(regionSlug, categorySlug) {
  const region = regionsBySlug.get(regionSlug) || null;
  const experience = experiencesBySlug.get(categorySlug) || null;
  if (!region || !experience) return null;

  const regionDetails = experience.regions?.[regionSlug];
  if (!regionDetails) return null;

  const sites = regionDetails.locations.map((name, idx) => {
    const slug = slugifySite(name);
    const matches = getToursForSite(regionSlug, categorySlug, name);
    return {
      name,
      slug,
      index: idx,
      image: experience.imagePool[idx % experience.imagePool.length],
      alt: `${name} — ${experience.title} in ${region.name}`,
      tourCount: matches.length,
    };
  });

  const matchingTours = getToursForRegionExperience(regionSlug, categorySlug);

  return {
    region,
    experience,
    regionDetails,
    sites,
    matchingTours,
  };
}

/** Resolve a specific site's details, sibling sites, and matching itineraries. */
export function getSiteItineraryData(regionSlug, categorySlug, siteSlug) {
  const group = getRegionExperienceData(regionSlug, categorySlug);
  if (!group) return null;

  const siteItem = group.sites.find((s) => s.slug === siteSlug) || null;
  if (!siteItem) return null;

  const matchedTours = getToursForSite(regionSlug, categorySlug, siteItem.name);
  const siblingSites = group.sites.filter((s) => s.slug !== siteSlug);

  return {
    region: group.region,
    experience: group.experience,
    regionDetails: group.regionDetails,
    site: siteItem,
    totalSitesCount: group.sites.length,
    siblingSites,
    matchedTours,
  };
}
