'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Icon from '@/components/icons';
import { site } from '@/data/site';
import { computePortalAlerts, getChecklistProgress } from '@/lib/admin-analytics';
import OwnerDashboardView from './components/OwnerDashboardView';
import ManagerDashboardView from './components/ManagerDashboardView';
import ReservationsDashboardView from './components/ReservationsDashboardView';
import FinanceDashboardView from './components/FinanceDashboardView';
import BookingsWorkspace from './components/BookingsWorkspace';
import OperationsChecklistView from './components/OperationsChecklistView';
import EmailLogsView from './components/EmailLogsView';
import UsersRolesView from './components/UsersRolesView';
import { AuditLogView, SettingsView } from './components/AuditSettingsView';
import styles from './Admin.module.css';

const REMOTE_PORTAL_ORIGIN = (process.env.NEXT_PUBLIC_PORTAL_ORIGIN || '').replace(/\/+$/, '');
const STATIC_BASE_PATH = (process.env.NEXT_PUBLIC_BASE_PATH || '').replace(/\/+$/, '');
const ALLOWED_PORTAL_PATHS = new Set([
  '/admin',
  '/owner',
  '/manager',
  '/reservation',
  '/reservations',
  '/finance',
]);

function getRemotePortalRedirectUrl() {
  if (typeof window === 'undefined' || !REMOTE_PORTAL_ORIGIN) return null;
  if (!REMOTE_PORTAL_ORIGIN.startsWith('https://')) return null;
  if (window.location.origin === REMOTE_PORTAL_ORIGIN) return null;
  let routePath = window.location.pathname || '/admin';
  if (STATIC_BASE_PATH && routePath.startsWith(STATIC_BASE_PATH)) {
    routePath = routePath.slice(STATIC_BASE_PATH.length) || '/admin';
  }
  routePath = routePath.replace(/\/+$/, '') || '/admin';
  const safePath = ALLOWED_PORTAL_PATHS.has(routePath) ? routePath : '/admin';
  return `${REMOTE_PORTAL_ORIGIN}${safePath}`;
}

function getCandidateApiBases() {
  if (typeof window === 'undefined') return [''];
  const { hostname, port } = window.location;
  const isLocal = hostname === 'localhost' || hostname === '127.0.0.1';
  if (!isLocal) return [''];
  if (port === '3000' || port === '3001' || port === '3002') {
    return [`http://${hostname}:8081`, `http://${hostname}:8080`];
  }
  return ['', `http://${hostname}:8081`, `http://${hostname}:8080`].filter(
    (b, idx, arr) => b === '' || (b !== window.location.origin && arr.indexOf(b) === idx)
  );
}

function getNowBttLabel() {
  const btt = new Date(Date.now() + 6 * 3600 * 1000);
  return `${btt.toISOString().slice(11, 16)} BTT`;
}

function getDefaultTabForRole(role) {
  if (role === 'super_admin') return 'owner-overview';
  if (role === 'manager') return 'manager-overview';
  if (role === 'finance') return 'finance-overview';
  return 'res-desk';
}

const SECTION_LABELS = {
  'owner-overview': 'Executive Overview',
  'manager-overview': 'Manager Overview',
  'res-desk': 'My Desk',
  'finance-overview': 'Finance Overview',
  'finance-payments': 'Payments & Deposits',
  'finance-ledger': 'SDF & Visa Ledger',
  bookings: 'Bookings & Queue',
  operations: 'Visa, Permits & SDF',
  emails: 'Email Delivery Logs',
  users: 'Users & Roles',
  audit: 'Staff Audit Log',
  settings: 'Rates & Settings',
};

const PORTAL_ROLE_META = {
  super_admin: {
    title: 'Owner Executive Portal Sign In',
    subtitle: 'Sign in with your Owner password (leave email blank or enter your Owner email).',
    badge: 'Owner',
  },
  manager: {
    title: 'Desk Manager Portal Sign In',
    subtitle: 'Sign in with your Desk Manager staff email and password.',
    badge: 'Desk Manager',
  },
  reservation: {
    title: 'Reservations Portal Sign In',
    subtitle: 'Sign in with your Reservations staff email and password.',
    badge: 'Reservations',
  },
  finance: {
    title: 'Finance Portal Sign In',
    subtitle: 'Sign in with your Finance staff email and password.',
    badge: 'Finance',
  },
};

