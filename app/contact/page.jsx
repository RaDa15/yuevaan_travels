import Breadcrumb from '@/components/layout/Breadcrumb';
import PageHero from '@/components/sections/PageHero';
import MixMatchCta from '@/components/sections/MixMatchCta';
import ContactForm from '@/components/forms/ContactForm';
import Reveal from '@/components/ui/Reveal';
import Icon from '@/components/icons';
import Button from '@/components/ui/Button';
import { site } from '@/data/site';
import { getLiveSiteConfig } from '@/lib/site-settings';
import styles from '@/components/forms/Forms.module.css';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Contact Us',
  description:
    'Contact our local travel planners in Thimphu, Bhutan. Get bespoke itineraries, Drukair flight reservations, visa clearance, and SDF estimates within 24 hours.',
  alternates: { canonical: '/contact' },
  openGraph: {
    title: 'Contact Us — Yuevaan Bhutan Travels',
    description:
      'Connect directly with our local travel designers in Thimphu, Kingdom of Bhutan.',
    images: [{ url: `${site.url}/images/tigers-nest.jpg` }],
  },
};

export default async function ContactPage() {
  const siteConfig = await getLiveSiteConfig();

  return (
    <>
      <Breadcrumb
        items={[
          { label: 'Home', href: '/' },
          { label: 'Contact Us' },
        ]}
      />

      <PageHero
        eyebrow="CONTACT US"
        title="Start Your Bhutan Conversation"
        description="Connect directly with our local travel designers in Thimphu. Whether you are enquiring about flight availability, custom trekking routes, or government visa clearance, we reply within 24 hours."
        image="/images/tigers-nest.jpg"
        alt="Tiger's Nest monastery and sacred valley in Paro"
        actions={[
          { label: 'Send an Inquiry', href: '#inquiry-form', variant: 'primary' },
          { label: 'WhatsApp Concierge', href: `https://wa.me/${siteConfig.contact.whatsappNumber}`, external: true, variant: 'secondary' },
        ]}
      />

      <main id="main-content" className="section">
        <div className="container">
          <div className={styles.contactGrid}>
            <Reveal className={styles.contactCard}>
              <div id="inquiry-form">
                <h2 className={styles.contactFormTitle}>Tell Us About Your Journey</h2>
                <p className={styles.contactFormSub}>
                  Fill in your preferred dates and interests. We will send an itemised proposal with hotel options, private vehicle, and official SDF calculations.
                </p>
                <ContactForm />
              </div>
            </Reveal>

            <Reveal delay={90}>
              <h2 className={styles.reachHeading}>How to Reach Us</h2>
              <div className={styles.reachStack}>
                <div className={styles.waHighlightCard}>
                  <div className={styles.waCardHeader}>
                    <Icon name="whatsapp" size={24} className="spec-icon" />
                    <span className={styles.waCardTitle}>Direct WhatsApp Concierge</span>
                  </div>
                  <p className={styles.waCardDesc}>
                    Instant replies during Bhutan daylight hours. Ideal for quick questions regarding visa timing and flight seats.
                  </p>
                  <Button
                    href={`https://wa.me/${siteConfig.contact.whatsappNumber}?text=${encodeURIComponent(`Hi ${siteConfig.name}, I would like to plan a trip to Bhutan.`)}`}
                    external
                    variant="whatsapp"
                    className={styles.waCardBtn}
                  >
                    <Icon name="whatsapp" size={18} />
                    <span>Chat on WhatsApp ({siteConfig.contact.whatsappLabel})</span>
                  </Button>
                </div>

                <div className={`experience-card ${styles.reachInfoCard}`}>
                  <div className={styles.reachCardHeading}>📍 Thimphu Office Address</div>
                  <p className={styles.reachCardText}>
                    {siteConfig.contact.address.map((line, i) => (
                      <span key={`${line}-${i}`}>
                        {line}
                        {i < siteConfig.contact.address.length - 1 ? <br /> : null}
                      </span>
                    ))}
                  </p>
                </div>

                <div className={`experience-card ${styles.reachInfoCard}`}>
                  <div className={styles.reachCardHeading}>🕒 Business Hours</div>
                  <p className={styles.reachCardHours}>
                    {siteConfig.contact.hours}<br />
                    {siteConfig.contact.emergencyHours}
                  </p>
                  <div className={styles.reachEmailHeading}>✉️ Email Address</div>
                  <div className={styles.reachEmailActions}>
                    <a href={`mailto:${siteConfig.contact.email}`} className={styles.reachEmailLink}>
                      {siteConfig.contact.email}
                    </a>
                    <a
                      href={`https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(siteConfig.contact.email)}&su=${encodeURIComponent(`Bhutan Travel Inquiry — ${siteConfig.name}`)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={styles.reachGmailLink}
                    >
                      Open in Gmail ↗
                    </a>
                  </div>
                </div>

                <div className={styles.licencePillCard}>
                  <img src="/logos/bhutan-crest.png" alt="Bhutan crest" width={28} height={28} loading="lazy" />
                  <div className={styles.licencePillMeta}>
                    <strong className={styles.licencePillTitle}>Licensed Bhutan Tour Operator</strong>
                    <span>{siteConfig.licence.authority} Licence # {siteConfig.licence.number}</span>
                  </div>
                </div>
              </div>
            </Reveal>
          </div>
        </div>
      </main>

      <MixMatchCta
        title="Prefer to configure a trip step by step?"
        description="Use our Request to Book planner to choose dates, group counts and see your estimated all-inclusive price."
        primaryLabel="Open trip planner"
        primaryHref="/plan-my-trip"
        secondaryLabel="WhatsApp concierge"
      />
    </>
  );
}
