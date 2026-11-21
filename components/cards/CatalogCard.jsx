import Link from 'next/link';
import Badge from '@/components/ui/Badge';

export default function CatalogCard({
  href,
  badge,
  image,
  alt,
  title,
  metaLeft,
  metaRight,
  footerLabel,
  footerValue,
  headingLevel = 'h3',
  onClick,
}) {
  const Heading = headingLevel;

  const inner = (
    <>
      <div className="catalog-card-media">
        {badge ? <Badge variant="card">{badge}</Badge> : null}
        <img
          src={image}
          alt={alt}
          width={640}
          height={400}
          loading="lazy"
          className="catalog-card-img"
        />
      </div>
      <div className="catalog-card-body">
        <Heading className="catalog-card-title">{title}</Heading>
        <div className="catalog-card-meta">
          {metaLeft ? (
            <span className="catalog-meta-item">
              {metaLeft.icon ? <span className="catalog-meta-icon" aria-hidden="true">{metaLeft.icon}</span> : null}
              <span>{metaLeft.text}</span>
            </span>
          ) : null}
          {metaRight ? (
            <span className="catalog-meta-item">
              {metaRight.icon ? <span className="catalog-meta-star" aria-hidden="true">{metaRight.icon}</span> : null}
              <span>{metaRight.text}</span>
            </span>
          ) : null}
        </div>
        <div className="catalog-card-footer">
          <div className="catalog-price-wrap">
            <span className="catalog-price-label">{footerLabel}</span>
            <span className="catalog-price-val">{footerValue}</span>
          </div>
          <span className="catalog-arrow-btn" aria-hidden="true">→</span>
        </div>
      </div>
    </>
  );

  if (onClick) {
    return (
      <article className="catalog-card">
        <button
          type="button"
          onClick={onClick}
          className="catalog-card-btn"
          aria-label={`View ${title}`}
        >
          {inner}
        </button>
      </article>
    );
  }

  return (
    <article className="catalog-card">
      <Link href={href} className="catalog-card-link" aria-label={`View ${title}`}>
        {inner}
      </Link>
    </article>
  );
}