export default function AdminDashboardClient({ portalRole = null }) {
  const [checking, setChecking] = useState(true);
  const [serverUnreachable, setServerUnreachable] = useState(false);
  const [configured, setConfigured] = useState(true);
  const [authenticated, setAuthenticated] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [dismissedRoleMismatch, setDismissedRoleMismatch] = useState(false);
  const [permissions, setPermissions] = useState([]);
  const [dbEngine, setDbEngine] = useState('local-file');
  const [siteConfig, setSiteConfig] = useState(site);
  const [emailConfig, setEmailConfig] = useState({ configured: false, provider: 'none', adminTo: '' });
  const [publicSiteHref, setPublicSiteHref] = useState('/');
  const [bttClock, setBttClock] = useState('');

  const [loginEmail, setLoginEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [loggingIn, setLoggingIn] = useState(false);

  const [activeTab, setActiveTab] = useState('owner-overview');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [showAlertsPopover, setShowAlertsPopover] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [showQuickSearch, setShowQuickSearch] = useState(false);
  const [quickSearchQuery, setQuickSearchQuery] = useState('');

  const [analyticsData, setAnalyticsData] = useState(null);
  const [analyticsDays, setAnalyticsDays] = useState(30);
  const [inquiries, setInquiries] = useState([]);
  const [staffDirectory, setStaffDirectory] = useState([]);
  const [emailLogs, setEmailLogs] = useState([]);
  const [auditLogs, setAuditLogs] = useState([]);
  const [usersList, setUsersList] = useState([]);
  const [activeSessions, setActiveSessions] = useState([]);
  const [localFallbackItems, setLocalFallbackItems] = useState([]);
  const [selectedRef, setSelectedRef] = useState('');
  const [loadingList, setLoadingList] = useState(false);
  const [banner, setBanner] = useState(null);

  const apiBaseRef = useRef(null);
  const quickSearchInputRef = useRef(null);

  const adminFetch = useCallback(async (endpoint, options = {}, overrideBase = null) => {
    const base = overrideBase !== null ? overrideBase : (apiBaseRef.current ?? getCandidateApiBases()[0]);
    const res = await fetch(`${base}${endpoint}`, {
      credentials: 'include',
      ...options,
      headers: {
        ...(options.body ? { 'Content-Type': 'application/json' } : {}),
        ...(options.headers || {}),
      },
    });
    const data = await res.json().catch(() => null);
    return { status: res.status, ok: res.ok, data };
  }, []);

  const readLocalFallback = useCallback(() => {
    try {
      const saved = JSON.parse(localStorage.getItem('yuevaan_saved_inquiries') || '[]');
      return Array.isArray(saved) ? [...saved].reverse() : [];
    } catch {
      return [];
    }
  }, []);

  const loadSiteSettings = useCallback(async () => {
    try {
      const { ok, data } = await adminFetch('/api/admin/settings');
      if (ok && data?.ok && data.settings) {
        setSiteConfig((prev) => ({ ...prev, ...data.settings }));
        if (data.dbEngine) setDbEngine(data.dbEngine);
      }
    } catch {}
  }, [adminFetch]);

  const loadAnalytics = useCallback(
    async (days = 30) => {
      setLoadingList(true);
      try {
        const { ok, status, data } = await adminFetch(`/api/admin/analytics?days=${encodeURIComponent(days)}`);
        if (status === 401) {
          setAuthenticated(false);
          return;
        }
        if (ok && data?.ok) {
          setAnalyticsData(data);
          if (data.dbEngine) setDbEngine(data.dbEngine);
          if (data.emailConfig) setEmailConfig(data.emailConfig);
        }
      } catch {
        setServerUnreachable(true);
      } finally {
        setLoadingList(false);
      }
    },
    [adminFetch]
  );

  const loadInquiries = useCallback(async () => {
    setLoadingList(true);
    try {
      const { ok, status, data } = await adminFetch('/api/admin/inquiries');
      if (status === 401) {
        setAuthenticated(false);
        return;
      }
      if (ok && data?.ok) {
        setInquiries(data.inquiries || []);
        setStaffDirectory(data.staffDirectory || []);
        if (data.emailConfig) setEmailConfig(data.emailConfig);
        if (data.inquiries?.length > 0) {
          setSelectedRef((prev) =>
            data.inquiries.some((item) => item.reference === prev) ? prev : data.inquiries[0].reference
          );
        }
      }
    } catch {
      setServerUnreachable(true);
    } finally {
      setLoadingList(false);
    }
  }, [adminFetch]);

  const loadEmailLogs = useCallback(async () => {
    try {
      const { ok, data } = await adminFetch('/api/admin/email-logs');
      if (ok && data?.ok) setEmailLogs(data.logs || []);
    } catch {}
  }, [adminFetch]);

  const loadAuditLogs = useCallback(async () => {
    try {
      const { ok, data } = await adminFetch('/api/admin/audit-logs');
      if (ok && data?.ok) setAuditLogs(data.logs || []);
    } catch {}
  }, [adminFetch]);

  const loadUsersAndSessions = useCallback(async () => {
    try {
      const { ok, data } = await adminFetch('/api/admin/users');
      if (ok && data?.ok) {
        setUsersList(data.users || []);
        setActiveSessions(data.sessions || []);
      }
    } catch {}
  }, [adminFetch]);

  const loadSecondaryData = useCallback(
    async (perms, days = 30) => {
      const tasks = [loadSiteSettings()];
      const canReadInquiries =
        perms.includes('bookings:read_all') || perms.includes('bookings:read_own_and_unassigned');
      if (canReadInquiries) {
        tasks.push(loadInquiries());
      } else if (perms.includes('analytics:view')) {
        tasks.push(loadAnalytics(days));
      }
      if (perms.includes('emails:logs')) tasks.push(loadEmailLogs());
      if (perms.includes('audit:read')) tasks.push(loadAuditLogs());
      if (perms.includes('users:manage')) tasks.push(loadUsersAndSessions());
      await Promise.all(tasks);
    },
    [loadAnalytics, loadAuditLogs, loadEmailLogs, loadInquiries, loadSiteSettings, loadUsersAndSessions]
  );

  const performSessionCheck = useCallback(async () => {
    const redirectUrl = getRemotePortalRedirectUrl();
    if (redirectUrl) {
      window.location.replace(redirectUrl);
      return;
    }

    const candidates = getCandidateApiBases();
    let matched = null;
    for (const candidate of candidates) {
      try {
        const res = await adminFetch('/api/admin/session', {}, candidate);
        if (res.ok && res.data?.ok) {
          apiBaseRef.current = candidate;
          matched = res.data;
          break;
        }
      } catch {}
    }

    setLocalFallbackItems(readLocalFallback());
    setBttClock(getNowBttLabel());
    if (typeof window !== 'undefined' && window.location.port === '8082') {
      setPublicSiteHref(`http://${window.location.hostname}:8081/`);
    }

    if (!matched) {
      setServerUnreachable(true);
      setChecking(false);
      return;
    }

    try {
      setServerUnreachable(false);
      setConfigured(Boolean(matched.configured));
      setAuthenticated(Boolean(matched.authenticated));
      setCurrentUser(matched.user || null);
      if (matched.dbEngine) setDbEngine(matched.dbEngine);
      if (matched.siteConfig) setSiteConfig((prev) => ({ ...prev, ...matched.siteConfig }));
      const perms = Array.isArray(matched.permissions) ? matched.permissions : [];
      setPermissions(perms);
      if (matched.emailConfig) setEmailConfig(matched.emailConfig);
      if (matched.authenticated && matched.user) {
        setActiveTab(getDefaultTabForRole(matched.user.role));
        await loadSecondaryData(perms, 30);
      }
    } finally {
      setChecking(false);
    }
  }, [adminFetch, loadSecondaryData, readLocalFallback]);

  const checkSession = useCallback(async () => {
    setChecking(true);
    setServerUnreachable(false);
    await performSessionCheck();
  }, [performSessionCheck]);

  useEffect(() => {
    let active = true;
    (async () => {
      if (!active) return;
      await performSessionCheck();
    })();
    const clockTimer = setInterval(() => {
      if (active) setBttClock(getNowBttLabel());
    }, 30000);
    return () => {
      active = false;
      clearInterval(clockTimer);
    };
  }, [performSessionCheck]);

  const hasBookingsAccess =
    permissions.includes('bookings:inbox') ||
    permissions.includes('bookings:read_all') ||
    permissions.includes('bookings:read_own_and_unassigned');
  const hasInboxWorkspace = permissions.includes('bookings:inbox');

  useEffect(() => {
    const onKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k' && hasInboxWorkspace) {
        e.preventDefault();
        setShowQuickSearch((prev) => !prev);
        setShowAlertsPopover(false);
        setShowProfileMenu(false);
        setTimeout(() => quickSearchInputRef.current?.focus(), 30);
      } else if (e.key === 'Escape') {
        setShowQuickSearch(false);
        setShowAlertsPopover(false);
        setShowProfileMenu(false);
        setMobileNavOpen(false);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [hasInboxWorkspace]);

  const alerts = useMemo(
    () => (hasInboxWorkspace ? computePortalAlerts(inquiries) : []),
    [hasInboxWorkspace, inquiries]
  );

  const unassignedCount = useMemo(
    () => inquiries.filter((i) => !i.assignedUserId && i.status !== 'archived').length,
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

  const pendingDepositsCount = useMemo(
    () =>
      inquiries.filter(
        (i) => i.type === 'booking' && i.status !== 'archived' && !i.payment?.depositVerified
      ).length,
    [inquiries]
  );

  const failedEmailCount = useMemo(
    () => emailLogs.filter((l) => l.status === 'failed').length,
    [emailLogs]
  );

  const quickSearchResults = useMemo(() => {
    const q = quickSearchQuery.trim().toLowerCase();
    if (!q) return inquiries.slice(0, 6);
    return inquiries
      .filter((i) =>
        [i.reference, i.fullName, i.email, i.phone, i.tourTitle]
          .filter(Boolean)
          .join(' ')
          .toLowerCase()
          .includes(q)
      )
      .slice(0, 8);
  }, [inquiries, quickSearchQuery]);

  const jumpToBooking = (ref) => {
    if (!hasInboxWorkspace) return;
    setSelectedRef(ref);
    setActiveTab('bookings');
    setShowQuickSearch(false);
    setShowAlertsPopover(false);
    setMobileNavOpen(false);
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoginError('');
    setLoggingIn(true);
    try {
      const { ok, data } = await adminFetch('/api/admin/login', {
        method: 'POST',
        body: JSON.stringify({ email: loginEmail.trim() || undefined, password }),
      });
      if (!ok || !data?.ok) {
        setLoginError(data?.error?.message || 'Unable to sign in.');
        return;
      }
      setPassword('');
      setAuthenticated(true);
      setDismissedRoleMismatch(true);
      setCurrentUser(data.user || null);
      if (data.dbEngine) setDbEngine(data.dbEngine);
      if (data.siteConfig) setSiteConfig((prev) => ({ ...prev, ...data.siteConfig }));
      const perms = Array.isArray(data.permissions) ? data.permissions : [];
      setPermissions(perms);
      if (data.emailConfig) setEmailConfig(data.emailConfig);
      setActiveTab(getDefaultTabForRole(data.user?.role));
      await loadSecondaryData(perms, 30);
    } catch {
      setServerUnreachable(true);
    } finally {
      setLoggingIn(false);
    }
  };

  const handleLogout = async () => {
    try {
      await adminFetch('/api/admin/logout', { method: 'POST' });
    } catch {}
    setAuthenticated(false);
    setCurrentUser(null);
    setPermissions([]);
    setAnalyticsData(null);
    setInquiries([]);
    setEmailLogs([]);
    setAuditLogs([]);
    setUsersList([]);
    setActiveSessions([]);
    setShowProfileMenu(false);
    setBanner(null);
  };

  const handleAnalyticsRangeChange = async (days) => {
    setAnalyticsDays(days);
    await loadAnalytics(days);
  };

  const handleSaveBooking = async (ref, payload) => {
    setBanner(null);
    const { ok, data } = await adminFetch(`/api/admin/inquiries/${encodeURIComponent(ref)}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    });
    if (!ok || !data?.ok) {
      setBanner({ kind: 'error', text: data?.error?.message || 'Failed to save booking.' });
      return false;
    }
    setInquiries((prev) => prev.map((i) => (i.reference === ref ? data.inquiry : i)));
    setBanner({ kind: 'success', text: `Saved updates for ${ref}.` });
    if (permissions.includes('audit:read')) loadAuditLogs();
    return true;
  };

  const handleClaimBooking = async (ref) => {
    setBanner(null);
    const { ok, data } = await adminFetch(`/api/admin/inquiries/${encodeURIComponent(ref)}/claim`, {
      method: 'POST',
    });
    if (!ok || !data?.ok) {
      setBanner({ kind: 'error', text: data?.error?.message || 'Could not claim booking.' });
      return false;
    }
    setInquiries((prev) => prev.map((i) => (i.reference === ref ? data.inquiry : i)));
    setBanner({ kind: 'success', text: `Claimed ${ref} into your Reservations queue.` });
    return true;
  };

  const handleAssignBooking = async (ref, assignedUserId) => {
    return handleSaveBooking(ref, { assignedUserId });
  };

  const handleSavePayment = async (ref, payload) => {
    setBanner(null);
    const { ok, data } = await adminFetch(`/api/admin/inquiries/${encodeURIComponent(ref)}/payment`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    });
    if (!ok || !data?.ok) {
      setBanner({ kind: 'error', text: data?.error?.message || 'Could not update payment ledger.' });
      return false;
    }
    setInquiries((prev) => prev.map((i) => (i.reference === ref ? data.inquiry : i)));
    setBanner({
      kind: 'success',
      text:
        payload.depositVerified === true
          ? `Deposit verified for ${ref} — Reservations can now confirm this trip.`
          : `Updated Finance ledger for ${ref}.`,
    });
    return true;
  };

  const handleSaveSettings = async (payload) => {
    setBanner(null);
    const { ok, data } = await adminFetch('/api/admin/settings', {
      method: 'PATCH',
      body: JSON.stringify(payload),
    });
    if (!ok || !data?.ok) {
      setBanner({ kind: 'error', text: data?.error?.message || 'Could not update Bhutan statutory rates.' });
      return false;
    }
    if (data.settings) setSiteConfig((prev) => ({ ...prev, ...data.settings }));
    const changedCount = Object.keys(data.diff || {}).length;
    setBanner({
      kind: 'success',
      text:
        changedCount > 0
          ? `Saved ${changedCount} live update(s) — public website & emails now use the updated Bhutan rates.`
          : 'Settings saved (no values changed).',
    });
    if (permissions.includes('audit:read')) loadAuditLogs();
    if (currentUser?.role === 'super_admin') loadAnalytics(analyticsDays);
    return true;
  };

  const handleToggleChecklist = async (ref, checklistPatch) => {
    setBanner(null);
    const { ok, data } = await adminFetch(`/api/admin/inquiries/${encodeURIComponent(ref)}`, {
      method: 'PATCH',
      body: JSON.stringify({ checklist: checklistPatch }),
    });
    if (!ok || !data?.ok) {
      setBanner({ kind: 'error', text: data?.error?.message || 'Could not update checklist.' });
      return false;
    }
    setInquiries((prev) => prev.map((i) => (i.reference === ref ? data.inquiry : i)));
    if (permissions.includes('audit:read')) loadAuditLogs();
    return true;
  };

  const handleBulkStatus = async (references, status) => {
    setBanner(null);
    const { ok, data } = await adminFetch('/api/admin/inquiries/bulk-status', {
      method: 'POST',
      body: JSON.stringify({ references, status }),
    });
    if (!ok || !data?.ok) {
      setBanner({ kind: 'error', text: data?.error?.message || 'Bulk update failed.' });
      return false;
    }
    const skippedMsg =
      data.skippedUnverified?.length > 0
        ? ` (${data.skippedUnverified.length} skipped — awaiting Finance deposit verification)`
        : '';
    setBanner({
      kind: 'success',
      text: `Updated ${data.updatedCount} request(s) to "${status}"${skippedMsg}.`,
    });
    await loadInquiries();
    if (permissions.includes('audit:read')) loadAuditLogs();
    return true;
  };

  const handleResendEmail = async (ref) => {
    setBanner(null);
    const { ok, data } = await adminFetch(`/api/admin/inquiries/${encodeURIComponent(ref)}/resend`, {
      method: 'POST',
    });
    if (data?.inquiry) {
      setInquiries((prev) => prev.map((i) => (i.reference === ref ? data.inquiry : i)));
    }
    if (permissions.includes('emails:logs')) loadEmailLogs();
    if (permissions.includes('audit:read')) loadAuditLogs();
    if (!ok || !data?.ok) {
      setBanner({ kind: 'error', text: data?.error?.message || 'Email delivery failed.' });
      return false;
    }
    setBanner({
      kind: 'success',
      text: `Email resent for ${ref} via ${String(data.emailResult?.provider || '').toUpperCase()}.`,
    });
    return true;
  };

  const handleTestEmail = async () => {
    setBanner(null);
    const { ok, data } = await adminFetch('/api/admin/test-email', { method: 'POST' });
    if (permissions.includes('emails:logs')) loadEmailLogs();
    if (permissions.includes('audit:read')) loadAuditLogs();
    if (!ok || !data?.ok) {
      setBanner({ kind: 'error', text: data?.error?.message || 'Test email failed.' });
      return;
    }
    setBanner({
      kind: 'success',
      text: `Test email sent to ${data.adminTo} via ${String(data.provider || '').toUpperCase()}.`,
    });
  };

  const handleDeleteBooking = async (ref) => {
    setBanner(null);
    const { ok, data } = await adminFetch(`/api/admin/inquiries/${encodeURIComponent(ref)}`, {
      method: 'DELETE',
    });
    if (!ok || !data?.ok) {
      setBanner({ kind: 'error', text: data?.error?.message || 'Unable to delete booking.' });
      return false;
    }
    setInquiries((prev) => prev.filter((i) => i.reference !== ref));
    setBanner({ kind: 'success', text: `Permanently purged ${ref} (Privacy deletion recorded).` });
    if (permissions.includes('audit:read')) loadAuditLogs();
    return true;
  };

  const handleSyncLocal = async (item) => {
    setBanner(null);
    try {
      const base = apiBaseRef.current ?? getCandidateApiBases()[0];
      const res = await fetch(`${base}/api/inquiries`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(item),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.ok) {
        setBanner({ kind: 'error', text: data?.error?.message || 'Could not sync local booking.' });
        return;
      }
      const nextLocal = localFallbackItems.filter((x) => x.reference !== item.reference);
      setLocalFallbackItems(nextLocal);
      try {
        localStorage.setItem('yuevaan_saved_inquiries', JSON.stringify([...nextLocal].reverse()));
      } catch {}
      setBanner({ kind: 'success', text: `Synced ${item.fullName}'s request under ${data.reference}.` });
      await loadInquiries();
    } catch {
      setBanner({ kind: 'error', text: 'Could not reach server to sync local booking.' });
    }
  };

  const handleCreateUser = async (payload) => {
    setBanner(null);
    const { ok, data } = await adminFetch('/api/admin/users', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    if (!ok || !data?.ok) {
      setBanner({ kind: 'error', text: data?.error?.message || 'Could not create user.' });
      return false;
    }
    setBanner({ kind: 'success', text: `Created staff account for ${data.user.email} (${data.user.roleLabel}).` });
    await Promise.all([
      loadUsersAndSessions(),
      loadAuditLogs(),
      currentUser?.role === 'super_admin' ? loadAnalytics(analyticsDays) : Promise.resolve(),
    ]);
    return true;
  };

  const handleUpdateUser = async (userId, patch) => {
    setBanner(null);
    const { ok, data } = await adminFetch(`/api/admin/users/${encodeURIComponent(userId)}`, {
      method: 'PATCH',
      body: JSON.stringify(patch),
    });
    if (!ok || !data?.ok) {
      setBanner({ kind: 'error', text: data?.error?.message || 'Could not update user.' });
      return false;
    }
    setBanner({ kind: 'success', text: `Updated staff account ${data.user.email}.` });
    await Promise.all([
      loadUsersAndSessions(),
      loadAuditLogs(),
      currentUser?.role === 'super_admin' ? loadAnalytics(analyticsDays) : Promise.resolve(),
    ]);
    return true;
  };

  const handleRevokeSession = async (sessionId) => {
    setBanner(null);
    const { ok, data } = await adminFetch(`/api/admin/sessions/${encodeURIComponent(sessionId)}`, {
      method: 'DELETE',
    });
    if (!ok || !data?.ok) {
      setBanner({ kind: 'error', text: data?.error?.message || 'Could not revoke session.' });
      return;
    }
    setBanner({ kind: 'success', text: 'Session revoked immediately.' });
    await Promise.all([loadUsersAndSessions(), loadAuditLogs()]);
  };

  const handleChangePassword = async (currentPassword, newPassword) => {
    setBanner(null);
    const { ok, data } = await adminFetch('/api/admin/account/password', {
      method: 'POST',
      body: JSON.stringify({ currentPassword, newPassword }),
    });
    if (!ok || !data?.ok) {
      setBanner({ kind: 'error', text: data?.error?.message || 'Password update failed.' });
      return false;
    }
    setBanner({ kind: 'success', text: 'Your password has been updated.' });
    if (permissions.includes('audit:read')) loadAuditLogs();
    return true;
  };

  const handleDownloadBackup = async () => {
    setBanner(null);
    try {
      const base = apiBaseRef.current ?? getCandidateApiBases()[0];
      const res = await fetch(`${base}/api/admin/backup`, { credentials: 'include' });
      if (!res.ok) {
        setBanner({ kind: 'error', text: 'Backup download failed.' });
        return;
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `yuevaan-backup-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
      setBanner({ kind: 'success', text: 'Sanitized JSON backup downloaded.' });
      if (permissions.includes('audit:read')) loadAuditLogs();
    } catch {
      setBanner({ kind: 'error', text: 'Could not reach server for backup.' });
    }
  };

  const renderAuthShell = (content) => (
    <div className={styles.portalShell}>
      <header className={styles.portalBar}>
        <div className={styles.portalBarInner}>
          <div className={styles.portalBrand}>
            <img
              src="/logos/yuevaan-logo.png"
              alt="Yuevaan Bhutan Travels"
              width={36}
              height={36}
              className={styles.portalBrandLogo}
            />
            <div className={styles.portalBrandText}>
              <span className={styles.portalBrandName}>Yuevaan Admin Portal</span>
              <span className={styles.portalBrandSub}>Thimphu Operations &amp; Governance</span>
            </div>
            <span className={styles.portalBadge}>Private</span>
          </div>

          <a
            href={publicSiteHref}
            target="_blank"
            rel="noopener noreferrer"
            className={styles.portalSiteLink}
          >
            <span>Open Website ↗</span>
          </a>
        </div>
      </header>

      <main id="main-content" className={styles.portalAuthScreen}>
        {content}
      </main>

      <footer className={styles.portalFooter}>
        {siteConfig.name} · Private Admin Portal · Licence {siteConfig.licence?.number}
      </footer>
    </div>
  );

  if (checking) {
    return renderAuthShell(
      <div className={styles.loginWrap}>
        <h1 className={styles.loginTitle}>Admin Portal</h1>
        <p className={styles.loginSub}>Connecting to the reservations server…</p>
      </div>
    );
  }

  if (serverUnreachable) {
    return renderAuthShell(
      <div className={styles.loginWrap}>
        <div className={styles.loginBrand}>
          <img src="/logos/yuevaan-logo.png" alt="Yuevaan Bhutan Travels" width={40} height={40} />
          <strong>{siteConfig.name}</strong>
        </div>
        <h1 className={styles.loginTitle}>Start the Booking Server</h1>
        <p className={styles.loginSub}>
          The Admin Portal connects to <span className={styles.codeInline}>server.js</span> to read saved bookings
          and send automatic emails. Run <span className={styles.codeInline}>npm start</span> in your project folder,
          then open <span className={styles.codeInline}>http://localhost:8082</span> or click retry below.
        </p>
        <button type="button" onClick={checkSession} className={`btn btn-primary ${styles.loginSubmit}`}>
          Retry Connection
        </button>

        {localFallbackItems.length > 0 ? (
          <div className={styles.localBox}>
            <h2 className={styles.localTitle}>
              Browser Preview Bookings ({localFallbackItems.length})
            </h2>
            <p className={styles.localDesc}>
              These requests were saved in your browser during <span className={styles.codeInline}>npm run dev</span>{' '}
              before <span className={styles.codeInline}>server.js</span> was running:
            </p>
            <div className={styles.listPane}>
              {localFallbackItems.map((item) => (
                <div key={item.reference} className={styles.rowBtn}>
                  <div className={styles.rowTop}>
                    <span className={styles.refCode}>{item.reference}</span>
                    <span className={`${styles.badge} ${styles.badgeBooking}`}>{item.type}</span>
                  </div>
                  <div className={styles.rowTitle}>
                    {item.fullName} · {item.email}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : null}
      </div>
    );
  }

  const roleMismatch =
    Boolean(portalRole) &&
    authenticated &&
    Boolean(currentUser?.role) &&
    currentUser.role !== portalRole &&
    !dismissedRoleMismatch;

  const portalMeta = portalRole ? PORTAL_ROLE_META[portalRole] : null;

  if (!authenticated || roleMismatch) {
    return renderAuthShell(
      <div className={styles.loginWrap}>
        <div className={styles.loginBrand}>
          <img src="/logos/yuevaan-logo.png" alt="Yuevaan Bhutan Travels" width={40} height={40} />
          <strong>{siteConfig.name}</strong>
          {portalMeta ? <span className={styles.portalBadge}>{portalMeta.badge}</span> : null}
        </div>
        <h1 className={styles.loginTitle}>
          {portalMeta ? portalMeta.title : 'Admin Portal Sign In'}
        </h1>
        <p className={styles.loginSub}>
          {portalMeta
            ? portalMeta.subtitle
            : 'Sign in with your staff email & password (or leave email blank for Owner sign-in).'}
        </p>

        {roleMismatch ? (
          <div className={`${styles.noticeBanner} ${styles.noticeInfo}`} role="status">
            <div>
              <strong>Currently signed in as {currentUser.roleLabel}</strong> ({currentUser.email}). Enter your{' '}
              <strong>{portalMeta?.badge || portalRole}</strong> staff email and password below to switch accounts, or{' '}
              <button
                type="button"
                onClick={() => setDismissedRoleMismatch(true)}
                className={styles.tableLinkBtn}
              >
                continue as {currentUser.roleLabel} →
              </button>
            </div>
          </div>
        ) : null}

        {!configured ? (
          <div className={`${styles.noticeBanner} ${styles.noticeError}`} role="alert">
            <strong>Admin password not set yet.</strong> Add{' '}
            <span className={styles.codeInline}>ADMIN_PASSWORD=your-secret</span> in{' '}
            <span className={styles.codeInline}>.env</span> and restart <span className={styles.codeInline}>npm start</span>.
          </div>
        ) : null}

        {loginError ? (
          <div className={`${styles.noticeBanner} ${styles.noticeError}`} role="alert">
            {loginError}
          </div>
        ) : null}

        <form onSubmit={handleLogin} className={styles.loginForm}>
          <div>
            <label htmlFor="adminEmail" className="rtb-field-label">
              {portalRole && portalRole !== 'super_admin'
                ? `${portalMeta?.badge || 'Staff'} Email`
                : 'Staff Email (optional for Owner)'}
            </label>
            <input
              id="adminEmail"
              type="email"
              required={Boolean(portalRole && portalRole !== 'super_admin')}
              autoComplete="username"
              value={loginEmail}
              onChange={(e) => setLoginEmail(e.target.value)}
              className="rtb-input"
              placeholder={
                portalRole === 'reservation'
                  ? 'reservation@yuevaantravels.bt'
                  : portalRole === 'manager'
                    ? 'manager@yuevaantravels.bt'
                    : portalRole === 'finance'
                      ? 'finance@yuevaantravels.bt'
                      : 'staff@yuevaantravels.bt'
              }
            />
          </div>
          <div>
            <label htmlFor="adminPassword" className="rtb-field-label">
              Password
            </label>
            <input
              id="adminPassword"
              type="password"
              required
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="rtb-input"
              placeholder="Enter password"
            />
          </div>
          <button
            type="submit"
            disabled={loggingIn || !configured}
            className={`btn btn-primary ${styles.loginSubmit}`}
          >
            {loggingIn
              ? 'Signing in…'
              : `Sign In to ${portalMeta ? `${portalMeta.badge} ` : ''}Portal →`}
          </button>
        </form>
      </div>
    );
  }

  const role = currentUser?.role || 'reservation';

  let navGroups = [];
  if (role === 'super_admin') {
    navGroups = [
      {
        label: 'Executive',
        items: [{ id: 'owner-overview', label: 'Executive Overview', icon: 'dashboard', show: true }],
      },
      {
        label: 'Governance & Rates',
        items: [
          { id: 'users', label: 'Users & Roles', icon: 'users', show: true },
          { id: 'audit', label: 'Audit Log', icon: 'clipboardList', show: true },
          { id: 'settings', label: 'Bhutan Rates & Settings', icon: 'settings', show: true },
        ],
      },
    ];
  } else if (role === 'manager') {
    navGroups = [
      {
        label: 'Manager Desk',
        items: [
          { id: 'manager-overview', label: 'Manager Overview', icon: 'dashboard', show: true },
          { id: 'bookings', label: 'All Bookings', icon: 'inbox', badge: unassignedCount, show: true },
        ],
      },
      {
        label: 'Bhutan Operations',
        items: [
          { id: 'operations', label: 'Visa, Permits & SDF', icon: 'fileCheck', badge: pendingOpsCount, show: true },
        ],
      },
      {
        label: 'Oversight',
        items: [
          { id: 'emails', label: 'Email Logs', icon: 'mail', badge: failedEmailCount, badgeTone: 'danger', show: true },
          { id: 'audit', label: 'Audit Log', icon: 'clipboardList', show: true },
          { id: 'settings', label: 'Settings', icon: 'settings', show: true },
        ],
      },
    ];
  } else if (role === 'finance') {
    navGroups = [
      {
        label: 'Finance & Accounts',
        items: [
          { id: 'finance-overview', label: 'Finance Overview', icon: 'dashboard', show: true },
          {
            id: 'finance-payments',
            label: 'Payments & Deposits',
            icon: 'fileCheck',
            badge: pendingDepositsCount,
            show: true,
          },
          { id: 'finance-ledger', label: 'SDF & Visa Ledger', icon: 'clipboardList', show: true },
        ],
      },
      {
        label: 'Reference',
        items: [{ id: 'settings', label: 'Rates & Settings', icon: 'settings', show: true }],
      },
    ];
  } else {
    navGroups = [
      {
        label: 'Reservations Desk',
        items: [
          { id: 'res-desk', label: 'My Desk', icon: 'dashboard', show: true },
          { id: 'bookings', label: 'Bookings Queue', icon: 'inbox', badge: unassignedCount, show: true },
        ],
      },
      {
        label: 'Bhutan Operations',
        items: [
          { id: 'operations', label: 'Visa, Permits & SDF', icon: 'fileCheck', badge: pendingOpsCount, show: true },
        ],
      },
      {
        label: 'Account',
        items: [{ id: 'settings', label: 'Rates & Settings', icon: 'settings', show: true }],
      },
    ];
  }

  const userInitials = String(currentUser?.name || 'AD')
    .split(/\s+/)
    .map((w) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  return (
    <div className={`${styles.appFrame}${sidebarCollapsed ? ` ${styles.appFrameCollapsed}` : ''}`}>
      {mobileNavOpen ? (
        <div
          className={styles.mobileBackdrop}
          onClick={() => setMobileNavOpen(false)}
          aria-hidden="true"
        />
      ) : null}

      <aside
        className={`${styles.sidebar}${sidebarCollapsed ? ` ${styles.sidebarCollapsed}` : ''}${mobileNavOpen ? ` ${styles.sidebarMobileOpen}` : ''}`}
        aria-label="Admin Portal Navigation"
      >
        <div className={styles.sidebarBrand}>
          <img
            src="/logos/yuevaan-logo.png"
            alt="Yuevaan Bhutan Travels"
            width={34}
            height={34}
            className={styles.portalBrandLogo}
          />
          {!sidebarCollapsed ? (
            <div className={styles.portalBrandText}>
              <span className={styles.sidebarBrandTitle}>Yuevaan Portal</span>
              <span className={styles.portalBrandSub}>{currentUser?.roleLabel || 'Staff'}</span>
            </div>
          ) : null}
        </div>

        <nav className={styles.sidebarNav}>
          {navGroups.map((group) => {
            const visibleItems = group.items.filter((i) => i.show);
            if (visibleItems.length === 0) return null;
            return (
              <div key={group.label} className={styles.sidebarGroup}>
                {!sidebarCollapsed ? (
                  <span className={styles.sidebarGroupLabel}>{group.label}</span>
                ) : null}
                {visibleItems.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    aria-label={sidebarCollapsed ? item.label : undefined}
                    onClick={() => {
                      setActiveTab(item.id);
                      setMobileNavOpen(false);
                    }}
                    title={sidebarCollapsed ? item.label : undefined}
                    className={`${styles.sidebarItem}${activeTab === item.id ? ` ${styles.sidebarItemActive}` : ''}`}
                  >
                    <Icon name={item.icon} size={18} />
                    {!sidebarCollapsed ? <span className={styles.sidebarItemLabel}>{item.label}</span> : null}
                    {!sidebarCollapsed && item.badge > 0 ? (
                      <span
                        className={`${styles.sidebarBadge}${item.badgeTone === 'danger' ? ` ${styles.sidebarBadgeDanger}` : ''}`}
                      >
                        {item.badge}
                      </span>
                    ) : null}
                  </button>
                ))}
              </div>
            );
          })}
        </nav>

        <div className={styles.sidebarFoot}>
          <a
            href={publicSiteHref}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Open Public Website"
            title="Open Public Website"
            className={styles.sidebarFootLink}
          >
            <Icon name="external" size={16} />
            {!sidebarCollapsed ? <span>Open Public Website</span> : null}
          </a>
        </div>
      </aside>

      <div className={styles.appMainCol}>
        <header className={styles.smartHeader}>
          <div className={styles.smartHeaderLeft}>
            <button
              type="button"
              onClick={() => {
                if (typeof window !== 'undefined' && window.innerWidth < 960) {
                  setMobileNavOpen((prev) => !prev);
                } else {
                  setSidebarCollapsed((prev) => !prev);
                }
              }}
              aria-label="Toggle sidebar navigation"
              className={styles.iconBtn}
            >
              <Icon name="panelLeft" size={18} />
            </button>
            <div className={styles.headerCrumb}>
              <span className={styles.crumbRoot}>{currentUser?.roleLabel || 'Portal'}</span>
              <span className={styles.crumbSep}>/</span>
              <strong>{SECTION_LABELS[activeTab] || 'Dashboard'}</strong>
            </div>
          </div>

          <div className={styles.smartHeaderRight}>
            {hasInboxWorkspace ? (
              <button
                type="button"
                aria-label="Quick search bookings"
                onClick={() => {
                  setShowQuickSearch(true);
                  setShowAlertsPopover(false);
                  setShowProfileMenu(false);
                  setTimeout(() => quickSearchInputRef.current?.focus(), 30);
                }}
                className={styles.searchTrigger}
              >
                <Icon name="search" size={15} />
                <span>Quick search…</span>
                <kbd className={styles.kbdHint}>Ctrl K</kbd>
              </button>
            ) : null}

            <span
              className={emailConfig.configured ? styles.headerEmailOk : styles.headerEmailOff}
              title={emailConfig.configured ? `Active via ${emailConfig.provider}` : 'Email not configured in .env'}
            >
              {emailConfig.configured
                ? `● ${String(emailConfig.provider || '').toUpperCase()}`
                : '○ Email Off'}
            </span>

            {bttClock ? <span className={styles.clockChip}>{bttClock}</span> : null}

            {hasInboxWorkspace ? (
              <div className={styles.popoverAnchor}>
                <button
                  type="button"
                  aria-label="Open notifications"
                  onClick={() => {
                    setShowAlertsPopover((prev) => !prev);
                    setShowProfileMenu(false);
                  }}
                  className={styles.iconBtn}
                >
                  <Icon name="bell" size={18} />
                  {alerts.length > 0 ? <span className={styles.bellBadge}>{alerts.length}</span> : null}
                </button>

                {showAlertsPopover ? (
                  <div className={styles.popoverPanel} role="dialog" aria-label="Desk Notifications">
                    <div className={styles.popoverHead}>
                      <strong>Desk Alerts ({alerts.length})</strong>
                      <button
                        type="button"
                        onClick={() => setShowAlertsPopover(false)}
                        className={styles.tableLinkBtn}
                      >
                        Close
                      </button>
                    </div>
                    {alerts.length === 0 ? (
                      <p className={styles.popoverEmpty}>All caught up! Zero overdue alerts.</p>
                    ) : (
                      <ul className={styles.popoverList}>
                        {alerts.slice(0, 6).map((a) => (
                          <li key={a.id}>
                            <button
                              type="button"
                              onClick={() => jumpToBooking(a.reference)}
                              className={styles.popoverItemBtn}
                            >
                              <strong>{a.title}</strong>
                              <span>{a.detail}</span>
                            </button>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                ) : null}
              </div>
            ) : null}

            <div className={styles.popoverAnchor}>
              <button
                type="button"
                onClick={() => {
                  setShowProfileMenu((prev) => !prev);
                  setShowAlertsPopover(false);
                }}
                className={styles.profileBtn}
              >
                <span className={styles.avatarCircle}>{userInitials}</span>
                <span className={styles.profileMeta}>
                  <strong>{currentUser?.name || 'Admin'}</strong>
                  <span>{currentUser?.roleLabel || 'Owner'}</span>
                </span>
              </button>

              {showProfileMenu ? (
                <div className={styles.popoverPanel} role="menu">
                  <div className={styles.popoverHead}>
                    <div>
                      <strong>{currentUser?.name}</strong>
                      <div className={styles.cellSub}>{currentUser?.email}</div>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setActiveTab('settings');
                      setShowProfileMenu(false);
                    }}
                    className={styles.menuItemBtn}
                  >
                    <Icon name="key" size={15} />
                    <span>Password &amp; Settings</span>
                  </button>
                  <a
                    href={publicSiteHref}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={styles.menuItemBtn}
                  >
                    <Icon name="external" size={15} />
                    <span>Open Public Website ↗</span>
                  </a>
                  <button
                    type="button"
                    onClick={handleLogout}
                    className={`${styles.menuItemBtn} ${styles.menuItemDanger}`}
                  >
                    <Icon name="logOut" size={15} />
                    <span>Sign Out</span>
                  </button>
                </div>
              ) : null}
            </div>
          </div>
        </header>

        <main id="main-content" className={styles.workspaceMain}>
          {banner ? (
            <div
              className={`${styles.noticeBanner} ${
                banner.kind === 'error'
                  ? styles.noticeError
                  : banner.kind === 'success'
                    ? styles.noticeSuccess
                    : styles.noticeInfo
              }`}
              role="status"
            >
              <span>{banner.text}</span>
              <button
                type="button"
                onClick={() => setBanner(null)}
                className={styles.bannerDismiss}
                aria-label="Dismiss notification"
              >
                ×
              </button>
            </div>
          ) : null}

          {activeTab === 'owner-overview' && role === 'super_admin' ? (
            <OwnerDashboardView
              analyticsData={analyticsData}
              rangeDays={analyticsDays}
              onRangeChange={handleAnalyticsRangeChange}
              siteConfig={siteConfig}
              dbEngine={dbEngine}
              onNavigate={setActiveTab}
              onRefresh={() => loadSecondaryData(permissions, analyticsDays)}
              loading={loadingList}
            />
          ) : null}

          {activeTab === 'manager-overview' && role === 'manager' ? (
            <ManagerDashboardView
              inquiries={inquiries}
              staffDirectory={staffDirectory}
              alerts={alerts}
              siteConfig={siteConfig}
              onAssignBooking={handleAssignBooking}
              onSelectBooking={jumpToBooking}
              onNavigate={setActiveTab}
              onRefresh={() => loadSecondaryData(permissions)}
              loading={loadingList}
            />
          ) : null}

          {activeTab === 'res-desk' && role === 'reservation' ? (
            <ReservationsDashboardView
              currentUser={currentUser}
              inquiries={inquiries}
              alerts={alerts}
              siteConfig={siteConfig}
              onClaimBooking={handleClaimBooking}
              onSelectBooking={jumpToBooking}
              onNavigate={setActiveTab}
              onRefresh={loadInquiries}
              loading={loadingList}
            />
          ) : null}

          {(activeTab === 'finance-overview' ||
            activeTab === 'finance-payments' ||
            activeTab === 'finance-ledger') &&
          role === 'finance' ? (
            <FinanceDashboardView
              mode={
                activeTab === 'finance-payments'
                  ? 'payments'
                  : activeTab === 'finance-ledger'
                    ? 'ledger'
                    : 'overview'
              }
              inquiries={inquiries}
              siteConfig={siteConfig}
              onSavePayment={handleSavePayment}
              onNavigate={setActiveTab}
              onRefresh={loadInquiries}
              loading={loadingList}
            />
          ) : null}

          {activeTab === 'bookings' && hasInboxWorkspace ? (
            <BookingsWorkspace
              currentUser={currentUser}
              siteConfig={siteConfig}
              inquiries={inquiries}
              staffDirectory={staffDirectory}
              permissions={permissions}
              selectedRef={selectedRef}
              onSelectRef={setSelectedRef}
              localFallbackItems={localFallbackItems}
              onSaveBooking={handleSaveBooking}
              onClaimBooking={handleClaimBooking}
              onToggleChecklist={handleToggleChecklist}
              onBulkStatus={handleBulkStatus}
              onResendEmail={handleResendEmail}
              onDeleteBooking={handleDeleteBooking}
              onSyncLocal={handleSyncLocal}
              onRefresh={loadInquiries}
              loading={loadingList}
            />
          ) : null}

          {activeTab === 'operations' && hasInboxWorkspace ? (
            <OperationsChecklistView
              inquiries={inquiries}
              permissions={permissions}
              siteConfig={siteConfig}
              onToggleChecklist={handleToggleChecklist}
              onOpenBooking={jumpToBooking}
            />
          ) : null}

          {activeTab === 'emails' && permissions.includes('emails:logs') ? (
            <EmailLogsView
              logs={emailLogs}
              emailConfig={emailConfig}
              permissions={permissions}
              onResendBookingEmail={handleResendEmail}
              onTestEmail={handleTestEmail}
              onRefresh={loadEmailLogs}
              loading={loadingList}
            />
          ) : null}

          {activeTab === 'users' && permissions.includes('users:manage') ? (
            <UsersRolesView
              currentUser={currentUser}
              users={usersList}
              sessions={activeSessions}
              onCreateUser={handleCreateUser}
              onUpdateUser={handleUpdateUser}
              onRevokeSession={handleRevokeSession}
              onRefresh={loadUsersAndSessions}
            />
          ) : null}

          {activeTab === 'audit' && permissions.includes('audit:read') ? (
            <AuditLogView
              logs={auditLogs}
              onRefresh={loadAuditLogs}
              onOpenBooking={jumpToBooking}
              canOpenBooking={hasInboxWorkspace}
            />
          ) : null}

          {activeTab === 'settings' ? (
            <SettingsView
              currentUser={currentUser}
              permissions={permissions}
              emailConfig={emailConfig}
              siteSettings={siteConfig}
              dbEngine={dbEngine}
              onTestEmail={handleTestEmail}
              onChangePassword={handleChangePassword}
              onDownloadBackup={handleDownloadBackup}
              onSaveSettings={handleSaveSettings}
            />
          ) : null}
        </main>

        <footer className={styles.portalFooter}>
          {siteConfig.name} · Private Admin Portal · DoT Licence {siteConfig.licence?.number}
        </footer>
      </div>

      {showQuickSearch && hasInboxWorkspace ? (
        <div
          className={styles.modalBackdrop}
          role="dialog"
          aria-modal="true"
          aria-label="Quick search bookings"
          onClick={() => setShowQuickSearch(false)}
        >
          <div className={styles.quickSearchCard} onClick={(e) => e.stopPropagation()}>
            <div className={styles.quickSearchBar}>
              <Icon name="search" size={18} />
              <input
                ref={quickSearchInputRef}
                type="search"
                aria-label="Search bookings by reference, guest, email, or tour"
                value={quickSearchQuery}
                onChange={(e) => setQuickSearchQuery(e.target.value)}
                placeholder="Type booking ref (YBT-…), guest name, email, or tour…"
                className={styles.quickSearchInput}
              />
              <button
                type="button"
                onClick={() => setShowQuickSearch(false)}
                className={styles.tableLinkBtn}
              >
                Esc
              </button>
            </div>
            <div className={styles.quickSearchList}>
              {quickSearchResults.length === 0 ? (
                <p className={styles.popoverEmpty}>No matching requests found.</p>
              ) : (
                quickSearchResults.map((item) => (
                  <button
                    key={item.reference}
                    type="button"
                    onClick={() => jumpToBooking(item.reference)}
                    className={styles.popoverItemBtn}
                  >
                    <strong>
                      {item.reference} · {item.fullName}
                    </strong>
                    <span>
                      {item.type === 'booking' ? item.tourTitle : 'General Inquiry'} · {item.status}
                    </span>
                  </button>
                ))
              )}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
