import Breadcrumb from '@/components/layout/Breadcrumb';
import PageHero from '@/components/sections/PageHero';
import MixMatchCta from '@/components/sections/MixMatchCta';
import ExperienceFilter from '@/components/experiences/ExperienceFilter';
import Reveal from '@/components/ui/Reveal';
import { experiences } from '@/data/experiences';
import { toursByCategory } from '@/lib/selectors';
import { site } from '@/data/site';
import styles from '@/components/experiences/Experiences.module.css';

export const metadata = {
  title: 'Experiences in Bhutan',
  description:
    'Explore nine curated ways to experience Bhutan: Himalayan trekking, bird watching, sacred Tshechu festivals, cultural dzongs, wildlife sanctuaries, and village stays.',
  alternates: { canonical: '/experiences' },
  openGraph: {
    title: 'Experiences in Bhutan — Yuevaan Bhutan Travels',
    description:
      'Explore nine curated ways to experience Bhutan across all four regions.',
    images: [{ url: `${site.url}/images/tigers-nest.jpg` }],
  },
};

export default function ExperiencesIndexPage() {
  const enriched = experiences.map((exp) => ({
    ...exp,
    tourCount: toursByCategory(exp.slug).length,
  }));

  return (
    <>
      <Breadcrumb
        items={[
          { label: 'Home', href: '/' },
          { label: 'Experiences' },
        ]}
      />

      <PageHero
        eyebrow="EXPERIENCES"
        title="Experiences in Bhutan"
        description="Start with what you love. Each experience has its own page with the best time to go, where to go and the trips that fit."
        image="/images/tigers-nest.jpg"
        alt="Tiger’s Nest monastery on cliff above Paro"
        actions={[
          { label: 'Plan my trip →', href: '/plan-my-trip', variant: 'primary' },
          { label: 'Choose an experience', href: '#list', variant: 'secondary' },
        ]}
      />

      <main id="main-content">
        <section id="list" className="section" aria-labelledby="list-title">
          <div className="container">
            <Reveal className={styles.headerRow}>
              <div>
                <span className={styles.eyebrow}>
                  <span className={styles.eyebrowDot} aria-hidden="true" />
                  NINE WAYS TO SEE BHUTAN
                </span>
                <h2 id="list-title" className={`heading-serif-lg ${styles.heading}`}>
                  Choose an experience
                </h2>
              </div>
              <p className={styles.introDesc}>
                You can combine several in one trip. Tell us what you’d like and we’ll plan the days around it with dedicated local guides.
              </p>
            </Reveal>

            <ExperienceFilter items={enriched} />
          </div>
        </section>
      </main>

      <MixMatchCta
        title="Combine any experiences into one itinerary"
        description="Most travellers mix cultural dzongs, a festival or village stay, and scenic Himalayan ridge hikes into a single seamless journey."
      />
    </>
  );
}
