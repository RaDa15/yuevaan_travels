'use client';

import { useState } from 'react';
import Icon from '@/components/icons';
import { hubTreks } from '@/data/treks';
import styles from './Experiences.module.css';

export default function TrekHubSection({ title, intro, defaultTrek = 'dagala' }) {
  const [activeHubId, setActiveHubId] = useState(defaultTrek);
  const mapUrl = `/maps/trek-map.html?trek=${activeHubId}`;

  return (
    <section className={styles.trekHubBox} id="trek-3d-explorer">
      <div className={styles.trekHubTop}>
        <div>
          <span className={styles.trekHubEyebrow}>
            <span className={styles.trekHubEyebrowDot} aria-hidden="true" />
            INTERACTIVE 3D TERRAIN &amp; SATELLITE EXPLORER
          </span>
          <h2 className={styles.trekHubTitle}>{title}</h2>
          <p className={styles.trekHubDesc}>{intro}</p>
        </div>
        <a
          href={mapUrl}
          target="_blank"
          rel="noopener noreferrer"
          className={`btn btn-primary ${styles.trekHubFsBtn}`}
        >
          <Icon name="external" size={15} />
          <span>Open Full Screen Explorer</span>
        </a>
      </div>

      <div className={styles.trekHubPills} role="tablist" aria-label="Select Bhutan trek route">
        {hubTreks.map((item) => {
          const active = item.hubId === activeHubId;
          return (
            <button
              key={item.hubId}
              type="button"
              role="tab"
              aria-selected={active}
              className={`hub-trek-pill${active ? ' active' : ''}`}
              onClick={() => setActiveHubId(item.hubId)}
            >
              {item.label}
            </button>
          );
        })}
      </div>

      <div className="map-embed-wrapper">
        <iframe
          src={mapUrl}
          title="3D Himalayan Trekking Routes Explorer"
          className={styles.trekHubIframe}
          loading="lazy"
          allowFullScreen
        />
      </div>
    </section>
  );
}
