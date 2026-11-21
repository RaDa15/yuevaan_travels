'use client';

import { useState } from 'react';
import Icon from '@/components/icons';
import { getTrekById } from '@/lib/selectors';
import styles from './PackageDetail.module.css';

export default function TrekMapSection({ mapIds, mapIntro, tourTitle }) {
  const maps = mapIds.map((id) => getTrekById(id)).filter(Boolean);
  const [selectedIdx, setSelectedIdx] = useState(0);

  if (maps.length === 0) return null;

  const currentMap = maps[selectedIdx] || maps[0];

  return (
    <section id="trek-3d-map" className={`pkg-section ${styles.mapSection}`}>
      <div className={styles.sectionHeaderRow}>
        <div>
          <span className="pkg-badge-row">
            <span className="pkg-badge-dot" aria-hidden="true" />
            INTERACTIVE 3D ROUTE MAP
          </span>
          <h2 className="pkg-section-title">Explore {tourTitle} Trail in 3D</h2>
        </div>
        <a
          href={currentMap.file}
          target="_blank"
          rel="noopener noreferrer"
          className={`btn btn-secondary ${styles.mapFsLink}`}
        >
          <Icon name="external" size={15} />
          <span>Open Full Screen 3D Map</span>
        </a>
      </div>

      {mapIntro ? <p className={styles.mapIntro}>{mapIntro}</p> : null}

      {maps.length > 1 ? (
        <div className={styles.mapPills} role="tablist" aria-label="Trail route switcher">
          {maps.map((m, idx) => {
            const active = idx === selectedIdx;
            return (
              <button
                key={m.id}
                type="button"
                role="tab"
                aria-selected={active}
                className={`btn ${active ? 'btn-primary' : 'btn-secondary'} ${styles.mapPillBtn}`}
                onClick={() => setSelectedIdx(idx)}
              >
                {m.pillLabel}
              </button>
            );
          })}
        </div>
      ) : null}

      <div className="map-embed-wrapper">
        <iframe
          src={currentMap.file}
          title={currentMap.title}
          className={styles.mapIframe}
          loading="lazy"
          allowFullScreen
        />
      </div>
    </section>
  );
}
