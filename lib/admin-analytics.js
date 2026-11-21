import { site } from '../data/site.js';
import { formatDisplayDate, formatUSD } from './format.js';

export function formatCsvCell(val) {
  let str = String(val ?? '');
  if (/^[=+\-@\t\r]/.test(str)) {
    str = `'${str}`;
  }
  return `"${str.replace(/"/g, '""')}"`;
}

export const CHECKLIST_STEPS = [
  { key: 'passportReceived', label: 'Passport Copy Received', shortLabel: 'Passport' },
  { key: 'depositReceived', label: 'Deposit / Wire Received', shortLabel: 'Deposit' },
  { key: 'sdfRemitted', label: 'SDF Remitted to DoT', shortLabel: 'SDF' },
  { key: 'visaSubmitted', label: 'Bhutan Visa / Permit Applied', shortLabel: 'Visa Applied' },
  { key: 'visaApproved', label: 'Visa / Permit Approved & Sent', shortLabel: 'Visa OK' },
  { key: 'flightsConfirmed', label: 'Drukair / Flights Confirmed', shortLabel: 'Flights' },
  { key: 'guideDriverAssigned', label: 'GAB Guide & Driver Assigned', shortLabel: 'Guide/SUV' },
];

export const DEFAULT_CHECKLIST = Object.fromEntries(CHECKLIST_STEPS.map((s) => [s.key, false]));

export function getChecklistProgress(checklist) {
  const c = checklist && typeof checklist === 'object' ? checklist : {};
  const completed = CHECKLIST_STEPS.reduce((acc, step) => acc + (c[step.key] ? 1 : 0), 0);
  const total = CHECKLIST_STEPS.length;
  return { completed, total, pct: Math.round((completed / total) * 100) };
}

export function getBookingNights(record) {
  if (Number.isFinite(record.nights) && record.nights >= 0) {
    return { nights: record.nights, days: record.nights + 1 };
  }
  if (record.startDate && record.endDate) {
    const startMs = Date.parse(`${record.startDate}T00:00:00Z`);
    const endMs = Date.parse(`${record.endDate}T00:00:00Z`);
    if (Number.isFinite(startMs) && Number.isFinite(endMs) && endMs >= startMs) {
      const nights = Math.round((endMs - startMs) / 86400000);
      return { nights, days: nights + 1 };
    }
  }
  return { nights: 6, days: 7 };
}

export function isIndianTariff(nationality) {
  return String(nationality || '').trim().toLowerCase() === 'india';
}

export function computeBhutanBreakdown(record, fees = site.fees) {
  const { nights, days } = getBookingNights(record);
  const adults = Math.max(0, Number(record.adults || 0));
  const children = Math.max(0, Number(record.children || 0));
  const youngChildren = Math.max(0, Number(record.youngChildren || 0));
  const totalTravellers = adults + children + youngChildren;

  const indian = isIndianTariff(record.nationality);
  const sdfConfig = fees.sdf;
  const childFactor = (100 - sdfConfig.childDiscountPct) / 100;

  const adultPackageUsd = Number.isFinite(record.estimatedAdultTotalUSD)
    ? record.estimatedAdultTotalUSD
    : 0;

  let sdfUsd = 0;
  let sdfNu = 0;
  let visaUsd = 0;

  if (record.type === 'booking') {
    if (indian) {
      const adultSdfNu = adults * nights * sdfConfig.indianNuPerNight;
      const childSdfNu = Math.round(children * nights * sdfConfig.indianNuPerNight * childFactor);
      sdfNu = adultSdfNu + childSdfNu;
      // Permit-based entry for Indian nationals; international USD visa fee does not apply
      visaUsd = 0;
    } else {
      const adultSdfUsd = adults * nights * sdfConfig.internationalUsdPerNight;
      const childSdfUsd = Math.round(children * nights * sdfConfig.internationalUsdPerNight * childFactor);
      sdfUsd = adultSdfUsd + childSdfUsd;
      visaUsd = totalTravellers * fees.visaUsd;
    }
  }

  const finalQuotedUsd = Number.isFinite(record.quoteOverride?.finalQuotedUsd)
    ? record.quoteOverride.finalQuotedUsd
    : null;
  const paymentPaid = Number.isFinite(record.payment?.depositPaidUsd) && record.payment.depositPaidUsd > 0
    ? record.payment.depositPaidUsd
    : null;
  const depositPaidUsd =
    paymentPaid !== null
      ? paymentPaid
      : Number.isFinite(record.quoteOverride?.depositPaidUsd)
        ? record.quoteOverride.depositPaidUsd
        : 0;
  const effectiveTotalUsd = finalQuotedUsd !== null ? finalQuotedUsd : adultPackageUsd;
  const balanceDueUsd = Math.max(0, effectiveTotalUsd - depositPaidUsd);
  const governmentPassThroughUsd = sdfUsd + visaUsd;
  const estimatedAgencyNetUsd = Math.max(0, effectiveTotalUsd - governmentPassThroughUsd);

  return {
    days,
    nights,
    adults,
    children,
    youngChildren,
    totalTravellers,
    tariff: indian ? 'indian' : 'international',
    tariffLabel: indian
      ? `Regional SDF (Nu. ${sdfConfig.indianNuPerNight.toLocaleString('en-US')}/night)`
      : `International SDF (US$${sdfConfig.internationalUsdPerNight}/night)`,
    sdfUsd,
    sdfNu,
    visaUsd,
    governmentPassThroughUsd,
    adultPackageUsd,
    finalQuotedUsd,
    effectiveTotalUsd,
    depositPaidUsd,
    balanceDueUsd,
    estimatedAgencyNetUsd,
    childDiscountPct: sdfConfig.childDiscountPct,
    childAgeRange: `${sdfConfig.childAgeMin}–${sdfConfig.childAgeMax}`,
    gstPct: fees.gstPct,
    gstAppliesTo: fees.gstAppliesTo,
    sdfValidUntil: sdfConfig.validUntil,
  };
}

