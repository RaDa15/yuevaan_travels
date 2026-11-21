'use client';

import { useRef, useState } from 'react';
import FormConfirmation from './FormConfirmation';
import { submitEnquiry } from '@/lib/api';
import { validateInquiryInput } from '@/lib/validation';
import { site } from '@/data/site';
import styles from './Forms.module.css';

export default function ContactForm() {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [dates, setDates] = useState('');
  const [party, setParty] = useState(site.travellerOptions.partyOptions[0]);
  const [notes, setNotes] = useState('');
  const [website, setWebsite] = useState('');

  const [errors, setErrors] = useState({});
  const [submitState, setSubmitState] = useState('editing'); // editing | submitting | sent | notSent
  const [reference, setReference] = useState('');

  const formRef = useRef(null);

  const focusField = (fieldName) => {
    requestAnimationFrame(() => {
      const el = formRef.current?.querySelector(`[name="${fieldName}"]`);
      el?.focus();
    });
  };

  const buildPayload = () => ({
    type: 'inquiry',
    fullName,
    email,
    phone,
    dates,
    party,
    notes,
    website,
    source: '/contact',
  });

  const performSubmit = async () => {
    setSubmitState('submitting');
    try {
      const res = await submitEnquiry(buildPayload());
      setReference(res.reference);
      setSubmitState('sent');
    } catch (err) {
      if (err.field && err.status === 400) {
        setErrors({ [err.field]: err.message });
        setSubmitState('editing');
        focusField(err.field);
      } else {
        setSubmitState('notSent');
      }
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const check = validateInquiryInput(buildPayload());
    if (!check.valid) {
      setErrors(check.errors);
      if (check.firstField) focusField(check.firstField);
      return;
    }
    setErrors({});
    await performSubmit();
  };

  const handleReset = () => {
    setFullName('');
    setEmail('');
    setPhone('');
    setDates('');
    setParty(site.travellerOptions.partyOptions[0]);
    setNotes('');
    setWebsite('');
    setErrors({});
    setReference('');
    setSubmitState('editing');
  };

  const summaryLines = [
    reference ? `Reference: ${reference}` : null,
    `Name: ${fullName}`,
    `Email: ${email}`,
    phone ? `Phone / WhatsApp: ${phone}` : null,
    dates ? `Target Dates: ${dates}` : null,
    `Party: ${party}`,
    notes ? `\nMessage:\n${notes}` : null,
  ].filter(Boolean).join('\n');

  const mailSubject = encodeURIComponent(
    `Bhutan Inquiry${reference ? ` [${reference}]` : ''} from ${fullName || 'Traveller'}`
  );
  const mailBody = encodeURIComponent(summaryLines);
  const mailHref = `mailto:${site.contact.email}?subject=${mailSubject}&body=${mailBody}`;
  const gmailHref = `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(
    site.contact.email
  )}&su=${mailSubject}&body=${mailBody}`;
  const whatsappHref = `https://wa.me/${site.contact.whatsappNumber}?text=${encodeURIComponent(
    `Hi Yuevaan Bhutan Travels, I have a travel inquiry:\n\n${summaryLines}`
  )}`;

  if (submitState === 'sent' || submitState === 'notSent') {
    return (
      <FormConfirmation
        mode={submitState}
        type="inquiry"
        reference={reference}
        summaryText={`Thank you for contacting ${site.name}. A licensed travel specialist from our Thimphu desk has received your request and will reply within 24 hours.`}
        detailText={`Reference: ${reference}. You can also forward your inquiry immediately via WhatsApp or Gmail below.`}
        mailtoHref={mailHref}
        gmailHref={gmailHref}
        whatsappHref={whatsappHref}
        onReset={handleReset}
        onRetry={performSubmit}
      />
    );
  }

  return (
    <form ref={formRef} id="contact-form" action="/api/inquiries" method="post" className={styles.contactForm} onSubmit={handleSubmit} noValidate>
      <input type="hidden" name="type" value="inquiry" />
      <input type="hidden" name="source" value="/contact" />

      <div className="sr-only-trap" aria-hidden="true">
        <label htmlFor="contactWebsite">Website</label>
        <input
          id="contactWebsite"
          name="website"
          type="text"
          tabIndex={-1}
          autoComplete="off"
          value={website}
          onChange={(e) => setWebsite(e.target.value)}
        />
      </div>

      <div>
        <label htmlFor="contactName" className="rtb-field-label">Your Full Name *</label>
        <input
          id="contactName"
          name="fullName"
          required
          type="text"
          value={fullName}
          onChange={(e) => {
            setFullName(e.target.value);
            setErrors((prev) => ({ ...prev, fullName: undefined }));
          }}
          aria-describedby={errors.fullName ? 'err-contactName' : undefined}
          className={`rtb-input${errors.fullName ? ' is-error' : ''}`}
          placeholder="e.g. Eleanor Vance"
        />
        {errors.fullName ? (
          <span id="err-contactName" className="field-error-text">{errors.fullName}</span>
        ) : null}
      </div>

      <div className={styles.contactRow2}>
        <div>
          <label htmlFor="contactEmail" className="rtb-field-label">Email Address *</label>
          <input
            id="contactEmail"
            name="email"
            required
            type="email"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              setErrors((prev) => ({ ...prev, email: undefined }));
            }}
            aria-describedby={errors.email ? 'err-contactEmail' : undefined}
            className={`rtb-input${errors.email ? ' is-error' : ''}`}
            placeholder="e.g. eleanor@example.com"
          />
          {errors.email ? (
            <span id="err-contactEmail" className="field-error-text">{errors.email}</span>
          ) : null}
        </div>
        <div>
          <label htmlFor="contactPhone" className="rtb-field-label">Phone / WhatsApp (Optional)</label>
          <input
            id="contactPhone"
            name="phone"
            type="tel"
            value={phone}
            onChange={(e) => {
              setPhone(e.target.value);
              setErrors((prev) => ({ ...prev, phone: undefined }));
            }}
            aria-describedby={errors.phone ? 'err-contactPhone' : undefined}
            className={`rtb-input${errors.phone ? ' is-error' : ''}`}
            placeholder="e.g. +1 555 019 2831"
          />
          {errors.phone ? (
            <span id="err-contactPhone" className="field-error-text">{errors.phone}</span>
          ) : null}
        </div>
      </div>

      <div className={styles.contactRow2}>
        <div>
          <label htmlFor="contactDates" className="rtb-field-label">Target Month / Dates</label>
          <input
            id="contactDates"
            name="dates"
            type="text"
            value={dates}
            onChange={(e) => setDates(e.target.value)}
            className="rtb-input"
            placeholder="e.g. Oct 2026 (7–10 days)"
          />
        </div>
        <div>
          <label htmlFor="contactParty" className="rtb-field-label">Travel Party</label>
          <select
            id="contactParty"
            name="party"
            value={party}
            onChange={(e) => setParty(e.target.value)}
            className="rtb-select"
          >
            {site.travellerOptions.partyOptions.map((opt) => (
              <option key={opt} value={opt}>{opt}</option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <label htmlFor="contactMessage" className="rtb-field-label">Your Message or Specific Requests</label>
        <textarea
          id="contactMessage"
          name="notes"
          rows={4}
          value={notes}
          onChange={(e) => {
            setNotes(e.target.value);
            setErrors((prev) => ({ ...prev, notes: undefined }));
          }}
          aria-describedby={errors.notes ? 'err-contactMessage' : undefined}
          className={`rtb-textarea${errors.notes ? ' is-error' : ''}`}
          placeholder="Tell us if you have specific festivals, bird watching targets, or hiking preferences in mind..."
        />
        {errors.notes ? (
          <span id="err-contactMessage" className="field-error-text">{errors.notes}</span>
        ) : null}
      </div>

      <button
        type="submit"
        className={`btn btn-primary ${styles.contactSubmitBtn}`}
        disabled={submitState === 'submitting'}
      >
        {submitState === 'submitting' ? 'Sending Inquiry…' : 'Send Inquiry to Thimphu Desk →'}
      </button>
      <span className={styles.contactSubmitNote}>
        Guaranteed local reply within 24 hours · No obligations
      </span>
    </form>
  );
}
