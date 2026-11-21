import Breadcrumb from '@/components/layout/Breadcrumb';
import Button from '@/components/ui/Button';
import { formatUSD } from '@/lib/format';
import { site } from '@/data/site';
import { getLiveSiteConfig } from '@/lib/site-settings';
import styles from '@/components/sections/ContentPages.module.css';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Policies & Terms',
  description:
    'Privacy Policy, Terms & Conditions, and Booking & Cancellation Policy for private tours booked with Yuevaan Bhutan Travels.',
  alternates: { canonical: '/legal' },
  openGraph: {
    title: 'Policies & Terms — Yuevaan Bhutan Travels',
    description:
      'Clear guidelines covering privacy, Royal Government of Bhutan SDF/visa formalities, and booking flexibility.',
    images: [{ url: `${site.url}/logos/yuevaan-logo.png` }],
  },
};

export default async function LegalPage() {
  const siteConfig = await getLiveSiteConfig();
  const { sdf, visaUsd } = siteConfig.fees;
  const childUsd = Math.round((sdf.internationalUsdPerNight * sdf.childDiscountPct) / 100);
  const childRange = `${sdf.childAgeMin}–${sdf.childAgeMax}`;

  return (
    <>
      <Breadcrumb
        items={[
          { label: 'Home', href: '/' },
          { label: 'Policies & Terms' },
        ]}
      />

      <main id="main-content" className="rtb-page">
        <div className={`container ${styles.legalContainer}`}>
          <div className="rtb-header">
            <h1 className="rtb-title">Policies &amp; Terms</h1>
            <p className="rtb-subtitle">
              Clear guidelines covering privacy, Royal Government of Bhutan SDF/visa formalities, and booking flexibility (Licence {siteConfig.licence.number}).
            </p>
          </div>

          <section id="privacy" className={`rtb-trip-card ${styles.legalCard}`}>
            <h2 className={styles.legalHeading}>Privacy Policy</h2>
            <p className={styles.legalPara}>
              {siteConfig.name} collects only the contact, travel-date, date-of-birth, nationality, and group details submitted through our forms in order to prepare your quotation. Passport bio-page scans required for official Department of Immigration tourist visa processing are requested separately via email only after you choose to confirm a booking.
            </p>
            <p className={styles.legalPara}>
              We never sell or share traveller details with unrelated third parties. Enquiry records are retained for 24 months unless you ask us earlier to delete or amend your information by writing to{' '}
              <a href={`mailto:${siteConfig.contact.email}`} className={styles.emailInline}>
                {siteConfig.contact.email}
              </a>.
            </p>
          </section>

          <section id="terms" className={`rtb-trip-card ${styles.legalCard}`}>
            <h2 className={styles.legalHeading}>Terms &amp; Conditions</h2>
            <p className={styles.legalPara}>
              Submitting a booking request carries zero financial obligation. A confirmed booking is formed only after you approve your tailored itinerary and pay the agreed deposit.
            </p>
            <p className={styles.legalPara}>
              All international itineraries include Bhutan’s Sustainable Development Fee (currently {formatUSD(sdf.internationalUsdPerNight)} per adult age {sdf.adultAgeMin}+ per night, {formatUSD(childUsd)} for children ages {childRange}, and exempt under age {sdf.childAgeMin}), one-time {formatUSD(visaUsd)} visa fee, licensed English-speaking guide, private vehicle, and three meals daily unless specified otherwise in your written quote.
            </p>
          </section>

          <section id="booking-policy" className={`rtb-trip-card ${styles.legalCard}`}>
            <h2 className={styles.legalHeading}>Booking &amp; Cancellation Policy</h2>
            <ul className={styles.legalList}>
              <li>
                <strong>No payment upfront:</strong> Quotes and itinerary adjustments are free of charge until you choose to confirm.
              </li>
              <li>
                <strong>60+ days before arrival:</strong> Full refund of land tour deposit minus bank transfer charges and any non-refundable airline/boutique lodge commitments.
              </li>
              <li>
                <strong>30–59 days before arrival:</strong> 75% refund of land package cost, or 100% credit toward rescheduled Bhutan dates within 12 months.
              </li>
              <li>
                <strong>Under 30 days:</strong> Standard hotel and transport cancellation terms apply; unused SDF days are refundable in full per Royal Government of Bhutan rules.
              </li>
            </ul>
          </section>

          <div className={styles.legalActions}>
            <Button href="/plan-my-trip" variant="primary" className={styles.legalBtn}>
              Return to Plan My Trip
            </Button>
            <Button href="/contact" variant="outline-dark" className={styles.legalBtn}>
              Contact Thimphu Desk
            </Button>
          </div>
        </div>
      </main>
    </>
  );
}
