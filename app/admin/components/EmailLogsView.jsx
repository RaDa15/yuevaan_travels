'use client';

import { useMemo, useState } from 'react';
import Icon from '@/components/icons';
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

export default function EmailLogsView({
  logs,
  emailConfig,
  permissions,
  onResendBookingEmail,
  onTestEmail,
  onRefresh,
  loading,
}) {
  const [filter, setFilter] = useState('all'); // all | sent | failed | admin | guest | test
  const [retryingRef, setRetryingRef] = useState('');

  const canSend = permissions.includes('emails:send');

  const filtered = useMemo(() => {
    return logs.filter((entry) => {
      if (filter === 'sent' || filter === 'failed') return entry.status === filter;
      if (filter === 'admin' || filter === 'guest' || filter === 'test') return entry.kind === filter;
      return true;
    });
  }, [filter, logs]);

  const sentCount = logs.filter((l) => l.status === 'sent').length;
  const failedCount = logs.filter((l) => l.status === 'failed').length;

  const handleRetry = async (ref) => {
    setRetryingRef(ref);
    try {
      await onResendBookingEmail(ref);
      await onRefresh();
    } finally {
      setRetryingRef('');
    }
  };

  return (
    <div className={styles.viewStack}>
      <div className={styles.viewHead}>
        <div>
          <span className={styles.eyebrow}>COMMUNICATIONS</span>
          <h1 className={styles.pageTitle}>Email Delivery Logs</h1>
        </div>
        <div className={styles.topActions}>
          {canSend ? (
            <button
              type="button"
              onClick={onTestEmail}
              className={`btn btn-primary ${styles.actionBtn}`}
            >
              <Icon name="mail" size={15} />
              <span>Send Test Email</span>
            </button>
          ) : null}
          <button
            type="button"
            onClick={onRefresh}
            disabled={loading}
            className={`btn btn-outline ${styles.actionBtn}`}
          >
            {loading ? 'Refreshing…' : 'Refresh Logs'}
          </button>
        </div>
      </div>

      <section className={styles.kpiGrid} aria-label="Email Delivery Summary">
        <div className={styles.kpiCard}>
          <span className={styles.kpiLabel}>Transport Status</span>
          <span className={styles.kpiVal}>
            {emailConfig.configured ? String(emailConfig.provider || '').toUpperCase() : 'Off'}
          </span>
          <span className={styles.kpiSub}>
            {emailConfig.configured ? `Alert inbox: ${emailConfig.adminTo}` : 'Set SMTP_PASS or RESEND_API_KEY in .env'}
          </span>
        </div>
        <div className={styles.kpiCard}>
          <span className={styles.kpiLabel}>Delivered</span>
          <span className={styles.kpiVal}>{sentCount}</span>
          <span className={styles.kpiSub}>Recorded in email-logs.ndjson</span>
        </div>
        <div className={styles.kpiCard}>
          <span className={styles.kpiLabel}>Failed Attempts</span>
          <span className={styles.kpiVal}>{failedCount}</span>
          <span className={styles.kpiSub}>Retry failed deliveries below</span>
        </div>
      </section>

      <div className={styles.filterBar}>
        <div className={styles.filterGroup} role="group" aria-label="Filter email logs">
          {[
            { value: 'all', label: 'All' },
            { value: 'sent', label: 'Delivered' },
            { value: 'failed', label: 'Failed' },
            { value: 'admin', label: 'Admin Alerts' },
            { value: 'guest', label: 'Guest Copies' },
            { value: 'test', label: 'Tests' },
          ].map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => setFilter(opt.value)}
              className={`${styles.pillBtn}${filter === opt.value ? ` ${styles.pillBtnActive}` : ''}`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      <div className={styles.panelCard}>
        {filtered.length === 0 ? (
          <div className={styles.emptyState}>
            No email delivery logs yet. Once SMTP or Resend is configured, every automatic notification and test send will be logged here.
          </div>
        ) : (
          <div className={styles.tableScroll}>
            <table className={styles.dataTable}>
              <thead>
                <tr>
                  <th>Time (BTT)</th>
                  <th>Ref</th>
                  <th>Kind</th>
                  <th>Recipient</th>
                  <th>Subject &amp; Details</th>
                  <th>Status</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((entry) => (
                  <tr key={entry.id}>
                    <td>{formatBttTime(entry.at)}</td>
                    <td>
                      <span className={styles.refCode}>{entry.reference || '—'}</span>
                    </td>
                    <td>
                      <span className={`${styles.badge} ${styles.badgeInquiry}`}>{entry.kind}</span>
                    </td>
                    <td>{entry.to || '—'}</td>
                    <td>
                      <div className={styles.cellPrimary}>{entry.subject}</div>
                      <div className={styles.cellSub}>
                        via {String(entry.provider || 'none').toUpperCase()} · triggered by {entry.triggeredBy || 'auto'}
                      </div>
                      {entry.error ? <div className={styles.emailErrorText}>{entry.error}</div> : null}
                    </td>
                    <td>
                      <span
                        className={`${styles.badge} ${
                          entry.status === 'sent' ? styles.badgeEmailSent : styles.badgeEmailFail
                        }`}
                      >
                        {entry.status}
                      </span>
                    </td>
                    <td>
                      {canSend && entry.reference && entry.reference !== 'TEST' ? (
                        <button
                          type="button"
                          onClick={() => handleRetry(entry.reference)}
                          disabled={retryingRef === entry.reference}
                          className={`btn btn-outline ${styles.miniActionBtn}`}
                        >
                          {retryingRef === entry.reference ? 'Sending…' : 'Resend'}
                        </button>
                      ) : (
                        '—'
                      )}
                    </td>
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
