'use client';

import { useSearchParams } from 'next/navigation';
import Button from '@/components/ui/Button';
import styles from '@/components/forms/Forms.module.css';

export default function ThankYouClient() {
  const searchParams = useSearchParams();
  const ref = searchParams.get('ref') || '';

  return (
    <main id="main-content" className="rtb-page">
      <div className={`container ${styles.thankYouWrap}`}>
        <div className="rtb-confirmation-card">
          {ref ? <span className="rtb-ref-pill">REFERENCE: {ref}</span> : null}
          <h1 className="rtb-title">Thank you — your request was received</h1>
          <p className={styles.confirmBody}>
            {ref
              ? `Your booking or inquiry has been logged under reference ${ref}.`
              : 'Your request has been logged by our team.'}
          </p>
          <p className={styles.confirmSub}>
            Our licensed trip designers in Thimphu review every request personally and respond within 24 hours with a tailored day-by-day plan and transparent quote.
          </p>
          <div className={styles.confirmActions}>
            <Button href="/" variant="primary" className={styles.confirmBtn}>
              Back to Home
            </Button>
            <Button href="/tours" variant="outline-dark" className={styles.confirmBtn}>
              Browse Popular Tours
            </Button>
          </div>
        </div>
      </div>
    </main>
  );
}
