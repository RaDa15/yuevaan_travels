'use client';

import { useMemo, useState } from 'react';
import Icon from '@/components/icons';
import { formatDisplayDate, formatUSD } from '@/lib/format';
import {
  computeDashboardAnalytics,
  computeTeamPerformance,
  getChecklistProgress,
} from '@/lib/admin-analytics';
import { FunnelBarChart, MonthlyDeparturesChart } from './PortalCharts';
import styles from '../Admin.module.css';

function formatHours(hrs) {
  if (hrs === null || hrs === undefined || !Number.isFinite(hrs)) return '—';
  if (hrs < 1) return `${Math.max(1, Math.round(hrs * 60))}m`;
  return `${hrs.toFixed(1)}h`;
}

export default function ManagerDashboardView({
  inquiries,
  staffDirectory,
  alerts,
  siteConfig,
  onAssignBooking,
  onSelectBooking,
  onNavigate,
  onRefresh,
  loading,
}) {
  const [assigningRef, setAssigningRef] = useState('');

  const analytics = useMemo(
    () => computeDashboardAnalytics(inquiries, 30, new Date(), siteConfig?.fees),
    [inquiries, siteConfig]
  );
  const team = useMemo(
    () => computeTeamPerformance(inquiries, staffDirectory),
    [inquiries, staffDirectory]
  );

  const assignableStaff = useMemo(
    () => (staffDirectory || []).filter((s) => s.role === 'reservation' || s.role === 'manager'),
    [staffDirectory]
  );

  const unassignedQueue = useMemo(
    () =>
      inquiries
        .filter((i) => !i.assignedUserId && i.status !== 'archived')
        .sort((a, b) => String(a.receivedAt || '').localeCompare(String(b.receivedAt || ''))),
    [inquiries]
  );

  const pendingOpsCount = useMemo(
    () =>
      inquiries.filter((i) => {
        if (i.type !== 'booking' || i.status === 'archived') return false;
        const p = getChecklistProgress(i.checklist);
        return p.completed < p.total;
      }).length,
    [inquiries]
  );

  const handleQuickAssign = async (ref, userId) => {
    if (!userId) return;
    setAssigningRef(ref);
    try {
      await onAssignBooking(ref, userId);
    } finally {
      setAssigningRef('');
    }
  };

  const { kpis } = analytics;
  const slaHours = siteConfig?.slaHours || 24;

  return (
    <div className={styles.viewStack}>
      <div className={styles.viewHead}>
        <div>
          <span className={styles.eyebrow}>DESK MANAGER OPERATIONS</span>
          <h1 className={styles.pageTitle}>Manager Overview</h1>
        </div>
        <div className={styles.topActions}>
          <button
            type="button"
            onClick={() => onNavigate('bookings')}
            className={`btn btn-primary ${styles.actionBtn}`}
          >
            <Icon name="inbox" size={15} />
            <span>All Bookings Queue</span>
          </button>
          <button
            type="button"
            onClick={() => onNavigate('operations')}
            className={`btn btn-outline ${styles.actionBtn}`}
          >
            <Icon name="fileCheck" size={15} />
            <span>Visa &amp; SDF Matrix</span>
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

      <section className={styles.kpiGridFive} aria-label="Manager Operational KPIs">
        <div className={styles.kpiCard}>
          <div className={styles.kpiTopRow}>
            <span className={styles.kpiLabel}>Unassigned Queue</span>
            <span
              className={`${styles.deltaPill} ${
                unassignedQueue.length > 0 ? styles.deltaWarn : styles.deltaUp
              }`}
            >
              {unassignedQueue.length > 0 ? 'Needs routing' : 'Clear'}
            </span>
          </div>
          <span className={`${styles.kpiVal} ${unassignedQueue.length > 0 ? styles.kpiValAccent : ''}`}>
            {unassignedQueue.length}
          </span>
          <span className={styles.kpiSub}>Assign to Reservations staff below</span>
        </div>

        <div className={styles.kpiCard}>
          <div className={styles.kpiTopRow}>
            <span className={styles.kpiLabel}>Awaiting Reply</span>
            {kpis.slaOverdueCount > 0 ? (
              <span className={`${styles.deltaPill} ${styles.deltaCrit}`}>
                {kpis.slaOverdueCount} &gt;{slaHours}h SLA
              </span>
            ) : (
              <span className={`${styles.deltaPill} ${styles.deltaUp}`}>On SLA</span>
            )}
          </div>
          <span className={styles.kpiVal}>{kpis.awaitingReply}</span>
          <span className={styles.kpiSub}>
            Median reply: {formatHours(kpis.medianResponseHours)}
          </span>
        </div>

        <div className={styles.kpiCard}>
          <span className={styles.kpiLabel}>Confirmed Trips</span>
          <span className={styles.kpiVal}>{kpis.confirmedCount}</span>
          <span className={styles.kpiSub}>{kpis.conversionRate}% active conversion</span>
        </div>

        <div className={styles.kpiCard}>
          <span className={styles.kpiLabel}>Active Pipeline</span>
          <span className={styles.kpiVal}>{formatUSD(kpis.pipelineUsd)}</span>
          <span className={styles.kpiSub}>Confirmed: {formatUSD(kpis.confirmedUsd)}</span>
        </div>

        <div className={styles.kpiCard}>
          <span className={styles.kpiLabel}>Pending Visa / SDF</span>
          <span className={styles.kpiVal}>{pendingOpsCount}</span>
          <span className={styles.kpiSub}>
            {analytics.health.visaReadinessPct}% upcoming readiness
          </span>
        </div>
      </section>

      <section className={styles.actionWidgetsGrid} aria-label="Unassigned Queue and Team Workload">
        <div className={styles.panelCard}>
          <div className={styles.panelHead}>
            <div>
              <h2 className={styles.panelTitle}>Unassigned Queue ({unassignedQueue.length})</h2>
              <p className={styles.panelSub}>
                Route incoming guest requests to your Reservations desk or inspect directly
              </p>
            </div>
          </div>

          {unassignedQueue.length === 0 ? (
            <div className={styles.cleanState}>
              <Icon name="shieldCheck" size={18} />
              <span>Every active booking and inquiry has an assigned staff owner.</span>
            </div>
          ) : (
            <div className={styles.queueList}>
              {unassignedQueue.slice(0, 8).map((item) => (
                <div key={item.reference} className={styles.queueRowCard}>
                  <div className={styles.queueRowInfo}>
                    <div className={styles.badges}>
                      <span className={styles.refCode}>{item.reference}</span>
                      <span className={`${styles.badge} ${styles.badgeBooking}`}>{item.type}</span>
                      <span className={`${styles.badge} ${styles.badgeStatusNew}`}>{item.status}</span>
                    </div>
                    <strong className={styles.queueGuestName}>
                      {item.fullName} — {item.type === 'booking' ? item.tourTitle : 'General Inquiry'}
                    </strong>
                    <span className={styles.cellSub}>
                      {item.startDate ? `Arrival ${formatDisplayDate(item.startDate)}` : item.dates || 'Flexible dates'}
                      {item.nationality ? ` · ${item.nationality}` : ''}
                    </span>
                  </div>
                  <div className={styles.queueRowActions}>
                    <select
                      aria-label={`Assign ${item.reference} to staff`}
                      defaultValue=""
                      disabled={assigningRef === item.reference || assignableStaff.length === 0}
                      onChange={(e) => handleQuickAssign(item.reference, e.target.value)}
                      className={`rtb-select ${styles.inlineAssignSelect}`}
                    >
                      <option value="">Assign to…</option>
                      {assignableStaff.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.name} ({s.roleLabel})
                        </option>
                      ))}
                    </select>
                    <button
                      type="button"
                      onClick={() => onSelectBooking(item.reference)}
                      className={`btn btn-outline ${styles.miniActionBtn}`}
                    >
                      Inspect
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className={styles.panelCard}>
          <div className={styles.panelHead}>
            <div>
              <h2 className={styles.panelTitle}>Team Workload &amp; SLA</h2>
              <p className={styles.panelSub}>Live queue distribution across Reservations &amp; Desk Management</p>
            </div>
          </div>

          {team.members.length === 0 ? (
            <div className={styles.cleanState}>
              <span>No staff workload recorded yet.</span>
            </div>
          ) : (
            <div className={styles.tableScroll}>
              <table className={styles.compactTable}>
                <thead>
                  <tr>
                    <th>Staff</th>
                    <th>Role</th>
                    <th>Active</th>
                    <th>Quoted</th>
                    <th>Confirmed</th>
                    <th>Avg Reply</th>
                  </tr>
                </thead>
                <tbody>
                  {team.members.map((m) => (
                    <tr key={m.id}>
                      <td className={styles.cellPrimary}>{m.name}</td>
                      <td>{m.roleLabel}</td>
                      <td>{m.assigned}</td>
                      <td>{m.quoted}</td>
                      <td>
                        <span className={`${styles.badge} ${styles.badgeStatusConfirmed}`}>
                          {m.confirmed}
                        </span>
                      </td>
                      <td>{formatHours(m.avgResponseHours)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </section>

      <section className={styles.chartsGrid} aria-label="Pipeline and Departure Charts">
        <FunnelBarChart stages={analytics.funnelStages} />
        <MonthlyDeparturesChart months={analytics.monthlyDepartures} />
      </section>

      <section className={styles.actionWidgetsGrid} aria-label="Alerts and Upcoming Departures">
        <div className={styles.panelCard}>
          <div className={styles.panelHead}>
            <div>
              <h2 className={styles.panelTitle}>Needs Attention Today</h2>
              <p className={styles.panelSub}>SLA breaches, failed emails &amp; urgent visa checks</p>
            </div>
            <span className={styles.countChip}>{alerts.length}</span>
          </div>

          {alerts.length === 0 ? (
            <div className={styles.cleanState}>
              <Icon name="shieldCheck" size={18} />
              <span>All clear — zero SLA breaches, failed emails, or urgent visa blockers.</span>
            </div>
          ) : (
            <ul className={styles.alertList}>
              {alerts.slice(0, 6).map((a) => (
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
                    Inspect
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className={styles.panelCard}>
          <div className={styles.panelHead}>
            <div>
              <h2 className={styles.panelTitle}>Upcoming Departures</h2>
              <p className={styles.panelSub}>Next scheduled Bhutan arrivals &amp; visa/permit readiness</p>
            </div>
            <button
              type="button"
              onClick={() => onNavigate('operations')}
              className={`btn btn-outline ${styles.miniActionBtn}`}
            >
              Full Matrix →
            </button>
          </div>

          {analytics.upcomingDepartures.length === 0 ? (
            <div className={styles.cleanState}>
              <span>No upcoming tour departures scheduled yet.</span>
            </div>
          ) : (
            <div className={styles.tableScroll}>
              <table className={styles.compactTable}>
                <thead>
                  <tr>
                    <th>Arrival</th>
                    <th>Guest</th>
                    <th>Deposit</th>
                    <th>Ops</th>
                  </tr>
                </thead>
                <tbody>
                  {analytics.upcomingDepartures.map((item) => {
                    const prog = getChecklistProgress(item.checklist);
                    return (
                      <tr key={item.reference}>
                        <td>{formatDisplayDate(item.startDate)}</td>
                        <td>
                          <button
                            type="button"
                            onClick={() => onSelectBooking(item.reference)}
                            className={styles.tableLinkBtn}
                          >
                            {item.fullName}
                          </button>
                        </td>
                        <td>
                          <span
                            className={`${styles.badge} ${
                              item.payment?.depositVerified
                                ? styles.badgeStatusConfirmed
                                : styles.badgeStatusNew
                            }`}
                          >
                            {item.payment?.depositVerified ? 'Verified ✓' : 'Pending'}
                          </span>
                        </td>
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
      </section>
    </div>
  );
}
