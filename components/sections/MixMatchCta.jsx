import Button from '@/components/ui/Button';
import Icon from '@/components/icons';
import { site } from '@/data/site';

export default function MixMatchCta({
  title = 'Can’t decide on a tour yet?',
  description = 'Tell our Thimphu trip designers your dates, pace and interests. We will craft a custom day-by-day proposal within 24 hours.',
  primaryLabel = 'Plan my trip',
  primaryHref = '/plan-my-trip',
  secondaryLabel = 'WhatsApp us',
}) {
  return (
    <section className="mix-match-section">
      <div className="container">
        <div className="mix-match-box">
          <div className="mix-match-text">
            <h2 className="mix-match-title">{title}</h2>
            <p className="mix-match-desc">{description}</p>
          </div>
          <div className="mix-match-actions">
            <Button href={primaryHref} variant="mix-primary">
              <span>{primaryLabel}</span>
              <span aria-hidden="true">→</span>
            </Button>
            <Button
              href={`https://wa.me/${site.contact.whatsappNumber}`}
              external
              variant="mix-outline"
            >
              <Icon name="whatsapp" size={18} />
              <span>{secondaryLabel}</span>
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}
