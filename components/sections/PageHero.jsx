import Button from '@/components/ui/Button';

export default function PageHero({
  eyebrow,
  title,
  description,
  image,
  alt,
  actions = [],
  priority = true,
}) {
  return (
    <section className="page-hero" aria-labelledby="hero-title">
      <img
        src={image}
        alt={alt}
        width={1920}
        height={800}
        fetchPriority={priority ? 'high' : undefined}
        className="page-hero-bg"
      />
      <div className="page-hero-overlay" />
      <div className="container page-hero-content">
        <div className="hero-eyebrow-pill">
          <span className="hero-dot" aria-hidden="true" />
          <span>{eyebrow}</span>
        </div>
        <h1 id="hero-title" className="page-hero-title">{title}</h1>
        <p className="page-hero-desc">{description}</p>
        {actions.length > 0 ? (
          <div className="page-hero-actions">
            {actions.map((act) => (
              <Button
                key={act.label}
                href={act.href}
                external={act.external}
                variant={act.variant === 'secondary' ? 'hero-secondary' : 'hero-primary'}
              >
                {act.label}
              </Button>
            ))}
          </div>
        ) : null}
      </div>
    </section>
  );
}
