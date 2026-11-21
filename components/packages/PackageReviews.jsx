import styles from './PackageDetail.module.css';

export default function PackageReviews({ reviews }) {
  if (!reviews || reviews.length === 0) return null;

  return (
    <section className="pkg-section">
      <div>
        <span className="pkg-badge-row">
          <span className="pkg-badge-dot" aria-hidden="true" />
          TRAVELLER EXPERIENCES
        </span>
        <h2 className="pkg-section-title">What our guests say</h2>
      </div>
      <div className={styles.reviewsGrid}>
        {reviews.map((rev) => (
          <div key={rev.id} className={styles.reviewCard}>
            <div className={styles.reviewStars} aria-label={`${rev.rating} out of 5 stars`}>
              {'★'.repeat(rev.rating)}
            </div>
            <p className={styles.reviewQuote}>“{rev.quote}”</p>
            <div className={styles.reviewAuthor}>
              <strong>{rev.name}</strong> · {rev.country}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
