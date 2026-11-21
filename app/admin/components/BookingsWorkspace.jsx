'use client';

import { useMemo, useState } from 'react';
import Icon from '@/components/icons';
import { formatDisplayDate, formatUSD } from '@/lib/format';
import { site } from '@/data/site';
import {
  buildReplyTemplates,
  CHECKLIST_STEPS,
  computeBhutanBreakdown,
  formatCsvCell,
  getChecklistProgress,
} from '@/lib/admin-analytics';
import styles from '../Admin.module.css';

const STATUS_OPTIONS = [
  { value: 'new', label: 'New' },
  { value: 'contacted', label: 'Contacted' },
  { value: 'quoted', label: 'Quoted' },
  { value: 'confirmed', label: 'Confirmed' },
  { value: 'archived', label: 'Archived' },
];

const KANBAN_COLS = ['new', 'contacted', 'quoted', 'confirmed'];

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

function formatParty(rec) {
  if (rec.type !== 'booking') return rec.party || 'Not specified';
  const parts = [`${rec.adults} adult${rec.adults > 1 ? 's' : ''}`];
  if (rec.children > 0) parts.push(`${rec.children} child${rec.children > 1 ? 'ren' : ''}`);
  if (rec.youngChildren > 0) parts.push(`${rec.youngChildren} young`);
  return parts.join(', ');
}

function statusBadgeClass(status) {
  if (status === 'confirmed') return styles.badgeStatusConfirmed;
  if (status === 'contacted') return styles.badgeStatusContacted;
  if (status === 'quoted') return styles.badgeStatusQuoted;
  if (status === 'archived') return styles.badgeStatusArchived;
  return styles.badgeStatusNew;
}

function csvCell(val) {
  return formatCsvCell(val);
}

