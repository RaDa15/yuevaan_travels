import Icon from '@/components/icons';
import { formatUSD } from '@/lib/format';
import { site } from '@/data/site';

export default function Faqs({ items }) {
  const sdfUsd = formatUSD(site.fees.sdf.internationalUsdPerNight);
  const childRange = `${site.fees.sdf.childAgeMin}–${site.fees.sdf.childAgeMax}`;

  const resolvedFaqs = items || [
    {
      q: 'How does Bhutan visa processing work?',
      a: `Yuevaan Bhutan Travels processes your official visa clearance directly with the Department of Tourism and Department of Immigration. All we require is a color passport copy valid for at least 6 months (and the one-time ${formatUSD(site.fees.visaUsd)} visa fee is already included). Your e-visa clearance is issued within 3 to 5 business days and emailed to you.`,
    },
    {
      q: 'What is the Sustainable Development Fee (SDF)?',
      a: `The SDF is a mandatory Royal Government levy of ${sdfUsd} per adult per night (ages ${childRange} receive ${site.fees.sdf.childDiscountPct}% off; under ${site.fees.sdf.childAgeMin} exempt) that funds free universal healthcare, education, and conservation across Bhutan. It is 100% included in all our tour package prices.`,
    },
  ];

  return (
    <section className="pkg-section">
      <div>
        <span className="pkg-badge-row">
          <span className="pkg-badge-dot" aria-hidden="true" />
          PREPARATION
        </span>
        <h2 className="pkg-section-title">Essential traveller information</h2>
      </div>
      <div>
        {resolvedFaqs.map((faq, idx) => (
          <details key={faq.q} className="pkg-accordion-item" open={idx === 0}>
            <summary>
              <span>{faq.q}</span>
              <Icon name="plus" size={18} />
            </summary>
            <p>{faq.a}</p>
          </details>
        ))}
      </div>
    </section>
  );
}
