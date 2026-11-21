import FlightPreloader from '@/components/home/FlightPreloader';
import HeroVideo from '@/components/home/HeroVideo';
import AccreditationsMarquee from '@/components/sections/AccreditationsMarquee';
import HowBookingWorks from '@/components/sections/HowBookingWorks';
import FilmShowcase from '@/components/sections/FilmShowcase';
import StorySection from '@/components/sections/StorySection';
import ReviewsTicker from '@/components/sections/ReviewsTicker';
import TourCard from '@/components/cards/TourCard';
import Button from '@/components/ui/Button';
import Reveal from '@/components/ui/Reveal';
import { popularTours } from '@/lib/selectors';
import { site } from '@/data/site';
import styles from '@/components/home/Home.module.css';

export const metadata = {
  title: {
    absolute: 'Yuevaan Bhutan Travels — Licensed Tour Operator | Treks, Cultural Tours & SDF Estimates',
  },
  description:
    'Official licensed Bhutan tour operator based in Thimphu. Bespoke itineraries, high Himalayan treks, authentic cultural tours, and transparent SDF pricing.',
  alternates: { canonical: '/' },
  openGraph: {
    title: 'Yuevaan Bhutan Travels — Licensed Tour Operator',
    description:
      'Official licensed Bhutan tour operator based in Thimphu. Bespoke itineraries, high Himalayan treks, and transparent SDF pricing.',
    images: [{ url: `${site.url}/images/flight-himalayas.jpg` }],
  },
};

export default function HomePage() {
  const topFourTours = popularTours(4);

  return (
    <>
      <FlightPreloader />
      <main id="main-content">
        <HeroVideo />
        <AccreditationsMarquee />
        <HowBookingWorks />

        <section className="section" aria-labelledby="top-selling-heading">
          <div className="container">
            <Reveal className="section-header-row">
              <div>
                <h2 id="top-selling-heading" className="heading-serif-lg">
                  Top selling Bhutan tours and treks
                </h2>
                <p className={`subhead ${styles.topSellingSubhead}`}>
                  Curated journeys perfected over hundreds of departures. Every route includes private SUV transit,
                  licensed Bhutanese guides, and heritage accommodations.
                </p>
              </div>
              <Button href="/tours" variant="outline" className={styles.viewAllBtn}>
                <span>View All Popular Tours</span> →
              </Button>
            </Reveal>

            <div className="tours-grid">
              {topFourTours.map((tour, idx) => (
                <Reveal key={tour.slug} delay={idx * 75}>
                  <TourCard tour={tour} />
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        <FilmShowcase />
        <StorySection />
        <ReviewsTicker />
      </main>
    </>
  );
}
