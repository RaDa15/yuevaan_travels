// BR-01: Format integer USD as US$ with thousands separator, no space, no decimals
export function formatUSD(amount) {
  return `US$${Math.round(Number(amount)).toLocaleString('en-US')}`;
}

// BR-02: Derive duration strings from integer days & nights
export function formatDuration(days, nights, style = 'long') {
  if (style === 'short') return `${days}D/${nights}N`;
  if (style === 'meta') return `${days} days / ${nights} nights · Private trip`;
  return `${days} Days / ${nights} Nights`;
}

// BR-04: Parse ISO YYYY-MM-DD in UTC cleanly (avoiding timezone shift)
export function parseISODateUTC(iso) {
  const [y, m, d] = (iso || '').split('-').map(Number);
  return new Date(Date.UTC(y || 2027, (m || 1) - 1, d || 1));
}

// BR-04: Compute departure date = arrival date + nights days in UTC
export function addNightsUTC(isoStart, nights) {
  const start = parseISODateUTC(isoStart);
  const end = new Date(start.getTime() + Number(nights || 0) * 86_400_000);
  return end.toISOString().slice(0, 10);
}

// BR-04: Format ISO date string as e.g. "Wed 17 Mar 2027"
export function formatDisplayDate(iso) {
  const dateObj = parseISODateUTC(iso);
  const weekdays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${weekdays[dateObj.getUTCDay()]} ${dateObj.getUTCDate()} ${months[dateObj.getUTCMonth()]} ${dateObj.getUTCFullYear()}`;
}

// BR-07: Arrival window helper in YYYY-MM-DD
export function getBookingDateBounds(today = new Date()) {
  const utcMidnight = Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate());
  const addDays = (days) => new Date(utcMidnight + days * 86_400_000).toISOString().slice(0, 10);
  return {
    defaultStart: addDays(60),
    minStart: addDays(14),
    maxStart: addDays(730),
  };
}

// D-22: Split "Region (Sub-area)" into primary headline + secondary region context
export function parseDestinationSpec(label) {
  const match = String(label || '').match(/^([^(]+?)\s*\((.+)\)$/);
  if (!match) return { primary: label || '', secondary: '' };
  const outer = match[1].trim();
  const inner = match[2].trim();
  if (/bhutan$/i.test(inner)) {
    return { primary: outer, secondary: `+ ${inner}` };
  }
  return { primary: inner, secondary: outer };
}

// D-22: Map tour grade string to a 1-5 difficulty bar level
export function parseGradeSpec(grade) {
  const g = String(grade || '').toLowerCase();
  let level = 2;
  if (/strenuous/.test(g)) {
    level = /moderate/.test(g) ? 4 : 5;
  } else if (/high/.test(g)) {
    level = 4;
  } else if (/active|adventurous/.test(g) || (/moderate/.test(g) && !/easy/.test(g))) {
    level = 3;
  } else if (/easy/.test(g) && !/moderate/.test(g)) {
    level = 1;
  }
  return { primary: grade || '', level };
}

// D-22: Split "Primary & Secondary" stay or transport specs into two lines
export function parseCompoundSpec(value) {
  const parts = String(value || '').split(/\s+&\s+/);
  if (parts.length > 1) {
    return { primary: parts[0].trim(), secondary: `+ ${parts.slice(1).join(' & ').trim()}` };
  }
  return { primary: value || '', secondary: '' };
}

// D-22: Extract "X,XXX m" primary elevation and "Pass Name · XX,XXX ft" secondary label
export function parseHighestPointSpec(value) {
  const parts = String(value || '').split(/\s*·\s*/);
  const metersStr = parts[0]?.trim() || '';
  const place = parts.slice(1).join(' · ').trim();
  const metersNum = parseInt(metersStr.replace(/[^0-9]/g, ''), 10);
  const feetStr = Number.isFinite(metersNum)
    ? `${Math.round(metersNum * 3.28084).toLocaleString('en-US')} ft`
    : '';
  return {
    primary: metersStr,
    secondary: [place, feetStr].filter(Boolean).join(' · '),
  };
}

// D-22: Format "Private / 1-12 Trekkers" into "Private, 1-12" + "trekkers per group"
export function parseGroupSizeSpec(value) {
  const parts = String(value || '').split(/\s*\/\s*/);
  if (parts.length === 2) {
    const match = parts[1].trim().match(/^(\d+[–-]\d+)\s+(.+)$/);
    if (match) {
      return {
        primary: `${parts[0].trim()}, ${match[1]}`,
        secondary: `${match[2].toLowerCase()} per group`,
      };
    }
    return { primary: parts[0].trim(), secondary: parts[1].trim() };
  }
  return { primary: value || '', secondary: '' };
}
