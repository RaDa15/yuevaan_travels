import Link from 'next/link';
import Icon from '@/components/icons';
import styles from './Experiences.module.css';

export default function ExperienceRegionCard({ region, details }) {
  return (
    <article className="act-region-card" id={region.slug}>
      <div className="act-region-header">
        <span className="act-region-title">
          <Icon name="pin" size={18} className={styles.pinIcon} />
          <span>{region.name}</span>
        </span>
        <span className={styles.elevPill}>Elevation: {region.elevation}</span>
      </div>

      <div className="act-region-locs">
        <strong className={styles.locStrong}>Key Locations:</strong>{' '}
        {details.locations.join(' · ')}
      </div>

      <p className="act-region-desc">{details.highlights}</p>

      <Link href={`/destinations#${region.slug}`} className="act-region-link">
        <span>Explore {region.name} Destinations &amp; Tours</span>
        <span aria-hidden="true">→</span>
      </Link>
    </article>
  );
}
