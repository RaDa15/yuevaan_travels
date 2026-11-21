import { site } from '@/data/site';
import { experiences } from '@/data/experiences';
import { getAllPackageTours } from '@/lib/selectors';
import { getAllRegionExperienceParams, getAllSiteParams } from '@/lib/siteItineraries';

export const dynamic = 'force-static';

export default function sitemap() {
  const baseUrl = site.url.replace(/\/+$/, '');
  const now = new Date('2026-11-17T00:00:00Z');

  const staticRoutes = [
    '/',
    '/destinations',
    '/experiences',
    '/tours',
    '/travel-guide',
    '/plan-my-trip',
    '/contact',
    '/about',
    '/legal',
  ].map((route) => ({
    url: `${baseUrl}${route === '/' ? '/' : route}`,
    lastModified: now,
  }));

  const experienceRoutes = experiences.map((exp) => ({
    url: `${baseUrl}/experiences/${exp.slug}`,
    lastModified: now,
  }));

  const packageRoutes = getAllPackageTours().map((tour) => ({
    url: `${baseUrl}/packages/${tour.slug}`,
    lastModified: now,
  }));

  const regionExperienceRoutes = getAllRegionExperienceParams().map(({ region, category }) => ({
    url: `${baseUrl}/destinations/${region}/${category}`,
    lastModified: now,
  }));

  const siteRoutes = getAllSiteParams().map(({ region, category, site: siteSlug }) => ({
    url: `${baseUrl}/destinations/${region}/${category}/${siteSlug}`,
    lastModified: now,
  }));

  return [
    ...staticRoutes,
    ...experienceRoutes,
    ...packageRoutes,
    ...regionExperienceRoutes,
    ...siteRoutes,
  ];
}
