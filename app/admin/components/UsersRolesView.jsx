'use client';

import { useState } from 'react';
import Icon from '@/components/icons';
import styles from '../Admin.module.css';

const ROLE_OPTIONS = [
  { value: 'super_admin', label: 'Owner (Executive & Settings)' },
  { value: 'manager', label: 'Desk Manager' },
  { value: 'reservation', label: 'Reservations' },
  { value: 'finance', label: 'Finance' },
];

const PERM_MATRIX_ROWS = [
  { label: 'Executive Analytics & Team Performance', roles: ['super_admin', 'manager'] },
  { label: 'Edit Live Bhutan Statutory Rates & Agency Settings', roles: ['super_admin'] },
  { label: 'Manage Staff Users, Roles, Sessions & JSON Backups', roles: ['super_admin'] },
  { label: 'View & Route All Booking Enquiries + Bulk Actions', roles: ['manager'] },
  { label: 'Audited Manager Confirmation Override', roles: ['manager'] },
  { label: 'Claim Unassigned Leads & Work Own Bookings Queue', roles: ['manager', 'reservation'] },
  { label: 'Update Bhutan Visa, Permits & Guide Checklist', roles: ['manager', 'reservation'] },
  { label: 'Send / Resend Emails & Guest Templates', roles: ['super_admin', 'manager', 'reservation'] },
  { label: 'View Email Delivery Logs', roles: ['manager'] },
  { label: 'Verify Deposits, Record Wire Refs & Unlock Confirmed', roles: ['finance'] },
  { label: 'Manage SDF & Visa Ledger + Export Financial CSV', roles: ['finance'] },
  { label: 'View Immutable Staff Audit Log', roles: ['super_admin', 'manager'] },
];

function formatBttTime(iso) {
  if (!iso) return 'Never';
  try {
    const dt = new Date(iso);
    const btt = new Date(dt.getTime() + 6 * 3600 * 1000);
    return `${btt.toISOString().slice(0, 16).replace('T', ' ')} BTT`;
  } catch {
    return iso;
  }
}

