'use client';

import { useState } from 'react';
import CatalogCard from '@/components/cards/CatalogCard';
import styles from './Destinations.module.css';

export default function CategoryTabs({ regionName, regionSlug, categories }) {
  const [selectedSlug, setSelectedSlug] = useState('all');

  if (!categories || categories.length === 0) return null;

  const activeCategory = categories.find((c) => c.slug === selectedSlug) || null;

  return (
    <div className="dest-activities-section">
      <span className={styles.eyebrowRow}>
        <span className={styles.eyebrowDot} aria-hidden="true" />
        AVAILABLE EXPERIENCES IN {regionName.toUpperCase()}
      </span>
      <h3 className="dest-section-heading">Activities &amp; Highlights in {regionName}</h3>

      <div
        className="dest-cat-tabs"
        role="tablist"
        aria-label={`${regionName} experience categories`}
      >
        <button
          type="button"
          role="tab"
          aria-selected={selectedSlug === 'all'}
          className={`dest-cat-tab${selectedSlug === 'all' ? ' active' : ''}`}
          onClick={() => setSelectedSlug('all')}
        >
          <span>All Categories</span>
          <span className="dest-cat-count">{categories.length}</span>
        </button>

        {categories.map((cat) => {
          const isSelected = selectedSlug === cat.slug;
          return (
            <button
              key={cat.slug}
              type="button"
              role="tab"
              aria-selected={isSelected}
              className={`dest-cat-tab${isSelected ? ' active' : ''}`}
              onClick={() => setSelectedSlug(cat.slug)}
            >
              <span>{cat.title}</span>
              <span className="dest-cat-count">{cat.locations.length}</span>
            </button>
          );
        })}
      </div>

      {activeCategory ? (
        <div className="dest-cat-detail-panel is-active">
          <div className="dest-cat-items-grid">
            {activeCategory.sites.map((siteItem, idx) => {
              const imgPool = activeCategory.imagePool;
              const imgSrc = imgPool[idx % imgPool.length];
              const countLabel =
                siteItem.tourCount === 1 ? '1 Itinerary' : `${siteItem.tourCount} Itineraries`;
              return (
                <CatalogCard
                  key={siteItem.slug}
                  href={`/destinations/${regionSlug}/${activeCategory.slug}/${siteItem.slug}`}
                  badge={activeCategory.title}
                  image={imgSrc}
                  alt={`${siteItem.name} — ${activeCategory.title} in ${regionName}`}
                  title={siteItem.name}
                  metaLeft={{ icon: '📍', text: regionName }}
                  metaRight={{ icon: '★', text: `Highlight ${String(idx + 1).padStart(2, '0')}` }}
                  footerLabel="Location Itineraries"
                  footerValue={countLabel}
                  headingLevel="h4"
                />
              );
            })}
          </div>
        </div>
      ) : (
        <div className="dest-activities-grid">
          {categories.map((cat) => (
            <CatalogCard
              key={cat.slug}
              href={`/destinations/${regionSlug}/${cat.slug}`}
              badge={`${cat.locations.length} Destinations`}
              image={cat.imagePool[0]}
              alt={`${cat.title} in ${regionName}`}
              title={cat.title}
              metaLeft={{
                icon: '⏱',
                text: cat.locations.slice(0, 2).join(' · ') || regionName,
              }}
              footerLabel={regionName}
              footerValue={`Explore ${cat.locations.length} Sites`}
              headingLevel="h4"
            />
          ))}
        </div>
      )}
    </div>
  );
}
