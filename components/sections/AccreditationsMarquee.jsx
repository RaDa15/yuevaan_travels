import { site } from '@/data/site';

function MarqueeGroup({ hidden = false }) {
  return (
    <div className="marq-group" aria-hidden={hidden || undefined}>
      {site.accreditations.map((item) => (
        <span
          key={item.id}
          className="marq-item"
          data-org={item.org}
          tabIndex={hidden ? -1 : 0}
        >
          <span className="marq-pill">
            <img
              src={item.logo}
              alt={hidden ? '' : item.org}
              width={28}
              height={28}
              loading="lazy"
            />
            <span className="marq-text">{item.label}</span>
          </span>
        </span>
      ))}
    </div>
  );
}

export default function AccreditationsMarquee({ heading = 'Royal Government Licensed Bhutan Tour Operator' }) {
  return (
    <section className="accreditations-bar" aria-label="Accreditations and Affiliations">
      <div className="container accreditation-header-wrap">
        <h2 className="accreditation-heading">{heading}</h2>
      </div>
      <div className="marquee" aria-label="Accreditation and Partner Badges Ticker">
        <div className="marq-track">
          <MarqueeGroup />
          <MarqueeGroup hidden />
        </div>
      </div>
    </section>
  );
}
