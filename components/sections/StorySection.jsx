import Button from '@/components/ui/Button';
import Reveal from '@/components/ui/Reveal';
import { site } from '@/data/site';
import styles from '@/components/home/Home.module.css';

const CHECKLIST = [
  'Officially licensed tour operator registered with Department of Tourism, Bhutan',
  'Zero surprise charges: exact SDF, visa, accommodation, and transport itemized',
  'Accompanied by certified English-speaking Bhutanese guides and seasoned drivers',
  '100% customisable itineraries crafted by our Thimphu reservations desk',
];

export default function StorySection() {
  return (
    <section className="section section-bg-surface-2" aria-labelledby="local-team-heading">
      <div className="container">
        <div className="story-grid">
          <Reveal className="story-images-composition">
            <div className="primary-story-img-wrap">
              <img
                src="/images/bhutan-valley.jpg"
                alt="Lush green valley in Bhutan with settlements"
                width={640}
                height={480}
                loading="lazy"
              />
            </div>
            <div className="secondary-story-img-wrap">
              <img
                src="/images/snow-mountain.jpg"
                alt="Himalayan mountain with fortress tower in Bhutan"
                width={420}
                height={320}
                loading="lazy"
              />
            </div>
            <div className="story-badge-floating">
              <div className="story-badge-icon" aria-hidden="true">🛡️</div>
              <div>
                <div className={styles.storyBadgeTitle}>100% Local</div>
                <div className={styles.storyBadgeSub}>Thimphu Team</div>
              </div>
            </div>
          </Reveal>

          <Reveal delay={90}>
            <h2 id="local-team-heading" className="heading-serif-lg">
              A local team that plans every trip by hand
            </h2>
            <p className="story-lead-para">
              We are an independent, licensed Bhutanese tour operator based right here in Thimphu. Rather than relying
              on rigid mass itineraries, we personally tailor every day to your pace, energy, and curiosity.
            </p>
            <p className="story-sub-para">
              Bhutan is a living sanctuary of Mahayana Buddhism, Gross National Happiness, and pristine Himalayan
              landscapes. We make sure you experience its authentic soul—eating at village farmhouses, listening to monk
              prayers at dawn, and hiking off-the-beaten-track trails.
            </p>

            <ul className="checklist">
              {CHECKLIST.map((item) => (
                <li key={item} className="check-item">
                  <span className="check-icon" aria-hidden="true">✓</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>

            <div className="stats-strip">
              {site.stats.map((stat, idx) => (
                <div key={stat.label}>
                  <div className={`stat-num${idx === 0 ? ` ${styles.storyStatAccent}` : ''}`}>
                    {stat.value}
                  </div>
                  <div className="stat-txt">{stat.label}</div>
                </div>
              ))}
            </div>

            <div className={styles.storyActions}>
              <Button href="/plan-my-trip" variant="primary" className={styles.storyActionBtn}>
                Plan A Custom Tour
              </Button>
              <Button href="/about" variant="outline" className={styles.storyActionBtn}>
                Meet Our Guides
              </Button>
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
