import RegionSwitcher from '@/components/destinations/RegionSwitcher';
import { regions } from '@/data/regions';
import { experiences } from '@/data/experiences';
import { toursByRegion } from '@/lib/selectors';
import { getToursForSite, slugifySite } from '@/lib/siteItineraries';
import { site } from '@/data/site';

export const metadata = {
  title: 'Destinations in Bhutan',
  description:
    "Explore Bhutan's four distinct regions: Western Bhutan, Central spiritual heartlands, Eastern untamed valleys, and Southern subtropical wildlife reserves.",
  alternates: { canonical: '/destinations' },
  openGraph: {
    title: 'Destinations in Bhutan — Yuevaan Bhutan Travels',
    description:
      "Explore Bhutan's four distinct regions: Western, Central, Eastern, and Southern Bhutan.",
    images: [{ url: `${site.url}/images/tigers-nest.jpg` }],
  },
};

export default function DestinationsPage() {
  const regionsData = regions.map((region) => {
    const regionCategories = experiences
      .filter((exp) => Boolean(exp.regions?.[region.slug]))
      .map((exp) => ({
        slug: exp.slug,
        title: exp.title,
        icon: exp.icon,
        imagePool: exp.imagePool,
        locations: exp.regions[region.slug].locations,
        sites: exp.regions[region.slug].locations.map((loc) => ({
          name: loc,
          slug: slugifySite(loc),
          tourCount: getToursForSite(region.slug, exp.slug, loc).length,
        })),
        highlights: exp.regions[region.slug].highlights,
        mapHref: exp.regions[region.slug].mapHref || null,
      }));

    return {
      region,
      categories: regionCategories,
      tours: toursByRegion(region.slug),
    };
  });

  return <RegionSwitcher regionsData={regionsData} />;
}
