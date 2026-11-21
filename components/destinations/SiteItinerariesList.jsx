'use client';

import { useState } from 'react';
import Link from 'next/link';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import { formatDuration, formatUSD } from '@/lib/format';
import styles from './Destinations.module.css';

export default function SiteItinerariesList({ siteName, experienceTitle, items }) {
  const [showAll, setShowAll] = useState(false);

  if (!items || items.length === 0) {
    return (
      <div className={styles.emptyToursCard}>
        <p className={styles.emptyToursText}>
          We can craft a private itinerary featuring {siteName} tailored to your travel dates and pace.
        </p>
        <Button href="/plan-my-trip?tour=custom" variant="neutral">
          Request Custom Itinerary →
        </Button>
      </div>
    );
  }

  const visibleItems = showAll ? items : items.slice(0, 4);

  return (
    <div>
      <div className={styles.siteToursStack}>
        {visibleItems.map((entry) => {
          const { tour, matchedDayNumbers, isCategoryMatch, matchType } = entry;
          const matchedSet = new Set(matchedDayNumbers || []);

          return (
            <article key={tour.slug} className={styles.siteTourCard}>
              <div className={styles.siteTourTop}>
                <div className={styles.siteTourIntro}>
                  <div className={styles.siteTourBadges}>
                    <Badge variant="pill">{tour.badge}</Badge>
                    {isCategoryMatch ? (
                      <span className={styles.siteTourMatchPill}>
                        {`Matches ${experienceTitle}`}
                      </span>
                    ) : null}
                    {matchedDayNumbers.length > 0 ? (
                      <span className={styles.siteTourMatchPill}>
                        {matchType === 'exact'
                          ? `Features ${siteName} on Day ${matchedDayNumbers.join(', ')}`
                          : `Covers corridor on Day ${matchedDayNumbers.join(', ')}`}
                      </span>
                    ) : null}
                  </div>

                  <h3 className={styles.siteTourTitle}>
                    <Link href={`/packages/${tour.slug}`} className={styles.siteTourTitleLink}>
                      {tour.title}
                    </Link>
                  </h3>
                  <p className={styles.siteTourSummary}>{tour.summary}</p>

                  <div className={styles.siteTourMeta}>
                    <span>{formatDuration(tour.days, tour.nights, 'long')}</span>
                    <span>{`★ ${tour.rating} (${tour.reviewCount} reviews)`}</span>
                    <span>{tour.specs?.grade}</span>
                  </div>
                </div>

                <div className={styles.siteTourSide}>
                  <div className={styles.siteTourPriceWrap}>
                    <span className={styles.siteTourPriceLabel}>All-inclusive pp</span>
                    <span className={styles.siteTourPriceVal}>{formatUSD(tour.price)}</span>
                  </div>
                  <div className={styles.siteTourActions}>
                    <Button href={`/packages/${tour.slug}`} variant="neutral" size="sm">
                      View Full Package →
                    </Button>
                    <Button href={`/plan-my-trip?tour=${tour.slug}`} variant="outline-dark" size="sm">
                      Request to Book
                    </Button>
                  </div>
                </div>
              </div>

              <div className="pkg-itinerary-list">
                {tour.itinerary.map((day, idx) => {
                  const dayNum = idx + 1;
                  const dayLabel = String(dayNum).padStart(2, '0');
                  const isMatchedDay = matchedSet.has(dayNum);

                  return (
                    <details
                      key={dayLabel}
                      open={isMatchedDay}
                      className={`pkg-day-card${isMatchedDay ? ` ${styles.dayMatchedCard}` : ''}`}
                    >
                      <summary className="pkg-day-summary">
                        <span className="pkg-day-badge">
                          <span className="pkg-day-badge-small">DAY</span>
                          <span className="pkg-day-badge-num">{dayLabel}</span>
                        </span>
                        <div className="pkg-day-meta-wrap">
                          <h4 className="pkg-day-title">
                            {day.title}
                            {isMatchedDay ? (
                              <span className={styles.dayMatchTag}>
                                {matchType === 'exact' ? 'Visits this site' : 'Surrounding area'}
                              </span>
                            ) : null}
                          </h4>
                          <span className="pkg-day-subtitle">Overnight: {day.overnight}</span>
                        </div>
                        <span className="pkg-day-toggle-icon" aria-hidden="true">+</span>
                      </summary>
                      <div className="pkg-day-body">
                        {day.body.map((para, pIdx) => (
                          <p key={pIdx}>{para}</p>
                        ))}
                      </div>
                    </details>
                  );
                })}
              </div>
            </article>
          );
        })}
      </div>

      {!showAll && items.length > 4 ? (
        <div className={styles.showAllWrap}>
          <button
            type="button"
            className="btn btn-outline-dark"
            onClick={() => setShowAll(true)}
          >
            {`Show all ${items.length} tours featuring ${siteName}`}
          </button>
        </div>
      ) : null}
    </div>
  );
}