export function getHoursSince(iso, now = new Date()) {
  const ts = Date.parse(iso || '');
  if (!Number.isFinite(ts)) return 0;
  return Math.max(0, (now.getTime() - ts) / 3600000);
}

export function computePortalAlerts(inquiries, now = new Date()) {
  const alerts = [];
  const nowMs = now.getTime();
  const fourteenDaysMs = 14 * 86400000;

  for (const item of inquiries) {
    if (item.status === 'new') {
      const hrs = getHoursSince(item.receivedAt, now);
      if (hrs >= 24) {
        alerts.push({
          id: `sla-crit-${item.reference}`,
          severity: 'critical',
          category: 'sla',
          reference: item.reference,
          title: `24h SLA overdue — ${item.fullName}`,
          detail: `${item.reference} has been waiting ${Math.floor(hrs)}h for a first reply.`,
        });
      } else if (hrs >= 18) {
        alerts.push({
          id: `sla-warn-${item.reference}`,
          severity: 'warning',
          category: 'sla',
          reference: item.reference,
          title: `Reply due soon — ${item.fullName}`,
          detail: `${item.reference} received ${Math.floor(hrs)}h ago (24h target).`,
        });
      }
    }

    if (item.emailStatus === 'failed') {
      alerts.push({
        id: `email-fail-${item.reference}`,
        severity: 'critical',
        category: 'email',
        reference: item.reference,
        title: `Auto-email failed — ${item.reference}`,
        detail: item.emailError || 'Notification email failed to send; retry from Email Logs.',
      });
    }

    if (
      item.type === 'booking' &&
      item.startDate &&
      (item.status === 'confirmed' || item.status === 'quoted')
    ) {
      const startMs = Date.parse(`${item.startDate}T00:00:00Z`);
      if (Number.isFinite(startMs) && startMs >= nowMs && startMs - nowMs <= fourteenDaysMs) {
        const prog = getChecklistProgress(item.checklist);
        if (!item.checklist?.visaApproved || !item.checklist?.sdfRemitted) {
          const daysAway = Math.max(1, Math.ceil((startMs - nowMs) / 86400000));
          alerts.push({
            id: `ops-${item.reference}`,
            severity: daysAway <= 7 ? 'critical' : 'warning',
            category: 'operations',
            reference: item.reference,
            title: `Arrival in ${daysAway}d — Visa/SDF pending`,
            detail: `${item.fullName} (${item.reference}) starts ${formatDisplayDate(item.startDate)} · ${prog.completed}/${prog.total} ready.`,
          });
        }
      }
    }
  }

  const order = { critical: 0, warning: 1, info: 2 };
  return alerts.sort((a, b) => (order[a.severity] ?? 9) - (order[b.severity] ?? 9));
}

function monthKeyUTC(dateStr) {
  const m = String(dateStr || '').slice(0, 7);
  return /^\d{4}-\d{2}$/.test(m) ? m : null;
}

