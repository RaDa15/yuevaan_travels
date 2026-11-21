import { notFound } from 'next/navigation';
import Breadcrumb from '@/components/layout/Breadcrumb';
import CatalogCard from '@/components/cards/CatalogCard';
import Button from '@/components/ui/Button';
import Reveal from '@/components/ui/Reveal';
import ExperienceRegionCard from '@/components/experiences/ExperienceRegionCard';
import TrekHubSection from '@/components/experiences/TrekHubSection';
import { formatDuration, formatUSD } from '@/lib/format';
import { experiences } from '@/data/experiences';
import { regions } from '@/data/regions';
import { getExperience, toursByCategory } from '@/lib/selectors';
import { site } from '@/data/site';
import styles from '@/components/experiences/Experiences.module.css';

export const dynamicParams = false;

export async function generateStaticParams() {
  return experiences.map((exp) => ({ slug: exp.slug }));
}

export async function generateMetadata({ params }) {
  const { slug } = await params;
  const exp = getExperience(slug);
  if (!exp) return {};

  return {
    title: exp.pageTitle,
    description: `${exp.cardDesc} Best time: ${exp.bestTime}.`,
    alternates: { canonical: `/experiences/${exp.slug}` },
    openGraph: {
      title: `${exp.pageTitle} — ${site.name}`,
      description: exp.cardDesc,
      images: [{ url: `${site.url}${exp.image.src}` }],
    },
  };
}

export default async function ExperienceDetailPage({ params }) {
  const { slug } = await params;
  const exp = getExperience(slug);

  if (!exp) {
    notFound();
  }

  const matchingTours = toursByCategory(exp.slug);
  const matchingRegions = regions.filter((r) => Boolean(exp.regions?.[r.slug]));

  return (
    <main id="main-content" className={`section ${styles.detailMain}`}>
      <Breadcrumb
        items={[
          { label: 'Home', href: '/' },
          { label: exp.pageTitle },
        ]}
      />

      <div className={`container ${styles.detailContainer}`}>
        <div className="catalog-header-bar">
          <h1 className="catalog-page-title">{exp.pageTitle}</h1>
        </div>

        {matchingTours.length > 0 ? (
          <div className="catalog-grid">
            {matchingTours.map((tour, idx) => (
              <Reveal key={tour.slug} delay={idx * 75}>
                <CatalogCard
                  href={`/packages/${tour.slug}`}
                  badge={tour.badge}
                  image={tour.heroImage}
                  alt={tour.title}
                  title={tour.title}
                  metaLeft={{ icon: '⏱', text: formatDuration(tour.days, tour.nights, 'short') }}
                  metaRight={{ icon: '⭐', text: `${tour.reviewCount} reviews` }}
                  footerLabel="Starting from"
                  footerValue={formatUSD(tour.price)}
                />
              </Reveal>
            ))}
          </div>
        ) : (
          <div className={styles.emptyState}>
            <p className={styles.emptyStateText}>Tell us what you’d like — we’ll design it.</p>
            <Button href="/plan-my-trip?tour=custom" variant="primary">
              Plan Custom Journey →
            </Button>
          </div>
        )}

        {exp.trekHub ? (
          <Reveal delay={90}>
            <TrekHubSection
              title={exp.trekHub.title}
              intro={exp.trekHub.intro}
              defaultTrek={exp.trekHub.defaultTrek}
            />
          </Reveal>
        ) : null}

        <section className={styles.regionSection} aria-labelledby="experience-regions-title">
          <div className={styles.regionSectionHead}>
            <span className={styles.eyebrow}>
              <span className={styles.eyebrowDot} aria-hidden="true" />
              REGIONS &amp; LOCATIONS
            </span>
            <h2 id="experience-regions-title" className={styles.regionSectionTitle}>
              Available Regions &amp; Specific Locations
            </h2>
            <p className={styles.regionSectionDesc}>
              Discover where {exp.pageTitle.toLowerCase()} can be experienced across the Kingdom. Click any region to view destinations and bespoke tour packages.
            </p>
          </div>

          <div className={styles.regionsStack}>
            {matchingRegions.map((reg) => (
              <ExperienceRegionCard
                key={reg.slug}
                region={reg}
                details={exp.regions[reg.slug]}
              />
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}
