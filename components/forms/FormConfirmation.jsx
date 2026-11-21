import Button from '@/components/ui/Button';
import Icon from '@/components/icons';
import { site } from '@/data/site';
import styles from './Forms.module.css';

export default function FormConfirmation({
  mode, // 'sent' | 'notSent'
  type, // 'booking' | 'inquiry'
  reference,
  title,
  summaryText,
  detailText,
  mailtoHref,
  gmailHref,
  whatsappHref,
  onReset,
  onRetry,
}) {
  const resolvedWaHref = whatsappHref || `https://wa.me/${site.contact.whatsappNumber}`;

  if (mode === 'notSent') {
    return (
      <div className={styles.notSentCard} role="status">
        <h2 className={styles.confirmTitle}>We couldn’t send this right now</h2>
        <p className={styles.confirmBody}>
          Our booking desk endpoint was unreachable. Your details have not been lost—you can send them straight away using WhatsApp, Gmail, or your email app, or try submitting again.
        </p>
        <div className={styles.confirmActions}>
          <Button
            href={resolvedWaHref}
            external
            variant="whatsapp"
            className={styles.confirmBtn}
          >
            <Icon name="whatsapp" size={18} />
            <span>Chat on WhatsApp ({site.contact.whatsappLabel})</span>
          </Button>
          {gmailHref ? (
            <Button href={gmailHref} external variant="primary" className={styles.confirmBtn}>
              <Icon name="mail" size={18} />
              <span>Send via Gmail →</span>
            </Button>
          ) : null}
          <Button href={mailtoHref} external variant="outline-dark" className={styles.confirmBtn}>
            Send via email app →
          </Button>
          <Button onClick={onRetry} variant="outline" className={styles.confirmBtn}>
            Try again
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="rtb-confirmation-card" role="status">
      <span className="rtb-ref-pill">REFERENCE: {reference}</span>
      <h2 className={styles.confirmTitle}>
        {title || (type === 'booking' ? 'Booking Request Received' : `✓ Message Received (${reference})`)}
      </h2>
      <p className={styles.confirmBody}>{summaryText}</p>
      <p className={styles.confirmSub}>{detailText}</p>
      <div className={styles.confirmActions}>
        <Button
          href={resolvedWaHref}
          external
          variant="whatsapp"
          className={styles.confirmBtn}
        >
          <Icon name="whatsapp" size={18} />
          <span>Chat on WhatsApp ({site.contact.whatsappLabel})</span>
        </Button>
        {gmailHref ? (
          <Button href={gmailHref} external variant="primary" className={styles.confirmBtn}>
            <Icon name="mail" size={18} />
            <span>Send Copy via Gmail →</span>
          </Button>
        ) : null}
        {mailtoHref ? (
          <Button href={mailtoHref} external variant="outline-dark" className={styles.confirmBtn}>
            Open in Email App
          </Button>
        ) : null}
        <Button onClick={onReset} variant="outline" className={styles.confirmBtn}>
          {type === 'booking' ? 'Submit Another Request' : 'Send Another Message'}
        </Button>
      </div>
    </div>
  );
}
