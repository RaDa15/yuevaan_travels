import Button from '@/components/ui/Button';
import Icon from '@/components/icons';
import { formatUSD } from '@/lib/format';
import { site } from '@/data/site';
import styles from './PackageDetail.module.css';

export default function BookingSidebar({ slug, price }) {
  const waText = encodeURIComponent(
    `Hi Yuevaan Bhutan Travels, I would like to enquire about the ${slug.replace(/-/g, ' ')} tour.`
  );
  const waHref = `https://wa.me/${site.contact.whatsappNumber}?text=${waText}`;
  const gmailHref = `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(
    site.contact.email
  )}&su=${encodeURIComponent(`Bhutan Tour Inquiry (${slug})`)}`;

  return (
    <aside className="pkg-aside-col" aria-label="Book this journey">
      <div className="pkg-sidebar-card">
        <div>
          <span className={styles.priceCaption}>From, per person (All-inclusive)</span>
          <span className={styles.priceMain}>{formatUSD(price)}</span>
          <span className={styles.priceInclusions}>✓ SDF &amp; Official Visa Included</span>
        </div>

        <div className={styles.scheduleBox}>
          <span className={styles.scheduleIcon} aria-hidden="true">🗓️</span>
          <div>
            <span className={styles.scheduleLabel}>Private Departure Schedule</span>
            <span className={styles.scheduleValue}>Tailored to your dates</span>
          </div>
        </div>

        <Button
          href={`/plan-my-trip?tour=${slug}`}
          variant="primary"
          className={styles.sidebarBtnPrimary}
        >
          Request to Book Journey →
        </Button>

        <Button
          href={waHref}
          external
          variant="whatsapp"
          className={styles.sidebarBtnOutline}
        >
          <Icon name="whatsapp" size={18} />
          <span>Chat on WhatsApp</span>
        </Button>

        <ul className={styles.perksList}>
          {site.packageDefaults.sidebarPerks.map((perk) => (
            <li key={perk} className={styles.perksItem}>
              <span className={styles.perkTick} aria-hidden="true">✓</span>
              <span>{perk}</span>
            </li>
          ))}
        </ul>
      </div>

      <div className="pkg-sidebar-help">
        <span className={styles.helpEyebrow}>NEED PERSONAL GUIDANCE?</span>
        <div className={styles.helpDeskRow}>
          <div className={styles.helpAvatar} aria-hidden="true">YT</div>
          <div>
            <span className={styles.helpDeskName}>Thimphu Travel Desk</span>
            <span className={styles.helpDeskSub}>Destination Specialists · Thimphu Office</span>
          </div>
        </div>
        <div className={styles.helpLinks}>
          <a
            href={waHref}
            target="_blank"
            rel="noopener noreferrer"
            className={styles.helpWaLink}
          >
            <Icon name="whatsapp" size={16} />
            <span>WhatsApp: {site.contact.whatsappLabel}</span>
          </a>
          <a href={`mailto:${site.contact.email}`} className={styles.helpEmailLink}>
            {site.contact.email}
          </a>
          <a
            href={gmailHref}
            target="_blank"
            rel="noopener noreferrer"
            className={styles.helpEmailLink}
          >
            Compose in Gmail ↗
          </a>
        </div>
      </div>
    </aside>
  );
}
