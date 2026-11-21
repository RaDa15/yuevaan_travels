import CategoryTabs from './CategoryTabs';
import RegionToursList from './RegionToursList';
import styles from './Destinations.module.css';

export default function RegionBlock({ region, categories, tours, hidden }) {
  return (
    <section
      className={`dest-region-block${hidden ? ' is-region-hidden' : ''}`}
      id={region.slug}
    >
      <div className="dest-region-header">
        <div className="dest-region-title-wrap">
          <span className={styles.eyebrowRow}>
            <span className={styles.eyebrowDot} aria-hidden="true" />
            REGION OVERVIEW
          </span>
          <h2 className="dest-region-title">{region.name}</h2>
          <div className="dest-region-sub">
            {region.places} · Elevation: {region.elevation}
          </div>
          <p className="dest-region-desc">{region.description}</p>

          <div className={styles.locationsWrap}>
            <span className={styles.locationsLabel}>Key Locations &amp; Corridors:</span>
            <div className={styles.locationsList}>
              {region.keyLocations.map((loc) => (
                <span key={loc} className={styles.locationChip}>
                  {loc}
                </span>
              ))}
            </div>
          </div>
        </div>

        <div className="dest-region-media">
          <img
            src={region.blockImage.src}
            alt={region.blockImage.alt}
            width={720}
            height={520}
            loading="lazy"
          />
        </div>
      </div>

      <CategoryTabs
        regionName={region.name}
        regionSlug={region.slug}
        categories={categories}
      />

      <div className="dest-packages-section">
        <span className={styles.eyebrowRow}>
          <span className={styles.eyebrowDot} aria-hidden="true" />
          CURATED JOURNEYS
        </span>
        <h3 className="dest-section-heading">Tour Packages Covering {region.name}</h3>
        <RegionToursList regionName={region.name} tours={tours} />
      </div>
    </section>
  );
}
