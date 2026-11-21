'use client';

import { useState } from 'react';
import Link from 'next/link';
import Icon from '@/components/icons';
import styles from './Experiences.module.css';

const FILTER_TABS = [
  { key: 'all', label: 'All Experiences' },
  { key: 'western-bhutan', label: 'Western Bhutan' },
  { key: 'central-bhutan', label: 'Central Bhutan' },
  { key: 'eastern-bhutan', label: 'Eastern Bhutan' },
  { key: 'southern-bhutan', label: 'Southern Bhutan' },
];

const REGION_SHORT_NAMES = {
  'western-bhutan': 'Western',
  'central-bhutan': 'Central',
  'eastern-bhutan': 'Eastern',
  'southern-bhutan': 'Southern',
};

export default function ExperienceFilter({ items }) {
  const [regionFilter, setRegionFilter] = useState('all');

  const visibleItems =
    regionFilter === 'all'
      ? items
      : items.filter((exp) => Boolean(exp.regions?.[regionFilter]));

  return (
    <>
      <div className="exp-region-filter-bar" role="tablist" aria-label="Filter experiences by region">
        {FILTER_TABS.map((tab) => {
          const active = regionFilter === tab.key;
          return (
            <button
              key={tab.key}
              type="button"
              role="tab"
              aria-selected={active}
              className={`exp-filter-btn${active ? ' active' : ''}`}
              onClick={() => setRegionFilter(tab.key)}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      <div className="experiences-grid">
        {visibleItems.map((exp) => {
          const regKeys = Object.keys(exp.regions || {});
          return (
            <article key={exp.slug} className="experience-card" id={exp.slug}>
              <img
                src={exp.image.src}
                alt={exp.image.alt}
                width={640}
                height={400}
                loading="lazy"
                className="experience-card-img"
              />
              <div className="experience-card-body">
                <span className="card-time-badge">
                  <Icon name="calendar" size={16} />
                  <span>Best time: {exp.bestTime}</span>
                </span>
                <h3 className="card-title">{exp.title}</h3>
                <p className="card-desc">{exp.cardDesc}</p>

                <div className={styles.regionPills}>
                  {regKeys.map((regKey) => (
                    <Link
                      key={regKey}
                      href={`/destinations#${regKey}`}
                      className={styles.regionPill}
                    >
                      {REGION_SHORT_NAMES[regKey] || regKey}
                    </Link>
                  ))}
                </div>

                <div className="card-footer">
                  <span className="card-count">{`${exp.tourCount} ${exp.tourCount === 1 ? 'tour' : 'tours'}`}</span>
                  <Link href={`/experiences/${exp.slug}`} className="card-explore-btn">
                    Explore →
                  </Link>
                </div>
              </div>
            </article>
          );
        })}
      </div>
    </>
  );
}
