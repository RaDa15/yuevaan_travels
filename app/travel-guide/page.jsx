import Breadcrumb from '@/components/layout/Breadcrumb';
import PageHero from '@/components/sections/PageHero';
import MixMatchCta from '@/components/sections/MixMatchCta';
import Reveal from '@/components/ui/Reveal';
import { formatDisplayDate, formatUSD } from '@/lib/format';
import { site } from '@/data/site';
import { getLiveSiteConfig } from '@/lib/site-settings';
import styles from '@/components/sections/ContentPages.module.css';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Practical Bhutan Travel Guide',
  description:
    'Everything you need to know to travel to Bhutan: Sustainable Development Fee (SDF) rates, visa processing, best time to visit, Drukair flights, and packing advice.',
  alternates: { canonical: '/travel-guide' },
  openGraph: {
    title: 'Practical Bhutan Travel Guide — Yuevaan Bhutan Travels',
    description:
      'SDF rates, visa processing, best seasons, Drukair flights, and answers from our Thimphu team.',
    images: [{ url: `${site.url}/images/snow-mountain.jpg` }],
  },
};

export default async function TravelGuidePage() {
  const siteConfig = await getLiveSiteConfig();
  const { sdf, visaUsd } = siteConfig.fees;
  const childRange = `${sdf.childAgeMin}–${sdf.childAgeMax}`;
  const childUsd = Math.round((sdf.internationalUsdPerNight * sdf.childDiscountPct) / 100);
  const childNu = Math.round((sdf.indianNuPerNight * sdf.childDiscountPct) / 100);
  const validUntilLabel = sdf.validUntil === '2029-12-31' ? '31 December 2029' : formatDisplayDate(sdf.validUntil);

  return (
    <>
      <Breadcrumb
        items={[
          { label: 'Home', href: '/' },
          { label: 'Travel Guide' },
        ]}
      />

      <PageHero
        eyebrow="TRAVEL GUIDE"
        title="Practical Bhutan Travel Guide"
        description="Plain-English advice from our licensed Thimphu team on tourist visa clearance, government Sustainable Development Fees (SDF), Drukair flights, optimal seasons, currency, and local cultural etiquette."
        image="/images/snow-mountain.jpg"
        alt="Snow clad Himalayan peaks in Bhutan"
        actions={[
          { label: 'SDF Daily Fee', href: '#sustainable-development-fee', variant: 'primary' },
          { label: 'Visa Clearance', href: '#visa-and-entry-requirements', variant: 'secondary' },
          { label: 'Best Months', href: '#best-time-to-visit', variant: 'secondary' },
          { label: 'FAQs', href: '#faqs', variant: 'secondary' },
        ]}
      />

      <main id="main-content" className="section">
        <div className="container">
          {/* 1. SDF Section */}
          <Reveal>
            <section id="sustainable-development-fee" className={styles.guideCard}>
              <h2 className={styles.sectionHeading}>Sustainable Development Fee (SDF)</h2>
              <p className={styles.sectionIntro}>
                The SDF is a mandatory daily levy collected by the Department of Tourism to safeguard Bhutan’s carbon-negative status, preserve pristine Himalayan ecosystems, fund free universal healthcare, and preserve cultural monuments.
              </p>

              <div className={styles.sdfGrid}>
                <div className={styles.sdfBox}>
                  <span className={styles.sdfEyebrow}>International Guests</span>
                  <div className={styles.sdfFigure}>
                    {formatUSD(sdf.internationalUsdPerNight)}{' '}
                    <span className={styles.sdfUnit}>/ person / night</span>
                  </div>
                  <p className={styles.sdfDesc}>
                    Applies to all international passport holders (age {sdf.adultAgeMin}+). Confirmed at {formatUSD(sdf.internationalUsdPerNight)} per night until {validUntilLabel}.
                  </p>
                </div>

                <div className={styles.sdfBox}>
                  <span className={styles.sdfEyebrow}>Indian Nationals</span>
                  <div className={styles.sdfFigure}>
                    Nu. {sdf.indianNuPerNight.toLocaleString('en-US')}{' '}
                    <span className={styles.sdfUnit}>/ person / night</span>
                  </div>
                  <p className={styles.sdfDesc}>
                    Applicable to Indian citizens with valid Voter ID card or Indian Passport. No separate tourist visa fee required.
                  </p>
                </div>

                <div className={styles.sdfBox}>
                  <span className={styles.sdfEyebrow}>Children Concessions</span>
                  <div className={styles.sdfFigure}>
                    {sdf.childDiscountPct}% Off{' '}
                    <span className={styles.sdfUnit}>(Ages {childRange})</span>
                  </div>
                  <p className={styles.sdfDesc}>
                    Children aged {sdf.childAgeMin} to {sdf.childAgeMax} on arrival pay {formatUSD(childUsd)} (or Nu. {childNu.toLocaleString('en-US')}) per night. Children aged {sdf.childAgeMin - 1} and under are completely exempt from the SDF.
                  </p>
                </div>
              </div>

              <p className={styles.sdfValidityNote}>
                Official SDF rate of {formatUSD(sdf.internationalUsdPerNight)} per adult per night is confirmed until {validUntilLabel}.
              </p>
            </section>
          </Reveal>

          {/* 2. Practical Guides Grid */}
          <div className={styles.guidesGrid}>
            <Reveal>
              <article id="visa-and-entry-requirements" className={`experience-card ${styles.infoCard}`}>
                <div className={styles.infoCardIcon} aria-hidden="true">
                  <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="3" y="4" width="18" height="16" rx="2" />
                    <circle cx="9" cy="10" r="2" />
                    <line x1="15" y1="8" x2="17" y2="8" />
                    <line x1="15" y1="12" x2="17" y2="12" />
                    <line x1="7" y1="16" x2="17" y2="16" />
                  </svg>
                </div>
                <h3 className={`card-title ${styles.infoCardTitle}`}>Visa Clearance Made Easy</h3>
                <p className="card-desc">
                  All international tourists require a Bhutanese visa clearance letter before flying to Paro. As your licensed tour operator, Yuevaan Travels submits your application directly to the Department of Immigration. All you need to supply is a color scan of your passport bio page (minimum 6 months validity) and a passport photo. Visa approval is typically issued in 3–5 working days. A one-off government visa fee of {formatUSD(visaUsd)} applies.
                </p>
              </article>
            </Reveal>

            <Reveal delay={75}>
              <article id="bhutan-travel-guide" className={`experience-card ${styles.infoCard}`}>
                <div className={styles.infoCardIcon} aria-hidden="true">
                  <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="10" />
                    <line x1="2" y1="12" x2="22" y2="12" />
                    <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
                  </svg>
                </div>
                <h3 className={`card-title ${styles.infoCardTitle}`}>Money, SIM &amp; Etiquette</h3>
                <p className="card-desc">
                  The national currency is the Bhutanese Ngultrum (BTN / Nu.), pegged 1:1 with the Indian Rupee (INR). Both Nu. and INR cash are accepted across the country. ATMs exist in major towns like Thimphu and Paro. We provide our guests with local 4G tourist SIM cards (TashiCell or B-Mobile) upon arrival at Paro airport for effortless mountain data connectivity.
                </p>
              </article>
            </Reveal>

            <Reveal delay={150}>
              <article id="best-time-to-visit" className={`experience-card ${styles.infoCard}`}>
                <div className={styles.infoCardIcon} aria-hidden="true">
                  <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="5" />
                    <line x1="12" y1="1" x2="12" y2="3" />
                    <line x1="12" y1="21" x2="12" y2="23" />
                    <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
                    <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
                    <line x1="1" y1="12" x2="3" y2="12" />
                    <line x1="21" y1="12" x2="23" y2="12" />
                    <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
                    <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
                  </svg>
                </div>
                <h3 className={`card-title ${styles.infoCardTitle}`}>Best Seasons to Visit</h3>
                <p className="card-desc">
                  <strong>Autumn (Sep–Nov):</strong> Crystal-clear skies, dramatic high-Himalayan panoramas, and iconic Thimphu and Paro Tshechus.<br />
                  <strong>Spring (Mar–May):</strong> Wild rhododendrons and magnolias carpet the mountain passes with temperate hiking weather.<br />
                  <strong>Winter (Dec–Feb):</strong> Crisp clear days, snowfall on high ridges, and endangered Black-necked cranes in Phobjikha.<br />
                  <strong>Summer (Jun–Aug):</strong> Lush emerald green rice terraces, dramatic mist, and quieter cultural sights.
                </p>
              </article>
            </Reveal>

            <Reveal delay={225}>
              <article id="transportation" className={`experience-card ${styles.infoCard}`}>
                <div className={styles.infoCardIcon} aria-hidden="true">
                  <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M17.8 19.2L16 11l3.5-3.5C21 6 21.5 4 21 3.5c-.5-.5-2.5 0-4 1.5L13.5 8.5 5.3 6.7c-.8-.2-1.6.2-2 1l1.5 2.5 4 1.5L7 14.5l-2.5-.5-1.5 1 2.5 2 2 2.5 1-1.5-.5-2.5 2.8-1.8 1.5 4 2.5 1.5c.8-.4 1.2-1.2 1-2z" />
                  </svg>
                </div>
                <h3 className={`card-title ${styles.infoCardTitle}`}>Drukair Flights &amp; Private SUVs</h3>
                <p className="card-desc">
                  Only two national carriers operate into Paro International Airport (PBH): <strong>Drukair (Royal Bhutan Airlines)</strong> and <strong>Bhutan Airlines</strong>. Key transit hubs include Bangkok (BKK), Singapore (SIN), New Delhi (DEL), Kolkata (CCU), and Kathmandu (KTM). Our team reserves your flight tickets seamlessly. On the road, all transfers are in late-model private 4WD Toyota Land Cruisers or Toyota HiAce vans with experienced licensed mountain drivers.
                </p>
              </article>
            </Reveal>
          </div>

          {/* 3. FAQs */}
          <Reveal>
            <section id="faqs" className={styles.faqsSection}>
              <div className={styles.faqsHeader}>
                <h2 className={styles.sectionHeading}>Everything You Might Wonder</h2>
                <p className={styles.faqAnswer}>
                  Direct answers to the most common queries from travelers planning a journey to Bhutan.
                </p>
              </div>

              <div className={styles.faqsList}>
                <div className={styles.faqItem}>
                  <h3 className={styles.faqQuestion}>Can I travel in Bhutan independently without a tour operator?</h3>
                  <p className={styles.faqAnswer}>
                    Under Royal Government of Bhutan regulations, all international tourists must be accompanied by a licensed Bhutanese tour guide and have private transport pre-arranged through a licensed tour operator like Yuevaan Travels. However, you have 100% freedom over your personal daily schedule, stops, and pace.
                  </p>
                </div>

                <div className={styles.faqItem}>
                  <h3 className={styles.faqQuestion}>How physically demanding is the hike to Tiger’s Nest (Paro Taktsang)?</h3>
                  <p className={styles.faqAnswer}>
                    The hike covers approximately 4–5 hours round-trip over a 4.5 km dirt trail with 500 metres of elevation gain (reaching 3,120m). We schedule the trek at the end of your itinerary so your body is thoroughly acclimatised. There is a scenic halfway cafeteria where you can rest, and riding ponies can be hired for the first uphill stage.
                  </p>
                </div>

                <div className={styles.faqItem}>
                  <h3 className={styles.faqQuestion}>What dress code is required when visiting Dzongs and temples?</h3>
                  <p className={styles.faqAnswer}>
                    Out of deep respect for monastic tradition, respectful attire is mandatory: long trousers or full skirts covering ankles, long sleeves, and collared shirts. Hats and shoes must be removed before stepping into temple shrines. Photography is permitted in courtyards but strictly prohibited inside the inner holy sanctums.
                  </p>
                </div>

                <div className={styles.faqItem}>
                  <h3 className={styles.faqQuestion}>What is included in the tour packages?</h3>
                  <p className={styles.faqAnswer}>
                    Our packages are all-inclusive: government-approved 3-star (or luxury 5-star upgrade) hotels, three full meals daily, private chauffeured 4WD vehicle with fuel, senior certified English-speaking guide, all monument entrance permits, bottled water, the {formatUSD(sdf.internationalUsdPerNight)} per adult night SDF, the one-time {formatUSD(visaUsd)} visa fee, and end-to-end visa clearance assistance.
                  </p>
                </div>
              </div>
            </section>
          </Reveal>
        </div>
      </main>

      <MixMatchCta
        title="Ready to plan your personal journey?"
        description="Reach out to our local Thimphu team. We will check flight seats on Drukair, recommend the optimal festival dates, and send an itemised proposal with transparent pricing."
        primaryLabel="Build custom trip"
        secondaryLabel="WhatsApp concierge"
      />
    </>
  );
}
