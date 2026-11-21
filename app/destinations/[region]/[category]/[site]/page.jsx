import { notFound } from 'next/navigation';
import Breadcrumb from '@/components/layout/Breadcrumb';
import PageHero from '@/components/sections/PageHero';
import MixMatchCta from '@/components/sections/MixMatchCta';
import CatalogCard from '@/components/cards/CatalogCard';
import SiteItinerariesList from '@/components/destinations/SiteItinerariesList';
import {
  getAllSiteParams,
  getSiteItineraryData,
} from '@/lib/siteItineraries';
import { site as siteConfig } from '@/data/site';
import styles from '@/components/destinations/Destinations.module.css';

export const dynamicParams = false;

export async function generateStaticParams() {
  return getAllSiteParams();
}

export async function generateMetadata({ params }) {
  const { region: regionSlug, category: categorySlug, site: siteSlug } = await params;
  const data = getSiteItineraryData(regionSlug, categorySlug, siteSlug);
  if (!data) return {};

  const { region, experience, site: siteItem, matchedTours } = data;
  const title = `${siteItem.name} — ${experience.title} in ${region.name}`;
  const description = `Browse ${matchedTours.length} Bhutan tour ${matchedTours.length === 1 ? 'itinerary' : 'itineraries'} covering ${siteItem.name} (${region.name}). Best time: ${experience.bestTime}.`;

  return {
    title,
    description,
    alternates: { canonical: `/destinations/${region.slug}/${experience.slug}/${siteItem.slug}` },
    openGraph: {
      title: `${title} — ${siteConfig.name}`,
      description,
      images: [{ url: `${siteConfig.url}${siteItem.image}` }],
    },
  };
}

export default async function SiteItineraryPage({ params }) {
  const { region: regionSlug, category: categorySlug, site: siteSlug } = await params;
  const data = getSiteItineraryData(regionSlug, categorySlug, siteSlug);

  if (!data) {
    notFound();
  }

  const {
    region,
    experience,
    regionDetails,
    site: siteItem,
    totalSitesCount,
    siblingSites,
    matchedTours,
  } = data;

  const serializedTours = matchedTours.map((entry) => ({
    tour: {
      slug: entry.tour.slug,
      title: entry.tour.title,
      summary: entry.tour.summary,
      badge: entry.tour.badge,
      days: entry.tour.days,
      nights: entry.tour.nights,
      price: entry.tour.price,
      rating: entry.tour.rating,
      reviewCount: entry.tour.reviewCount,
      specs: { grade: entry.tour.specs?.grade || '' },
      itinerary: entry.tour.itinerary,
    },
    matchedDayNumbers: entry.matchedDayNumbers,
    isCategoryMatch: entry.isCategoryMatch,
    matchType: entry.matchType,
  }));

  return (
    <>
      <Breadcrumb
        items={[
          { label: 'Home', href: '/' },
          { label: region.name, href: `/destinations#${region.slug}` },
          {
            label: experience.title,
            href: `/destinations/${region.slug}/${experience.slug}`,
          },
          { label: siteItem.name },
        ]}
      />

      <PageHero
        eyebrow={`${region.name.toUpperCase()} · ${experience.title.toUpperCase()}`}
        title={siteItem.name}
        description={`${regionDetails.highlights} Best season: ${experience.bestTime} · Elevation: ${region.elevation}.`}
        image={siteItem.image}
        alt={siteItem.alt}
        actions={[
          { label: 'Plan custom trip →', href: '/plan-my-trip?tour=custom', variant: 'primary' },
          {
            label: `← All ${totalSitesCount} ${experience.title} Sites`,
            href: `/destinations/${region.slug}/${experience.slug}`,
            variant: 'secondary',
          },
        ]}
      />

      <main id="main-content" className="section">
        <div className="container">
          <section aria-labelledby="site-itineraries-heading">
            <div className={styles.sectionHeadRow}>
              <div>
                <span className={styles.eyebrowRow}>
                  <span className={styles.eyebrowDot} aria-hidden="true" />
                  LOCATION ITINERARIES
                </span>
                <h2 id="site-itineraries-heading" className={styles.sectionTitle}>
                  {`Itineraries featuring ${siteItem.name}`}
                </h2>
                <p className={styles.sectionSubhead}>
                  Matching day(s) are expanded below. Click any day to explore the full route, or open a complete tour package for pricing and booking.
                </p>
              </div>
            </div>

            <SiteItinerariesList
              siteName={siteItem.name}
              experienceTitle={experience.title}
              items={serializedTours}
            />
          </section>

          {siblingSites.length > 0 ? (
            <section
              className={styles.siblingSitesSection}
              aria-labelledby="sibling-sites-heading"
            >
              <div className={styles.sectionHeadRow}>
                <div>
                  <span className={styles.eyebrowRow}>
                    <span className={styles.eyebrowDot} aria-hidden="true" />
                    MORE IN {region.name.toUpperCase()}
                  </span>
                  <h2 id="sibling-sites-heading" className={styles.sectionTitle}>
                    {`Other ${experience.title.toLowerCase()} sites in ${region.name}`}
                  </h2>
                </div>
              </div>

              <div className="dest-cat-items-grid">
                {siblingSites.map((sib) => (
                  <CatalogCard
                    key={sib.slug}
                    href={`/destinations/${region.slug}/${experience.slug}/${sib.slug}`}
                    badge={experience.title}
                    image={sib.image}
                    alt={sib.alt}
                    title={sib.name}
                    metaLeft={{ icon: '📍', text: region.name }}
                    metaRight={{
                      icon: '🗓',
                      text: `${sib.tourCount} ${sib.tourCount === 1 ? 'itinerary' : 'itineraries'}`,
                    }}
                    footerLabel="Location Itineraries"
                    footerValue="View Itineraries"
                    headingLevel="h3"
                  />
                ))}
              </div>
            </section>
          ) : null}
        </div>
      </main>

      <MixMatchCta
        title={`Include ${siteItem.name} in your private Bhutan trip`}
        description="Every Yuevaan journey is private and customizable. Share your preferred dates and our Thimphu guides will tailor the route around this location."
      />
    </>
  );
}
