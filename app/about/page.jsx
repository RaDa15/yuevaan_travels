import Breadcrumb from '@/components/layout/Breadcrumb';
import PageHero from '@/components/sections/PageHero';
import MixMatchCta from '@/components/sections/MixMatchCta';
import Reveal from '@/components/ui/Reveal';
import { site } from '@/data/site';
import { getLiveSiteConfig } from '@/lib/site-settings';
import styles from '@/components/sections/ContentPages.module.css';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'About Us',
  description:
    'Learn about Yuevaan Bhutan Travels — an officially licensed Bhutanese tour operator in Thimphu delivering sustainable, high-value mountain journeys.',
  alternates: { canonical: '/about' },
  openGraph: {
    title: 'About Us — Yuevaan Bhutan Travels',
    description:
      'Officially licensed and accredited Bhutanese tour operator headquartered in Thimphu.',
    images: [{ url: `${site.url}/images/cultural-festival.jpg` }],
  },
};

export default async function AboutPage() {
  const siteConfig = await getLiveSiteConfig();
  return (
    <>
      <Breadcrumb
        items={[
          { label: 'Home', href: '/' },
          { label: 'About Us' },
        ]}
      />

      <PageHero
        eyebrow="ABOUT US"
        title="Locally Rooted, Globally Trusted"
        description="Headquartered on Norzin Lam in Thimphu, Yuevaan Bhutan Travels is an officially licensed and accredited Bhutanese tour operator. We believe that genuine travel should nurture both our guests and the mountain communities we visit."
        image="/images/cultural-festival.jpg"
        alt="Bhutanese cultural festival and heritage"
        actions={[
          { label: 'Our Story', href: '#our-story', variant: 'primary' },
          { label: 'Official Accreditations', href: '#certifications', variant: 'secondary' },
          { label: 'Meet Our Team', href: '/contact', variant: 'secondary' },
        ]}
      />

      <main id="main-content" className="section">
        <div className="container">
          <section id="our-story" className={styles.aboutStoryGrid}>
            <Reveal>
              <h2 className={styles.aboutLeadHeading}>High Value, Low Volume, Pure Bhutan</h2>
              <p className={styles.aboutPara}>
                Yuevaan Bhutan Travels was founded by native Bhutanese travel specialists with a shared vision: to invite travelers into the Kingdom not as tourists, but as honoured guests.
              </p>
              <p className={styles.aboutPara}>
                We operate strictly in alignment with the national philosophy of Gross National Happiness (GNH)—prioritising ecological preservation, cultural integrity, and equitable community benefits above mass commercial tourism.
              </p>

              <div className={styles.aboutChipsRow}>
                <div className={styles.aboutChip}>
                  <span className={styles.aboutChipNum}>100%</span>
                  <span className={styles.aboutChipTxt}>Local Bhutanese Staff</span>
                </div>
                <div className={styles.aboutChip}>
                  <span className={styles.aboutChipNum}>{siteConfig.licence.number}</span>
                  <span className={styles.aboutChipTxt}>Royal Govt License</span>
                </div>
                <div className={styles.aboutChip}>
                  <span className={styles.aboutChipNum}>Zero</span>
                  <span className={styles.aboutChipTxt}>Middleman Markups</span>
                </div>
              </div>
            </Reveal>

            <Reveal delay={90} className={styles.aboutImgWrap}>
              <img
                src="/images/bhutan-valley.jpg"
                alt="Pristine mountain valley settlement in Bhutan"
                width={720}
                height={440}
                loading="lazy"
                className={styles.aboutImg}
              />
            </Reveal>
          </section>

          <section className={styles.pillarsSection}>
            <Reveal className={styles.pillarsHead}>
              <h2 className={styles.sectionHeading}>Why Discerning Travelers Choose Us</h2>
            </Reveal>

            <div className="experiences-grid">
              <Reveal className={`experience-card ${styles.infoCard}`}>
                <div className={styles.pillarEmoji} aria-hidden="true">🛡️</div>
                <h3 className="card-title">Certified by Royal Government</h3>
                <p className="card-desc">
                  Officially registered with the {site.licence.authority} (Licence {site.licence.number}) and an active executive member of the Association of Bhutanese Tour Operators (ABTO) and Bhutan Chamber of Commerce &amp; Industry (BCCI).
                </p>
              </Reveal>

              <Reveal delay={75} className={`experience-card ${styles.infoCard}`}>
                <div className={styles.pillarEmoji} aria-hidden="true">🧭</div>
                <h3 className="card-title">Senior Licensed Leaders</h3>
                <p className="card-desc">
                  Every group is accompanied by a certified Bhutanese cultural or trekking guide with Wilderness First Aid training and deep monastic and historical scholarship. No apprentice freelancers.
                </p>
              </Reveal>

              <Reveal delay={150} className={`experience-card ${styles.infoCard}`}>
                <div className={styles.pillarEmoji} aria-hidden="true">🌱</div>
                <h3 className="card-title">Community &amp; Carbon Neutral</h3>
                <p className="card-desc">
                  We reinvest directly in rural communities: booking authentic farmhouse homestays, employing village horse packers, patronising women weavers, and enforcing strict “Leave No Trace” mountain protocols.
                </p>
              </Reveal>
            </div>
          </section>

          <section id="certifications" className={styles.aboutCertSection}>
            <div className={styles.aboutCertHead}>
              <h2 className={styles.aboutCertTitle}>Officially Recognized Across the Kingdom</h2>
              <p className={styles.aboutCertSub}>
                Proudly accredited by the {site.licence.authority} and national apex bodies for exemplary travel hospitality.
              </p>
            </div>

            <div className="marquee" aria-label="Official Accreditations Ticker">
              <div className="marq-track">
                {[false, true].map((hidden, gIdx) => (
                  <div key={gIdx} className="marq-group" aria-hidden={hidden || undefined}>
                    {site.accreditations.map((item) => (
                      <span
                        key={item.id}
                        className="marq-item"
                        data-org={item.org}
                        tabIndex={hidden ? -1 : 0}
                      >
                        <span className="marq-pill">
                          <img
                            src={item.logo}
                            alt={hidden ? '' : item.org}
                            width={28}
                            height={28}
                            loading="lazy"
                          />
                          <span className="marq-text">{item.label}</span>
                        </span>
                      </span>
                    ))}
                  </div>
                ))}
              </div>
            </div>
          </section>
        </div>
      </main>

      <MixMatchCta
        title="Ready to journey into the Kingdom?"
        description="Explore our pre-crafted packages or reach out to our Thimphu desk for a tailor-made consultation."
      />
    </>
  );
}