export default function UsersRolesView({
  currentUser,
  users,
  sessions,
  onCreateUser,
  onUpdateUser,
  onRevokeSession,
  onRefresh,
}) {
  const [showAddModal, setShowAddModal] = useState(false);
  const [resetTarget, setResetTarget] = useState(null);
  const [newName, setNewName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newRole, setNewRole] = useState('reservation');
  const [newPassword, setNewPassword] = useState('');
  const [resetPassword, setResetPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleCreate = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const ok = await onCreateUser({
        name: newName,
        email: newEmail,
        role: newRole,
        password: newPassword,
      });
      if (ok) {
        setNewName('');
        setNewEmail('');
        setNewRole('reservation');
        setNewPassword('');
        setShowAddModal(false);
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleReset = async (e) => {
    e.preventDefault();
    if (!resetTarget) return;
    setSubmitting(true);
    try {
      const ok = await onUpdateUser(resetTarget.id, { password: resetPassword });
      if (ok) {
        setResetPassword('');
        setResetTarget(null);
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className={styles.viewStack}>
      <div className={styles.viewHead}>
        <div>
          <span className={styles.eyebrow}>ACCESS CONTROL (RBAC)</span>
          <h1 className={styles.pageTitle}>Users, Roles &amp; Sessions</h1>
        </div>
        <div className={styles.topActions}>
          <button
            type="button"
            onClick={() => setShowAddModal(true)}
            className={`btn btn-primary ${styles.actionBtn}`}
          >
            <Icon name="userPlus" size={15} />
            <span>Add Staff Member</span>
          </button>
          <button
            type="button"
            onClick={onRefresh}
            className={`btn btn-outline ${styles.actionBtn}`}
          >
            Refresh
          </button>
        </div>
      </div>

      <div className={styles.panelCard}>
        <div className={styles.panelHead}>
          <div>
            <h2 className={styles.panelTitle}>Staff Directory ({users.length})</h2>
            <p className={styles.panelSub}>
              Scalable 1 → N Reservations seats · Salted scrypt password hashing
            </p>
          </div>
        </div>

        <div className={styles.tableScroll}>
          <table className={styles.dataTable}>
            <thead>
              <tr>
                <th>Staff Member</th>
                <th>Role</th>
                <th>Status</th>
                <th>Last Login</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id}>
                  <td>
                    <div className={styles.cellPrimary}>
                      {u.name} {u.id === currentUser?.id ? '(You)' : ''}
                    </div>
                    <div className={styles.cellSub}>{u.email}</div>
                  </td>
                  <td>
                    <select
                      aria-label={`Role for ${u.email}`}
                      value={u.role}
                      onChange={(e) => onUpdateUser(u.id, { role: e.target.value })}
                      className={`rtb-select ${styles.roleSelect}`}
                    >
                      {ROLE_OPTIONS.map((r) => (
                        <option key={r.value} value={r.value}>
                          {r.label}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td>
                    <span
                      className={`${styles.badge} ${
                        u.active ? styles.badgeStatusConfirmed : styles.badgeStatusArchived
                      }`}
                    >
                      {u.active ? 'Active' : 'Disabled'}
                    </span>
                  </td>
                  <td>{formatBttTime(u.lastLoginAt)}</td>
                  <td>
                    <div className={styles.inlineBtnRow}>
                      <button
                        type="button"
                        onClick={() => setResetTarget(u)}
                        className={`btn btn-outline ${styles.miniActionBtn}`}
                      >
                        <Icon name="key" size={13} />
                        <span>Reset Password</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => onUpdateUser(u.id, { active: !u.active })}
                        className={`btn btn-outline ${styles.miniActionBtn}`}
                      >
                        {u.active ? 'Disable' : 'Enable'}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className={styles.panelCard}>
        <div className={styles.panelHead}>
          <div>
            <h2 className={styles.panelTitle}>Active Portal Sessions ({sessions.length})</h2>
            <p className={styles.panelSub}>Revoke any active cookie session immediately</p>
          </div>
        </div>
        <div className={styles.tableScroll}>
          <table className={styles.dataTable}>
            <thead>
              <tr>
                <th>User</th>
                <th>Signed In</th>
                <th>IP / Client</th>
                <th>Expires</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {sessions.map((s) => (
                <tr key={s.id}>
                  <td>
                    <div className={styles.cellPrimary}>{s.userName}</div>
                    <div className={styles.cellSub}>{s.userEmail}</div>
                  </td>
                  <td>{formatBttTime(s.createdAt)}</td>
                  <td>
                    <div className={styles.cellPrimary}>{s.ipHint || 'local'}</div>
                    <div className={styles.cellSub}>{String(s.userAgent || '').slice(0, 48)}</div>
                  </td>
                  <td>{formatBttTime(s.expiresAt)}</td>
                  <td>
                    <button
                      type="button"
                      onClick={() => onRevokeSession(s.id)}
                      className={`btn btn-outline ${styles.miniActionBtn}`}
                    >
                      Revoke
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className={styles.panelCard}>
        <div className={styles.panelHead}>
          <div>
            <h2 className={styles.panelTitle}>Role Permission Matrix</h2>
            <p className={styles.panelSub}>Server-enforced access boundaries for every Admin API route</p>
          </div>
        </div>
        <div className={styles.tableScroll}>
          <table className={styles.compactTable}>
            <thead>
              <tr>
                <th>Capability</th>
                <th>Owner</th>
                <th>Desk Manager</th>
                <th>Reservations</th>
                <th>Finance</th>
              </tr>
            </thead>
            <tbody>
              {PERM_MATRIX_ROWS.map((row) => (
                <tr key={row.label}>
                  <td>{row.label}</td>
                  {['super_admin', 'manager', 'reservation', 'finance'].map((r) => (
                    <td key={r}>{row.roles.includes(r) ? '✓' : '—'}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {showAddModal ? (
        <div className={styles.modalBackdrop} role="dialog" aria-modal="true" aria-labelledby="addStaffTitle">
          <div className={styles.modalCard}>
            <h2 id="addStaffTitle" className={styles.modalTitle}>
              Add Staff Member
            </h2>
            <form onSubmit={handleCreate} className={styles.loginForm}>
              <div>
                <label htmlFor="staffName" className="rtb-field-label">
                  Full Name
                </label>
                <input
                  id="staffName"
                  type="text"
                  required
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className="rtb-input"
                  placeholder="e.g. Tenzin Dorji"
                />
              </div>
              <div>
                <label htmlFor="staffEmail" className="rtb-field-label">
                  Work Email
                </label>
                <input
                  id="staffEmail"
                  type="email"
                  required
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  className="rtb-input"
                  placeholder="tenzin@yuevaantravels.bt"
                />
              </div>
              <div>
                <label htmlFor="staffRole" className="rtb-field-label">
                  Role
                </label>
                <select
                  id="staffRole"
                  value={newRole}
                  onChange={(e) => setNewRole(e.target.value)}
                  className="rtb-select"
                >
                  {ROLE_OPTIONS.map((r) => (
                    <option key={r.value} value={r.value}>
                      {r.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor="staffPassword" className="rtb-field-label">
                  Temporary Password (min 8 chars)
                </label>
                <input
                  id="staffPassword"
                  type="password"
                  required
                  minLength={8}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="rtb-input"
                  placeholder="At least 8 characters"
                />
              </div>
              <div className={styles.modalActions}>
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className={`btn btn-outline ${styles.actionBtn}`}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className={`btn btn-primary ${styles.actionBtn}`}
                >
                  {submitting ? 'Creating…' : 'Create Account'}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}

      {resetTarget ? (
        <div className={styles.modalBackdrop} role="dialog" aria-modal="true" aria-labelledby="resetPwTitle">
          <div className={styles.modalCard}>
            <h2 id="resetPwTitle" className={styles.modalTitle}>
              Reset Password — {resetTarget.name}
            </h2>
            <form onSubmit={handleReset} className={styles.loginForm}>
              <div>
                <label htmlFor="resetPwInput" className="rtb-field-label">
                  New Password (min 8 chars)
                </label>
                <input
                  id="resetPwInput"
                  type="password"
                  required
                  minLength={8}
                  value={resetPassword}
                  onChange={(e) => setResetPassword(e.target.value)}
                  className="rtb-input"
                  placeholder="Enter new password"
                />
              </div>
              <div className={styles.modalActions}>
                <button
                  type="button"
                  onClick={() => setResetTarget(null)}
                  className={`btn btn-outline ${styles.actionBtn}`}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className={`btn btn-primary ${styles.actionBtn}`}
                >
                  {submitting ? 'Saving…' : 'Update Password'}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  );
}
