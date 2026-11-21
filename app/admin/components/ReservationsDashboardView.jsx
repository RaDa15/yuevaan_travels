'use client';

import { useMemo, useState } from 'react';
import Icon from '@/components/icons';
import { formatDisplayDate, formatUSD } from '@/lib/format';
import { computeBhutanBreakdown, getChecklistProgress } from '@/lib/admin-analytics';
import styles from '../Admin.module.css';

export default function ReservationsDashboardView({
  currentUser,
  inquiries,
  alerts,
  siteConfig,
  onClaimBooking,
  onSelectBooking,
  onNavigate,
  onRefresh,
  loading,
}) {
  const [claimingRef, setClaimingRef] = useState('');

  const unassignedQueue = useMemo(
    () =>
      inquiries
        .filter((i) => !i.assignedUserId && i.status !== 'archived')
        .sort((a, b) => String(a.receivedAt || '').localeCompare(String(b.receivedAt || ''))),
    [inquiries]
  );

  const myQueue = useMemo(
    () =>
      inquiries
        .filter((i) => i.assignedUserId === currentUser?.id && i.status !== 'archived')
        .sort((a, b) => String(b.receivedAt || '').localeCompare(String(a.receivedAt || ''))),
    [currentUser?.id, inquiries]
  );

  const readyToConfirm = useMemo(
    () =>
      myQueue.filter(
        (i) => i.type === 'booking' && i.status !== 'confirmed' && Boolean(i.payment?.depositVerified)
      ),
    [myQueue]
  );

  const myUpcoming = useMemo(
    () =>
      myQueue
        .filter((i) => i.type === 'booking' && i.startDate)
        .sort((a, b) => String(a.startDate).localeCompare(String(b.startDate)))
        .slice(0, 6),
    [myQueue]
  );

  const handleClaim = async (ref) => {
    setClaimingRef(ref);
    try {
      await onClaimBooking(ref);
    } finally {
      setClaimingRef('');
    }
  };

  return (
    <div className={styles.viewStack}>
      <div className={styles.viewHead}>
        <div>
          <span className={styles.eyebrow}>RESERVATIONS DESK · {currentUser?.name}</span>
          <h1 className={styles.pageTitle}>My Desk</h1>
        </div>
        <div className={styles.topActions}>
          <button
            type="button"
            onClick={() => onNavigate('bookings')}
            className={`btn btn-primary ${styles.actionBtn}`}
          >
            <Icon name="inbox" size={15} />
            <span>Open Bookings Queue</span>
          </button>
          <button
            type="button"
            onClick={() => onNavigate('operations')}
            className={`btn btn-outline ${styles.actionBtn}`}
          >
            <Icon name="fileCheck" size={15} />
            <span>Visa &amp; Permits</span>
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

      <section className={styles.kpiGridFour} aria-label="My Desk Summary">
        <div className={styles.kpiCard}>
          <div className={styles.kpiTopRow}>
            <span className={styles.kpiLabel}>Unassigned Queue</span>
            <span
              className={`${styles.deltaPill} ${
                unassignedQueue.length > 0 ? styles.deltaWarn : styles.deltaUp
              }`}
            >
              {unassignedQueue.length > 0 ? 'Claim now' : 'Empty'}
            </span>
          </div>
          <span className={`${styles.kpiVal} ${unassignedQueue.length > 0 ? styles.kpiValAccent : ''}`}>
            {unassignedQueue.length}
          </span>
          <span className={styles.kpiSub}>Shared leads ready to claim</span>
        </div>

        <div className={styles.kpiCard}>
          <span className={styles.kpiLabel}>My Active Leads</span>
          <span className={styles.kpiVal}>{myQueue.length}</span>
          <span className={styles.kpiSub}>
            {myQueue.filter((i) => i.status === 'confirmed').length} confirmed trips
          </span>
        </div>

        <div className={styles.kpiCard}>
          <div className={styles.kpiTopRow}>
            <span className={styles.kpiLabel}>Ready to Confirm</span>
            <span
              className={`${styles.deltaPill} ${
                readyToConfirm.length > 0 ? styles.deltaUp : styles.deltaDown
              }`}
            >
              Deposit Verified
            </span>
          </div>
          <span className={styles.kpiVal}>{readyToConfirm.length}</span>
          <span className={styles.kpiSub}>Finance verified — unlock Confirmed</span>
        </div>

        <div className={styles.kpiCard}>
          <span className={styles.kpiLabel}>My Upcoming Trips</span>
          <span className={styles.kpiVal}>{myUpcoming.length}</span>
          <span className={styles.kpiSub}>Track passport, visa &amp; guide steps</span>
        </div>
      </section>

      <section className={styles.actionWidgetsGrid} aria-label="Unassigned Leads and Active Queue">
        <div className={styles.panelCard}>
          <div className={styles.panelHead}>
            <div>
              <h2 className={styles.panelTitle}>Unassigned Queue ({unassignedQueue.length})</h2>
              <p className={styles.panelSub}>
                Claim incoming enquiries to move them into your personal Reservations queue
              </p>
            </div>
          </div>

          {unassignedQueue.length === 0 ? (
            <div className={styles.cleanState}>
              <Icon name="shieldCheck" size={18} />
              <span>No unassigned requests waiting right now.</span>
            </div>
          ) : (
            <div className={styles.queueList}>
              {unassignedQueue.map((item) => {
                const bd = computeBhutanBreakdown(item, siteConfig?.fees);
                return (
                  <div key={item.reference} className={styles.queueRowCard}>
                    <div className={styles.queueRowInfo}>
                      <div className={styles.badges}>
                        <span className={styles.refCode}>{item.reference}</span>
                        <span className={`${styles.badge} ${styles.badgeBooking}`}>{item.type}</span>
                        {item.type === 'booking' && bd.effectiveTotalUsd > 0 ? (
                          <span className={styles.rowPrice}>{formatUSD(bd.effectiveTotalUsd)}</span>
                        ) : null}
                      </div>
                      <strong className={styles.queueGuestName}>
                        {item.fullName} — {item.type === 'booking' ? item.tourTitle : 'General Travel Inquiry'}
                      </strong>
                      <span className={styles.cellSub}>
                        {item.startDate ? formatDisplayDate(item.startDate) : item.dates || 'Flexible'}
                        {item.nationality ? ` · ${item.nationality}` : ''}
                      </span>
                    </div>
                    <div className={styles.queueRowActions}>
                      <button
                        type="button"
                        disabled={claimingRef === item.reference}
                        onClick={() => handleClaim(item.reference)}
                        className={`btn btn-primary ${styles.miniActionBtn}`}
                      >
                        {claimingRef === item.reference ? 'Claiming…' : 'Claim Lead'}
                      </button>
                      <button
                        type="button"
                        onClick={() => onSelectBooking(item.reference)}
                        className={`btn btn-outline ${styles.miniActionBtn}`}
                      >
                        Open
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className={styles.panelCard}>
          <div className={styles.panelHead}>
            <div>
              <h2 className={styles.panelTitle}>My Active Queue ({myQueue.length})</h2>
              <p className={styles.panelSub}>
                Trips move to Confirmed as soon as Finance verifies the guest deposit
              </p>
            </div>
          </div>

          {myQueue.length === 0 ? (
            <div className={styles.cleanState}>
              <Icon name="inbox" size={18} />
              <span>Claim a lead from the Unassigned Queue to begin crafting a quote.</span>
            </div>
          ) : (
            <div className={styles.queueList}>
              {myQueue.slice(0, 10).map((item) => {
                const prog = getChecklistProgress(item.checklist);
                const verified = Boolean(item.payment?.depositVerified);
                return (
                  <div key={item.reference} className={styles.queueRowCard}>
                    <div className={styles.queueRowInfo}>
                      <div className={styles.badges}>
                        <span className={styles.refCode}>{item.reference}</span>
                        <span
                          className={`${styles.badge} ${
                            item.status === 'confirmed'
                              ? styles.badgeStatusConfirmed
                              : item.status === 'quoted'
                                ? styles.badgeStatusQuoted
                                : styles.badgeStatusNew
                          }`}
                        >
                          {item.status}
                        </span>
                        {item.type === 'booking' && item.status !== 'confirmed' ? (
                          <span
                            className={`${styles.badge} ${
                              verified ? styles.badgeStatusConfirmed : styles.badgeStatusContacted
                            }`}
                          >
                            {verified ? 'Deposit Verified ✓ — Ready to Confirm' : 'Awaiting Finance Deposit'}
                          </span>
                        ) : null}
                      </div>
                      <strong className={styles.queueGuestName}>
                        {item.fullName} — {item.type === 'booking' ? item.tourTitle : 'General Inquiry'}
                      </strong>
                      <span className={styles.cellSub}>
                        {item.startDate ? formatDisplayDate(item.startDate) : item.dates || 'Flexible'}
                        {item.type === 'booking' ? ` · Checklist ${prog.completed}/${prog.total}` : ''}
                      </span>
                    </div>
                    <div className={styles.queueRowActions}>
                      <button
                        type="button"
                        onClick={() => onSelectBooking(item.reference)}
                        className={`btn btn-outline ${styles.miniActionBtn}`}
                      >
                        Work Lead →
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </section>

      {alerts.length > 0 ? (
        <section className={styles.panelCard} aria-label="My Queue Alerts">
          <div className={styles.panelHead}>
            <div>
              <h2 className={styles.panelTitle}>Action Alerts ({alerts.length})</h2>
              <p className={styles.panelSub}>Upcoming arrivals, SLA countdowns &amp; visa follow-ups</p>
            </div>
          </div>
          <ul className={styles.alertList}>
            {alerts.slice(0, 5).map((a) => (
              <li key={a.id} className={styles.alertRow}>
                <span
                  className={`${styles.alertDot} ${
                    a.severity === 'critical' ? styles.dotDanger : styles.dotWarning
                  }`}
                />
                <div className={styles.alertCopy}>
                  <strong>{a.title}</strong>
                  <span>{a.detail}</span>
                </div>
                <button
                  type="button"
                  onClick={() => onSelectBooking(a.reference)}
                  className={`btn btn-outline ${styles.miniActionBtn}`}
                >
                  Open
                </button>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}
