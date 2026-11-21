'use client';

import { useMemo, useState } from 'react';
import Icon from '@/components/icons';
import { site } from '@/data/site';
import styles from '../Admin.module.css';

function formatBttTime(iso) {
  if (!iso) return '—';
  try {
    const dt = new Date(iso);
    const btt = new Date(dt.getTime() + 6 * 3600 * 1000);
    return `${btt.toISOString().slice(0, 16).replace('T', ' ')} BTT`;
  } catch {
    return iso;
  }
}

export function AuditLogView({ logs, onRefresh, onOpenBooking, canOpenBooking = true }) {
  const [actionFilter, setActionFilter] = useState('all');
  const [query, setQuery] = useState('');

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return logs.filter((entry) => {
      if (actionFilter !== 'all' && entry.action !== actionFilter) return false;
      if (!q) return true;
      return [entry.actorName, entry.action, entry.targetRef, entry.summary]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
        .includes(q);
    });
  }, [actionFilter, logs, query]);

  const actions = useMemo(() => {
    const set = new Set(logs.map((l) => l.action).filter(Boolean));
    return ['all', ...set];
  }, [logs]);

  return (
    <div className={styles.viewStack}>
      <div className={styles.viewHead}>
        <div>
          <span className={styles.eyebrow}>ACCOUNTABILITY</span>
          <h1 className={styles.pageTitle}>Staff Audit Log</h1>
        </div>
        <button
          type="button"
          onClick={onRefresh}
          className={`btn btn-outline ${styles.actionBtn}`}
        >
          Refresh Audit Log
        </button>
      </div>

      <div className={styles.filterBar}>
        <div className={styles.filterGroup} role="group" aria-label="Filter by audit action">
          {actions.slice(0, 8).map((act) => (
            <button
              key={act}
              type="button"
              onClick={() => setActionFilter(act)}
              className={`${styles.pillBtn}${actionFilter === act ? ` ${styles.pillBtnActive}` : ''}`}
            >
              {act === 'all' ? 'All Events' : act.replace(/_/g, ' ')}
            </button>
          ))}
        </div>
        <input
          type="search"
          aria-label="Search audit events"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search actor, reference, summary…"
          className={`rtb-input ${styles.searchInput}`}
        />
      </div>

      <div className={styles.panelCard}>
        {filtered.length === 0 ? (
          <div className={styles.emptyState}>No audit events recorded yet.</div>
        ) : (
          <div className={styles.tableScroll}>
            <table className={styles.dataTable}>
              <thead>
                <tr>
                  <th>Time (BTT)</th>
                  <th>Actor</th>
                  <th>Action</th>
                  <th>Ref</th>
                  <th>Summary</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((ev) => (
                  <tr key={ev.id}>
                    <td>{formatBttTime(ev.at)}</td>
                    <td>
                      <div className={styles.cellPrimary}>{ev.actorName}</div>
                      <div className={styles.cellSub}>{ev.actorRole}</div>
                    </td>
                    <td>
                      <span className={`${styles.badge} ${styles.badgeInquiry}`}>
                        {String(ev.action || '').replace(/_/g, ' ')}
                      </span>
                    </td>
                    <td>
                      {ev.targetRef ? (
                        canOpenBooking && onOpenBooking ? (
                          <button
                            type="button"
                            onClick={() => onOpenBooking(ev.targetRef)}
                            className={styles.tableLinkBtn}
                          >
                            <span className={styles.refCode}>{ev.targetRef}</span>
                          </button>
                        ) : (
                          <span className={styles.refCode}>{ev.targetRef}</span>
                        )
                      ) : (
                        '—'
                      )}
                    </td>
                    <td>{ev.summary}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

function buildEditableState(cfg) {
  const s = cfg || site;
  return {
    name: s.name || site.name,
    slaHours: String(s.slaHours ?? 24),
    licenceAuthority: s.licence?.authority || site.licence.authority,
    licenceNumber: s.licence?.number || site.licence.number,
    whatsappNumber: s.contact?.whatsappNumber || site.contact.whatsappNumber,
    whatsappLabel: s.contact?.whatsappLabel || site.contact.whatsappLabel,
    email: s.contact?.email || site.contact.email,
    hours: s.contact?.hours || site.contact.hours,
    emergencyHours: s.contact?.emergencyHours || site.contact.emergencyHours,
    addressText: (Array.isArray(s.contact?.address) ? s.contact.address : site.contact.address).join('\n'),
    intlSdfUsd: String(s.fees?.sdf?.internationalUsdPerNight ?? site.fees.sdf.internationalUsdPerNight),
    indianSdfNu: String(s.fees?.sdf?.indianNuPerNight ?? site.fees.sdf.indianNuPerNight),
    childDiscountPct: String(s.fees?.sdf?.childDiscountPct ?? site.fees.sdf.childDiscountPct),
    childAgeMin: String(s.fees?.sdf?.childAgeMin ?? site.fees.sdf.childAgeMin),
    childAgeMax: String(s.fees?.sdf?.childAgeMax ?? site.fees.sdf.childAgeMax),
    adultAgeMin: String(s.fees?.sdf?.adultAgeMin ?? site.fees.sdf.adultAgeMin),
    validUntil: s.fees?.sdf?.validUntil || site.fees.sdf.validUntil,
    visaUsd: String(s.fees?.visaUsd ?? site.fees.visaUsd),
    gstPct: String(s.fees?.gstPct ?? site.fees.gstPct),
    gstAppliesTo: s.fees?.gstAppliesTo || site.fees.gstAppliesTo,
  };
}

export function SettingsView({
  currentUser,
  permissions,
  emailConfig,
  siteSettings,
  dbEngine,
  onTestEmail,
  onChangePassword,
  onDownloadBackup,
  onSaveSettings,
}) {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [pwError, setPwError] = useState('');
  const [savingPw, setSavingPw] = useState(false);

  const [ratesDraft, setRatesDraft] = useState(null);
  const [savingRates, setSavingRates] = useState(false);

  const canSendEmail = permissions.includes('emails:send');
  const canDownloadBackup = permissions.includes('backup:download');
  const canEditSettings = permissions.includes('settings:manage');

  const liveSite = siteSettings || site;
  const formVal = ratesDraft || buildEditableState(liveSite);

  const updateRateField = (key, value) => {
    setRatesDraft((prev) => ({
      ...(prev || buildEditableState(liveSite)),
      [key]: value,
    }));
  };

  const handleRatesSubmit = async (e) => {
    e.preventDefault();
    if (!canEditSettings || !onSaveSettings) return;
    setSavingRates(true);
    try {
      const payload = {
        name: formVal.name.trim(),
        slaHours: Number(formVal.slaHours),
        licence: {
          authority: formVal.licenceAuthority.trim(),
          number: formVal.licenceNumber.trim(),
        },
        contact: {
          whatsappNumber: formVal.whatsappNumber.trim(),
          whatsappLabel: formVal.whatsappLabel.trim(),
          email: formVal.email.trim(),
          hours: formVal.hours.trim(),
          emergencyHours: formVal.emergencyHours.trim(),
          address: formVal.addressText
            .split(/\r?\n/)
            .map((l) => l.trim())
            .filter(Boolean),
        },
        fees: {
          visaUsd: Number(formVal.visaUsd),
          gstPct: Number(formVal.gstPct),
          gstAppliesTo: formVal.gstAppliesTo.trim(),
          sdf: {
            internationalUsdPerNight: Number(formVal.intlSdfUsd),
            indianNuPerNight: Number(formVal.indianSdfNu),
            childDiscountPct: Number(formVal.childDiscountPct),
            childAgeMin: Number(formVal.childAgeMin),
            childAgeMax: Number(formVal.childAgeMax),
            adultAgeMin: Number(formVal.adultAgeMin),
            validUntil: formVal.validUntil.trim(),
          },
        },
      };
      const ok = await onSaveSettings(payload);
      if (ok) setRatesDraft(null);
    } finally {
      setSavingRates(false);
    }
  };

  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    setPwError('');
    if (newPassword.length < 8) {
      setPwError('New password must be at least 8 characters long.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setPwError('New password and confirmation do not match.');
      return;
    }
    setSavingPw(true);
    try {
      const ok = await onChangePassword(currentPassword, newPassword);
      if (ok) {
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
      }
    } finally {
      setSavingPw(false);
    }
  };

  return (
    <div className={styles.viewStack}>
      <div className={styles.viewHead}>
        <div>
          <span className={styles.eyebrow}>PORTAL &amp; LIVE WEBSITE CONFIGURATION</span>
          <h1 className={styles.pageTitle}>
            {canEditSettings ? 'Bhutan Rates, Agency & Settings' : 'Settings & Statutory Reference'}
          </h1>
        </div>
        <span
          className={`${styles.enginePill} ${
            dbEngine === 'postgres' ? styles.enginePillPg : styles.enginePillLocal
          }`}
        >
          {dbEngine === 'postgres' ? '● PostgreSQL Connected' : '○ Local .data/ Storage'}
        </span>
      </div>

      <div className={styles.settingsGrid}>
        {canEditSettings ? (
          <section className={`${styles.panelCard} ${styles.settingsFullSpan}`}>
            <div className={styles.panelHead}>
              <div>
                <h2 className={styles.panelTitle}>Editable Bhutan Statutory Rates &amp; Agency References</h2>
                <p className={styles.panelSub}>
                  Saving updates the public website (/travel-guide, /legal, /about, /contact, global footer) and automatic emails in real time with zero rebuild. Every edit is logged in the Audit Log.
                </p>
              </div>
              {ratesDraft ? (
                <span className={`${styles.badge} ${styles.badgeStatusQuoted}`}>Unsaved Changes</span>
              ) : (
                <span className={`${styles.badge} ${styles.badgeStatusConfirmed}`}>Live Synced</span>
              )}
            </div>

            <form onSubmit={handleRatesSubmit} className={styles.ratesForm}>
              <div className={styles.ratesSectionGroup}>
                <h3 className={styles.ratesSubhead}>Bhutan Statutory Fees (Department of Tourism)</h3>
                <div className={styles.ratesGridThree}>
                  <div>
                    <label htmlFor="setIntlSdf" className="rtb-field-label">
                      International SDF (US$/night)
                    </label>
                    <input
                      id="setIntlSdf"
                      type="number"
                      min="0"
                      max="2000"
                      required
                      value={formVal.intlSdfUsd}
                      onChange={(e) => updateRateField('intlSdfUsd', e.target.value)}
                      className="rtb-input"
                    />
                  </div>
                  <div>
                    <label htmlFor="setIndianSdf" className="rtb-field-label">
                      Indian Regional SDF (Nu./night)
                    </label>
                    <input
                      id="setIndianSdf"
                      type="number"
                      min="0"
                      max="50000"
                      required
                      value={formVal.indianSdfNu}
                      onChange={(e) => updateRateField('indianSdfNu', e.target.value)}
                      className="rtb-input"
                    />
                  </div>
                  <div>
                    <label htmlFor="setChildDisc" className="rtb-field-label">
                      Child SDF Discount (%)
                    </label>
                    <input
                      id="setChildDisc"
                      type="number"
                      min="0"
                      max="100"
                      required
                      value={formVal.childDiscountPct}
                      onChange={(e) => updateRateField('childDiscountPct', e.target.value)}
                      className="rtb-input"
                    />
                  </div>
                  <div>
                    <label htmlFor="setChildMin" className="rtb-field-label">
                      Child Discount Min Age
                    </label>
                    <input
                      id="setChildMin"
                      type="number"
                      min="0"
                      max="17"
                      required
                      value={formVal.childAgeMin}
                      onChange={(e) => updateRateField('childAgeMin', e.target.value)}
                      className="rtb-input"
                    />
                  </div>
                  <div>
                    <label htmlFor="setChildMax" className="rtb-field-label">
                      Child Discount Max Age
                    </label>
                    <input
                      id="setChildMax"
                      type="number"
                      min="1"
                      max="17"
                      required
                      value={formVal.childAgeMax}
                      onChange={(e) => updateRateField('childAgeMax', e.target.value)}
                      className="rtb-input"
                    />
                  </div>
                  <div>
                    <label htmlFor="setAdultMin" className="rtb-field-label">
                      Adult Full-SDF Min Age
                    </label>
                    <input
                      id="setAdultMin"
                      type="number"
                      min="2"
                      max="21"
                      required
                      value={formVal.adultAgeMin}
                      onChange={(e) => updateRateField('adultAgeMin', e.target.value)}
                      className="rtb-input"
                    />
                  </div>
                  <div>
                    <label htmlFor="setValidUntil" className="rtb-field-label">
                      SDF Policy Valid Until (YYYY-MM-DD)
                    </label>
                    <input
                      id="setValidUntil"
                      type="date"
                      required
                      value={formVal.validUntil}
                      onChange={(e) => updateRateField('validUntil', e.target.value)}
                      className="rtb-input"
                    />
                  </div>
                  <div>
                    <label htmlFor="setVisaUsd" className="rtb-field-label">
                      Bhutan Visa Fee (US$)
                    </label>
                    <input
                      id="setVisaUsd"
                      type="number"
                      min="0"
                      max="1000"
                      required
                      value={formVal.visaUsd}
                      onChange={(e) => updateRateField('visaUsd', e.target.value)}
                      className="rtb-input"
                    />
                  </div>
                  <div>
                    <label htmlFor="setGstPct" className="rtb-field-label">
                      Bhutan GST (%)
                    </label>
                    <input
                      id="setGstPct"
                      type="number"
                      min="0"
                      max="50"
                      step="0.5"
                      required
                      value={formVal.gstPct}
                      onChange={(e) => updateRateField('gstPct', e.target.value)}
                      className="rtb-input"
                    />
                  </div>
                </div>
                <div>
                  <label htmlFor="setGstScope" className="rtb-field-label">
                    GST Scope Description
                  </label>
                  <input
                    id="setGstScope"
                    type="text"
                    required
                    value={formVal.gstAppliesTo}
                    onChange={(e) => updateRateField('gstAppliesTo', e.target.value)}
                    className="rtb-input"
                  />
                </div>
              </div>

              <div className={styles.ratesSectionGroup}>
                <h3 className={styles.ratesSubhead}>Agency Identity &amp; DoT References</h3>
                <div className={styles.ratesGridThree}>
                  <div>
                    <label htmlFor="setAgencyName" className="rtb-field-label">
                      Agency Display Name
                    </label>
                    <input
                      id="setAgencyName"
                      type="text"
                      required
                      value={formVal.name}
                      onChange={(e) => updateRateField('name', e.target.value)}
                      className="rtb-input"
                    />
                  </div>
                  <div>
                    <label htmlFor="setLicenceNum" className="rtb-field-label">
                      DoT Licence Number
                    </label>
                    <input
                      id="setLicenceNum"
                      type="text"
                      required
                      value={formVal.licenceNumber}
                      onChange={(e) => updateRateField('licenceNumber', e.target.value)}
                      className="rtb-input"
                    />
                  </div>
                  <div>
                    <label htmlFor="setLicenceAuth" className="rtb-field-label">
                      Licensing Authority
                    </label>
                    <input
                      id="setLicenceAuth"
                      type="text"
                      required
                      value={formVal.licenceAuthority}
                      onChange={(e) => updateRateField('licenceAuthority', e.target.value)}
                      className="rtb-input"
                    />
                  </div>
                  <div>
                    <label htmlFor="setWaDigits" className="rtb-field-label">
                      WhatsApp Number (Digits Only)
                    </label>
                    <input
                      id="setWaDigits"
                      type="text"
                      required
                      value={formVal.whatsappNumber}
                      onChange={(e) => updateRateField('whatsappNumber', e.target.value)}
                      className="rtb-input"
                    />
                  </div>
                  <div>
                    <label htmlFor="setWaLabel" className="rtb-field-label">
                      WhatsApp Display Label
                    </label>
                    <input
                      id="setWaLabel"
                      type="text"
                      required
                      value={formVal.whatsappLabel}
                      onChange={(e) => updateRateField('whatsappLabel', e.target.value)}
                      className="rtb-input"
                    />
                  </div>
                  <div>
                    <label htmlFor="setConciergeEmail" className="rtb-field-label">
                      Public Concierge Email
                    </label>
                    <input
                      id="setConciergeEmail"
                      type="email"
                      required
                      value={formVal.email}
                      onChange={(e) => updateRateField('email', e.target.value)}
                      className="rtb-input"
                    />
                  </div>
                  <div>
                    <label htmlFor="setHours" className="rtb-field-label">
                      Thimphu Desk Office Hours
                    </label>
                    <input
                      id="setHours"
                      type="text"
                      required
                      value={formVal.hours}
                      onChange={(e) => updateRateField('hours', e.target.value)}
                      className="rtb-input"
                    />
                  </div>
                  <div>
                    <label htmlFor="setEmergHours" className="rtb-field-label">
                      On-Trip Emergency Support
                    </label>
                    <input
                      id="setEmergHours"
                      type="text"
                      value={formVal.emergencyHours}
                      onChange={(e) => updateRateField('emergencyHours', e.target.value)}
                      className="rtb-input"
                    />
                  </div>
                  <div>
                    <label htmlFor="setSlaHours" className="rtb-field-label">
                      First-Reply SLA Target (Hours)
                    </label>
                    <input
                      id="setSlaHours"
                      type="number"
                      min="1"
                      max="168"
                      required
                      value={formVal.slaHours}
                      onChange={(e) => updateRateField('slaHours', e.target.value)}
                      className="rtb-input"
                    />
                  </div>
                </div>
                <div>
                  <label htmlFor="setAddress" className="rtb-field-label">
                    Thimphu Office Address (One Line Per Row)
                  </label>
                  <textarea
                    id="setAddress"
                    rows={3}
                    required
                    value={formVal.addressText}
                    onChange={(e) => updateRateField('addressText', e.target.value)}
                    className="rtb-textarea"
                  />
                </div>
              </div>

              <div className={styles.inlineBtnRow}>
                <button
                  type="submit"
                  disabled={savingRates}
                  className={`btn btn-primary ${styles.actionBtn}`}
                >
                  <Icon name="shieldCheck" size={15} />
                  <span>{savingRates ? 'Saving & Syncing Live…' : 'Save Live Bhutan Rates & Agency Settings'}</span>
                </button>
                {ratesDraft ? (
                  <button
                    type="button"
                    onClick={() => setRatesDraft(null)}
                    className={`btn btn-outline ${styles.actionBtn}`}
                  >
                    Discard Edits
                  </button>
                ) : null}
              </div>
            </form>
          </section>
        ) : (
          <section className={styles.panelCard}>
            <div className={styles.panelHead}>
              <div>
                <h2 className={styles.panelTitle}>Bhutan Statutory Rates &amp; Agency Reference</h2>
                <p className={styles.panelSub}>Live configuration managed by the Owner</p>
              </div>
            </div>

            <div className={styles.detailGrid}>
              <div className={styles.detailField}>
                <span className={styles.detailLabel}>DoT Licence</span>
                <span className={styles.detailVal}>{liveSite.licence?.number}</span>
              </div>
              <div className={styles.detailField}>
                <span className={styles.detailLabel}>WhatsApp Concierge</span>
                <span className={styles.detailVal}>{liveSite.contact?.whatsappLabel}</span>
              </div>
              <div className={styles.detailField}>
                <span className={styles.detailLabel}>International SDF</span>
                <span className={styles.detailVal}>
                  US${liveSite.fees?.sdf?.internationalUsdPerNight}/night (valid to {liveSite.fees?.sdf?.validUntil})
                </span>
              </div>
              <div className={styles.detailField}>
                <span className={styles.detailLabel}>Indian Regional SDF</span>
                <span className={styles.detailVal}>
                  Nu. {(liveSite.fees?.sdf?.indianNuPerNight ?? 1200).toLocaleString('en-US')}/night
                </span>
              </div>
              <div className={styles.detailField}>
                <span className={styles.detailLabel}>Children SDF Discount</span>
                <span className={styles.detailVal}>
                  Ages {liveSite.fees?.sdf?.childAgeMin}–{liveSite.fees?.sdf?.childAgeMax}: {liveSite.fees?.sdf?.childDiscountPct}% off · Under {liveSite.fees?.sdf?.childAgeMin}: exempt
                </span>
              </div>
              <div className={styles.detailField}>
                <span className={styles.detailLabel}>Visa &amp; GST</span>
                <span className={styles.detailVal}>
                  US${liveSite.fees?.visaUsd} visa · {liveSite.fees?.gstPct}% GST
                </span>
              </div>
            </div>
          </section>
        )}

        <section className={styles.panelCard}>
          <div className={styles.panelHead}>
            <div>
              <h2 className={styles.panelTitle}>Database &amp; Automatic Email Transport</h2>
              <p className={styles.panelSub}>Server storage engine and notification provider from .env</p>
            </div>
          </div>

          <div className={styles.detailGrid}>
            <div className={styles.detailField}>
              <span className={styles.detailLabel}>Storage Engine</span>
              <span className={styles.detailVal}>
                {dbEngine === 'postgres' ? 'PostgreSQL (DATABASE_URL)' : 'Local .data/ Fallback'}
              </span>
            </div>
            <div className={styles.detailField}>
              <span className={styles.detailLabel}>Email Status</span>
              <span className={styles.detailVal}>
                {emailConfig.configured
                  ? `Active (${String(emailConfig.provider || '').toUpperCase()})`
                  : 'Not Configured'}
              </span>
            </div>
            <div className={styles.detailField}>
              <span className={styles.detailLabel}>Admin Alert Inbox</span>
              <span className={styles.detailVal}>{emailConfig.adminTo || 'Not set'}</span>
            </div>
            <div className={styles.detailField}>
              <span className={styles.detailLabel}>Guest Confirmation Copy</span>
              <span className={styles.detailVal}>
                {emailConfig.sendGuestCopy ? 'Enabled' : 'Disabled'}
              </span>
            </div>
          </div>

          {dbEngine !== 'postgres' ? (
            <p className={styles.sdfFootnote}>
              Tip: Add a free Neon or Supabase PostgreSQL connection string to{' '}
              <span className={styles.codeInline}>DATABASE_URL</span> in{' '}
              <span className={styles.codeInline}>.env</span> and restart <span className={styles.codeInline}>npm start</span> — your existing local data imports automatically.
            </p>
          ) : null}

          {canSendEmail ? (
            <button
              type="button"
              onClick={onTestEmail}
              className={`btn btn-primary ${styles.actionBtn}`}
            >
              <Icon name="mail" size={15} />
              <span>Send Test Email Now</span>
            </button>
          ) : null}
        </section>

        <section className={styles.panelCard}>
          <div className={styles.panelHead}>
            <div>
              <h2 className={styles.panelTitle}>Change My Password</h2>
              <p className={styles.panelSub}>
                Signed in as {currentUser?.name} ({currentUser?.email})
              </p>
            </div>
          </div>

          {pwError ? (
            <div className={`${styles.noticeBanner} ${styles.noticeError}`} role="alert">
              {pwError}
            </div>
          ) : null}

          <form onSubmit={handlePasswordSubmit} className={styles.loginForm}>
            <div>
              <label htmlFor="curPw" className="rtb-field-label">
                Current Password
              </label>
              <input
                id="curPw"
                type="password"
                required
                autoComplete="current-password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                className="rtb-input"
              />
            </div>
            <div>
              <label htmlFor="nextPw" className="rtb-field-label">
                New Password (min 8 characters)
              </label>
              <input
                id="nextPw"
                type="password"
                required
                minLength={8}
                autoComplete="new-password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="rtb-input"
              />
            </div>
            <div>
              <label htmlFor="confPw" className="rtb-field-label">
                Confirm New Password
              </label>
              <input
                id="confPw"
                type="password"
                required
                minLength={8}
                autoComplete="new-password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="rtb-input"
              />
            </div>
            <button
              type="submit"
              disabled={savingPw}
              className={`btn btn-primary ${styles.actionBtn}`}
            >
              {savingPw ? 'Updating…' : 'Update Password'}
            </button>
          </form>
        </section>

        {canDownloadBackup ? (
          <section className={styles.panelCard}>
            <div className={styles.panelHead}>
              <div>
                <h2 className={styles.panelTitle}>Data Backup Snapshot</h2>
                <p className={styles.panelSub}>
                  Downloads all bookings, statutory settings, checklists, email logs, audit trail, and non-secret user summaries as a single JSON archive (password hashes and session tokens excluded).
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={onDownloadBackup}
              className={`btn btn-outline-dark ${styles.actionBtn}`}
            >
              <Icon name="download" size={16} />
              <span>Download JSON Backup</span>
            </button>
          </section>
        ) : null}
      </div>
    </div>
  );
}
