import styles from './PackageDetail.module.css';

export default function Itinerary({ days }) {
  return (
    <section id="itinerary" className="pkg-section">
      <div className={styles.sectionHeaderRow}>
        <div>
          <span className="pkg-badge-row">
            <span className="pkg-badge-dot" aria-hidden="true" />
            DAY BY DAY ROUTE
          </span>
          <h2 className="pkg-section-title">Detailed daily itinerary</h2>
        </div>
        <span className={styles.itineraryHint}>Click any day to expand</span>
      </div>

      <div className="pkg-itinerary-list">
        {days.map((day, idx) => {
          const dayNum = String(idx + 1).padStart(2, '0');
          return (
            <details key={dayNum} className="pkg-day-card">
              <summary className="pkg-day-summary">
                <span className="pkg-day-badge">
                  <span className="pkg-day-badge-small">DAY</span>
                  <span className="pkg-day-badge-num">{dayNum}</span>
                </span>
                <div className="pkg-day-meta-wrap">
                  <h3 className="pkg-day-title">{day.title}</h3>
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
    </section>
  );
}
