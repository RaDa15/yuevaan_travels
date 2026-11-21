import { site } from '../../data/site.js';

export const POSTGRES_SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS site_settings (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_by TEXT NOT NULL DEFAULT 'system'
);

CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  role TEXT NOT NULL,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  password_salt TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  env_synced BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_login_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS sessions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at BIGINT NOT NULL,
  user_agent TEXT NOT NULL DEFAULT '',
  ip_hint TEXT NOT NULL DEFAULT ''
);

CREATE TABLE IF NOT EXISTS inquiries (
  reference TEXT PRIMARY KEY,
  received_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  type TEXT NOT NULL,
  full_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT NOT NULL DEFAULT '',
  notes TEXT NOT NULL DEFAULT '',
  tour_slug TEXT,
  tour_title TEXT,
  start_date TEXT,
  end_date TEXT,
  adults INT,
  children INT,
  young_children INT,
  estimated_adult_total_usd INT,
  dob TEXT,
  nationality TEXT,
  dates TEXT,
  party TEXT,
  source TEXT NOT NULL DEFAULT '/plan-my-trip',
  status TEXT NOT NULL DEFAULT 'new',
  internal_notes TEXT NOT NULL DEFAULT '',
  assigned_user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
  first_response_at TIMESTAMPTZ,
  email_status TEXT NOT NULL DEFAULT 'not_configured',
  email_provider TEXT NOT NULL DEFAULT 'none',
  email_error TEXT NOT NULL DEFAULT '',
  email_sent_at TIMESTAMPTZ,
  guest_email_sent BOOLEAN NOT NULL DEFAULT FALSE,
  checklist JSONB NOT NULL DEFAULT '{}'::jsonb,
  quote_override JSONB NOT NULL DEFAULT '{}'::jsonb,
  payment JSONB NOT NULL DEFAULT '{}'::jsonb,
  confirmation_override JSONB NOT NULL DEFAULT '{}'::jsonb,
  activity JSONB NOT NULL DEFAULT '[]'::jsonb,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS email_logs (
  id TEXT PRIMARY KEY,
  at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  reference TEXT NOT NULL DEFAULT '',
  kind TEXT NOT NULL DEFAULT 'admin',
  recipient TEXT NOT NULL DEFAULT '',
  subject TEXT NOT NULL DEFAULT '',
  provider TEXT NOT NULL DEFAULT 'none',
  status TEXT NOT NULL DEFAULT 'failed',
  error TEXT NOT NULL DEFAULT '',
  triggered_by TEXT NOT NULL DEFAULT 'auto'
);

CREATE TABLE IF NOT EXISTS audit_logs (
  id TEXT PRIMARY KEY,
  at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  actor_id TEXT NOT NULL DEFAULT 'system',
  actor_name TEXT NOT NULL DEFAULT 'System',
  actor_role TEXT NOT NULL DEFAULT 'system',
  action TEXT NOT NULL,
  target_ref TEXT NOT NULL DEFAULT '',
  summary TEXT NOT NULL DEFAULT '',
  diff JSONB
);

CREATE INDEX IF NOT EXISTS idx_inquiries_received_at ON inquiries (received_at DESC);
CREATE INDEX IF NOT EXISTS idx_inquiries_status ON inquiries (status);
CREATE INDEX IF NOT EXISTS idx_inquiries_assigned_user ON inquiries (assigned_user_id);
CREATE INDEX IF NOT EXISTS idx_email_logs_at ON email_logs (at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_at ON audit_logs (at DESC);
CREATE INDEX IF NOT EXISTS idx_sessions_expires_at ON sessions (expires_at);
`;

export function getDefaultSiteSettings() {
  return {
    name: site.name,
    licence: {
      authority: site.licence.authority,
      number: site.licence.number,
    },
    contact: {
      address: [...site.contact.address],
      footerAddress: [...site.contact.footerAddress],
      whatsappNumber: site.contact.whatsappNumber,
      whatsappLabel: site.contact.whatsappLabel,
      email: site.contact.email,
      hours: site.contact.hours,
      emergencyHours: site.contact.emergencyHours,
    },
    fees: {
      sdf: { ...site.fees.sdf },
      visaUsd: site.fees.visaUsd,
      gstPct: site.fees.gstPct,
      gstAppliesTo: site.fees.gstAppliesTo,
    },
    slaHours: 24,
  };
}

export function mergeSiteConfigWithSettings(stored) {
  const defaults = getDefaultSiteSettings();
  const s = stored && typeof stored === 'object' ? stored : {};
  const mergedContact = {
    ...defaults.contact,
    ...(s.contact && typeof s.contact === 'object' ? s.contact : {}),
  };
  if (Array.isArray(mergedContact.address) && mergedContact.address.length > 0 && !s.contact?.footerAddress) {
    mergedContact.footerAddress = mergedContact.address;
  }
  const mergedSdf = {
    ...defaults.fees.sdf,
    ...(s.fees?.sdf && typeof s.fees.sdf === 'object' ? s.fees.sdf : {}),
  };
  const mergedFees = {
    ...defaults.fees,
    ...(s.fees && typeof s.fees === 'object' ? s.fees : {}),
    sdf: mergedSdf,
  };
  const mergedLicence = {
    ...defaults.licence,
    ...(s.licence && typeof s.licence === 'object' ? s.licence : {}),
  };

  return {
    ...site,
    name: typeof s.name === 'string' && s.name.trim() ? s.name.trim() : defaults.name,
    licence: mergedLicence,
    contact: mergedContact,
    fees: mergedFees,
    slaHours: Number.isFinite(Number(s.slaHours)) && Number(s.slaHours) >= 1 ? Number(s.slaHours) : 24,
  };
}

export function validateSiteSettingsPatch(patch, currentSettings = getDefaultSiteSettings()) {
  if (!patch || typeof patch !== 'object') {
    throw Object.assign(new Error('Settings payload must be a JSON object.'), { statusCode: 400 });
  }

  const next = structuredClone(currentSettings);
  const diff = {};

  const recordChange = (pathKey, oldVal, newVal) => {
    if (JSON.stringify(oldVal) !== JSON.stringify(newVal)) {
      diff[pathKey] = { before: oldVal, after: newVal };
    }
  };

  if (patch.name !== undefined) {
    const v = String(patch.name).trim().slice(0, 120);
    if (v.length < 2) throw Object.assign(new Error('Agency name must be at least 2 characters.'), { statusCode: 400 });
    recordChange('name', next.name, v);
    next.name = v;
  }

  if (patch.slaHours !== undefined) {
    const n = Number(patch.slaHours);
    if (!Number.isInteger(n) || n < 1 || n > 168) {
      throw Object.assign(new Error('Reply SLA hours must be an integer between 1 and 168.'), { statusCode: 400 });
    }
    recordChange('slaHours', next.slaHours, n);
    next.slaHours = n;
  }

  if (patch.licence && typeof patch.licence === 'object') {
    if (patch.licence.authority !== undefined) {
      const v = String(patch.licence.authority).trim().slice(0, 120);
      if (v.length < 2) throw Object.assign(new Error('Licensing authority is required.'), { statusCode: 400 });
      recordChange('licence.authority', next.licence.authority, v);
      next.licence.authority = v;
    }
    if (patch.licence.number !== undefined) {
      const v = String(patch.licence.number).trim().slice(0, 80);
      if (v.length < 2) throw Object.assign(new Error('DoT licence number is required.'), { statusCode: 400 });
      recordChange('licence.number', next.licence.number, v);
      next.licence.number = v;
    }
  }

  if (patch.contact && typeof patch.contact === 'object') {
    const c = patch.contact;
    if (c.whatsappNumber !== undefined) {
      const digits = String(c.whatsappNumber).replace(/[^\d]/g, '').slice(0, 20);
      if (digits.length < 7) {
        throw Object.assign(new Error('WhatsApp number must contain at least 7 digits (with country code).'), { statusCode: 400 });
      }
      recordChange('contact.whatsappNumber', next.contact.whatsappNumber, digits);
      next.contact.whatsappNumber = digits;
    }
    if (c.whatsappLabel !== undefined) {
      const v = String(c.whatsappLabel).trim().slice(0, 40);
      if (v.length < 5) throw Object.assign(new Error('WhatsApp display label is required.'), { statusCode: 400 });
      recordChange('contact.whatsappLabel', next.contact.whatsappLabel, v);
      next.contact.whatsappLabel = v;
    }
    if (c.email !== undefined) {
      const v = String(c.email).trim().slice(0, 160);
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) {
        throw Object.assign(new Error('Public concierge email must be valid.'), { statusCode: 400 });
      }
      recordChange('contact.email', next.contact.email, v);
      next.contact.email = v;
    }
    if (c.hours !== undefined) {
      const v = String(c.hours).trim().slice(0, 120);
      if (v.length < 3) throw Object.assign(new Error('Office hours are required.'), { statusCode: 400 });
      recordChange('contact.hours', next.contact.hours, v);
      next.contact.hours = v;
    }
    if (c.emergencyHours !== undefined) {
      const v = String(c.emergencyHours).trim().slice(0, 120);
      recordChange('contact.emergencyHours', next.contact.emergencyHours, v);
      next.contact.emergencyHours = v;
    }
    if (c.address !== undefined) {
      const lines = (Array.isArray(c.address) ? c.address : String(c.address).split(/\r?\n/))
        .map((l) => String(l).trim().slice(0, 120))
        .filter(Boolean);
      if (lines.length === 0) throw Object.assign(new Error('At least one address line is required.'), { statusCode: 400 });
      recordChange('contact.address', next.contact.address, lines);
      next.contact.address = lines;
      next.contact.footerAddress = lines;
    }
  }

  if (patch.fees && typeof patch.fees === 'object') {
    const f = patch.fees;
    if (f.visaUsd !== undefined) {
      const n = Number(f.visaUsd);
      if (!Number.isFinite(n) || n < 0 || n > 1000) {
        throw Object.assign(new Error('Visa fee (USD) must be between 0 and 1000.'), { statusCode: 400 });
      }
      const rounded = Math.round(n);
      recordChange('fees.visaUsd', next.fees.visaUsd, rounded);
      next.fees.visaUsd = rounded;
    }
    if (f.gstPct !== undefined) {
      const n = Number(f.gstPct);
      if (!Number.isFinite(n) || n < 0 || n > 50) {
        throw Object.assign(new Error('GST percentage must be between 0 and 50.'), { statusCode: 400 });
      }
      recordChange('fees.gstPct', next.fees.gstPct, n);
      next.fees.gstPct = n;
    }
    if (f.gstAppliesTo !== undefined) {
      const v = String(f.gstAppliesTo).trim().slice(0, 200);
      if (v.length < 3) throw Object.assign(new Error('GST scope description is required.'), { statusCode: 400 });
      recordChange('fees.gstAppliesTo', next.fees.gstAppliesTo, v);
      next.fees.gstAppliesTo = v;
    }
    if (f.sdf && typeof f.sdf === 'object') {
      const sdf = f.sdf;
      if (sdf.internationalUsdPerNight !== undefined) {
        const n = Number(sdf.internationalUsdPerNight);
        if (!Number.isFinite(n) || n < 0 || n > 2000) {
          throw Object.assign(new Error('International SDF (USD/night) must be between 0 and 2000.'), { statusCode: 400 });
        }
        const rounded = Math.round(n);
        recordChange('fees.sdf.internationalUsdPerNight', next.fees.sdf.internationalUsdPerNight, rounded);
        next.fees.sdf.internationalUsdPerNight = rounded;
      }
      if (sdf.indianNuPerNight !== undefined) {
        const n = Number(sdf.indianNuPerNight);
        if (!Number.isFinite(n) || n < 0 || n > 50000) {
          throw Object.assign(new Error('Indian Regional SDF (Nu./night) must be between 0 and 50000.'), { statusCode: 400 });
        }
        const rounded = Math.round(n);
        recordChange('fees.sdf.indianNuPerNight', next.fees.sdf.indianNuPerNight, rounded);
        next.fees.sdf.indianNuPerNight = rounded;
      }
      if (sdf.childDiscountPct !== undefined) {
        const n = Number(sdf.childDiscountPct);
        if (!Number.isFinite(n) || n < 0 || n > 100) {
          throw Object.assign(new Error('Child SDF discount (%) must be between 0 and 100.'), { statusCode: 400 });
        }
        const rounded = Math.round(n);
        recordChange('fees.sdf.childDiscountPct', next.fees.sdf.childDiscountPct, rounded);
        next.fees.sdf.childDiscountPct = rounded;
      }
      if (sdf.childAgeMin !== undefined) {
        const n = Number(sdf.childAgeMin);
        if (!Number.isInteger(n) || n < 0 || n > 17) {
          throw Object.assign(new Error('Child minimum age must be an integer 0–17.'), { statusCode: 400 });
        }
        recordChange('fees.sdf.childAgeMin', next.fees.sdf.childAgeMin, n);
        next.fees.sdf.childAgeMin = n;
      }
      if (sdf.childAgeMax !== undefined) {
        const n = Number(sdf.childAgeMax);
        if (!Number.isInteger(n) || n < 1 || n > 17) {
          throw Object.assign(new Error('Child maximum age must be an integer 1–17.'), { statusCode: 400 });
        }
        recordChange('fees.sdf.childAgeMax', next.fees.sdf.childAgeMax, n);
        next.fees.sdf.childAgeMax = n;
      }
      if (sdf.adultAgeMin !== undefined) {
        const n = Number(sdf.adultAgeMin);
        if (!Number.isInteger(n) || n < 2 || n > 21) {
          throw Object.assign(new Error('Adult minimum age must be an integer 2–21.'), { statusCode: 400 });
        }
        recordChange('fees.sdf.adultAgeMin', next.fees.sdf.adultAgeMin, n);
        next.fees.sdf.adultAgeMin = n;
      }
      if (sdf.validUntil !== undefined) {
        const v = String(sdf.validUntil).trim();
        if (!/^\d{4}-\d{2}-\d{2}$/.test(v)) {
          throw Object.assign(new Error('SDF Valid Until date must be YYYY-MM-DD.'), { statusCode: 400 });
        }
        recordChange('fees.sdf.validUntil', next.fees.sdf.validUntil, v);
        next.fees.sdf.validUntil = v;
      }
    }
  }

  if (next.fees.sdf.childAgeMin >= next.fees.sdf.childAgeMax) {
    throw Object.assign(new Error('Child minimum age must be less than child maximum age.'), { statusCode: 400 });
  }
  if (next.fees.sdf.adultAgeMin <= next.fees.sdf.childAgeMax) {
    throw Object.assign(new Error('Adult minimum age must be greater than child maximum age.'), { statusCode: 400 });
  }

  return { settings: next, diff };
}
