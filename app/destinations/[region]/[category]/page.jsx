import Link from 'next/link';
import { notFound } from 'next/navigation';
import Breadcrumb from '@/components/layout/Breadcrumb';
import PageHero from '@/components/sections/PageHero';
import MixMatchCta from '@/components/sections/MixMatchCta';
import CatalogCard from '@/components/cards/CatalogCard';
import Reveal from '@/components/ui/Reveal';
import { formatDuration, formatUSD } from '@/lib/format';
import {
  getAllRegionExperienceParams,
  getRegionExperienceData,
} from '@/lib/siteItineraries';
import { site } from '@/data/site';
import styles from '@/components/destinations/Destinations.module.css';

export const dynamicParams = false;

export async function generateStaticParams() {
  return getAllRegionExperienceParams();
}

export async function generateMetadata({ params }) {
  const { region: regionSlug, category: categorySlug } = await params;
  const data = getRegionExperienceData(regionSlug, categorySlug);
  if (!data) return {};

  const { region, experience, regionDetails, sites } = data;
  const title = `${experience.title} in ${region.name}`;
  const description = `Explore ${sites.length} ${experience.title.toLowerCase()} sites in ${region.name}: ${sites.map((s) => s.name).join(', ')}. ${regionDetails.highlights}`;

  return {
    title,
    description,
    alternates: { canonical: `/destinations/${region.slug}/${experience.slug}` },
    openGraph: {
      title: `${title} — ${site.name}`,
      description,
      images: [{ url: `${site.url}${experience.imagePool[0]}` }],
    },
  };
}

export default async function RegionCategorySitesPage({ params }) {
  const { region: regionSlug, category: categorySlug } = await params;
  const data = getRegionExperienceData(regionSlug, categorySlug);

  if (!data) {
    notFound();
  }

  const { region, experience, regionDetails, sites, matchingTours } = data;
  const siteNoun = sites.length === 1 ? 'site' : 'sites';

  return (
    <>
      <Breadcrumb
        items={[
          { label: 'Home', href: '/' },
          { label: region.name, href: `/destinations#${region.slug}` },
          { label: experience.title },
        ]}
      />

      <PageHero
        eyebrow={`${region.name.toUpperCase()} · ${experience.title.toUpperCase()}`}
        title={`${experience.title} in ${region.name}`}
        description={regionDetails.highlights}
        image={experience.imagePool[0]}
        alt={`${experience.title} in ${region.name}`}
        actions={[
          { label: 'Plan custom trip →', href: '/plan-my-trip?tour=custom', variant: 'primary' },
          { label: `← All ${region.name}`, href: `/destinations#${region.slug}`, variant: 'secondary' },
        ]}
      />

      <main id="main-content" className="section">
        <div className="container">
          <section className={styles.sitesSection} aria-labelledby="sites-heading">
            <div className={styles.sectionHeadRow}>
              <div>
                <span className={styles.eyebrowRow}>
                  <span className={styles.eyebrowDot} aria-hidden="true" />
                  {`${sites.length} FEATURED ${experience.title.toUpperCase()} SITES`}
                </span>
                <h2 id="sites-heading" className={styles.sectionTitle}>
                  {`Explore ${sites.length} ${experience.title.toLowerCase()} ${siteNoun} in ${region.name}`}
                </h2>
                <p className={styles.sectionSubhead}>
                  Select any site below to view the day-by-day tour itineraries and packages visiting that location.
                </p>
              </div>
              {regionDetails.mapHref ? (
                <Link href={regionDetails.mapHref} className={styles.mapCtaPill}>
                  Interactive 3D Trek Maps ↗
                </Link>
              ) : null}
            </div>

            <div className="dest-cat-items-grid">
              {sites.map((siteItem, idx) => (
                <Reveal key={siteItem.slug} delay={Math.min(idx * 60, 360)}>
                  <CatalogCard
                    href={`/destinations/${region.slug}/${experience.slug}/${siteItem.slug}`}
                    badge={experience.title}
                    image={siteItem.image}
                    alt={siteItem.alt}
                    title={siteItem.name}
                    metaLeft={{ icon: '📍', text: region.name }}
                    metaRight={{
                      icon: '🗓',
                      text: `${siteItem.tourCount} ${siteItem.tourCount === 1 ? 'itinerary' : 'itineraries'}`,
                    }}
                    footerLabel="Location Itineraries"
                    footerValue="View Itineraries"
                    headingLevel="h3"
                  />
                </Reveal>
              ))}
            </div>
          </section>

          {matchingTours.length > 0 ? (
            <section aria-labelledby="category-tours-heading">
              <div className={styles.sectionHeadRow}>
                <div>
                  <span className={styles.eyebrowRow}>
                    <span className={styles.eyebrowDot} aria-hidden="true" />
                    CURATED PACKAGES
                  </span>
                  <h2 id="category-tours-heading" className={styles.sectionTitle}>
                    {`${experience.title} tours in ${region.name}`}
                  </h2>
                </div>
              </div>

              <div className="dest-packages-grid">
                {matchingTours.map((tour) => (
                  <CatalogCard
                    key={tour.slug}
                    href={`/packages/${tour.slug}`}
                    badge={tour.badge}
                    image={tour.heroImage}
                    alt={tour.title}
                    title={tour.title}
                    metaLeft={{ icon: '⏱', text: formatDuration(tour.days, tour.nights, 'short') }}
                    metaRight={{ icon: '⭐', text: `${tour.reviewCount} reviews` }}
                    footerLabel="Starting from"
                    footerValue={formatUSD(tour.price)}
                    headingLevel="h3"
                  />
                ))}
              </div>
            </section>
          ) : null}
        </div>
      </main>

      <MixMatchCta
        title={`Combine ${experience.title.toLowerCase()} in ${region.name} into one journey`}
        description={`Tell us which sites in ${region.name} excite you most and our Thimphu desk will design a seamless private itinerary around your dates.`}
      />
    </>
  );
}
