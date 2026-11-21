import { tours } from '../data/tours.js';
import { regions } from '../data/regions.js';
import { experiences } from '../data/experiences.js';
import { reviews } from '../data/reviews.js';
import { treks } from '../data/treks.js';

const toursBySlug = new Map(tours.map((t) => [t.slug, t]));
const regionsBySlug = new Map(regions.map((r) => [r.slug, r]));
const experiencesBySlug = new Map(experiences.map((e) => [e.slug, e]));
const treksById = new Map(treks.map((tr) => [tr.id, tr]));

const sortTours = (a, b) => {
  if (b.reviewCount !== a.reviewCount) return b.reviewCount - a.reviewCount;
  return a.title.localeCompare(b.title);
};

export function getAllPackageTours() {
  return tours.filter((t) => t.slug !== 'custom');
}

export function getTour(slug) {
  return toursBySlug.get(slug) || toursBySlug.get('custom');
}

export function getTourExact(slug) {
  return toursBySlug.get(slug) || null;
}

// BR-10: Tours whose regions include regionSlug, sorted by reviewCount desc then title
export function toursByRegion(regionSlug) {
  return tours
    .filter((t) => t.slug !== 'custom' && t.regions.includes(regionSlug))
    .sort(sortTours);
}

// BR-11: Tours whose categories include categorySlug, sorted by reviewCount desc then title
export function toursByCategory(categorySlug) {
  return tours
    .filter((t) => t.slug !== 'custom' && t.categories.includes(categorySlug))
    .sort(sortTours);
}

// BR-12: Popular tours with popularRank 1-6 ascending
export function popularTours(limit = 6) {
  return tours
    .filter((t) => t.slug !== 'custom' && typeof t.popularRank === 'number')
    .sort((a, b) => a.popularRank - b.popularRank)
    .slice(0, limit);
}

export function getRegion(slug) {
  return regionsBySlug.get(slug) || regions[0];
}

export function getExperience(slug) {
  return experiencesBySlug.get(slug) || null;
}

export function experiencesByRegion(regionSlug) {
  if (!regionSlug || regionSlug === 'all') return experiences;
  return experiences.filter((exp) => Boolean(exp.regions?.[regionSlug]));
}

// BR-20: Reviews matching specific tourSlug
export function reviewsByTour(tourSlug) {
  return reviews.filter((r) => r.tourSlug === tourSlug);
}

// BR-20: Home ticker reviews
export function homeReviews() {
  return reviews.filter((r) => r.showOnHome);
}

export function getTrekById(id) {
  return treksById.get(id) || null;
}
