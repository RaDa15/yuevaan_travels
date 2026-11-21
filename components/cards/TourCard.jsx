import Link from 'next/link';
import Badge from '@/components/ui/Badge';
import Icon from '@/components/icons';
import { formatDuration, formatUSD } from '@/lib/format';

export default function TourCard({ tour }) {
  const cardMeta = tour.homeCard || {
    category: 'Bhutan Journey',
    pace: tour.specs.grade,
    route: tour.places.slice(0, 3).join(', '),
  };

  return (
    <article className="tour-card">
      <div>
        <div className="tour-card-media">
          <img
            src={tour.heroImage}
            alt={tour.heroAlt}
            width={640}
            height={420}
            loading="lazy"
            className="tour-card-img"
          />
          <Badge variant="tour">{tour.badge}</Badge>
        </div>
        <div className="tour-card-body">
          <span className="tour-card-category">{cardMeta.category}</span>
          <h3 className="tour-card-title">{tour.title}</h3>
          <ul className="tour-specs-list">
            <li className="spec-item">
              <Icon name="calendar" className="spec-icon" size={16} />
              <span>{formatDuration(tour.days, tour.nights, 'long')}</span>
            </li>
            <li className="spec-item">
              <Icon name="compass" className="spec-icon" size={16} />
              <span>Pace: {cardMeta.pace}</span>
            </li>
            <li className="spec-item">
              <Icon name="pin" className="spec-icon" size={16} />
              <span>{cardMeta.route}</span>
            </li>
          </ul>
        </div>
      </div>

      <div className="tour-card-footer">
        <div className="tour-price-box">
          <span className="price-label">All-inclusive pp</span>
          <span className="price-val">{formatUSD(tour.price)}</span>
          <span className="price-note">incl. SDF &amp; visa</span>
        </div>
        <Link href={`/packages/${tour.slug}`} className="tour-link-text">
          <span>View itinerary</span> <span aria-hidden="true">→</span>
        </Link>
      </div>
    </article>
  );
}