export default function BookingsWorkspace({
  currentUser,
  siteConfig = site,
  inquiries,
  staffDirectory,
  permissions,
  selectedRef,
  onSelectRef,
  localFallbackItems,
  onSaveBooking,
  onClaimBooking,
  onToggleChecklist,
  onBulkStatus,
  onResendEmail,
  onDeleteBooking,
  onSyncLocal,
  onRefresh,
  loading,
}) {
  const [viewMode, setViewMode] = useState('split'); // 'split' | 'table' | 'kanban'
  const [queueFilter, setQueueFilter] = useState('all'); // 'all' | 'unassigned' | 'mine'
  const [statusFilter, setStatusFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('receivedDesc');
  const [selectedBulk, setSelectedBulk] = useState([]);
  const [bulkStatusValue, setBulkStatusValue] = useState('contacted');

  const [draftEdits, setDraftEdits] = useState({});
  const [selectedTemplateId, setSelectedTemplateId] = useState('initial-quote');
  const [savingMeta, setSavingMeta] = useState(false);
  const [claimingRef, setClaimingRef] = useState('');
  const [resendingEmail, setResendingEmail] = useState(false);
  const [confirmDeleteRef, setConfirmDeleteRef] = useState('');
  const [deleting, setDeleting] = useState(false);

  const canWriteBooking = permissions.includes('bookings:write');
  const canAssign = permissions.includes('bookings:assign');
  const canClaim = permissions.includes('bookings:claim');
  const canOverrideConfirm = permissions.includes('bookings:confirm_override');
  const canWriteChecklist = permissions.includes('checklist:write');
  const canVerifyPayment = permissions.includes('finance:verify_payment');
  const canSendEmail = permissions.includes('emails:send');
  const canExportCsv = permissions.includes('export:csv');
  const canDelete = permissions.includes('bookings:assign');

  const fees = siteConfig?.fees || site.fees;

  const staffMap = useMemo(
    () => new Map((staffDirectory || []).map((s) => [s.id, s])),
    [staffDirectory]
  );

  const filtered = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const list = inquiries.filter((item) => {
      if (queueFilter === 'unassigned' && item.assignedUserId) return false;
      if (queueFilter === 'mine' && item.assignedUserId !== currentUser?.id) return false;
      if (statusFilter !== 'all' && item.status !== statusFilter) return false;
      if (typeFilter !== 'all' && item.type !== typeFilter) return false;
      if (!q) return true;
      const haystack = [
        item.reference,
        item.fullName,
        item.email,
        item.phone,
        item.tourTitle,
        item.nationality,
        item.notes,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return haystack.includes(q);
    });

    const sorted = [...list];
    sorted.sort((a, b) => {
      if (sortBy === 'arrivalAsc') {
        return String(a.startDate || '9999').localeCompare(String(b.startDate || '9999'));
      }
      if (sortBy === 'valueDesc') {
        const av = a.quoteOverride?.finalQuotedUsd ?? a.estimatedAdultTotalUSD ?? 0;
        const bv = b.quoteOverride?.finalQuotedUsd ?? b.estimatedAdultTotalUSD ?? 0;
        return bv - av;
      }
      return String(b.receivedAt || '').localeCompare(String(a.receivedAt || ''));
    });
    return sorted;
  }, [currentUser?.id, inquiries, queueFilter, searchQuery, sortBy, statusFilter, typeFilter]);

  const selectedItem = useMemo(
    () => filtered.find((i) => i.reference === selectedRef) || filtered[0] || null,
    [filtered, selectedRef]
  );

  const selectedDraft = selectedItem ? draftEdits[selectedItem.reference] : null;
  const draftStatus = selectedDraft?.status ?? selectedItem?.status ?? 'new';
  const draftNotes = selectedDraft?.internalNotes ?? selectedItem?.internalNotes ?? '';
  const draftAssignee = selectedDraft?.assignedUserId ?? selectedItem?.assignedUserId ?? '';
  const draftQuoted =
    selectedDraft?.finalQuotedUsd !== undefined
      ? selectedDraft.finalQuotedUsd
      : selectedItem?.quoteOverride?.finalQuotedUsd !== null &&
          selectedItem?.quoteOverride?.finalQuotedUsd !== undefined
        ? String(selectedItem.quoteOverride.finalQuotedUsd)
        : '';
  const draftOverrideConfirm = Boolean(selectedDraft?.overrideConfirm);
  const draftOverrideReason = selectedDraft?.overrideReason ?? '';

  const updateSelectedDraft = (patch) => {
    if (!selectedItem) return;
    const ref = selectedItem.reference;
    setDraftEdits((prev) => ({
      ...prev,
      [ref]: {
        status: prev[ref]?.status ?? selectedItem.status ?? 'new',
        internalNotes: prev[ref]?.internalNotes ?? selectedItem.internalNotes ?? '',
        assignedUserId: prev[ref]?.assignedUserId ?? selectedItem.assignedUserId ?? '',
        finalQuotedUsd:
          prev[ref]?.finalQuotedUsd !== undefined
            ? prev[ref].finalQuotedUsd
            : selectedItem.quoteOverride?.finalQuotedUsd != null
              ? String(selectedItem.quoteOverride.finalQuotedUsd)
              : '',
        overrideConfirm: prev[ref]?.overrideConfirm ?? false,
        overrideReason: prev[ref]?.overrideReason ?? '',
        ...patch,
      },
    }));
  };

  const handleSaveMeta = async (e) => {
    e.preventDefault();
    if (!selectedItem || !canWriteBooking) return;
    setSavingMeta(true);
    try {
      const payload = {
        status: draftStatus,
        internalNotes: draftNotes,
        quoteOverride: {
          finalQuotedUsd: draftQuoted === '' ? null : Number(draftQuoted),
        },
      };
      if (canAssign) {
        payload.assignedUserId = draftAssignee;
      }
      const needsOverride =
        draftStatus === 'confirmed' &&
        selectedItem.status !== 'confirmed' &&
        !selectedItem.payment?.depositVerified;
      if (needsOverride && canOverrideConfirm && draftOverrideConfirm) {
        payload.overrideConfirm = true;
        payload.overrideReason = draftOverrideReason.trim();
      }
      const ok = await onSaveBooking(selectedItem.reference, payload);
      if (ok) {
        setDraftEdits((prev) => {
          const next = { ...prev };
          delete next[selectedItem.reference];
          return next;
        });
      }
    } finally {
      setSavingMeta(false);
    }
  };

  const handleClaim = async (ref) => {
    if (!onClaimBooking) return;
    setClaimingRef(ref);
    try {
      await onClaimBooking(ref);
    } finally {
      setClaimingRef('');
    }
  };

  const handleResend = async () => {
    if (!selectedItem || !canSendEmail) return;
    setResendingEmail(true);
    try {
      await onResendEmail(selectedItem.reference);
    } finally {
      setResendingEmail(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!confirmDeleteRef || !canDelete) return;
    setDeleting(true);
    try {
      const ok = await onDeleteBooking(confirmDeleteRef);
      if (ok) setConfirmDeleteRef('');
    } finally {
      setDeleting(false);
    }
  };

  const handleExportCsv = (rowsToExport) => {
    if (!canExportCsv) return;
    const headers = [
      'Reference',
      'Type',
      'Status',
      'Received (BTT)',
      'Full Name',
      'Email',
      'Phone',
      'Nationality',
      'DOB',
      'Tour',
      'Start Date',
      'End Date',
      'Travellers',
      'Est. Adult USD',
      'Final Quoted USD',
      'Deposit Paid USD',
      'Deposit Verified',
      'Visa/SDF Progress',
      'Email Status',
      'Assigned Staff',
      'Guest Notes',
      'Internal Notes',
    ];
    const rows = rowsToExport.map((r) => {
      const prog = getChecklistProgress(r.checklist);
      const staff = staffMap.get(r.assignedUserId);
      const bd = computeBhutanBreakdown(r, fees);
      return [
        r.reference,
        r.type,
        r.status,
        formatBttTime(r.receivedAt),
        r.fullName,
        r.email,
        r.phone || '',
        r.nationality || '',
        r.dob || '',
        r.tourTitle || '',
        r.startDate || r.dates || '',
        r.endDate || '',
        formatParty(r),
        r.estimatedAdultTotalUSD ?? '',
        r.quoteOverride?.finalQuotedUsd ?? '',
        bd.depositPaidUsd ?? '',
        r.payment?.depositVerified ? 'Yes' : 'No',
        `${prog.completed}/${prog.total}`,
        r.emailStatus || '',
        staff ? staff.name : 'Unassigned',
        r.notes || '',
        r.internalNotes || '',
      ];
    });
    const csv = [headers, ...rows].map((row) => row.map(csvCell).join(',')).join('\r\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `yuevaan-bookings-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const toggleBulkRef = (ref) => {
    setSelectedBulk((prev) =>
      prev.includes(ref) ? prev.filter((x) => x !== ref) : [...prev, ref]
    );
  };

  const handleBulkApply = async () => {
    if (selectedBulk.length === 0 || !canAssign) return;
    const ok = await onBulkStatus(selectedBulk, bulkStatusValue);
    if (ok) setSelectedBulk([]);
  };

  const breakdown = selectedItem ? computeBhutanBreakdown(selectedItem, fees) : null;
  const templates = selectedItem ? buildReplyTemplates(selectedItem, siteConfig) : [];
  const activeTemplate =
    templates.find((t) => t.id === selectedTemplateId) || templates[0] || null;

  const guestDigits = selectedItem ? String(selectedItem.phone || '').replace(/[^\d]/g, '') : '';
  const guestWaHref =
    selectedItem && guestDigits.length >= 7 && activeTemplate
      ? `https://wa.me/${guestDigits}?text=${encodeURIComponent(activeTemplate.body)}`
      : '';
  const guestGmailHref =
    selectedItem && activeTemplate
      ? `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(selectedItem.email)}&su=${encodeURIComponent(
          activeTemplate.subject
        )}&body=${encodeURIComponent(activeTemplate.body)}`
      : '';

  const renderInspector = () => {
    if (!selectedItem) {
      return (
        <div className={styles.emptyState}>
          Select a booking or inquiry to view Bhutan SDF breakdown, visa checklist, and follow-up templates.
        </div>
      );
    }

    const checklistProg = getChecklistProgress(selectedItem.checklist);
    const isVerified = Boolean(selectedItem.payment?.depositVerified);
    const assignedStaff = selectedItem.assignedUserId ? staffMap.get(selectedItem.assignedUserId) : null;
    const tryingUnverifiedConfirm =
      draftStatus === 'confirmed' && selectedItem.status !== 'confirmed' && !isVerified;

    return (
      <div className={styles.inspectorContent}>
        {!selectedItem.assignedUserId && canClaim ? (
          <div className={styles.claimBar}>
            <div>
              <strong>Unassigned Lead</strong>
              <span>Claim this request to lock it into your personal Reservations queue.</span>
            </div>
            <button
              type="button"
              disabled={claimingRef === selectedItem.reference}
              onClick={() => handleClaim(selectedItem.reference)}
              className={`btn btn-primary ${styles.miniActionBtn}`}
            >
              {claimingRef === selectedItem.reference ? 'Claiming…' : 'Claim to My Desk'}
            </button>
          </div>
        ) : null}

        <div className={styles.detailHeader}>
          <div className={styles.detailHeaderTop}>
            <div className={styles.badges}>
              <span className={styles.refCode}>{selectedItem.reference}</span>
              <span className={`${styles.badge} ${statusBadgeClass(selectedItem.status)}`}>
                {selectedItem.status}
              </span>
              {selectedItem.type === 'booking' ? (
                <span
                  className={`${styles.badge} ${
                    isVerified ? styles.badgeStatusConfirmed : styles.badgeStatusContacted
                  }`}
                >
                  {isVerified ? 'Deposit Verified ✓' : 'Awaiting Finance Deposit'}
                </span>
              ) : null}
              {selectedItem.type === 'booking' ? (
                <span className={`${styles.badge} ${styles.badgeBooking}`}>
                  Checklist {checklistProg.completed}/{checklistProg.total}
                </span>
              ) : null}
            </div>
            <div className={styles.inspectorIconActions}>
              <button
                type="button"
                onClick={() => window.print()}
                className={`btn btn-outline ${styles.miniActionBtn}`}
                title="Print or save booking quote as PDF"
              >
                <Icon name="printer" size={14} />
                <span>Print Quote</span>
              </button>
              {canDelete ? (
                <button
                  type="button"
                  onClick={() => setConfirmDeleteRef(selectedItem.reference)}
                  className={styles.dangerGhostBtn}
                  title="Permanently delete record (Privacy request)"
                >
                  <Icon name="trash" size={14} />
                </button>
              ) : null}
            </div>
          </div>

          <h2 className={styles.detailTitle}>
            {selectedItem.type === 'booking' ? selectedItem.tourTitle : 'General Travel Inquiry'}
          </h2>
          <div className={styles.detailSub}>
            Received {formatBttTime(selectedItem.receivedAt)} · Owner:{' '}
            {assignedStaff ? assignedStaff.name : 'Unassigned Queue'}
          </div>
        </div>

        {isVerified ? (
          <div className={`${styles.noticeBanner} ${styles.noticeSuccess}`}>
            <span>
              <strong>Finance Verified:</strong> Deposit of {formatUSD(breakdown?.depositPaidUsd || 0)} verified by{' '}
              {selectedItem.payment?.depositVerifiedBy || 'Finance'}
              {selectedItem.payment?.wireReference ? ` (Ref: ${selectedItem.payment.wireReference})` : ''}.
            </span>
          </div>
        ) : null}

        {selectedItem.confirmationOverride?.used ? (
          <div className={`${styles.noticeBanner} ${styles.noticeInfo}`}>
            <span>
              <strong>Manager Override Recorded:</strong> Confirmed by {selectedItem.confirmationOverride.actorName} — &ldquo;{selectedItem.confirmationOverride.reason}&rdquo;.
            </span>
          </div>
        ) : null}

        <div className={styles.detailGrid}>
          <div className={styles.detailField}>
            <span className={styles.detailLabel}>Lead Traveller</span>
            <span className={styles.detailVal}>{selectedItem.fullName}</span>
          </div>
          <div className={styles.detailField}>
            <span className={styles.detailLabel}>Email</span>
            <span className={styles.detailVal}>{selectedItem.email}</span>
          </div>
          <div className={styles.detailField}>
            <span className={styles.detailLabel}>Phone / WhatsApp</span>
            <span className={styles.detailVal}>{selectedItem.phone || 'Not provided'}</span>
          </div>
          <div className={styles.detailField}>
            <span className={styles.detailLabel}>Travellers</span>
            <span className={styles.detailVal}>{formatParty(selectedItem)}</span>
          </div>
          {selectedItem.type === 'booking' && breakdown ? (
            <>
              <div className={styles.detailField}>
                <span className={styles.detailLabel}>Travel Dates</span>
                <span className={styles.detailVal}>
                  {formatDisplayDate(selectedItem.startDate)} – {formatDisplayDate(selectedItem.endDate)} ({breakdown.days}D/{breakdown.nights}N)
                </span>
              </div>
              <div className={styles.detailField}>
                <span className={styles.detailLabel}>Nationality</span>
                <span className={styles.detailVal}>{selectedItem.nationality || '—'}</span>
              </div>
              <div className={styles.detailField}>
                <span className={styles.detailLabel}>Date of Birth</span>
                <span className={styles.detailVal}>{selectedItem.dob || '—'}</span>
              </div>
              <div className={styles.detailField}>
                <span className={styles.detailLabel}>Tariff Regime</span>
                <span className={styles.detailVal}>{breakdown.tariffLabel}</span>
              </div>
            </>
          ) : (
            <div className={styles.detailField}>
              <span className={styles.detailLabel}>Target Dates</span>
              <span className={styles.detailVal}>{selectedItem.dates || 'Flexible'}</span>
            </div>
          )}
        </div>

        <span className={styles.detailLabel}>Guest Message / Notes</span>
        <div className={styles.notesBox}>{selectedItem.notes || 'No additional notes provided.'}</div>

        {selectedItem.type === 'booking' && breakdown ? (
          <div className={styles.sdfCard}>
            <div className={styles.sdfCardHead}>
              <strong>Bhutan Cost &amp; SDF Breakdown</strong>
              <span className={styles.sdfTag}>
                {breakdown.tariff === 'indian' ? 'Regional Nu. Tariff' : 'International USD Tariff'}
              </span>
            </div>
            <div className={styles.sdfRows}>
              <div className={styles.sdfRow}>
                <span>Base Adult Package ({breakdown.adults} × package rate)</span>
                <strong>{formatUSD(breakdown.adultPackageUsd)}</strong>
              </div>
              <div className={styles.sdfRow}>
                <span>
                  Est. Bhutan SDF ({breakdown.nights}N · children {breakdown.childAgeRange} {breakdown.childDiscountPct}% off)
                </span>
                <strong>
                  {breakdown.tariff === 'indian'
                    ? `Nu. ${breakdown.sdfNu.toLocaleString('en-US')}`
                    : formatUSD(breakdown.sdfUsd)}
                </strong>
              </div>
              <div className={styles.sdfRow}>
                <span>
                  Bhutan Visa Processing (
                  {breakdown.tariff === 'indian' ? 'Entry Permit' : `${breakdown.totalTravellers} × $${fees.visaUsd}`})
                </span>
                <strong>{breakdown.tariff === 'indian' ? 'Permit' : formatUSD(breakdown.visaUsd)}</strong>
              </div>
              <div className={styles.sdfRow}>
                <span>Est. Agency Net (excl. govt. SDF &amp; visa)</span>
                <strong>{formatUSD(breakdown.estimatedAgencyNetUsd)}</strong>
              </div>
              <div className={`${styles.sdfRow} ${styles.sdfRowTotal}`}>
                <span>Quoted / Finance Deposit / Balance Due</span>
                <strong>
                  {formatUSD(breakdown.effectiveTotalUsd)} · Paid {formatUSD(breakdown.depositPaidUsd)} · Due{' '}
                  {formatUSD(breakdown.balanceDueUsd)}
                </strong>
              </div>
            </div>
            <p className={styles.sdfFootnote}>
              {breakdown.gstPct}% GST applies to {breakdown.gstAppliesTo}. SDF rate valid until {breakdown.sdfValidUntil}.
            </p>
          </div>
        ) : null}

        {selectedItem.type === 'booking' ? (
          <div className={styles.checklistCard}>
            <div className={styles.sdfCardHead}>
              <strong>Bhutan Visa, Permits &amp; SDF Checklist</strong>
              <span className={styles.sdfTag}>
                {checklistProg.completed}/{checklistProg.total} ({checklistProg.pct}%)
              </span>
            </div>
            <div className={styles.checklistGrid}>
              {CHECKLIST_STEPS.map((step) => {
                const checked = Boolean(selectedItem.checklist?.[step.key]);
                const inputId = `chk-${selectedItem.reference}-${step.key}`;
                const financeLocked = step.key === 'depositReceived' && !canVerifyPayment;
                return (
                  <label
                    key={step.key}
                    htmlFor={inputId}
                    className={styles.checklistItem}
                    title={financeLocked ? 'Verified by Finance under Payments & Deposits' : undefined}
                  >
                    <input
                      id={inputId}
                      type="checkbox"
                      checked={checked}
                      disabled={!canWriteChecklist || financeLocked}
                      onChange={() =>
                        onToggleChecklist(selectedItem.reference, {
                          [step.key]: !checked,
                        })
                      }
                    />
                    <span className={checked ? styles.checklistDoneText : ''}>
                      {step.label}
                      {financeLocked ? ' (Finance)' : ''}
                    </span>
                  </label>
                );
              })}
            </div>
          </div>
        ) : null}

        <div className={styles.emailStatusBox}>
          <div>
            <strong>Auto-Email:</strong>{' '}
            {selectedItem.emailStatus === 'sent'
              ? `Sent via ${String(selectedItem.emailProvider || '').toUpperCase()}${selectedItem.guestEmailSent ? ' (Admin + Guest)' : ' (Admin)'}`
              : selectedItem.emailStatus === 'failed'
                ? 'Delivery Failed'
                : 'Not sent (email not configured when submitted)'}
            {selectedItem.emailError ? (
              <span className={styles.emailErrorText}>{selectedItem.emailError}</span>
            ) : null}
          </div>
          {canSendEmail ? (
            <button
              type="button"
              onClick={handleResend}
              disabled={resendingEmail}
              className={`btn btn-outline ${styles.miniActionBtn}`}
            >
              {resendingEmail ? 'Sending…' : 'Resend Email'}
            </button>
          ) : null}
        </div>

        {canWriteBooking ? (
          <form onSubmit={handleSaveMeta} className={styles.workflowForm}>
            <div className={styles.workflowTwoCol}>
              <div>
                <label htmlFor="adminStatusSelect" className="rtb-field-label">
                  Booking Status
                </label>
                <select
                  id="adminStatusSelect"
                  value={draftStatus}
                  onChange={(e) => updateSelectedDraft({ status: e.target.value })}
                  className="rtb-select"
                >
                  {STATUS_OPTIONS.map((opt) => {
                    const lockedForRes =
                      opt.value === 'confirmed' &&
                      selectedItem.status !== 'confirmed' &&
                      !isVerified &&
                      !canOverrideConfirm;
                    return (
                      <option key={opt.value} value={opt.value} disabled={lockedForRes}>
                        {lockedForRes ? 'Confirmed (Requires Finance Verification)' : opt.label}
                      </option>
                    );
                  })}
                </select>
                {!isVerified && !canOverrideConfirm && selectedItem.status !== 'confirmed' ? (
                  <p className={styles.fieldHint}>
                    Finance must verify the deposit payment before Reservations can mark a trip Confirmed.
                  </p>
                ) : null}
              </div>

              {canAssign ? (
                <div>
                  <label htmlFor="adminAssigneeSelect" className="rtb-field-label">
                    Assigned Staff
                  </label>
                  <select
                    id="adminAssigneeSelect"
                    value={draftAssignee}
                    onChange={(e) => updateSelectedDraft({ assignedUserId: e.target.value })}
                    className="rtb-select"
                  >
                    <option value="">Unassigned Queue</option>
                    {(staffDirectory || []).map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name} ({s.roleLabel})
                      </option>
                    ))}
                  </select>
                </div>
              ) : (
                <div>
                  <span className="rtb-field-label">Assigned Owner</span>
                  <div className={styles.readOnlyField}>
                    {assignedStaff ? `${assignedStaff.name} (${assignedStaff.roleLabel})` : 'Unassigned Queue'}
                  </div>
                </div>
              )}
            </div>

            {tryingUnverifiedConfirm && canOverrideConfirm ? (
              <div className={styles.overrideBox}>
                <div className={styles.overrideHead}>
                  <Icon name="alertCircle" size={16} />
                  <strong>Audited Manager Confirmation Override</strong>
                </div>
                <p className={styles.overrideDesc}>
                  Finance has not yet verified the deposit for {selectedItem.reference}. To confirm early (e.g. VIP repeat guest or wire in transit), enable the override and record a reason for the immutable Audit Log.
                </p>
                <label htmlFor="mgrOverrideChk" className={styles.checklistItem}>
                  <input
                    id="mgrOverrideChk"
                    type="checkbox"
                    checked={draftOverrideConfirm}
                    onChange={(e) => updateSelectedDraft({ overrideConfirm: e.target.checked })}
                  />
                  <span>Enable Manager Confirmation Override</span>
                </label>
                {draftOverrideConfirm ? (
                  <div>
                    <label htmlFor="mgrOverrideReason" className="rtb-field-label">
                      Audit Reason (minimum 5 characters)
                    </label>
                    <input
                      id="mgrOverrideReason"
                      type="text"
                      required
                      minLength={5}
                      value={draftOverrideReason}
                      onChange={(e) => updateSelectedDraft({ overrideReason: e.target.value })}
                      placeholder="e.g. VIP repeat guest — Bank of Bhutan SWIFT receipt attached"
                      className="rtb-input"
                    />
                  </div>
                ) : null}
              </div>
            ) : null}

            {selectedItem.type === 'booking' ? (
              <div>
                <label htmlFor="adminQuotedUsd" className="rtb-field-label">
                  Final Quoted USD (optional override — deposits verified by Finance)
                </label>
                <input
                  id="adminQuotedUsd"
                  type="number"
                  min="0"
                  step="1"
                  value={draftQuoted}
                  onChange={(e) => updateSelectedDraft({ finalQuotedUsd: e.target.value })}
                  className="rtb-input"
                  placeholder={String(selectedItem.estimatedAdultTotalUSD || 0)}
                />
              </div>
            ) : null}

            <div>
              <label htmlFor="adminInternalNotes" className="rtb-field-label">
                Internal Desk Notes (private)
              </label>
              <textarea
                id="adminInternalNotes"
                rows={3}
                value={draftNotes}
                onChange={(e) => updateSelectedDraft({ internalNotes: e.target.value })}
                className="rtb-textarea"
                placeholder="Assigned guide, hotel tier preference, Drukair flight sector, wire status…"
              />
            </div>

            <div className={styles.workflowActions}>
              <button
                type="submit"
                disabled={savingMeta || (tryingUnverifiedConfirm && canOverrideConfirm && !draftOverrideConfirm)}
                className={`btn btn-primary ${styles.actionBtn}`}
              >
                {savingMeta ? 'Saving…' : 'Save Changes'}
              </button>
            </div>
          </form>
        ) : null}

        <div className={styles.replyBox}>
          <label htmlFor="replyTemplateSelect" className="rtb-field-label">
            1-Click Guest Reply Template
          </label>
          <select
            id="replyTemplateSelect"
            value={selectedTemplateId}
            onChange={(e) => setSelectedTemplateId(e.target.value)}
            className="rtb-select"
          >
            {templates.map((t) => (
              <option key={t.id} value={t.id}>
                {t.label}
              </option>
            ))}
          </select>

          <div className={styles.quickReplyRow}>
            <a
              href={guestGmailHref}
              target="_blank"
              rel="noopener noreferrer"
              className={`btn btn-outline-dark ${styles.actionBtn}`}
            >
              <Icon name="mail" size={16} />
              <span>Reply via Gmail ↗</span>
            </a>
            {guestWaHref ? (
              <a
                href={guestWaHref}
                target="_blank"
                rel="noopener noreferrer"
                className={`btn btn-whatsapp ${styles.actionBtn}`}
              >
                <Icon name="whatsapp" size={16} />
                <span>WhatsApp Guest</span>
              </a>
            ) : null}
          </div>
        </div>

        <div className={styles.timelineCard}>
          <span className={styles.detailLabel}>Activity Timeline</span>
          {Array.isArray(selectedItem.activity) && selectedItem.activity.length > 0 ? (
            <ul className={styles.timelineList}>
              {[...selectedItem.activity].reverse().slice(0, 8).map((ev) => (
                <li key={ev.id} className={styles.timelineItem}>
                  <span className={styles.timelineDot} />
                  <div>
                    <strong>{ev.actorName || 'System'}</strong> — {ev.message}
                    <div className={styles.timelineTime}>{formatBttTime(ev.at)}</div>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className={styles.timelineEmpty}>
              Logged on {formatBttTime(selectedItem.receivedAt)}. Status, deposit &amp; checklist changes will appear here.
            </p>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className={styles.viewStack}>
      <div className={styles.viewHead}>
        <div>
          <span className={styles.eyebrow}>
            {canAssign ? 'ALL RESERVATIONS & INQUIRIES' : 'SHARED & PERSONAL QUEUE'}
          </span>
          <h1 className={styles.pageTitle}>
            {canAssign ? 'All Bookings & Queue' : 'Bookings Queue'}
          </h1>
        </div>
        <div className={styles.topActions}>
          <div className={styles.viewToggle} role="tablist" aria-label="Booking view layout">
            <button
              type="button"
              role="tab"
              aria-selected={viewMode === 'split'}
              onClick={() => setViewMode('split')}
              className={`${styles.viewToggleBtn}${viewMode === 'split' ? ` ${styles.viewToggleBtnActive}` : ''}`}
            >
              <Icon name="inbox" size={15} />
              <span>Split</span>
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={viewMode === 'table'}
              onClick={() => setViewMode('table')}
              className={`${styles.viewToggleBtn}${viewMode === 'table' ? ` ${styles.viewToggleBtnActive}` : ''}`}
            >
              <Icon name="table" size={15} />
              <span>Table</span>
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={viewMode === 'kanban'}
              onClick={() => setViewMode('kanban')}
              className={`${styles.viewToggleBtn}${viewMode === 'kanban' ? ` ${styles.viewToggleBtnActive}` : ''}`}
            >
              <Icon name="kanban" size={15} />
              <span>Kanban</span>
            </button>
          </div>

          {canExportCsv ? (
            <button
              type="button"
              onClick={() => handleExportCsv(filtered)}
              disabled={filtered.length === 0}
              className={`btn btn-outline ${styles.actionBtn}`}
            >
              <Icon name="download" size={15} />
              <span>Export CSV</span>
            </button>
          ) : null}

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
        <div className={styles.filterGroup} role="group" aria-label="Filter by assignment">
          {[
            { value: 'all', label: 'All Visible' },
            { value: 'unassigned', label: 'Unassigned' },
            { value: 'mine', label: 'My Bookings' },
          ].map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => setQueueFilter(opt.value)}
              className={`${styles.pillBtn}${queueFilter === opt.value ? ` ${styles.pillBtnActive}` : ''}`}
            >
              {opt.label}
            </button>
          ))}
        </div>

        <div className={styles.filterGroup} role="group" aria-label="Filter by status">
          {[{ value: 'all', label: 'All' }, ...STATUS_OPTIONS].map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => setStatusFilter(opt.value)}
              className={`${styles.pillBtn}${statusFilter === opt.value ? ` ${styles.pillBtnActive}` : ''}`}
            >
              {opt.label}
            </button>
          ))}
        </div>

        <div className={styles.filterGroup} role="group" aria-label="Filter by request type">
          {[
            { value: 'all', label: 'All Types' },
            { value: 'booking', label: 'Bookings' },
            { value: 'inquiry', label: 'Inquiries' },
          ].map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => setTypeFilter(opt.value)}
              className={`${styles.pillBtn}${typeFilter === opt.value ? ` ${styles.pillBtnActive}` : ''}`}
            >
              {opt.label}
            </button>
          ))}
        </div>

        <div className={styles.filterRight}>
          <select
            aria-label="Sort bookings"
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className={`rtb-select ${styles.sortSelect}`}
          >
            <option value="receivedDesc">Newest First</option>
            <option value="arrivalAsc">Earliest Arrival</option>
            <option value="valueDesc">Highest USD Value</option>
          </select>

          <input
            type="search"
            aria-label="Search bookings"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search ref, name, email, tour…"
            className={`rtb-input ${styles.searchInput}`}
          />
        </div>
      </div>

      {viewMode === 'table' ? (
        <div className={styles.panelCard}>
          {selectedBulk.length > 0 && canAssign ? (
            <div className={styles.bulkBar}>
              <strong>{selectedBulk.length} selected</strong>
              <select
                aria-label="Bulk status target"
                value={bulkStatusValue}
                onChange={(e) => setBulkStatusValue(e.target.value)}
                className={`rtb-select ${styles.sortSelect}`}
              >
                {STATUS_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    Set status: {o.label}
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={handleBulkApply}
                className={`btn btn-primary ${styles.miniActionBtn}`}
              >
                Apply
              </button>
              {canExportCsv ? (
                <button
                  type="button"
                  onClick={() =>
                    handleExportCsv(filtered.filter((i) => selectedBulk.includes(i.reference)))
                  }
                  className={`btn btn-outline ${styles.miniActionBtn}`}
                >
                  Export Selected
                </button>
              ) : null}
              <button
                type="button"
                onClick={() => setSelectedBulk([])}
                className={styles.tableLinkBtn}
              >
                Clear
              </button>
            </div>
          ) : null}

          {filtered.length === 0 ? (
            <div className={styles.emptyState}>No bookings match your current filters.</div>
          ) : (
            <div className={styles.tableScroll}>
              <table className={styles.dataTable}>
                <thead>
                  <tr>
                    {canAssign ? (
                      <th className={styles.checkCol}>
                        <input
                          type="checkbox"
                          aria-label="Select all visible bookings"
                          checked={filtered.length > 0 && selectedBulk.length === filtered.length}
                          onChange={(e) =>
                            setSelectedBulk(e.target.checked ? filtered.map((i) => i.reference) : [])
                          }
                        />
                      </th>
                    ) : null}
                    <th>Reference</th>
                    <th>Traveller</th>
                    <th>Tour / Type</th>
                    <th>Arrival</th>
                    <th>Est. USD</th>
                    <th>Deposit</th>
                    <th>Status</th>
                    <th>Owner</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((item) => {
                    const estUsd = item.quoteOverride?.finalQuotedUsd ?? item.estimatedAdultTotalUSD;
                    const staff = staffMap.get(item.assignedUserId);
                    return (
                      <tr
                        key={item.reference}
                        className={selectedItem?.reference === item.reference ? styles.tableRowActive : ''}
                      >
                        {canAssign ? (
                          <td className={styles.checkCol}>
                            <input
                              type="checkbox"
                              aria-label={`Select ${item.reference}`}
                              checked={selectedBulk.includes(item.reference)}
                              onChange={() => toggleBulkRef(item.reference)}
                            />
                          </td>
                        ) : null}
                        <td>
                          <button
                            type="button"
                            onClick={() => {
                              onSelectRef(item.reference);
                              setViewMode('split');
                            }}
                            className={styles.tableLinkBtn}
                          >
                            <span className={styles.refCode}>{item.reference}</span>
                          </button>
                        </td>
                        <td>
                          <div className={styles.cellPrimary}>{item.fullName}</div>
                          <div className={styles.cellSub}>{item.email}</div>
                        </td>
                        <td>
                          <div className={styles.cellPrimary}>
                            {item.type === 'booking' ? item.tourTitle : 'General Inquiry'}
                          </div>
                          <div className={styles.cellSub}>{formatParty(item)}</div>
                        </td>
                        <td>{item.startDate ? formatDisplayDate(item.startDate) : item.dates || 'Flexible'}</td>
                        <td>{Number.isFinite(estUsd) ? formatUSD(estUsd) : '—'}</td>
                        <td>
                          {item.type === 'booking' ? (
                            <span
                              className={`${styles.badge} ${
                                item.payment?.depositVerified
                                  ? styles.badgeStatusConfirmed
                                  : styles.badgeStatusContacted
                              }`}
                            >
                              {item.payment?.depositVerified ? 'Verified ✓' : 'Pending'}
                            </span>
                          ) : (
                            '—'
                          )}
                        </td>
                        <td>
                          <span className={`${styles.badge} ${statusBadgeClass(item.status)}`}>
                            {item.status}
                          </span>
                        </td>
                        <td>{staff ? staff.name : 'Unassigned'}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      ) : null}

      {viewMode === 'kanban' ? (
        <div className={styles.kanbanGrid}>
          {KANBAN_COLS.map((colKey) => {
            const colItems = filtered.filter((i) => i.status === colKey);
            const colMeta = STATUS_OPTIONS.find((o) => o.value === colKey);
            return (
              <div key={colKey} className={styles.kanbanCol}>
                <div className={styles.kanbanColHead}>
                  <strong>{colMeta?.label}</strong>
                  <span className={styles.countChip}>{colItems.length}</span>
                </div>
                <div className={styles.kanbanCards}>
                  {colItems.length === 0 ? (
                    <div className={styles.kanbanEmpty}>No items</div>
                  ) : (
                    colItems.map((item) => {
                      const prog = getChecklistProgress(item.checklist);
                      const estUsd = item.quoteOverride?.finalQuotedUsd ?? item.estimatedAdultTotalUSD;
                      return (
                        <button
                          key={item.reference}
                          type="button"
                          onClick={() => {
                            onSelectRef(item.reference);
                            setViewMode('split');
                          }}
                          className={styles.kanbanCard}
                        >
                          <div className={styles.rowTop}>
                            <span className={styles.refCode}>{item.reference}</span>
                            {Number.isFinite(estUsd) ? (
                              <span className={styles.rowPrice}>{formatUSD(estUsd)}</span>
                            ) : null}
                          </div>
                          <div className={styles.rowTitle}>{item.fullName}</div>
                          <div className={styles.cellSub}>
                            {item.type === 'booking' ? item.tourTitle : 'General Inquiry'}
                          </div>
                          <div className={styles.rowMeta}>
                            <span>{item.startDate ? formatDisplayDate(item.startDate) : 'Flexible'}</span>
                            {item.type === 'booking' ? (
                              <span>
                                {item.payment?.depositVerified ? 'Dep ✓' : 'Dep …'} · {prog.completed}/{prog.total}
                              </span>
                            ) : null}
                          </div>
                        </button>
                      );
                    })
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : null}

      {viewMode === 'split' ? (
        <div className={styles.workspace}>
          <div className={styles.listPane}>
            {filtered.length === 0 ? (
              <div className={styles.emptyState}>
                <strong>No matching requests yet.</strong>
                <p>
                  {inquiries.length === 0
                    ? 'Submit a booking on /plan-my-trip or /contact to see it appear here immediately.'
                    : 'Try clearing your search or status filter.'}
                </p>
              </div>
            ) : (
              filtered.map((item) => {
                const isSelected = selectedItem?.reference === item.reference;
                const estUsd = item.quoteOverride?.finalQuotedUsd ?? item.estimatedAdultTotalUSD;
                const owner = item.assignedUserId ? staffMap.get(item.assignedUserId) : null;
                return (
                  <button
                    key={item.reference}
                    type="button"
                    onClick={() => onSelectRef(item.reference)}
                    className={`${styles.rowBtn}${isSelected ? ` ${styles.rowBtnSelected}` : ''}`}
                  >
                    <div className={styles.rowTop}>
                      <span className={styles.refCode}>{item.reference}</span>
                      <div className={styles.badges}>
                        {!item.assignedUserId ? (
                          <span className={`${styles.badge} ${styles.badgeStatusNew}`}>Unassigned</span>
                        ) : null}
                        <span className={`${styles.badge} ${statusBadgeClass(item.status)}`}>
                          {item.status}
                        </span>
                        {item.type === 'booking' ? (
                          <span
                            className={`${styles.badge} ${
                              item.payment?.depositVerified
                                ? styles.badgeStatusConfirmed
                                : styles.badgeEmailOff
                            }`}
                          >
                            {item.payment?.depositVerified ? 'Deposit ✓' : 'No Deposit'}
                          </span>
                        ) : null}
                      </div>
                    </div>
                    <div className={styles.rowTitle}>
                      {item.fullName} — {item.type === 'booking' ? item.tourTitle : 'General Travel Inquiry'}
                    </div>
                    <div className={styles.rowMeta}>
                      <span>
                        {item.type === 'booking'
                          ? `${formatDisplayDate(item.startDate)} · ${owner ? owner.name : 'Unassigned'}`
                          : `${item.dates || 'Flexible dates'} · ${owner ? owner.name : 'Unassigned'}`}
                      </span>
                      <span className={styles.rowPrice}>
                        {item.type === 'booking' && Number.isFinite(estUsd)
                          ? formatUSD(estUsd)
                          : formatBttTime(item.receivedAt)}
                      </span>
                    </div>
                  </button>
                );
              })
            )}
          </div>

          <aside className={styles.detailPane} aria-label="Selected Booking Details">
            {renderInspector()}
          </aside>
        </div>
      ) : null}

      {localFallbackItems.length > 0 ? (
        <div className={styles.localBox}>
          <h2 className={styles.localTitle}>
            Unsynced Browser Preview Bookings ({localFallbackItems.length})
          </h2>
          <p className={styles.localDesc}>
            These test bookings were saved in your browser while running <span className={styles.codeInline}>npm run dev</span>{' '}
            before <span className={styles.codeInline}>server.js</span> was connected. Click Sync to log them into the server:
          </p>
          <div className={styles.listPane}>
            {localFallbackItems.map((item) => (
              <div key={item.reference} className={styles.emailStatusBox}>
                <div>
                  <span className={styles.refCode}>{item.reference}</span> — <strong>{item.fullName}</strong> ({item.email})
                </div>
                <button
                  type="button"
                  onClick={() => onSyncLocal(item)}
                  className={`btn btn-primary ${styles.miniActionBtn}`}
                >
                  Sync to Server
                </button>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      {confirmDeleteRef ? (
        <div className={styles.modalBackdrop} role="dialog" aria-modal="true" aria-labelledby="deleteModalTitle">
          <div className={styles.modalCard}>
            <h2 id="deleteModalTitle" className={styles.modalTitle}>
              Permanently Delete {confirmDeleteRef}?
            </h2>
            <p className={styles.modalText}>
              This removes the traveller&apos;s personal data and metadata from server storage (for Privacy Policy deletion requests). This action cannot be undone and is recorded in the Audit Log.
            </p>
            <div className={styles.modalActions}>
              <button
                type="button"
                onClick={() => setConfirmDeleteRef('')}
                className={`btn btn-outline ${styles.actionBtn}`}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                disabled={deleting}
                className={styles.dangerSolidBtn}
              >
                {deleting ? 'Deleting…' : 'Delete Permanently'}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
