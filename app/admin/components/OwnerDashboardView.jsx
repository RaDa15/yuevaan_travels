'use client';

import Icon from '@/components/icons';
import { formatUSD } from '@/lib/format';
import {
  FunnelBarChart,
  HealthGaugesCard,
  MonthlyDeparturesChart,
  NationalityDonutChart,
  TopToursChart,
  VolumeLineChart,
} from './PortalCharts';
import styles from '../Admin.module.css';

function formatHours(hrs) {
  if (hrs === null || hrs === undefined || !Number.isFinite(hrs)) return '—';
  if (hrs < 1) return `${Math.max(1, Math.round(hrs * 60))}m`;
  return `${hrs.toFixed(1)}h`;
}

export default function OwnerDashboardView({
  analyticsData,
  rangeDays,
  onRangeChange,
  siteConfig,
  dbEngine,
  onNavigate,
  onRefresh,
  loading,
}) {
  const analytics = analyticsData?.analytics || null;
  const team = analyticsData?.teamPerformance || { unassignedCount: 0, members: [] };
  const finance = analyticsData?.financeSummary || {
    confirmedValueUsd: 0,
    totalDepositsUsd: 0,
    totalBalanceDueUsd: 0,
    intlSdfPayableUsd: 0,
    indianSdfPayableNu: 0,
    visaPayableUsd: 0,
  };

  if (!analytics) {
    return (
      <div className={styles.viewStack}>
        <div className={styles.panelCard}>
          <div className={styles.emptyState}>Loading executive analytics…</div>
        </div>
      </div>
    );
  }

  const { kpis } = analytics;
  const deltaSign = kpis.periodDeltaPct > 0 ? '+' : '';
  const slaHours = siteConfig?.slaHours || 24;

  return (
    <div className={styles.viewStack}>
      <div className={styles.viewHead}>
        <div>
          <span className={styles.eyebrow}>OWNER EXECUTIVE &amp; GOVERNANCE</span>
          <h1 className={styles.pageTitle}>Executive Overview</h1>
        </div>
        <div className={styles.topActions}>
          <button
            type="button"
            onClick={() => onNavigate('settings')}
            className={`btn btn-primary ${styles.actionBtn}`}
          >
            <Icon name="settings" size={15} />
            <span>Edit Bhutan Rates</span>
          </button>
          <button
            type="button"
            onClick={() => onNavigate('users')}
            className={`btn btn-outline ${styles.actionBtn}`}
          >
            <Icon name="users" size={15} />
            <span>Users &amp; Roles</span>
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

      <section className={styles.rateStrip} aria-label="Active statutory configuration and storage">
        <div className={styles.rateStripItem}>
          <span className={styles.rateStripLabel}>Database</span>
          <span
            className={`${styles.enginePill} ${
              dbEngine === 'postgres' ? styles.enginePillPg : styles.enginePillLocal
            }`}
          >
            {dbEngine === 'postgres' ? '● PostgreSQL Connected' : '○ Local .data/ Fallback'}
          </span>
        </div>
        <div className={styles.rateStripItem}>
          <span className={styles.rateStripLabel}>Intl. SDF</span>
          <strong>US${siteConfig?.fees?.sdf?.internationalUsdPerNight ?? 100}/night</strong>
        </div>
        <div className={styles.rateStripItem}>
          <span className={styles.rateStripLabel}>India SDF</span>
          <strong>Nu. {(siteConfig?.fees?.sdf?.indianNuPerNight ?? 1200).toLocaleString('en-US')}/night</strong>
        </div>
        <div className={styles.rateStripItem}>
          <span className={styles.rateStripLabel}>Visa &amp; GST</span>
          <strong>
            US${siteConfig?.fees?.visaUsd ?? 40} · {siteConfig?.fees?.gstPct ?? 5}% GST
          </strong>
        </div>
        <div className={styles.rateStripItem}>
          <span className={styles.rateStripLabel}>DoT Licence</span>
          <strong>{siteConfig?.licence?.number || '—'}</strong>
        </div>
      </section>

      <section className={styles.kpiGridFive} aria-label="Executive Key Performance Indicators">
        <div className={styles.kpiCard}>
          <div className={styles.kpiTopRow}>
            <span className={styles.kpiLabel}>Total Requests</span>
            <span
              className={`${styles.deltaPill} ${
                kpis.periodDeltaPct >= 0 ? styles.deltaUp : styles.deltaDown
              }`}
            >
              {deltaSign}
              {kpis.periodDeltaPct}% ({rangeDays}d)
            </span>
          </div>
          <span className={styles.kpiVal}>{kpis.total}</span>
          <span className={styles.kpiSub}>
            {kpis.bookingsCount} bookings · {kpis.inquiriesCount} inquiries
          </span>
        </div>

        <div className={styles.kpiCard}>
          <span className={styles.kpiLabel}>Confirmed Revenue</span>
          <span className={`${styles.kpiVal} ${styles.kpiValAccent}`}>
            {formatUSD(finance.confirmedValueUsd)}
          </span>
          <span className={styles.kpiSub}>
            Deposits {formatUSD(finance.totalDepositsUsd)} · Due {formatUSD(finance.totalBalanceDueUsd)}
          </span>
        </div>

        <div className={styles.kpiCard}>
          <span className={styles.kpiLabel}>Conversion Rate</span>
          <span className={styles.kpiVal}>{kpis.conversionRate}%</span>
          <span className={styles.kpiSub}>{kpis.confirmedCount} confirmed departures</span>
        </div>

        <div className={styles.kpiCard}>
          <span className={styles.kpiLabel}>Active Pipeline &amp; SDF</span>
          <span className={styles.kpiVal}>{formatUSD(kpis.pipelineUsd)}</span>
          <span className={styles.kpiSub}>
            Intl SDF {formatUSD(finance.intlSdfPayableUsd)}
            {finance.indianSdfPayableNu > 0
              ? ` · Nu. ${finance.indianSdfPayableNu.toLocaleString('en-US')}`
              : ''}
          </span>
        </div>

        <div className={styles.kpiCard}>
          <div className={styles.kpiTopRow}>
            <span className={styles.kpiLabel}>Median First Reply</span>
            <span
              className={`${styles.deltaPill} ${
                kpis.slaOverdueCount > 0 ? styles.deltaCrit : styles.deltaUp
              }`}
            >
              {analytics.health.slaCompliancePct}% SLA
            </span>
          </div>
          <span className={styles.kpiVal}>{formatHours(kpis.medianResponseHours)}</span>
          <span className={styles.kpiSub}>
            Target: under {slaHours}h · {kpis.awaitingReply} awaiting reply
          </span>
        </div>
      </section>

      <section className={styles.chartsGrid} aria-label="Executive Analytics Charts">
        <VolumeLineChart
          series={analytics.volumeSeries}
          rangeDays={rangeDays}
          onRangeChange={onRangeChange}
        />
        <FunnelBarChart stages={analytics.funnelStages} />
        <MonthlyDeparturesChart months={analytics.monthlyDepartures} />
        <TopToursChart tours={analytics.topTours} />
        <NationalityDonutChart mix={analytics.nationalityMix} />
        <HealthGaugesCard health={analytics.health} />
      </section>

      <section className={styles.actionWidgetsGrid} aria-label="Team Performance and Governance">
        <div className={styles.panelCard}>
          <div className={styles.panelHead}>
            <div>
              <h2 className={styles.panelTitle}>Team Performance</h2>
              <p className={styles.panelSub}>
                Aggregated workload &amp; conversion across Reservations and Desk Management (no individual guest inbox)
              </p>
            </div>
            <span className={styles.countChip}>
              {team.unassignedCount} unassigned
            </span>
          </div>

          {team.members.length === 0 ? (
            <div className={styles.cleanState}>
              <Icon name="users" size={18} />
              <span>
                No Reservations or Desk Manager accounts yet. Add staff under Users &amp; Roles to track individual workload.
              </span>
            </div>
          ) : (
            <div className={styles.tableScroll}>
              <table className={styles.compactTable}>
                <thead>
                  <tr>
                    <th>Staff Member</th>
                    <th>Role</th>
                    <th>Active</th>
                    <th>Quoted</th>
                    <th>Confirmed</th>
                    <th>Avg Reply</th>
                    <th>Visa Ready</th>
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
                      <td>{m.avgChecklistPct}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className={styles.panelCard}>
          <div className={styles.panelHead}>
            <div>
              <h2 className={styles.panelTitle}>Owner Governance Controls</h2>
              <p className={styles.panelSub}>
                Individual booking inquiries are handled by your Reservations, Desk Manager, and Finance staff.
              </p>
            </div>
          </div>

          <div className={styles.govActionList}>
            <button
              type="button"
              onClick={() => onNavigate('settings')}
              className={styles.govActionCard}
            >
              <Icon name="settings" size={18} />
              <div>
                <strong>Bhutan Statutory Rates &amp; Agency Settings</strong>
                <span>Edit SDF (USD / Nu.), child discounts, visa fee, GST, DoT licence, WhatsApp &amp; office hours live.</span>
              </div>
            </button>

            <button
              type="button"
              onClick={() => onNavigate('users')}
              className={styles.govActionCard}
            >
              <Icon name="users" size={18} />
              <div>
                <strong>Staff Directory, Roles &amp; Sessions</strong>
                <span>Create scalable Reservations, Desk Manager, and Finance accounts or revoke active sessions.</span>
              </div>
            </button>

            <button
              type="button"
              onClick={() => onNavigate('audit')}
              className={styles.govActionCard}
            >
              <Icon name="clipboardList" size={18} />
              <div>
                <strong>Immutable Staff Audit Log</strong>
                <span>Review rate edits, deposit verifications, manager confirmation overrides, and role changes.</span>
              </div>
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}
