import Reveal from '@/components/ui/Reveal';
import { homeReviews } from '@/lib/selectors';
import styles from '@/components/home/Home.module.css';

function ReviewsGroup({ items, hidden = false }) {
  return (
    <div className="reviews-ticker-group" aria-hidden={hidden || undefined}>
      {items.map((rev) => (
        <div key={rev.id} className="review-ticker-card">
          <div>
            <div className="stars-row" aria-label={hidden ? undefined : `${rev.rating} out of 5 stars`}>
              {Array.from({ length: rev.rating }).map((_, idx) => (
                <span key={idx} className="star-icon" aria-hidden="true">★</span>
              ))}
            </div>
            <p className="review-quote">“{rev.quote}”</p>
          </div>
          <div className="review-meta">
            <div className="reviewer-name">{rev.name}</div>
            <div className="reviewer-country">
              {rev.flag ? `${rev.flag} ` : ''}{rev.country}
            </div>
            <div className="reviewed-tour">{rev.tourLabel}</div>
          </div>
        </div>
      ))}
    </div>
  );
}

export default function ReviewsTicker() {
  const items = homeReviews();
  if (!items.length) return null;

  return (
    <section
      className={`section ${styles.reviewsSection}`}
      aria-labelledby="guest-reviews-heading"
    >
      <div className="container">
        <Reveal className="section-center-header">
          <h2 id="guest-reviews-heading" className="heading-serif-lg">
            What our guests say
          </h2>
          <p className="subhead">
            Authentic reviews from independent travelers, couples, and trekking enthusiasts who explored the Kingdom
            with our local team.
          </p>
        </Reveal>
      </div>

      <div className="reviews-ticker-wrapper" aria-label="Customer Reviews Marquee">
        <div className="reviews-ticker-track">
          <ReviewsGroup items={items} />
          <ReviewsGroup items={items} hidden />
        </div>
      </div>
    </section>
  );
}
