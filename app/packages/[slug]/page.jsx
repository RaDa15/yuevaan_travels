import { notFound } from 'next/navigation';
import Breadcrumb from '@/components/layout/Breadcrumb';
import Badge from '@/components/ui/Badge';
import Icon from '@/components/icons';
import Reveal from '@/components/ui/Reveal';
import SpecsGrid from '@/components/packages/SpecsGrid';
import ConnectedBox from '@/components/packages/ConnectedBox';
import Highlights from '@/components/packages/Highlights';
import TrekMapSection from '@/components/packages/TrekMapSection';
import Itinerary from '@/components/packages/Itinerary';
import Faqs from '@/components/packages/Faqs';
import PackageReviews from '@/components/packages/PackageReviews';
import BookingSidebar from '@/components/packages/BookingSidebar';
import { formatDuration } from '@/lib/format';
import { getAllPackageTours, getExperience, getTourExact, reviewsByTour } from '@/lib/selectors';
import { site } from '@/data/site';
import styles from '@/components/packages/PackageDetail.module.css';

export const dynamicParams = false;

export async function generateStaticParams() {
  return getAllPackageTours().map((t) => ({ slug: t.slug }));
}

export async function generateMetadata({ params }) {
  const { slug } = await params;
  const tour = getTourExact(slug);
  if (!tour || tour.slug === 'custom') return {};

  return {
    title: tour.title,
    description: tour.summary,
    alternates: { canonical: `/packages/${tour.slug}` },
    openGraph: {
      title: `${tour.title} — ${site.name}`,
      description: tour.summary,
      images: [{ url: `${site.url}${tour.heroImage}` }],
    },
  };
}

export default async function PackageDetailPage({ params }) {
  const { slug } = await params;
  const tour = getTourExact(slug);

  if (!tour || tour.slug === 'custom') {
    notFound();
  }

  const primaryCat = getExperience(tour.categories[0]);
  const alertBox = tour.alert || site.packageDefaults.alert;
  const tourReviews = reviewsByTour(tour.slug);

  return (
    <>
      <section className="pkg-hero-banner" aria-label={`${tour.title} Hero Banner`}>
        <img
          src={tour.heroImage}
          alt={tour.heroAlt}
          width={1920}
          height={900}
          fetchPriority="high"
          className="pkg-hero-img"
        />
      </section>

      <Breadcrumb
        variant="package"
        items={[
          { label: 'Home', href: '/' },
          {
            label: primaryCat?.pageTitle || primaryCat?.title || 'Popular Tours',
            href: primaryCat ? `/experiences/${primaryCat.slug}` : '/tours',
          },
          { label: tour.title },
        ]}
      />

      <div className="pkg-layout-container">
        <main id="main-content" className="pkg-main-col">
          <Reveal>
            <div className="pkg-badge-row">
              <span className="pkg-badge-dot" aria-hidden="true" />
              <span>
                {tour.badge} · {formatDuration(tour.days, tour.nights, 'long')}
              </span>
            </div>
            <h1 className="pkg-page-title">{tour.title}</h1>

            <div className="pkg-meta-row">
              <div className={styles.metaActions}>
                <Badge variant="pill">
                  <Icon name="star" size={14} className={styles.metaStarIcon} />
                  <strong className={styles.metaRatingNum}>{tour.rating}</strong>
                  <span className={styles.metaReviewCount}>{`${tour.reviewCount} reviews`}</span>
                </Badge>
                <Badge variant="pill">
                  <Icon name="shieldCheck" size={15} className={styles.metaShieldIcon} />
                  <span>Official DoT-licensed guide</span>
                </Badge>
              </div>
              <a href="#itinerary" className={styles.jumpItineraryLink}>
                <span>Jump to itinerary</span>
                <span aria-hidden="true">↓</span>
              </a>
            </div>

            <SpecsGrid tour={tour} />

            <ConnectedBox
              places={tour.places}
              primaryRegion={tour.regions[0]}
              includedExperiences={tour.includedExperiences}
            />

            <div className="pkg-festival-alert">
              <span className={styles.alertIcon} aria-hidden="true">✨</span>
              <div>
                <h2 className={styles.alertTitle}>{alertBox.title}</h2>
                <p className={styles.alertText}>{alertBox.text}</p>
              </div>
            </div>
          </Reveal>

          <Reveal delay={60}>
            <Highlights items={tour.highlights} />
          </Reveal>

          {tour.maps && tour.maps.length > 0 ? (
            <Reveal delay={90}>
              <TrekMapSection
                mapIds={tour.maps}
                mapIntro={tour.mapIntro}
                tourTitle={tour.title}
              />
            </Reveal>
          ) : null}

          <Reveal delay={120}>
            <Itinerary days={tour.itinerary} />
          </Reveal>

          <Reveal delay={150}>
            <Faqs items={tour.faqs} />
          </Reveal>

          {tourReviews.length > 0 ? (
            <Reveal delay={180}>
              <PackageReviews reviews={tourReviews} />
            </Reveal>
          ) : null}
        </main>

        <BookingSidebar slug={tour.slug} price={tour.price} />
      </div>
    </>
  );
}
