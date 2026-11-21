import { site } from '../data/site.js';
import { formatDisplayDate, getBookingDateBounds } from './format.js';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function isValidISODate(str) {
  if (!ISO_DATE_RE.test(str || '')) return false;
  const [y, m, d] = str.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  return dt.getUTCFullYear() === y && dt.getUTCMonth() === m - 1 && dt.getUTCDate() === d;
}

function getAgeOnDate(dobIso, refIso) {
  const [by, bm, bd] = dobIso.split('-').map(Number);
  const [ry, rm, rd] = refIso.split('-').map(Number);
  let age = ry - by;
  if (rm < bm || (rm === bm && rd < bd)) age -= 1;
  return age;
}

function countDigits(phoneStr) {
  const cleaned = String(phoneStr || '').replace(/[\s+\-()]/g, '');
  return /^\d{6,15}$/.test(cleaned);
}

export function validateBookingInput(input, allowedTourSlugs, now = new Date()) {
  const errors = {};
  const addError = (field, message) => {
    if (!errors[field]) errors[field] = message;
  };

  const fullName = String(input.fullName || '').trim();
  const email = String(input.email || '').trim();
  const phoneCode = String(input.phoneCode || '').trim();
  const phoneNumber = String(input.phoneNumber || '').trim();
  const dob = String(input.dob || '').trim();
  const nationality = String(input.nationality || '').trim();
  const tourSlug = String(input.tourSlug || '').trim();
  const startDate = String(input.startDate || '').trim();
  const notes = String(input.notes || '').trim();
  const agreeTerms = input.agreeTerms === true || input.agreeTerms === 'true' || input.agreeTerms === 'on';

  const adults = Number(input.adults);
  const children = Number(input.children ?? 0);
  const youngChildren = Number(input.youngChildren ?? 0);

  if (fullName.length < 2 || fullName.length > 160) {
    addError('fullName', 'Please enter your full name.');
  }

  if (!email || email.length > 160 || !EMAIL_RE.test(email)) {
    addError('email', 'Please enter a valid email address.');
  }

  const bounds = getBookingDateBounds(now);
  if (!isValidISODate(startDate) || startDate < bounds.minStart || startDate > bounds.maxStart) {
    addError(
      'startDate',
      `Please choose an arrival date between ${formatDisplayDate(bounds.minStart)} and ${formatDisplayDate(bounds.maxStart)}.`
    );
  }

  if (!isValidISODate(dob) || dob >= now.toISOString().slice(0, 10)) {
    addError('dob', 'The lead traveller must be 18 or older.');
  } else if (isValidISODate(startDate) && getAgeOnDate(dob, startDate) < 18) {
    addError('dob', 'The lead traveller must be 18 or older.');
  }

  if (!site.travellerOptions.nationalities.includes(nationality)) {
    addError('nationality', 'Please choose a nationality.');
  }

  if (
    !site.travellerOptions.phoneCodes.includes(phoneCode) ||
    !countDigits(phoneNumber)
  ) {
    addError('phoneNumber', 'Please enter a phone or WhatsApp number.');
  }

  if (Array.isArray(allowedTourSlugs) && !allowedTourSlugs.includes(tourSlug)) {
    addError('tourSlug', 'Please choose a tour.');
  } else if (!tourSlug) {
    addError('tourSlug', 'Please choose a tour.');
  }

  if (
    !Number.isInteger(adults) ||
    adults < 1 ||
    adults > 20 ||
    !Number.isInteger(children) ||
    children < 0 ||
    children > 12 ||
    !Number.isInteger(youngChildren) ||
    youngChildren < 0 ||
    youngChildren > 12
  ) {
    addError('adults', 'Please check the number of travellers.');
  }

  if (notes.length > 2000) {
    addError('notes', 'Please keep your message under 2,000 characters.');
  }

  if (!agreeTerms) {
    addError('agreeTerms', 'Please accept the terms to continue.');
  }

  const firstField = Object.keys(errors)[0] || null;
  return {
    valid: firstField === null,
    errors,
    firstField,
    firstMessage: firstField ? errors[firstField] : null,
    sanitized: {
      type: 'booking',
      tourSlug,
      startDate,
      adults,
      children,
      youngChildren,
      fullName: fullName.slice(0, 160),
      email: email.slice(0, 160),
      dob,
      nationality,
      phone: `${phoneCode} ${phoneNumber}`.trim().slice(0, 30),
      notes: notes.slice(0, 2000),
      agreeTerms: true,
    },
  };
}

export function validateInquiryInput(input) {
  const errors = {};
  const addError = (field, message) => {
    if (!errors[field]) errors[field] = message;
  };

  const fullName = String(input.fullName || '').trim();
  const email = String(input.email || '').trim();
  const phone = String(input.phone || '').trim();
  const dates = String(input.dates || '').trim();
  const party = String(input.party || site.travellerOptions.partyOptions[0]).trim();
  const notes = String(input.notes || '').trim();

  if (fullName.length < 2 || fullName.length > 160) {
    addError('fullName', 'Please enter your full name.');
  }

  if (!email || email.length > 160 || !EMAIL_RE.test(email)) {
    addError('email', 'Please enter a valid email address.');
  }

  if (phone && !countDigits(phone)) {
    addError('phone', 'Please check the phone number.');
  }

  if (dates.length > 120) {
    addError('dates', 'Please shorten your preferred dates note.');
  }

  if (party && !site.travellerOptions.partyOptions.includes(party)) {
    addError('party', 'Please choose a travel party option.');
  }

  if (notes.length > 2000) {
    addError('notes', 'Please keep your message under 2,000 characters.');
  }

  const firstField = Object.keys(errors)[0] || null;
  return {
    valid: firstField === null,
    errors,
    firstField,
    firstMessage: firstField ? errors[firstField] : null,
    sanitized: {
      type: 'inquiry',
      fullName: fullName.slice(0, 160),
      email: email.slice(0, 160),
      phone: phone.slice(0, 30),
      dates: dates.slice(0, 120),
      party: party || site.travellerOptions.partyOptions[0],
      notes: notes.slice(0, 2000),
    },
  };
}
