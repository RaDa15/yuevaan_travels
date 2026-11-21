'use client';

import { useMemo, useState } from 'react';
import { formatDisplayDate, formatUSD } from '@/lib/format';
import { site } from '@/data/site';
import {
  CHECKLIST_STEPS,
  computeBhutanBreakdown,
  getChecklistProgress,
} from '@/lib/admin-analytics';
import styles from '../Admin.module.css';

export default function OperationsChecklistView({
  inquiries,
  permissions,
  siteConfig = site,
  onToggleChecklist,
  onOpenBooking,
}) {
  const [filterMode, setFilterMode] = useState('active'); // 'active' | 'incomplete' | 'ready'
  const canEdit = permissions.includes('checklist:write');
  const canVerifyPayment = permissions.includes('finance:verify_payment');
  const fees = siteConfig?.fees || site.fees;

  const bookings = useMemo(() => {
    return inquiries
      .filter((item) => item.type === 'booking' && item.status !== 'archived')
      .filter((item) => {
        const prog = getChecklistProgress(item.checklist);
        if (filterMode === 'incomplete') return prog.completed < prog.total;
        if (filterMode === 'ready') return prog.completed === prog.total;
        return true;
      })
      .sort((a, b) => String(a.startDate || '9999').localeCompare(String(b.startDate || '9999')));
  }, [filterMode, inquiries]);

  return (
    <div className={styles.viewStack}>
      <div className={styles.viewHead}>
        <div>
          <span className={styles.eyebrow}>BHUTAN OPERATIONS</span>
          <h1 className={styles.pageTitle}>Visa, Permits &amp; SDF Tracker</h1>
        </div>
        <div className={styles.filterGroup} role="group" aria-label="Filter readiness">
          {[
            { value: 'active', label: 'All Active Trips' },
            { value: 'incomplete', label: 'Pending Steps' },
            { value: 'ready', label: '100% Ready' },
          ].map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => setFilterMode(opt.value)}
              className={`${styles.pillBtn}${filterMode === opt.value ? ` ${styles.pillBtnActive}` : ''}`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      <div className={styles.panelCard}>
        {bookings.length === 0 ? (
          <div className={styles.emptyState}>
            No matching active tour bookings found for this filter.
          </div>
        ) : (
          <div className={styles.tableScroll}>
            <table className={styles.dataTable}>
              <thead>
                <tr>
                  <th>Arrival &amp; Ref</th>
                  <th>Guest &amp; Tour</th>
                  <th>SDF &amp; Tariff</th>
                  {CHECKLIST_STEPS.map((s) => (
                    <th key={s.key} className={styles.checkCol}>
                      {s.shortLabel}
                    </th>
                  ))}
                  <th>Ready</th>
                </tr>
              </thead>
              <tbody>
                {bookings.map((item) => {
                  const breakdown = computeBhutanBreakdown(item, fees);
                  const prog = getChecklistProgress(item.checklist);
                  return (
                    <tr key={item.reference}>
                      <td>
                        <div className={styles.cellPrimary}>{formatDisplayDate(item.startDate)}</div>
                        <button
                          type="button"
                          onClick={() => onOpenBooking(item.reference)}
                          className={styles.tableLinkBtn}
                        >
                          <span className={styles.refCode}>{item.reference}</span>
                        </button>
                      </td>
                      <td>
                        <div className={styles.cellPrimary}>{item.fullName}</div>
                        <div className={styles.cellSub}>
                          {item.tourTitle} · {breakdown.totalTravellers} pax
                        </div>
                      </td>
                      <td>
                        <div className={styles.cellPrimary}>
                          {breakdown.tariff === 'indian'
                            ? `Nu. ${breakdown.sdfNu.toLocaleString('en-US')}`
                            : formatUSD(breakdown.sdfUsd)}
                        </div>
                        <div className={styles.cellSub}>
                          {breakdown.tariff === 'indian' ? 'India Permit' : `Visa ${formatUSD(breakdown.visaUsd)}`}
                        </div>
                      </td>
                      {CHECKLIST_STEPS.map((step) => {
                        const checked = Boolean(item.checklist?.[step.key]);
                        const financeLocked = step.key === 'depositReceived' && !canVerifyPayment;
                        return (
                          <td key={step.key} className={styles.checkCol}>
                            <input
                              type="checkbox"
                              aria-label={`${step.label} for ${item.reference}`}
                              title={financeLocked ? 'Verified by Finance in Payments & Deposits' : step.label}
                              checked={checked}
                              disabled={!canEdit || financeLocked}
                              onChange={() =>
                                onToggleChecklist(item.reference, { [step.key]: !checked })
                              }
                            />
                          </td>
                        );
                      })}
                      <td>
                        <span
                          className={`${styles.badge} ${
                            prog.completed === prog.total
                              ? styles.badgeStatusConfirmed
                              : styles.badgeStatusQuoted
                          }`}
                        >
                          {prog.completed}/{prog.total}
                        </span>
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
