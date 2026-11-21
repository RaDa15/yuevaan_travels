'use client';

import { useState } from 'react';
import CatalogCard from '@/components/cards/CatalogCard';
import Button from '@/components/ui/Button';
import { formatDuration, formatUSD } from '@/lib/format';
import styles from './Destinations.module.css';

export default function RegionToursList({ regionName, tours }) {
  const [showAll, setShowAll] = useState(false);

  if (!tours || tours.length === 0) {
    return (
      <div className={styles.emptyToursCard}>
        <p className={styles.emptyToursText}>
          Ask us for a custom itinerary in {regionName} tailored to your travel dates and pace.
        </p>
        <Button href="/plan-my-trip?tour=custom" variant="primary">
          Request Custom Itinerary →
        </Button>
      </div>
    );
  }

  const visibleTours = showAll ? tours : tours.slice(0, 6);

  return (
    <div>
      <div className="dest-packages-grid">
        {visibleTours.map((tour) => (
          <CatalogCard
            key={tour.slug}
            href={`/packages/${tour.slug}`}
            badge={tour.badge}
            image={tour.heroImage}
            alt={tour.title}
            title={tour.title}
            metaLeft={{ icon: '⏱', text: formatDuration(tour.days, tour.nights, 'short') }}
            metaRight={{ icon: '⭐', text: `${tour.reviewCount} reviews` }}
            footerLabel="Starting from"
            footerValue={formatUSD(tour.price)}
            headingLevel="h4"
          />
        ))}
      </div>

      {!showAll && tours.length > 6 ? (
        <div className={styles.showAllWrap}>
          <button
            type="button"
            className="btn btn-outline-dark"
            onClick={() => setShowAll(true)}
          >
            Show all {tours.length} tours
          </button>
        </div>
      ) : null}
    </div>
  );
}
