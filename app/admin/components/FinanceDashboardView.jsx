'use client';

import { useMemo, useState } from 'react';
import Icon from '@/components/icons';
import { formatDisplayDate, formatUSD } from '@/lib/format';
import {
  computeBhutanBreakdown,
  computeDashboardAnalytics,
  computeFinanceSummary,
  formatCsvCell,
} from '@/lib/admin-analytics';
import { MonthlyDeparturesChart, NationalityDonutChart } from './PortalCharts';
import styles from '../Admin.module.css';

const PAYMENT_METHODS = [
  'Bank of Bhutan Wire',
  'SWIFT International Wire',
  'INR Regional Bank Transfer',
  'Card / Online Gateway',
  'Cash / Office Receipt',
];

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

function csvCell(val) {
  return formatCsvCell(val);
}

export default function FinanceDashboardView({
  mode = 'overview',
  inquiries,
  siteConfig,
  onSavePayment,
  onNavigate,
  onRefresh,
  loading,
}) {
  const [paymentFilter, setPaymentFilter] = useState('all'); // all | unverified | verified | confirmed
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRef, setSelectedRef] = useState('');
  const [drafts, setDrafts] = useState({});
  const [saving, setSaving] = useState(false);

  const fees = siteConfig?.fees;

  const activeBookings = useMemo(
    () =>
      inquiries
        .filter((i) => i.type === 'booking' && i.status !== 'archived')
        .sort((a, b) => String(a.startDate || '9999').localeCompare(String(b.startDate || '9999'))),
    [inquiries]
  );

  const summary = useMemo(
    () => computeFinanceSummary(inquiries, fees),
    [inquiries, fees]
  );

  const analytics = useMemo(
    () => computeDashboardAnalytics(inquiries, 30, new Date(), fees),
    [inquiries, fees]
  );

  const filteredBookings = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return activeBookings.filter((item) => {
      if (paymentFilter === 'unverified' && item.payment?.depositVerified) return false;
      if (paymentFilter === 'verified' && !item.payment?.depositVerified) return false;
      if (paymentFilter === 'confirmed' && item.status !== 'confirmed') return false;
      if (!q) return true;
      return [item.reference, item.fullName, item.email, item.tourTitle, item.payment?.wireReference]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
        .includes(q);
    });
  }, [activeBookings, paymentFilter, searchQuery]);

  const selectedBooking = useMemo(
    () => filteredBookings.find((b) => b.reference === selectedRef) || filteredBookings[0] || null,
    [filteredBookings, selectedRef]
  );

  const selectedBreakdown = selectedBooking
    ? computeBhutanBreakdown(selectedBooking, fees)
    : null;

  const getDraft = (item) => {
    if (!item) return null;
    const d = drafts[item.reference];
    const bd = computeBhutanBreakdown(item, fees);
    return {
      finalQuotedUsd:
        d?.finalQuotedUsd !== undefined
          ? d.finalQuotedUsd
          : item.quoteOverride?.finalQuotedUsd != null
            ? String(item.quoteOverride.finalQuotedUsd)
            : '',
      depositPaidUsd:
        d?.depositPaidUsd !== undefined
          ? d.depositPaidUsd
          : bd.depositPaidUsd > 0
            ? String(bd.depositPaidUsd)
            : '',
      paymentMethod:
        d?.paymentMethod !== undefined
          ? d.paymentMethod
          : item.payment?.paymentMethod || PAYMENT_METHODS[0],
      wireReference:
        d?.wireReference !== undefined ? d.wireReference : item.payment?.wireReference || '',
      financeNotes:
        d?.financeNotes !== undefined ? d.financeNotes : item.payment?.financeNotes || '',
    };
  };

  const updateDraft = (ref, patch) => {
    const item = activeBookings.find((b) => b.reference === ref);
    if (!item) return;
    const base = getDraft(item);
    setDrafts((prev) => ({ ...prev, [ref]: { ...base, ...patch } }));
  };

  const handlePaymentSubmit = async (verifyAction) => {
    if (!selectedBooking) return;
    const d = getDraft(selectedBooking);
    setSaving(true);
    try {
      const payload = {
        finalQuotedUsd: d.finalQuotedUsd === '' ? null : Number(d.finalQuotedUsd),
        depositPaidUsd: d.depositPaidUsd === '' ? 0 : Number(d.depositPaidUsd),
        paymentMethod: d.paymentMethod,
        wireReference: d.wireReference,
        financeNotes: d.financeNotes,
      };
      if (verifyAction === 'verify') payload.depositVerified = true;
      if (verifyAction === 'revoke') payload.depositVerified = false;

      const ok = await onSavePayment(selectedBooking.reference, payload);
      if (ok) {
        setDrafts((prev) => {
          const next = { ...prev };
          delete next[selectedBooking.reference];
          return next;
        });
      }
    } finally {
      setSaving(false);
    }
  };

  const handleExportFinanceCsv = () => {
    const headers = [
      'Reference',
      'Status',
      'Lead Traveller',
      'Email',
      'Nationality',
      'Tour',
      'Arrival',
      'Nights',
      'Adults',
      'Children (6-11)',
      'Young (<6)',
      'Tariff Regime',
      'Intl SDF (USD)',
      'India SDF (Nu.)',
      'Visa Fee (USD)',
      'Effective Package Total (USD)',
      'Deposit Paid (USD)',
      'Balance Due (USD)',
      'Deposit Verified',
      'Verified By',
      'Wire Reference',
      'Payment Method',
      'SDF Remitted to DoT',
      'Manager Override Used',
    ];
    const rows = activeBookings.map((b) => {
      const bd = computeBhutanBreakdown(b, fees);
      return [
        b.reference,
        b.status,
        b.fullName,
        b.email,
        b.nationality || '',
        b.tourTitle || '',
        b.startDate || '',
        bd.nights,
        bd.adults,
        bd.children,
        bd.youngChildren,
        bd.tariff === 'indian' ? 'Indian Regional' : 'International USD',
        bd.sdfUsd,
        bd.sdfNu,
        bd.visaUsd,
        bd.effectiveTotalUsd,
        bd.depositPaidUsd,
        bd.balanceDueUsd,
        b.payment?.depositVerified ? 'Yes' : 'No',
        b.payment?.depositVerifiedBy || '',
        b.payment?.wireReference || '',
        b.payment?.paymentMethod || '',
        b.checklist?.sdfRemitted ? 'Yes' : 'No',
        b.confirmationOverride?.used ? `Yes (${b.confirmationOverride.actorName})` : 'No',
      ];
    });
    const csv = [headers, ...rows].map((r) => r.map(csvCell).join(',')).join('\r\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `yuevaan-finance-sdf-ledger-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (mode === 'overview') {
    const pendingVerify = activeBookings.filter((b) => !b.payment?.depositVerified);
    return (
      <div className={styles.viewStack}>
        <div className={styles.viewHead}>
          <div>
            <span className={styles.eyebrow}>FINANCE &amp; STATUTORY LEDGER</span>
            <h1 className={styles.pageTitle}>Finance Overview</h1>
          </div>
          <div className={styles.topActions}>
            <button
              type="button"
              onClick={() => onNavigate('finance-payments')}
              className={`btn btn-primary ${styles.actionBtn}`}
            >
              <Icon name="fileCheck" size={15} />
              <span>Verify Deposits</span>
            </button>
            <button
              type="button"
              onClick={handleExportFinanceCsv}
              disabled={activeBookings.length === 0}
              className={`btn btn-outline ${styles.actionBtn}`}
            >
              <Icon name="download" size={15} />
              <span>Export Financial CSV</span>
            </button>
            <button
              type="button"
              onClick={onRefresh}
              disabled={loading}
              className={`btn btn-outline ${styles.actionBtn}`}
            >
              {loading ? 'Refreshing…' : 'Refresh'}
            </button>
          </div>
        </div>

        <section className={styles.kpiGridThree} aria-label="Financial KPIs">
          <div className={styles.kpiCard}>
            <span className={styles.kpiLabel}>Confirmed Revenue</span>
            <span className={`${styles.kpiVal} ${styles.kpiValAccent}`}>
              {formatUSD(summary.confirmedValueUsd)}
            </span>
            <span className={styles.kpiSub}>
              Quoted pipeline: {formatUSD(summary.quotedPipelineUsd)}
            </span>
          </div>

          <div className={styles.kpiCard}>
            <div className={styles.kpiTopRow}>
              <span className={styles.kpiLabel}>Deposits Collected</span>
              <span className={`${styles.deltaPill} ${styles.deltaUp}`}>
                {summary.verifiedCount} verified
              </span>
            </div>
            <span className={styles.kpiVal}>{formatUSD(summary.totalDepositsUsd)}</span>
            <span className={styles.kpiSub}>
              {summary.pendingVerificationCount} quoted/confirmed awaiting verification
            </span>
          </div>

          <div className={styles.kpiCard}>
            <span className={styles.kpiLabel}>Balances Outstanding</span>
            <span className={styles.kpiVal}>{formatUSD(summary.totalBalanceDueUsd)}</span>
            <span className={styles.kpiSub}>Across {activeBookings.length} active tour bookings</span>
          </div>

          <div className={styles.kpiCard}>
            <span className={styles.kpiLabel}>Intl. SDF Payable (DoT)</span>
            <span className={styles.kpiVal}>{formatUSD(summary.intlSdfPayableUsd)}</span>
            <span className={styles.kpiSub}>
              US${fees?.sdf?.internationalUsdPerNight ?? 100}/night · children {fees?.sdf?.childDiscountPct ?? 50}% off
            </span>
          </div>

          <div className={styles.kpiCard}>
            <span className={styles.kpiLabel}>India Regional SDF Payable</span>
            <span className={styles.kpiVal}>
              Nu. {summary.indianSdfPayableNu.toLocaleString('en-US')}
            </span>
            <span className={styles.kpiSub}>
              Nu. {(fees?.sdf?.indianNuPerNight ?? 1200).toLocaleString('en-US')}/night regional tariff
            </span>
          </div>

          <div className={styles.kpiCard}>
            <div className={styles.kpiTopRow}>
              <span className={styles.kpiLabel}>Bhutan Visa Fees</span>
              <span className={`${styles.deltaPill} ${styles.deltaDown}`}>
                {summary.sdfRemittedCount}/{activeBookings.length} SDF remitted
              </span>
            </div>
            <span className={styles.kpiVal}>{formatUSD(summary.visaPayableUsd)}</span>
            <span className={styles.kpiSub}>US${fees?.visaUsd ?? 40} per international traveller</span>
          </div>
        </section>

        <section className={styles.chartsGrid} aria-label="Revenue and Tariff Charts">
          <MonthlyDeparturesChart months={analytics.monthlyDepartures} />
          <NationalityDonutChart mix={analytics.nationalityMix} />
        </section>

        <section className={styles.panelCard} aria-label="Pending Deposit Verifications">
          <div className={styles.panelHead}>
            <div>
              <h2 className={styles.panelTitle}>
                Bookings Awaiting Deposit Verification ({pendingVerify.length})
              </h2>
              <p className={styles.panelSub}>
                Verifying a guest&apos;s wire unlocks &ldquo;Confirmed&rdquo; status for the Reservations team
              </p>
            </div>
            <button
              type="button"
              onClick={() => onNavigate('finance-payments')}
              className={`btn btn-outline ${styles.miniActionBtn}`}
            >
              Open Full Ledger →
            </button>
          </div>

          {pendingVerify.length === 0 ? (
            <div className={styles.cleanState}>
              <Icon name="shieldCheck" size={18} />
              <span>All active tour bookings have verified deposits.</span>
            </div>
          ) : (
            <div className={styles.tableScroll}>
              <table className={styles.dataTable}>
                <thead>
                  <tr>
                    <th>Ref</th>
                    <th>Traveller &amp; Tour</th>
                    <th>Arrival</th>
                    <th>Status</th>
                    <th>Package USD</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {pendingVerify.slice(0, 8).map((b) => {
                    const bd = computeBhutanBreakdown(b, fees);
                    return (
                      <tr key={b.reference}>
                        <td>
                          <span className={styles.refCode}>{b.reference}</span>
                        </td>
                        <td>
                          <div className={styles.cellPrimary}>{b.fullName}</div>
                          <div className={styles.cellSub}>{b.tourTitle}</div>
                        </td>
                        <td>{formatDisplayDate(b.startDate)}</td>
                        <td>
                          <span className={`${styles.badge} ${styles.badgeStatusQuoted}`}>
                            {b.status}
                          </span>
                        </td>
                        <td>{formatUSD(bd.effectiveTotalUsd)}</td>
                        <td>
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedRef(b.reference);
                              onNavigate('finance-payments');
                            }}
                            className={`btn btn-primary ${styles.miniActionBtn}`}
                          >
                            Verify Deposit
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    );
  }

  if (mode === 'ledger') {
    return (
      <div className={styles.viewStack}>
        <div className={styles.viewHead}>
          <div>
            <span className={styles.eyebrow}>DEPARTMENT OF TOURISM REMITTANCE</span>
            <h1 className={styles.pageTitle}>Bhutan SDF &amp; Visa Ledger</h1>
          </div>
          <div className={styles.topActions}>
            <button
              type="button"
              onClick={handleExportFinanceCsv}
              disabled={activeBookings.length === 0}
              className={`btn btn-primary ${styles.actionBtn}`}
            >
              <Icon name="download" size={15} />
              <span>Export Financial &amp; SDF CSV</span>
            </button>
            <button
              type="button"
              onClick={onRefresh}
              disabled={loading}
              className={`btn btn-outline ${styles.actionBtn}`}
            >
              {loading ? 'Refreshing…' : 'Refresh'}
            </button>
          </div>
        </div>

        <section className={styles.rateStrip} aria-label="Current statutory rates">
          <div className={styles.rateStripItem}>
            <span className={styles.rateStripLabel}>International SDF</span>
            <strong>US${fees?.sdf?.internationalUsdPerNight ?? 100}/night</strong>
          </div>
          <div className={styles.rateStripItem}>
            <span className={styles.rateStripLabel}>India Regional SDF</span>
            <strong>Nu. {(fees?.sdf?.indianNuPerNight ?? 1200).toLocaleString('en-US')}/night</strong>
          </div>
          <div className={styles.rateStripItem}>
            <span className={styles.rateStripLabel}>Child Discount</span>
            <strong>
              Ages {fees?.sdf?.childAgeMin ?? 6}–{fees?.sdf?.childAgeMax ?? 11}: {fees?.sdf?.childDiscountPct ?? 50}% off
            </strong>
          </div>
          <div className={styles.rateStripItem}>
            <span className={styles.rateStripLabel}>Visa &amp; GST</span>
            <strong>
              US${fees?.visaUsd ?? 40} · {fees?.gstPct ?? 5}% GST
            </strong>
          </div>
          <div className={styles.rateStripItem}>
            <span className={styles.rateStripLabel}>Valid Until</span>
            <strong>{fees?.sdf?.validUntil || '—'}</strong>
          </div>
        </section>

        <div className={styles.panelCard}>
          {activeBookings.length === 0 ? (
            <div className={styles.emptyState}>No active tour bookings in the statutory ledger yet.</div>
          ) : (
            <div className={styles.tableScroll}>
              <table className={styles.dataTable}>
                <thead>
                  <tr>
                    <th>Arrival &amp; Ref</th>
                    <th>Traveller &amp; Party</th>
                    <th>Tariff Regime</th>
                    <th>SDF Payable</th>
                    <th>Visa Fee</th>
                    <th>Deposit Status</th>
                    <th className={styles.checkCol}>SDF Remitted</th>
                  </tr>
                </thead>
                <tbody>
                  {activeBookings.map((item) => {
                    const bd = computeBhutanBreakdown(item, fees);
                    const remitted = Boolean(item.checklist?.sdfRemitted);
                    return (
                      <tr key={item.reference}>
                        <td>
                          <div className={styles.cellPrimary}>{formatDisplayDate(item.startDate)}</div>
                          <span className={styles.refCode}>{item.reference}</span>
                        </td>
                        <td>
                          <div className={styles.cellPrimary}>{item.fullName}</div>
                          <div className={styles.cellSub}>
                            {bd.nights}N · {bd.adults}A
                            {bd.children > 0 ? ` + ${bd.children}C (${bd.childDiscountPct}% off)` : ''}
                            {bd.youngChildren > 0 ? ` + ${bd.youngChildren}Y (exempt)` : ''}
                          </div>
                        </td>
                        <td>
                          <span className={`${styles.badge} ${styles.badgeBooking}`}>
                            {bd.tariff === 'indian' ? 'India Regional' : 'International'}
                          </span>
                          <div className={styles.cellSub}>{item.nationality || '—'}</div>
                        </td>
                        <td className={styles.cellPrimary}>
                          {bd.tariff === 'indian'
                            ? `Nu. ${bd.sdfNu.toLocaleString('en-US')}`
                            : formatUSD(bd.sdfUsd)}
                        </td>
                        <td>{bd.tariff === 'indian' ? 'Permit' : formatUSD(bd.visaUsd)}</td>
                        <td>
                          <span
                            className={`${styles.badge} ${
                              item.payment?.depositVerified
                                ? styles.badgeStatusConfirmed
                                : styles.badgeStatusNew
                            }`}
                          >
                            {item.payment?.depositVerified
                              ? `Verified (${formatUSD(bd.depositPaidUsd)})`
                              : 'Unverified'}
                          </span>
                        </td>
                        <td className={styles.checkCol}>
                          <input
                            type="checkbox"
                            aria-label={`Mark Bhutan SDF remitted to DoT for ${item.reference}`}
                            checked={remitted}
                            onChange={() => onSavePayment(item.reference, { sdfRemitted: !remitted })}
                          />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    );
  }

  // mode === 'payments'
  const activeDraft = getDraft(selectedBooking);

  return (
    <div className={styles.viewStack}>
      <div className={styles.viewHead}>
        <div>
          <span className={styles.eyebrow}>PAYMENT VERIFICATION GATE</span>
          <h1 className={styles.pageTitle}>Payments &amp; Deposits</h1>
        </div>
        <div className={styles.topActions}>
          <button
            type="button"
            onClick={handleExportFinanceCsv}
            disabled={activeBookings.length === 0}
            className={`btn btn-outline ${styles.actionBtn}`}
          >
            <Icon name="download" size={15} />
            <span>Export CSV</span>
          </button>
          <button
            type="button"
            onClick={onRefresh}
            disabled={loading}
            className={`btn btn-outline ${styles.actionBtn}`}
          >
            {loading ? 'Refreshing…' : 'Refresh'}
          </button>
        </div>
      </div>

      <div className={styles.filterBar}>
        <div className={styles.filterGroup} role="group" aria-label="Filter payment status">
          {[
            { value: 'all', label: 'All Bookings' },
            { value: 'unverified', label: 'Awaiting Verification' },
            { value: 'verified', label: 'Deposit Verified' },
            { value: 'confirmed', label: 'Confirmed Trips' },
          ].map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => setPaymentFilter(opt.value)}
              className={`${styles.pillBtn}${paymentFilter === opt.value ? ` ${styles.pillBtnActive}` : ''}`}
            >
              {opt.label}
            </button>
          ))}
        </div>
        <input
          type="search"
          aria-label="Search bookings or wire references"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search ref, guest, tour, wire ref…"
          className={`rtb-input ${styles.searchInput}`}
        />
      </div>

      <div className={styles.workspace}>
        <div className={styles.listPane}>
          {filteredBookings.length === 0 ? (
            <div className={styles.emptyState}>No tour bookings match your payment filter.</div>
          ) : (
            filteredBookings.map((item) => {
              const bd = computeBhutanBreakdown(item, fees);
              const isSelected = selectedBooking?.reference === item.reference;
              const verified = Boolean(item.payment?.depositVerified);
              return (
                <button
                  key={item.reference}
                  type="button"
                  onClick={() => setSelectedRef(item.reference)}
                  className={`${styles.rowBtn}${isSelected ? ` ${styles.rowBtnSelected}` : ''}`}
                >
                  <div className={styles.rowTop}>
                    <span className={styles.refCode}>{item.reference}</span>
                    <div className={styles.badges}>
                      <span
                        className={`${styles.badge} ${
                          verified ? styles.badgeStatusConfirmed : styles.badgeStatusQuoted
                        }`}
                      >
                        {verified ? 'Verified ✓' : 'Pending Deposit'}
                      </span>
                      <span className={`${styles.badge} ${styles.badgeBooking}`}>
                        {item.status}
                      </span>
                    </div>
                  </div>
                  <div className={styles.rowTitle}>
                    {item.fullName} — {item.tourTitle}
                  </div>
                  <div className={styles.rowMeta}>
                    <span>
                      Total {formatUSD(bd.effectiveTotalUsd)} · Paid {formatUSD(bd.depositPaidUsd)}
                    </span>
                    <span className={styles.rowPrice}>Due {formatUSD(bd.balanceDueUsd)}</span>
                  </div>
                </button>
              );
            })
          )}
        </div>

        <aside className={styles.detailPane} aria-label="Payment Verification Drawer">
          {!selectedBooking || !activeDraft || !selectedBreakdown ? (
            <div className={styles.emptyState}>
              Select a tour booking to record wire details and verify the deposit payment.
            </div>
          ) : (
            <div className={styles.inspectorContent}>
              <div className={styles.detailHeader}>
                <div className={styles.badges}>
                  <span className={styles.refCode}>{selectedBooking.reference}</span>
                  <span
                    className={`${styles.badge} ${
                      selectedBooking.payment?.depositVerified
                        ? styles.badgeStatusConfirmed
                        : styles.badgeStatusQuoted
                    }`}
                  >
                    {selectedBooking.payment?.depositVerified
                      ? 'Deposit Verified ✓'
                      : 'Awaiting Finance Verification'}
                  </span>
                  {selectedBooking.confirmationOverride?.used ? (
                    <span className={`${styles.badge} ${styles.badgeEmailFail}`}>
                      Manager Override Used
                    </span>
                  ) : null}
                </div>
                <h2 className={styles.detailTitle}>{selectedBooking.fullName}</h2>
                <div className={styles.detailSub}>
                  {selectedBooking.tourTitle} · Arrival {formatDisplayDate(selectedBooking.startDate)}
                </div>
              </div>

              {selectedBooking.payment?.depositVerified ? (
                <div className={`${styles.noticeBanner} ${styles.noticeSuccess}`}>
                  <span>
                    Deposit verified by <strong>{selectedBooking.payment.depositVerifiedBy}</strong> on{' '}
                    {formatBttTime(selectedBooking.payment.depositVerifiedAt)}. Reservations can confirm this trip.
                  </span>
                </div>
              ) : null}

              {selectedBooking.confirmationOverride?.used ? (
                <div className={`${styles.noticeBanner} ${styles.noticeInfo}`}>
                  <span>
                    <strong>Manager Override:</strong> Confirmed by {selectedBooking.confirmationOverride.actorName} — &ldquo;{selectedBooking.confirmationOverride.reason}&rdquo;. Please verify deposit once wire clears.
                  </span>
                </div>
              ) : null}

              <div className={styles.sdfCard}>
                <div className={styles.sdfCardHead}>
                  <strong>Statutory &amp; Package Breakdown</strong>
                  <span className={styles.sdfTag}>{selectedBreakdown.tariffLabel}</span>
                </div>
                <div className={styles.sdfRows}>
                  <div className={styles.sdfRow}>
                    <span>Effective Package Total</span>
                    <strong>{formatUSD(selectedBreakdown.effectiveTotalUsd)}</strong>
                  </div>
                  <div className={styles.sdfRow}>
                    <span>Bhutan SDF ({selectedBreakdown.nights}N)</span>
                    <strong>
                      {selectedBreakdown.tariff === 'indian'
                        ? `Nu. ${selectedBreakdown.sdfNu.toLocaleString('en-US')}`
                        : formatUSD(selectedBreakdown.sdfUsd)}
                    </strong>
                  </div>
                  <div className={styles.sdfRow}>
                    <span>Bhutan Visa Fee</span>
                    <strong>
                      {selectedBreakdown.tariff === 'indian'
                        ? 'Entry Permit'
                        : formatUSD(selectedBreakdown.visaUsd)}
                    </strong>
                  </div>
                  <div className={`${styles.sdfRow} ${styles.sdfRowTotal}`}>
                    <span>Paid / Remaining Balance</span>
                    <strong>
                      Paid {formatUSD(selectedBreakdown.depositPaidUsd)} · Due{' '}
                      {formatUSD(selectedBreakdown.balanceDueUsd)}
                    </strong>
                  </div>
                </div>
              </div>

              <div className={styles.workflowForm}>
                <div className={styles.workflowTwoCol}>
                  <div>
                    <label htmlFor="finQuotedUsd" className="rtb-field-label">
                      Final Quoted USD
                    </label>
                    <input
                      id="finQuotedUsd"
                      type="number"
                      min="0"
                      step="1"
                      value={activeDraft.finalQuotedUsd}
                      onChange={(e) =>
                        updateDraft(selectedBooking.reference, { finalQuotedUsd: e.target.value })
                      }
                      placeholder={String(selectedBooking.estimatedAdultTotalUSD || 0)}
                      className="rtb-input"
                    />
                  </div>
                  <div>
                    <label htmlFor="finDepositUsd" className="rtb-field-label">
                      Deposit Received (USD)
                    </label>
                    <input
                      id="finDepositUsd"
                      type="number"
                      min="0"
                      step="1"
                      value={activeDraft.depositPaidUsd}
                      onChange={(e) =>
                        updateDraft(selectedBooking.reference, { depositPaidUsd: e.target.value })
                      }
                      placeholder="e.g. 1200"
                      className="rtb-input"
                    />
                  </div>
                </div>

                <div className={styles.workflowTwoCol}>
                  <div>
                    <label htmlFor="finMethod" className="rtb-field-label">
                      Payment Method
                    </label>
                    <select
                      id="finMethod"
                      value={activeDraft.paymentMethod}
                      onChange={(e) =>
                        updateDraft(selectedBooking.reference, { paymentMethod: e.target.value })
                      }
                      className="rtb-select"
                    >
                      {PAYMENT_METHODS.map((m) => (
                        <option key={m} value={m}>
                          {m}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label htmlFor="finWireRef" className="rtb-field-label">
                      Bank / Wire Reference #
                    </label>
                    <input
                      id="finWireRef"
                      type="text"
                      value={activeDraft.wireReference}
                      onChange={(e) =>
                        updateDraft(selectedBooking.reference, { wireReference: e.target.value })
                      }
                      placeholder="e.g. BOB-2026-8841"
                      className="rtb-input"
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="finNotes" className="rtb-field-label">
                    Finance Reconciliation Notes
                  </label>
                  <textarea
                    id="finNotes"
                    rows={3}
                    value={activeDraft.financeNotes}
                    onChange={(e) =>
                      updateDraft(selectedBooking.reference, { financeNotes: e.target.value })
                    }
                    placeholder="Bank statement confirmation date, exchange rate notes, partial payment schedule…"
                    className="rtb-textarea"
                  />
                </div>

                <div className={styles.inlineBtnRow}>
                  {!selectedBooking.payment?.depositVerified ? (
                    <button
                      type="button"
                      disabled={saving}
                      onClick={() => handlePaymentSubmit('verify')}
                      className={`btn btn-primary ${styles.actionBtn}`}
                    >
                      <Icon name="shieldCheck" size={15} />
                      <span>{saving ? 'Verifying…' : 'Verify Deposit & Unlock Confirmation'}</span>
                    </button>
                  ) : (
                    <>
                      <button
                        type="button"
                        disabled={saving}
                        onClick={() => handlePaymentSubmit('save')}
                        className={`btn btn-primary ${styles.actionBtn}`}
                      >
                        {saving ? 'Saving…' : 'Update Ledger Entry'}
                      </button>
                      <button
                        type="button"
                        disabled={saving}
                        onClick={() => handlePaymentSubmit('revoke')}
                        className={styles.dangerGhostBtn}
                      >
                        Revoke Verification
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}