function formatShortMonth(ym) {
  const [y, m] = ym.split('-').map(Number);
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${months[(m || 1) - 1]} ${String(y).slice(2)}`;
}

export function computeDashboardAnalytics(inquiries, rangeDays = 30, now = new Date(), fees = site.fees) {
  const nowMs = now.getTime();
  const rangeMs = rangeDays * 86400000;
  const currentStartMs = nowMs - rangeMs;
  const prevStartMs = currentStartMs - rangeMs;

  let currentPeriodCount = 0;
  let prevPeriodCount = 0;
  let bookingsCount = 0;
  let inquiriesCount = 0;
  let awaitingReply = 0;
  let slaWarningCount = 0;
  let slaOverdueCount = 0;
  let confirmedCount = 0;
  let activeNonArchived = 0;
  let confirmedUsd = 0;
  let pipelineUsd = 0;
  let estimatedSdfUsd = 0;
  const responseHours = [];
  let slaMeasured = 0;
  let slaMet = 0;
  let emailAttempted = 0;
  let emailSentCount = 0;

  const funnelMap = {
    new: { key: 'new', label: 'New', count: 0, usd: 0 },
    contacted: { key: 'contacted', label: 'Contacted', count: 0, usd: 0 },
    quoted: { key: 'quoted', label: 'Quoted', count: 0, usd: 0 },
    confirmed: { key: 'confirmed', label: 'Confirmed', count: 0, usd: 0 },
    archived: { key: 'archived', label: 'Archived', count: 0, usd: 0 },
  };

  const monthMap = new Map();
  const tourMap = new Map();
  const countryMap = new Map();
  let intlCount = 0;
  let indianCount = 0;
  let upcomingChecklistTotal = 0;
  let upcomingChecklistDone = 0;

  for (const item of inquiries) {
    const recMs = Date.parse(item.receivedAt || '');
    if (Number.isFinite(recMs)) {
      if (recMs >= currentStartMs && recMs <= nowMs) currentPeriodCount += 1;
      else if (recMs >= prevStartMs && recMs < currentStartMs) prevPeriodCount += 1;
    }

    const isBooking = item.type === 'booking';
    if (isBooking) bookingsCount += 1;
    else inquiriesCount += 1;

    const breakdown = computeBhutanBreakdown(item, fees);
    const valUsd = isBooking ? breakdown.effectiveTotalUsd : 0;

    const st = funnelMap[item.status] ? item.status : 'new';
    funnelMap[st].count += 1;
    funnelMap[st].usd += valUsd;

    if (st !== 'archived') {
      activeNonArchived += 1;
      if (isBooking) {
        pipelineUsd += valUsd;
        estimatedSdfUsd += breakdown.sdfUsd;
      }
    }

    if (st === 'confirmed') {
      confirmedCount += 1;
      if (isBooking) confirmedUsd += valUsd;
    }

    if (st === 'new') {
      awaitingReply += 1;
      const hrs = getHoursSince(item.receivedAt, now);
      if (hrs >= 24) {
        slaOverdueCount += 1;
        slaMeasured += 1;
      } else if (hrs >= 18) {
        slaWarningCount += 1;
      }
    } else if (item.firstResponseAt && Number.isFinite(recMs)) {
      const respMs = Date.parse(item.firstResponseAt);
      if (Number.isFinite(respMs) && respMs >= recMs) {
        const hrs = (respMs - recMs) / 3600000;
        responseHours.push(hrs);
        slaMeasured += 1;
        if (hrs <= 24) slaMet += 1;
      }
    } else if (st !== 'archived') {
      slaMeasured += 1;
      slaMet += 1;
    }

    if (item.emailStatus === 'sent' || item.emailStatus === 'failed') {
      emailAttempted += 1;
      if (item.emailStatus === 'sent') emailSentCount += 1;
    }

    // Departures by travel month
    if (isBooking && st !== 'archived' && item.startDate) {
      const ym = monthKeyUTC(item.startDate);
      if (ym) {
        const bucket = monthMap.get(ym) || { ym, label: formatShortMonth(ym), count: 0, netUsd: 0, sdfUsd: 0, totalUsd: 0 };
        bucket.count += 1;
        bucket.netUsd += breakdown.estimatedAgencyNetUsd;
        bucket.sdfUsd += breakdown.governmentPassThroughUsd;
        bucket.totalUsd += valUsd;
        monthMap.set(ym, bucket);
      }

      const startMs = Date.parse(`${item.startDate}T00:00:00Z`);
      if (Number.isFinite(startMs) && startMs >= nowMs) {
        const prog = getChecklistProgress(item.checklist);
        upcomingChecklistTotal += prog.total;
        upcomingChecklistDone += prog.completed;
      }
    }

    // Top tours
    if (isBooking) {
      const slug = item.tourSlug || 'custom';
      const title = item.tourTitle || 'Custom Tailor-Made Bhutan Journey';
      const t = tourMap.get(slug) || { slug, title, count: 0, usd: 0 };
      t.count += 1;
      t.usd += valUsd;
      tourMap.set(slug, t);
    }

    // Nationality & tariff mix
    const nat = String(item.nationality || '').trim();
    if (nat) {
      if (isIndianTariff(nat)) indianCount += 1;
      else intlCount += 1;
      countryMap.set(nat, (countryMap.get(nat) || 0) + 1);
    } else if (isBooking) {
      intlCount += 1;
      countryMap.set('Not specified', (countryMap.get('Not specified') || 0) + 1);
    }
  }

  // Build time-series buckets for VolumeLineChart
  const bucketCount = rangeDays <= 7 ? 7 : rangeDays <= 30 ? 10 : rangeDays <= 90 ? 12 : 12;
  const stepMs = rangeMs / bucketCount;
  const volumeSeries = [];
  for (let i = 0; i < bucketCount; i++) {
    const bStart = currentStartMs + i * stepMs;
    const bEnd = i === bucketCount - 1 ? nowMs + 1000 : bStart + stepMs;
    const midDate = new Date(bStart + stepMs / 2);
    const label =
      rangeDays > 120
        ? formatShortMonth(midDate.toISOString().slice(0, 7))
        : `${midDate.getUTCDate()} ${['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][midDate.getUTCMonth()]}`;
    let bookings = 0;
    let generalInquiries = 0;
    for (const item of inquiries) {
      const ts = Date.parse(item.receivedAt || '');
      if (Number.isFinite(ts) && ts >= bStart && ts < bEnd) {
        if (item.type === 'booking') bookings += 1;
        else generalInquiries += 1;
      }
    }
    volumeSeries.push({ label, bookings, inquiries: generalInquiries, total: bookings + generalInquiries });
  }

  // Median response time
  responseHours.sort((a, b) => a - b);
  let medianResponseHours = null;
  if (responseHours.length > 0) {
    const mid = Math.floor(responseHours.length / 2);
    medianResponseHours =
      responseHours.length % 2 === 0
        ? (responseHours[mid - 1] + responseHours[mid]) / 2
        : responseHours[mid];
  }

  const periodDeltaPct =
    prevPeriodCount > 0
      ? Math.round(((currentPeriodCount - prevPeriodCount) / prevPeriodCount) * 100)
      : currentPeriodCount > 0
        ? 100
        : 0;

  const conversionRate = activeNonArchived > 0 ? Math.round((confirmedCount / activeNonArchived) * 100) : 0;

  const monthlyDepartures = [...monthMap.values()]
    .sort((a, b) => a.ym.localeCompare(b.ym))
    .slice(0, 12);

  const topTours = [...tourMap.values()]
    .sort((a, b) => b.count - a.count || b.usd - a.usd)
    .slice(0, 8);

  const topCountries = [...countryMap.entries()]
    .map(([country, count]) => ({ country, count, isIndian: isIndianTariff(country) }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 6);

  const upcomingDepartures = inquiries
    .filter((item) => {
      if (item.type !== 'booking' || item.status === 'archived' || !item.startDate) return false;
      const startMs = Date.parse(`${item.startDate}T00:00:00Z`);
      return Number.isFinite(startMs) && startMs >= nowMs - 86400000;
    })
    .sort((a, b) => String(a.startDate).localeCompare(String(b.startDate)))
    .slice(0, 8);

  return {
    kpis: {
      total: inquiries.length,
      bookingsCount,
      inquiriesCount,
      currentPeriodCount,
      prevPeriodCount,
      periodDeltaPct,
      awaitingReply,
      slaWarningCount,
      slaOverdueCount,
      confirmedCount,
      conversionRate,
      confirmedUsd,
      pipelineUsd,
      estimatedSdfUsd,
      medianResponseHours,
    },
    volumeSeries,
    funnelStages: [
      funnelMap.new,
      funnelMap.contacted,
      funnelMap.quoted,
      funnelMap.confirmed,
      funnelMap.archived,
    ],
    monthlyDepartures,
    topTours,
    nationalityMix: {
      intlCount,
      indianCount,
      total: intlCount + indianCount,
      topCountries,
    },
    health: {
      emailAttempted,
      emailSentCount,
      emailDeliveryPct: emailAttempted > 0 ? Math.round((emailSentCount / emailAttempted) * 100) : 100,
      slaMeasured,
      slaMet,
      slaCompliancePct: slaMeasured > 0 ? Math.round((slaMet / slaMeasured) * 100) : 100,
      upcomingChecklistDone,
      upcomingChecklistTotal,
      visaReadinessPct:
        upcomingChecklistTotal > 0 ? Math.round((upcomingChecklistDone / upcomingChecklistTotal) * 100) : 100,
    },
    upcomingDepartures,
  };
}

export function buildReplyTemplates(record, siteConfig = site) {
  if (!record) return [];
  const breakdown = computeBhutanBreakdown(record, siteConfig.fees);
  const tourName = record.type === 'booking' ? record.tourTitle : 'your Bhutan journey';
  const dateSpan =
    record.type === 'booking' && record.startDate
      ? `${formatDisplayDate(record.startDate)} – ${formatDisplayDate(record.endDate)} (${breakdown.days}D/${breakdown.nights}N)`
      : record.dates || 'your preferred dates';
  const estStr =
    record.type === 'booking' && breakdown.effectiveTotalUsd > 0
      ? formatUSD(breakdown.effectiveTotalUsd)
      : 'a tailored quote';

  return [
    {
      id: 'initial-quote',
      label: 'Initial 24h Quote & Itinerary',
      subject: `Tailored Bhutan Proposal (${record.reference}) — ${tourName}`,
      body: `Kuzuzangpo la ${record.fullName},\n\nThank you for your request (${record.reference}) for ${tourName} (${dateSpan}).\n\nBased on your party of ${breakdown.totalTravellers || record.party || 'travellers'}, our estimated package total is ${estStr} (${breakdown.tariffLabel} and visa processing handled by our Thimphu desk).\n\nPlease let us know your preferred hotel tier (3★ Boutique / 4★ Heritage / 5★ Luxury) and departure gateway (Bangkok, Delhi, Kathmandu, or Singapore) so we can lock in your day-by-day proposal and Drukair flight options.\n\nWarm regards,\n${siteConfig.name}\nThimphu, Kingdom of Bhutan\nWhatsApp: ${siteConfig.contact.whatsappLabel}`,
    },
    {
      id: 'passport-visa',
      label: 'Request Passport Scan for Bhutan Visa',
      subject: `Action Needed: Passport Copy for Bhutan Visa (${record.reference})`,
      body: `Kuzuzangpo la ${record.fullName},\n\nTo submit your official Department of Tourism Bhutan visa/permit application for ${dateSpan} (${record.reference}), please reply with:\n1. Clear color photo/scan of each traveller's passport bio-page (valid at least 6 months beyond travel).\n2. Any dietary, mobility, or hotel bed-configuration preferences.\n\nOnce received along with the SDF remittance, visa clearance typically takes 3–5 working days.\n\nWarm regards,\n${siteConfig.name}\nLicence: ${siteConfig.licence.number}`,
    },
    {
      id: 'deposit-payment',
      label: 'Deposit & SDF Wire Instructions',
      subject: `Confirmation & Deposit Details — ${record.reference} (${siteConfig.name})`,
      body: `Kuzuzangpo la ${record.fullName},\n\nWe are delighted to move forward with ${tourName} (${dateSpan}, ref ${record.reference}).\n\nTotal Quoted: ${estStr}\nDeposit Paid: ${formatUSD(breakdown.depositPaidUsd)}\nBalance Remaining: ${formatUSD(breakdown.balanceDueUsd)}\n\nPlease reply to confirm you are ready and we will issue our official Bank of Bhutan wire invoice so we can immediately secure your hotels, Drukair seats, and SDF clearance.\n\nWarm regards,\n${siteConfig.name}\nWhatsApp: ${siteConfig.contact.whatsappLabel}`,
    },
    {
      id: 'pre-arrival',
      label: 'Pre-Arrival & Paro Airport Pickup Info',
      subject: `Welcome to Bhutan! Arrival & Guide Details (${record.reference})`,
      body: `Kuzuzangpo la ${record.fullName},\n\nWe look forward to welcoming you to Paro International Airport for ${tourName} (${dateSpan}, ref ${record.reference})!\n\nYour licensed GAB guide and private driver will meet you outside Paro arrivals holding a "${siteConfig.name}" welcome board. Please carry a printed copy of your Bhutan e-Visa clearance letter alongside your passport.\n\nFor 24/7 assistance while travelling, message our Thimphu desk directly on WhatsApp: ${siteConfig.contact.whatsappLabel}.\n\nTashi Delek!\n${siteConfig.name}`,
    },
  ];
}

export function computeTeamPerformance(inquiries, staffDirectory = []) {
  const map = new Map();
  for (const s of staffDirectory) {
    if (s.role === 'reservation' || s.role === 'manager') {
      map.set(s.id, {
        id: s.id,
        name: s.name,
        roleLabel: s.roleLabel || s.role,
        assigned: 0,
        quoted: 0,
        confirmed: 0,
        responseHours: [],
        checklistPctSum: 0,
        checklistCount: 0,
      });
    }
  }

  let unassignedCount = 0;
  for (const item of inquiries) {
    if (item.status === 'archived') continue;
    if (!item.assignedUserId) {
      unassignedCount += 1;
      continue;
    }
    const row = map.get(item.assignedUserId);
    if (!row) continue;
    row.assigned += 1;
    if (item.status === 'quoted') row.quoted += 1;
    if (item.status === 'confirmed') row.confirmed += 1;
    if (item.firstResponseAt && item.receivedAt) {
      const rMs = Date.parse(item.receivedAt);
      const fMs = Date.parse(item.firstResponseAt);
      if (Number.isFinite(rMs) && Number.isFinite(fMs) && fMs >= rMs) {
        row.responseHours.push((fMs - rMs) / 3600000);
      }
    }
    if (item.type === 'booking') {
      row.checklistPctSum += getChecklistProgress(item.checklist).pct;
      row.checklistCount += 1;
    }
  }

  const members = [...map.values()].map((m) => {
    m.responseHours.sort((a, b) => a - b);
    const avgResponseHours =
      m.responseHours.length > 0
        ? m.responseHours.reduce((a, b) => a + b, 0) / m.responseHours.length
        : null;
    const avgChecklistPct =
      m.checklistCount > 0 ? Math.round(m.checklistPctSum / m.checklistCount) : 0;
    return {
      id: m.id,
      name: m.name,
      roleLabel: m.roleLabel,
      assigned: m.assigned,
      quoted: m.quoted,
      confirmed: m.confirmed,
      avgResponseHours,
      avgChecklistPct,
    };
  });

  return { unassignedCount, members };
}

export function computeFinanceSummary(inquiries, fees = site.fees) {
  let confirmedValueUsd = 0;
  let quotedPipelineUsd = 0;
  let totalDepositsUsd = 0;
  let totalBalanceDueUsd = 0;
  let verifiedCount = 0;
  let pendingVerificationCount = 0;
  let intlSdfPayableUsd = 0;
  let indianSdfPayableNu = 0;
  let visaPayableUsd = 0;
  let sdfRemittedCount = 0;
  let sdfPendingCount = 0;

  for (const item of inquiries) {
    if (item.type !== 'booking' || item.status === 'archived') continue;
    const bd = computeBhutanBreakdown(item, fees);
    if (item.status === 'confirmed') confirmedValueUsd += bd.effectiveTotalUsd;
    else quotedPipelineUsd += bd.effectiveTotalUsd;

    totalDepositsUsd += bd.depositPaidUsd;
    totalBalanceDueUsd += bd.balanceDueUsd;

    if (item.payment?.depositVerified) verifiedCount += 1;
    else if (item.status === 'quoted' || item.status === 'confirmed') pendingVerificationCount += 1;

    if (bd.tariff === 'indian') indianSdfPayableNu += bd.sdfNu;
    else intlSdfPayableUsd += bd.sdfUsd;
    visaPayableUsd += bd.visaUsd;

    if (item.checklist?.sdfRemitted) sdfRemittedCount += 1;
    else sdfPendingCount += 1;
  }

  return {
    confirmedValueUsd,
    quotedPipelineUsd,
    totalDepositsUsd,
    totalBalanceDueUsd,
    verifiedCount,
    pendingVerificationCount,
    intlSdfPayableUsd,
    indianSdfPayableNu,
    visaPayableUsd,
    sdfRemittedCount,
    sdfPendingCount,
  };
}
