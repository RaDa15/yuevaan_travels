import Breadcrumb from '@/components/layout/Breadcrumb';
import PageHero from '@/components/sections/PageHero';
import MixMatchCta from '@/components/sections/MixMatchCta';
import CatalogCard from '@/components/cards/CatalogCard';
import Reveal from '@/components/ui/Reveal';
import { formatDuration, formatUSD } from '@/lib/format';
import { popularTours } from '@/lib/selectors';
import { site } from '@/data/site';
import styles from '@/components/packages/PackageDetail.module.css';

export const metadata = {
  title: 'Popular Bhutan Tours',
  description:
    'Most booked and highest-rated private Bhutan tours across Paro, Thimphu, Punakha, and Bumthang. Every journey includes licensed guides, private SUV transit, and official SDF.',
  alternates: { canonical: '/tours' },
  openGraph: {
    title: 'Popular Bhutan Tours — Yuevaan Bhutan Travels',
    description:
      'Most booked and highest-rated private Bhutan tours across Paro, Thimphu, Punakha, and Bumthang.',
    images: [{ url: `${site.url}/images/trekking-hiking.jpg` }],
  },
};

export default function ToursPage() {
  const rankedTours = popularTours(6);

  return (
    <>
      <Breadcrumb
        items={[
          { label: 'Home', href: '/' },
          { label: 'Popular Tours' },
        ]}
      />

      <PageHero
        eyebrow="POPULAR TOURS"
        title="Popular Bhutan Tours"
        description="Our most booked and highest-rated Bhutan itineraries across Paro, Thimphu, Punakha, and Bumthang. Every journey is private, flexible, and includes licensed local guides, private SUV transit, heritage stays, and the official SDF."
        image="/images/trekking-hiking.jpg"
        alt="Trekking in the high Himalayas of Bhutan"
      />

      <main id="main-content" className="section">
        <div className="container">
          <Reveal className={styles.toursIntro}>
            <h2 className={styles.toursHeading}>Most booked tours across Bhutan</h2>
            <p className={styles.toursSubhead}>
              Ranked by traveller demand. Each itinerary can be adjusted for your dates, party size, and comfort tier.
            </p>
          </Reveal>

          <div id="toursCatalogGrid" className="catalog-grid">
            {rankedTours.map((tour, idx) => (
              <Reveal key={tour.slug} delay={idx * 75}>
                <CatalogCard
                  href={`/packages/${tour.slug}`}
                  badge={tour.popularRank === 1 ? '#1 Most Popular' : tour.badge}
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
        </div>
      </main>

      <MixMatchCta
        title="Can’t decide which tour is right?"
        description="All our popular tours can be customised around your dates, pace, and hotel tier. Reach out to our Thimphu desk for a bespoke day-by-day plan."
      />
    </>
  );
}
