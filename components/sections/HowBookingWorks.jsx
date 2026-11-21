import Reveal from '@/components/ui/Reveal';

const STEPS = [
  {
    pill: 'STEP 01',
    title: 'Explore Your Trip',
    desc: 'Browse our signature itineraries or share your personal wishlist, dates, and group preferences.',
    svg: (
      <svg className="step-icon-svg" viewBox="0 0 52 52" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M12 14L18 20M18 14L12 20" />
        <path d="M34 32L40 38M40 32L34 38" />
        <circle cx="14" cy="36" r="4" stroke="currentColor" />
        <path d="M17 33C21 28 23 23 35 18" />
        <path d="M31 16L35 18L32 22" />
        <circle cx="38" cy="16" r="4" stroke="currentColor" />
      </svg>
    ),
  },
  {
    pill: 'STEP 02',
    title: 'See Your Price',
    desc: 'Get an all-inclusive estimate covering accommodations, guide, vehicle, and official SDF & visa fees.',
    svg: (
      <svg className="step-icon-svg" viewBox="0 0 52 52" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <circle cx="26" cy="26" r="17" stroke="currentColor" />
        <circle cx="26" cy="26" r="10.5" stroke="currentColor" />
        <circle cx="26" cy="26" r="3.5" stroke="currentColor" fill="currentColor" />
        <path d="M12 12L23.5 23.5" />
        <path d="M9 13.5L13.5 9" />
        <path d="M7.5 10.5L10.5 7.5" />
      </svg>
    ),
  },
  {
    pill: 'STEP 03',
    title: 'Send An Enquiry',
    desc: 'Submit your request with zero upfront commitment. We adjust hotels and dates until it is perfect.',
    svg: (
      <svg className="step-icon-svg" viewBox="0 0 52 52" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <rect x="6" y="10" width="40" height="32" rx="4" stroke="currentColor" />
        <line x1="6" y1="18" x2="46" y2="18" stroke="currentColor" />
        <circle cx="11" cy="14" r="1.5" fill="currentColor" />
        <circle cx="16" cy="14" r="1.5" fill="currentColor" />
        <circle cx="21" cy="14" r="1.5" fill="currentColor" />
        <path d="M18 26L14 30L18 34" />
        <path d="M28 24L24 36" />
        <path d="M34 26L38 30L34 34" />
      </svg>
    ),
  },
  {
    pill: 'STEP 04',
    title: 'Hear Back In 24h',
    desc: 'A licensed specialist from our Thimphu desk answers your questions and delivers your custom plan.',
    svg: (
      <svg className="step-icon-svg" viewBox="0 0 52 52" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <circle cx="26" cy="17" r="5.5" stroke="currentColor" />
        <path d="M17 37C17 32 21 28.5 26 28.5C31 28.5 35 32 35 37H17Z" stroke="currentColor" />
        <circle cx="15" cy="21" r="4" stroke="currentColor" />
        <path d="M7 37C7 33.2 9.8 30.5 13.5 30" stroke="currentColor" />
        <circle cx="37" cy="21" r="4" stroke="currentColor" />
        <path d="M38.5 30C42.2 30.5 45 33.2 45 37" stroke="currentColor" />
      </svg>
    ),
  },
];

export default function HowBookingWorks() {
  return (
    <section className="section" aria-labelledby="how-booking-works-heading">
      <div className="container">
        <Reveal className="section-center-header">
          <h2 id="how-booking-works-heading" className="heading-serif-lg">
            How booking works
          </h2>
          <p className="subhead">
            An easy, completely transparent 4-step process to plan your Bhutan journey with no hidden levies.
          </p>
        </Reveal>

        <div className="steps-four-grid">
          {STEPS.map((step, idx) => (
            <Reveal key={step.pill} delay={idx * 75} className="step-card">
              <div className="step-graphic-wrap">
                <div className="step-circle-backdrop" />
                {step.svg}
              </div>
              <span className="step-pill">{step.pill}</span>
              <h3 className="step-title">{step.title}</h3>
              <p className="step-desc">{step.desc}</p>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
