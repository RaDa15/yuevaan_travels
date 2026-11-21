'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import Breadcrumb from '@/components/layout/Breadcrumb';
import Icon from '@/components/icons';
import Stepper from './Stepper';
import FormConfirmation from './FormConfirmation';
import { addNightsUTC, formatDisplayDate, formatDuration, formatUSD, getBookingDateBounds } from '@/lib/format';
import { submitEnquiry } from '@/lib/api';
import { validateBookingInput } from '@/lib/validation';
import { site } from '@/data/site';
import styles from './Forms.module.css';

export default function BookingForm({ tourSummaries }) {
  const searchParams = useSearchParams();
  const requestedSlug = searchParams.get('tour') || 'custom';
  const findTour = (slug) =>
    tourSummaries.find((t) => t.slug === slug) ||
    tourSummaries.find((t) => t.slug === 'custom') ||
    tourSummaries[0];

  const [selectedSlug, setSelectedSlug] = useState(() => findTour(requestedSlug).slug);
  const [dateBounds, setDateBounds] = useState(() => getBookingDateBounds());
  const [startDate, setStartDate] = useState(() => getBookingDateBounds().defaultStart);
  const [openDrawer, setOpenDrawer] = useState(null); // 'dates' | 'trip' | null

  const [adults, setAdults] = useState(2);
  const [children, setChildren] = useState(0);
  const [youngChildren, setYoungChildren] = useState(0);

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [dob, setDob] = useState('');
  const [nationality, setNationality] = useState('');
  const [phoneCode, setPhoneCode] = useState('+975');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [notes, setNotes] = useState('');
  const [agreeTerms, setAgreeTerms] = useState(false);
  const [website, setWebsite] = useState(''); // Honeypot (BR-16)

  const [errors, setErrors] = useState({});
  const [submitState, setSubmitState] = useState('editing'); // editing | submitting | sent | notSent
  const [reference, setReference] = useState('');

  const formRef = useRef(null);
  const startDateInputRef = useRef(null);

  useEffect(() => {
    const matched = findTour(requestedSlug);
    const bounds = getBookingDateBounds();
    const id = requestAnimationFrame(() => {
      setSelectedSlug(matched.slug);
      setDateBounds(bounds);
      setStartDate(bounds.defaultStart);
    });
    return () => cancelAnimationFrame(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [requestedSlug]);

  const currentTour = findTour(selectedSlug);
  const endDate = addNightsUTC(startDate, currentTour.nights);
  const adultSubtotal = adults * currentTour.price;

  const focusField = (fieldName) => {
    if (fieldName === 'startDate') {
      setOpenDrawer('dates');
      requestAnimationFrame(() => startDateInputRef.current?.focus());
      return;
    }
    requestAnimationFrame(() => {
      const target = formRef.current?.querySelector(`[name="${fieldName}"]`);
      target?.focus();
    });
  };

  const buildPayload = () => ({
    type: 'booking',
    tourSlug: currentTour.slug,
    startDate,
    adults,
    children,
    youngChildren,
    fullName,
    email,
    dob,
    nationality,
    phoneCode,
    phoneNumber,
    notes,
    agreeTerms,
    website,
    source: '/plan-my-trip',
  });

  const performSubmit = async () => {
    setSubmitState('submitting');
    try {
      const result = await submitEnquiry(buildPayload());
      setReference(result.reference);
      setSubmitState('sent');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err) {
      if (err.field && err.status === 400) {
        setErrors({ [err.field]: err.message });
        setSubmitState('editing');
        focusField(err.field);
      } else {
        setSubmitState('notSent');
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const payload = buildPayload();
    const check = validateBookingInput(
      payload,
      tourSummaries.map((t) => t.slug)
    );

    if (!check.valid) {
      setErrors(check.errors);
      if (check.firstField) focusField(check.firstField);
      return;
    }

    setErrors({});
    await performSubmit();
  };

  const handleReset = () => {
    const bounds = getBookingDateBounds();
    setAdults(2);
    setChildren(0);
    setYoungChildren(0);
    setFullName('');
    setEmail('');
    setDob('');
    setNationality('');
    setPhoneCode('+975');
    setPhoneNumber('');
    setNotes('');
    setAgreeTerms(false);
    setWebsite('');
    setStartDate(bounds.defaultStart);
    setErrors({});
    setReference('');
    setSubmitState('editing');
  };

  const partyParts = [`${adults} adult${adults > 1 ? 's' : ''}`];
  if (children > 0) partyParts.push(`${children} child${children > 1 ? 'ren' : ''}`);
  if (youngChildren > 0) partyParts.push(`${youngChildren} young child${youngChildren > 1 ? 'ren' : ''}`);

  const refLabel = reference ? ` [${reference}]` : '';
  const summaryLines = [
    reference ? `Booking Reference: ${reference}` : null,
    `Tour: ${currentTour.title}`,
    `Dates: ${formatDisplayDate(startDate)} – ${formatDisplayDate(endDate)} (${currentTour.days} days)`,
    `Party: ${partyParts.join(', ')}`,
    `Estimated Total: ${formatUSD(adultSubtotal)}`,
    `Lead Traveller: ${fullName}`,
    `Nationality: ${nationality}`,
    `Phone / WhatsApp: ${phoneCode} ${phoneNumber}`,
    `Email: ${email}`,
    notes ? `Notes: ${notes}` : null,
  ].filter(Boolean).join('\n');

  const mailtoSubject = encodeURIComponent(`Booking Request${refLabel}: ${currentTour.title}`);
  const mailtoBody = encodeURIComponent(summaryLines);
  const mailtoHref = `mailto:${site.contact.email}?subject=${mailtoSubject}&body=${mailtoBody}`;
  const gmailHref = `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(
    site.contact.email
  )}&su=${mailtoSubject}&body=${mailtoBody}`;
  const whatsappHref = `https://wa.me/${site.contact.whatsappNumber}?text=${encodeURIComponent(
    `Hi Yuevaan Bhutan Travels, I have submitted a booking request:\n\n${summaryLines}`
  )}`;

  const breadcrumbItems =
    currentTour.slug === 'custom'
      ? [
          { label: 'Home', href: '/' },
          { label: 'Popular Tours', href: '/tours' },
          { label: 'Request to book' },
        ]
      : [
          { label: 'Home', href: '/' },
          { label: 'Popular Tours', href: '/tours' },
          { label: currentTour.title, href: `/packages/${currentTour.slug}` },
          { label: 'Request to book' },
        ];

  return (
    <>
      <Breadcrumb items={breadcrumbItems} />

      <main id="main-content" className="rtb-page">
        <div className="container">
          <div className="rtb-header">
            <h1 className="rtb-title">Request to book</h1>
            <p className="rtb-subtitle">
              No payment now. A trip designer in Thimphu replies within 24 hours.
            </p>
          </div>

          <div className="rtb-grid">
            <div id="rtbLeftCol">
              {submitState === 'sent' || submitState === 'notSent' ? (
                <FormConfirmation
                  mode={submitState}
                  type="booking"
                  reference={reference}
                  summaryText={`Thank you, ${fullName.trim()}. Your request for ${currentTour.title} (${formatDisplayDate(startDate)} – ${formatDisplayDate(endDate)}) for ${partyParts.join(', ')} is logged under reference ${reference}.`}
                  detailText={`Our Thimphu trip designers have received your request and will send a tailored day-by-day quote to ${email.trim()} within 24 hours. You can also send your booking summary directly via WhatsApp or Gmail below.`}
                  mailtoHref={mailtoHref}
                  gmailHref={gmailHref}
                  whatsappHref={whatsappHref}
                  onReset={handleReset}
                  onRetry={performSubmit}
                />
              ) : (
                <>
                  {/* Selected Trip Header Card */}
                  <div className="rtb-trip-card" id="bookingTripCard">
                    <div className="rtb-trip-row">
                      <img
                        src={currentTour.heroImage}
                        alt={currentTour.title}
                        width={96}
                        height={68}
                        className="rtb-trip-thumb"
                      />
                      <div className="rtb-trip-info">
                        <div className="rtb-trip-title">{currentTour.title}</div>
                        <div className="rtb-trip-meta">
                          {formatDuration(currentTour.days, currentTour.nights, 'meta')}
                        </div>
                        <div className="rtb-trip-dates">
                          <Icon name="calendar" size={15} />
                          <span>
                            {formatDisplayDate(startDate)} – {formatDisplayDate(endDate)}
                          </span>
                        </div>
                      </div>
                      <div className="rtb-trip-actions">
                        <button
                          type="button"
                          className="rtb-link-btn"
                          onClick={() => setOpenDrawer((prev) => (prev === 'dates' ? null : 'dates'))}
                        >
                          Change dates
                        </button>
                        <button
                          type="button"
                          className="rtb-link-btn"
                          onClick={() => setOpenDrawer((prev) => (prev === 'trip' ? null : 'trip'))}
                        >
                          Change trip
                        </button>
                      </div>
                    </div>

                    {openDrawer === 'dates' ? (
                      <div className="rtb-trip-drawer is-open" aria-label="Change preferred arrival date">
                        <div className="rtb-drawer-grid">
                          <div>
                            <label htmlFor="rtbStartDateInput" className="rtb-field-label">
                              Preferred arrival date in Paro
                            </label>
                            <input
                              ref={startDateInputRef}
                              id="rtbStartDateInput"
                              name="startDate"
                              type="date"
                              min={dateBounds.minStart}
                              max={dateBounds.maxStart}
                              value={startDate}
                              onChange={(e) => {
                                setStartDate(e.target.value);
                                setErrors((prev) => ({ ...prev, startDate: undefined }));
                              }}
                              aria-describedby={errors.startDate ? 'err-startDate' : undefined}
                              className={`rtb-input${errors.startDate ? ' is-error' : ''}`}
                            />
                            {errors.startDate ? (
                              <span id="err-startDate" className="field-error-text">{errors.startDate}</span>
                            ) : null}
                          </div>
                          <div className={styles.drawerNote}>
                            Departure date adjusts automatically based on the itinerary duration.
                          </div>
                        </div>
                      </div>
                    ) : null}

                    {openDrawer === 'trip' ? (
                      <div className="rtb-trip-drawer is-open" aria-label="Change selected trip">
                        <label htmlFor="rtbTourSelect" className="rtb-field-label">
                          Choose a tour or custom journey
                        </label>
                        <select
                          id="rtbTourSelect"
                          value={selectedSlug}
                          onChange={(e) => setSelectedSlug(e.target.value)}
                          className="rtb-select"
                        >
                          {tourSummaries.map((item) => (
                            <option key={item.slug} value={item.slug}>
                              {item.title} ({formatDuration(item.days, item.nights, 'short')} · {formatUSD(item.price)})
                            </option>
                          ))}
                        </select>
                      </div>
                    ) : null}
                  </div>

                  <form ref={formRef} id="rtbBookingForm" action="/api/inquiries" method="post" onSubmit={handleSubmit} noValidate>
                    <input type="hidden" name="type" value="booking" />
                    <input type="hidden" name="tourSlug" value={selectedSlug} />
                    <input type="hidden" name="startDate" value={startDate} />
                    <input type="hidden" name="adults" value={adults} />
                    <input type="hidden" name="children" value={children} />
                    <input type="hidden" name="youngChildren" value={youngChildren} />
                    <input type="hidden" name="source" value="/plan-my-trip" />

                    {/* Honeypot trap */}
                    <div className="sr-only-trap" aria-hidden="true">
                      <label htmlFor="rtbWebsite">Website</label>
                      <input
                        id="rtbWebsite"
                        name="website"
                        type="text"
                        tabIndex={-1}
                        autoComplete="off"
                        value={website}
                        onChange={(e) => setWebsite(e.target.value)}
                      />
                    </div>

                    {/* Step 1: Who's travelling? */}
                    <section className="rtb-section" aria-labelledby="step-travellers">
                      <div className="rtb-step-head">
                        <span className="rtb-step-badge" aria-hidden="true">1</span>
                        <div>
                          <h2 id="step-travellers" className="rtb-step-title">Who&apos;s travelling?</h2>
                          <p className="rtb-step-sub">Ages on the day you arrive in Bhutan</p>
                        </div>
                      </div>

                      <div className="rtb-travellers-card">
                        <Stepper
                          label="Adults"
                          note={`Age ${site.fees.sdf.adultAgeMin} and over`}
                          value={adults}
                          min={1}
                          max={20}
                          onChange={setAdults}
                        />
                        <Stepper
                          label="Children"
                          note={`Ages ${site.fees.sdf.childAgeMin}–${site.fees.sdf.childAgeMax} · Half SDF`}
                          value={children}
                          min={0}
                          max={12}
                          onChange={setChildren}
                        />
                        <Stepper
                          label="Young children"
                          note={`Under ${site.fees.sdf.childAgeMin} · Free SDF`}
                          value={youngChildren}
                          min={0}
                          max={12}
                          onChange={setYoungChildren}
                        />
                      </div>
                      {errors.adults ? <span className="field-error-text">{errors.adults}</span> : null}
                    </section>

                    {/* Step 2: Lead traveller */}
                    <section className="rtb-section" aria-labelledby="step-lead">
                      <div className="rtb-step-head">
                        <span className="rtb-step-badge" aria-hidden="true">2</span>
                        <div>
                          <h2 id="step-lead" className="rtb-step-title">Lead traveller</h2>
                          <p className="rtb-step-sub">
                            We&apos;ll send your quote to this person. Use the name on their passport.
                          </p>
                        </div>
                      </div>

                      <div className="rtb-form-fields">
                        <div className="rtb-form-grid-3">
                          <div>
                            <label htmlFor="rtbFullName" className="rtb-field-label">Full name *</label>
                            <input
                              id="rtbFullName"
                              name="fullName"
                              type="text"
                              required
                              value={fullName}
                              onChange={(e) => {
                                setFullName(e.target.value);
                                setErrors((prev) => ({ ...prev, fullName: undefined }));
                              }}
                              aria-describedby={errors.fullName ? 'err-fullName' : undefined}
                              className={`rtb-input${errors.fullName ? ' is-error' : ''}`}
                              placeholder="e.g. Eleanor Vance"
                            />
                            {errors.fullName ? (
                              <span id="err-fullName" className="field-error-text">{errors.fullName}</span>
                            ) : null}
                          </div>

                          <div>
                            <label htmlFor="rtbEmail" className="rtb-field-label">Email *</label>
                            <input
                              id="rtbEmail"
                              name="email"
                              type="email"
                              required
                              value={email}
                              onChange={(e) => {
                                setEmail(e.target.value);
                                setErrors((prev) => ({ ...prev, email: undefined }));
                              }}
                              aria-describedby={errors.email ? 'err-email' : undefined}
                              className={`rtb-input${errors.email ? ' is-error' : ''}`}
                              placeholder="e.g. eleanor@example.com"
                            />
                            {errors.email ? (
                              <span id="err-email" className="field-error-text">{errors.email}</span>
                            ) : null}
                          </div>

                          <div>
                            <label htmlFor="rtbDob" className="rtb-field-label">Date of birth *</label>
                            <input
                              id="rtbDob"
                              name="dob"
                              type="date"
                              required
                              value={dob}
                              onChange={(e) => {
                                setDob(e.target.value);
                                setErrors((prev) => ({ ...prev, dob: undefined }));
                              }}
                              aria-describedby={errors.dob ? 'err-dob' : undefined}
                              className={`rtb-input${errors.dob ? ' is-error' : ''}`}
                            />
                            {errors.dob ? (
                              <span id="err-dob" className="field-error-text">{errors.dob}</span>
                            ) : null}
                          </div>
                        </div>

                        <div>
                          <label htmlFor="rtbNationality" className="rtb-field-label">Nationality *</label>
                          <select
                            id="rtbNationality"
                            name="nationality"
                            required
                            value={nationality}
                            onChange={(e) => {
                              setNationality(e.target.value);
                              setErrors((prev) => ({ ...prev, nationality: undefined }));
                            }}
                            aria-describedby={errors.nationality ? 'err-nationality' : undefined}
                            className={`rtb-select${errors.nationality ? ' is-error' : ''}`}
                          >
                            <option value="">Choose a nationality</option>
                            {site.travellerOptions.nationalities.map((nat) => (
                              <option key={nat} value={nat}>{nat}</option>
                            ))}
                          </select>
                          {errors.nationality ? (
                            <span id="err-nationality" className="field-error-text">{errors.nationality}</span>
                          ) : null}
                        </div>

                        <div>
                          <label htmlFor="rtbPhoneNumber" className="rtb-field-label">
                            Mobile or WhatsApp number *
                          </label>
                          <div className="rtb-phone-row">
                            <select
                              id="rtbPhoneCode"
                              name="phoneCode"
                              className="rtb-select"
                              aria-label="Country dialing code"
                              value={phoneCode}
                              onChange={(e) => setPhoneCode(e.target.value)}
                            >
                              {site.travellerOptions.phoneCodes.map((code) => (
                                <option key={code} value={code}>{code}</option>
                              ))}
                            </select>
                            <input
                              id="rtbPhoneNumber"
                              name="phoneNumber"
                              type="tel"
                              required
                              value={phoneNumber}
                              onChange={(e) => {
                                setPhoneNumber(e.target.value);
                                setErrors((prev) => ({ ...prev, phoneNumber: undefined }));
                              }}
                              aria-describedby={errors.phoneNumber ? 'err-phoneNumber' : undefined}
                              className={`rtb-input${errors.phoneNumber ? ' is-error' : ''}`}
                              placeholder="Phone or WhatsApp number"
                            />
                          </div>
                          {errors.phoneNumber ? (
                            <span id="err-phoneNumber" className="field-error-text">{errors.phoneNumber}</span>
                          ) : null}
                        </div>

                        <div>
                          <label htmlFor="rtbNotes" className="rtb-field-label">
                            Anything we should know? (optional)
                          </label>
                          <textarea
                            id="rtbNotes"
                            name="notes"
                            value={notes}
                            onChange={(e) => {
                              setNotes(e.target.value);
                              setErrors((prev) => ({ ...prev, notes: undefined }));
                            }}
                            aria-describedby={errors.notes ? 'err-notes' : undefined}
                            className={`rtb-textarea${errors.notes ? ' is-error' : ''}`}
                            placeholder="Dietary needs, mobility, a celebration, the kind of hotels you like"
                          />
                          {errors.notes ? (
                            <span id="err-notes" className="field-error-text">{errors.notes}</span>
                          ) : null}
                        </div>
                      </div>
                    </section>

                    {/* Step 3: What happens next */}
                    <section className="rtb-section" aria-labelledby="step-next">
                      <div className="rtb-step-head">
                        <span className="rtb-step-badge" aria-hidden="true">3</span>
                        <div>
                          <h2 id="step-next" className="rtb-step-title">What happens next</h2>
                          <p className="rtb-step-sub">You can change anything before you confirm.</p>
                        </div>
                      </div>

                      <div className="rtb-next-box">
                        <div className="rtb-next-item">
                          <span className="rtb-next-num" aria-hidden="true">1</span>
                          <div>
                            <span className="rtb-next-title">You get a reference number</span>
                            <span className="rtb-next-desc">Straight away, on screen and by email.</span>
                          </div>
                        </div>
                        <div className="rtb-next-item">
                          <span className="rtb-next-num" aria-hidden="true">2</span>
                          <div>
                            <span className="rtb-next-title">A trip designer reviews it</span>
                            <span className="rtb-next-desc">They check hotels and guides for your dates.</span>
                          </div>
                        </div>
                        <div className="rtb-next-item">
                          <span className="rtb-next-num" aria-hidden="true">3</span>
                          <div>
                            <span className="rtb-next-title">You get your quote</span>
                            <span className="rtb-next-desc">A day-by-day plan and one clear price, within 24 hours.</span>
                          </div>
                        </div>
                        <div className="rtb-next-item">
                          <span className="rtb-next-num" aria-hidden="true">4</span>
                          <div>
                            <span className="rtb-next-title">You confirm when ready</span>
                            <span className="rtb-next-desc">Pay a deposit only once you&apos;re happy.</span>
                          </div>
                        </div>
                      </div>
                    </section>

                    {/* Terms & Primary CTA */}
                    <label className="rtb-terms-row">
                      <input
                        type="checkbox"
                        id="rtbAgreeTerms"
                        name="agreeTerms"
                        checked={agreeTerms}
                        onChange={(e) => {
                          setAgreeTerms(e.target.checked);
                          setErrors((prev) => ({ ...prev, agreeTerms: undefined }));
                        }}
                        aria-describedby={errors.agreeTerms ? 'err-agreeTerms' : undefined}
                      />
                      <span>
                        I agree to the <Link href="/legal#terms">terms and conditions</Link> and the{' '}
                        <Link href="/legal#booking-policy">booking and cancellation policy</Link>.
                      </span>
                    </label>
                    {errors.agreeTerms ? (
                      <span id="err-agreeTerms" className={`field-error-text ${styles.termsError}`}>
                        {errors.agreeTerms}
                      </span>
                    ) : null}

                    {Object.values(errors).some(Boolean) ? (
                      <div className={styles.validationBanner} role="alert">
                        Please check the highlighted field above: {Object.values(errors).find(Boolean)}
                      </div>
                    ) : null}

                    <button
                      type="submit"
                      className="rtb-submit-btn"
                      disabled={submitState === 'submitting'}
                    >
                      <span>{submitState === 'submitting' ? 'Sending booking request…' : 'Send booking request'}</span>
                      <span aria-hidden="true">→</span>
                    </button>
                    <p className="rtb-submit-note">Nothing to pay now.</p>
                  </form>
                </>
              )}
            </div>

            {/* Right Sticky Column */}
            <aside className="rtb-aside" aria-label="Booking Summary">
              <div className="rtb-summary-card">
                <h2 className="rtb-summary-heading">Summary</h2>
                <div className="rtb-summary-trip-name">{currentTour.title}</div>
                <div className="rtb-summary-trip-date">
                  {formatDisplayDate(startDate)} · {currentTour.days} days
                </div>

                <div className="rtb-summary-rows">
                  <div className="rtb-summary-row">
                    <span>Adults × {adults} at {formatUSD(currentTour.price)}</span>
                    <strong>{formatUSD(adultSubtotal)}</strong>
                  </div>
                  <div className="rtb-summary-row">
                    <span>Children × {children}</span>
                    <strong>In your quote</strong>
                  </div>
                  <div className="rtb-summary-row">
                    <span>Young children × {youngChildren}</span>
                    <strong>In your quote</strong>
                  </div>
                </div>

                <div className="rtb-summary-total-row">
                  <span className="rtb-summary-total-label">Estimated total</span>
                  <span className={`rtb-summary-total-val ${styles.summaryTotalAccent}`}>
                    {formatUSD(adultSubtotal)}
                  </span>
                </div>

                <p className="rtb-summary-caption">
                  SDF and visa included. Children&apos;s prices are confirmed in your quote.
                </p>

                <ul className="rtb-summary-perks">
                  <li><span className="rtb-perk-check" aria-hidden="true">✓</span> Nothing to pay now</li>
                  <li><span className="rtb-perk-check" aria-hidden="true">✓</span> Reply within 24 hours</li>
                  <li><span className="rtb-perk-check" aria-hidden="true">✓</span> Change anything before you confirm</li>
                </ul>
              </div>

              <div className="rtb-questions-card">
                <div className="rtb-questions-title">Questions?</div>
                <a
                  href={`https://wa.me/${site.contact.whatsappNumber}?text=${encodeURIComponent(`Hi Yuevaan Bhutan Travels, I have a question about ${currentTour.title}.`)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="rtb-wa-link"
                >
                  <Icon name="whatsapp" size={18} />
                  <span>Chat on WhatsApp ({site.contact.whatsappLabel})</span>
                </a>
              </div>
            </aside>
          </div>
        </div>
      </main>
    </>
  );
}
