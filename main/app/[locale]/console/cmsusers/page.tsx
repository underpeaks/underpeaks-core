'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { Users, Settings2, Save }                    from 'lucide-react';
import UserKpiBar    from './components/UserKpiBar';
import UserFilters   from './components/UserFilters';
import UserTable     from './components/UserTable';
import UserDrawer    from './components/UserDrawer';
import { KpiPageConfig, KpiResult }               from '../kpi/kpi';
import { computeAllKpis }                          from '../kpi/kpiEngine';
import { UserListRow, FilterState, SortState }     from '../types/users';
import { useAuth }                                 from '../layout';
import { logActivity }                             from '@/app/lib/logActivity';

const USER_KPI_FIELDS = [
  { value: 'role',         label: 'Role' },
  { value: 'status',       label: 'Status' },
  { value: 'created_at',   label: 'Date joined' },
  { value: 'last_login',   label: 'Last login' },
  { value: 'is_logged_in', label: 'Online status' },
  { value: 'display_name', label: 'Name' },
  { value: 'user_email',   label: 'Email' },
];

const DB_TYPE = process.env.NEXT_PUBLIC_DB_TYPE;

async function firebaseSendPasswordReset(email: string): Promise<void> {
  const { initializeApp, getApps }          = await import('firebase/app');
  const { getAuth, sendPasswordResetEmail } = await import('firebase/auth');
  const { parseFirebaseWebConfig }          = await import('@/app/lib/firebaseConfig');
  const firebaseConfig = parseFirebaseWebConfig(process.env.NEXT_PUBLIC_FIREBASE_CONFIG);
  if (!getApps().length) initializeApp(firebaseConfig);
  const auth = getAuth();
  await sendPasswordResetEmail(auth, email, {
    url: `${window.location.origin}/signin`,
  });
}

export default function UsersPage() {
  const { user } = useAuth();

  const [allUsers,      setAllUsers]      = useState<UserListRow[]>([]);
  const [isLoading,     setIsLoading]     = useState(true);
  const [kpiConfig,     setKpiConfig]     = useState<KpiPageConfig | null>(null);
  const [kpiResults,    setKpiResults]    = useState<KpiResult[]>([]);
  const [search,        setSearch]        = useState('');
  const [filter,        setFilter]        = useState<FilterState>({ role: 'all', status: 'all' });
  const [sort,          setSort]          = useState<SortState>({ field: 'display_name', direction: 'asc' });
  const [selectedUser,  setSelectedUser]  = useState<UserListRow | null>(null);
  const [isKpiEditMode, setIsKpiEditMode] = useState(false);
  const [isSavingKpi,   setIsSavingKpi]   = useState(false);
  const [toast,         setToast]         = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [currentUserId, setCurrentUserId] = useState('');

  // ── Resolve current user ID from auth context ──────────
  // Same pattern as CreateModelPage, EditModelPage, PagesPage, MenuPage.
  // useAuth() resolves the user once in the layout via onAuthStateChanged
  // (Firebase) or /api/auth/me (other DB types) and shares it via context.
  // No need to re-resolve here.
  useEffect(() => {
    if (!user) return;
    const uid = user.user_id || user.id || '';
    setCurrentUserId(uid);
  }, [user]);

  // ── Load users ─────────────────────────────────────────
  useEffect(() => {
    if (!currentUserId) return;
    async function load() {
      setIsLoading(true);
      try {
        const res = await fetch(`/api/cmsusers?user_id=${currentUserId}`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        setAllUsers(data.users ?? []);
      } catch (err) {
        console.error('[UsersPage] load users:', err);
        showToast('Failed to load users', 'error');
      } finally {
        setIsLoading(false);
      }
    }
    load();
  }, [currentUserId]);

  // ── Load KPI config ────────────────────────────────────
  useEffect(() => {
    if (!currentUserId) return;
    async function loadKpi() {
      try {
        const res = await fetch(`/api/kpi-config?page=users&user_id=${currentUserId}`);
        if (!res.ok) return;
        const data = await res.json();
        setKpiConfig(data.config ?? null);
      } catch {
        // KPI config is optional — silent fail
      }
    }
    loadKpi();
  }, [currentUserId]);

  // ── Recompute KPIs ─────────────────────────────────────
  useEffect(() => {
    if (!kpiConfig || allUsers.length === 0) { setKpiResults([]); return; }
    const allKpiConfigs = kpiConfig.blocks.flatMap((b) => b.kpis);
    setKpiResults(
      computeAllKpis(allUsers as unknown as Record<string, unknown>[], allKpiConfigs)
    );
  }, [kpiConfig, allUsers]);

  // ── Search / filter / sort ─────────────────────────────
  const processedUsers = useMemo(() => {
    let list = [...allUsers];

    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter(
        (u) =>
          u.display_name.toLowerCase().includes(q) ||
          u.user_email.toLowerCase().includes(q)
      );
    }

    if (filter.role   !== 'all') list = list.filter((u) => u.role   === filter.role);
    if (filter.status !== 'all') list = list.filter((u) => u.status === filter.status);

    if (filter.dateFrom) {
      const from = new Date(filter.dateFrom).getTime();
      list = list.filter((u) => u.created_at && new Date(u.created_at).getTime() >= from);
    }
    if (filter.dateTo) {
      const to = new Date(filter.dateTo).getTime();
      list = list.filter((u) => u.created_at && new Date(u.created_at).getTime() <= to);
    }

    list.sort((a, b) => {
      const av = a[sort.field] ?? '';
      const bv = b[sort.field] ?? '';
      const cmp =
        typeof av === 'string' && typeof bv === 'string'
          ? av.localeCompare(bv)
          : (av as unknown as number) - (bv as unknown as number);
      return sort.direction === 'asc' ? cmp : -cmp;
    });

    return list;
  }, [allUsers, search, filter, sort]);

  // ── Admin guard ────────────────────────────────────────
  const adminCount = useMemo(
    () => allUsers.filter((u) => u.role === 'admin').length,
    [allUsers]
  );

  const isLastAdmin = useCallback(
    (userId: string) => {
      const u = allUsers.find((u) => u.user_id === userId);
      return u?.role === 'admin' && adminCount === 1;
    },
    [allUsers, adminCount]
  );

  function showToast(message: string, type: 'success' | 'error') {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  }

  // ── Actions ────────────────────────────────────────────

  async function handleRoleChange(targetUserId: string, role: 'admin' | 'user') {
    const res = await fetch('/api/cmsusers', {
      method:  'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ user_id: currentUserId, target_user_id: targetUserId, role }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error ?? 'Failed');

    setAllUsers((prev) =>
      prev.map((u) => u.user_id === targetUserId ? { ...u, role } : u)
    );
    if (selectedUser?.user_id === targetUserId) {
      setSelectedUser((p) => p ? { ...p, role } : p);
    }
    showToast('Role updated', 'success');

    // Log — who made the change, who was changed, what it changed to
    await logActivity(currentUserId, 'user_role_changed', {
      target_user_id: targetUserId,
      role,
    });
  }

  async function handleStatusChange(
    targetUserId: string,
    status: 'active' | 'suspended' | 'disabled'
  ) {
    const res = await fetch('/api/cmsusers', {
      method:  'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ user_id: currentUserId, target_user_id: targetUserId, status }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error ?? 'Failed');

    setAllUsers((prev) =>
      prev.map((u) => u.user_id === targetUserId ? { ...u, status } : u)
    );
    if (selectedUser?.user_id === targetUserId) {
      setSelectedUser((p) => p ? { ...p, status } : p);
    }
    showToast('Status updated', 'success');

    await logActivity(currentUserId, 'user_status_changed', {
      target_user_id: targetUserId,
      status,
    });
  }

  async function handleDelete(targetUserId: string) {
    const res = await fetch(
      `/api/cmsusers?user_id=${currentUserId}&target_user_id=${targetUserId}`,
      { method: 'DELETE' }
    );
    const data = await res.json();
    if (!res.ok) throw new Error(data.error ?? 'Failed');

    setAllUsers((prev) => prev.filter((u) => u.user_id !== targetUserId));
    setSelectedUser(null);
    showToast('User deleted', 'success');

    await logActivity(currentUserId, 'user_deleted', {
      target_user_id: targetUserId,
    });
  }

  // ── Password reset — DB-type aware ─────────────────────
  async function handlePasswordReset(_userId: string, email: string) {
    try {
      if (DB_TYPE === 'firebase') {
        await firebaseSendPasswordReset(email);
      } else {
        const res = await fetch('/api/auth/reset-password', {
          method:  'POST',
          headers: { 'Content-Type': 'application/json' },
          body:    JSON.stringify({ email }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? 'Failed to send reset email');
      }
      showToast(`Password reset sent to ${email}`, 'success');
    } catch (err) {
      throw new Error(err instanceof Error ? err.message : 'Failed to send reset email');
    }
  }

  // ── KPI save ───────────────────────────────────────────
  async function handleSaveKpiConfig(config: KpiPageConfig) {
    setKpiConfig(config);
    setIsSavingKpi(true);
    try {
      const res = await fetch('/api/kpi-config', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ ...config, user_id: currentUserId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Failed to save');
      showToast('KPI layout saved', 'success');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Save failed', 'error');
    } finally {
      setIsSavingKpi(false);
    }
  }

  // ── Render ─────────────────────────────────────────────
  return (
    <div className="flex flex-col gap-6 p-6 max-w-[1400px] mx-auto">

      {/* Page header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-[var(--color-primary)]/10">
            <Users size={20} className="text-[var(--color-primary)]" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-[var(--color-text)]">Users</h1>
            <p className="text-sm text-[var(--color-text-muted)]">
              Manage CMS admin and user accounts
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {isKpiEditMode && (
            <button
              disabled={isSavingKpi}
              onClick={() => {
                if (kpiConfig) handleSaveKpiConfig(kpiConfig);
                setIsKpiEditMode(false);
              }}
              className="flex items-center gap-2 px-3 py-2 text-sm rounded-lg
                         bg-[var(--color-primary)] text-white hover:opacity-90
                         transition-opacity disabled:opacity-50"
            >
              <Save size={14} />
              {isSavingKpi ? 'Saving…' : 'Save layout'}
            </button>
          )}
          <button
            onClick={() => setIsKpiEditMode((p) => !p)}
            className={`flex items-center gap-2 px-3 py-2 text-sm rounded-lg
                        border transition-colors ${
              isKpiEditMode
                ? 'border-[var(--color-primary)] text-[var(--color-primary)] bg-[var(--color-primary)]/10'
                : 'border-[var(--color-border)] text-[var(--color-text-muted)] hover:text-[var(--color-text)]'
            }`}
          >
            <Settings2 size={14} />
            {isKpiEditMode ? 'Editing KPIs' : 'Edit KPIs'}
          </button>
        </div>
      </div>

      {/* KPI bar — sits on page background (grey) */}
      <UserKpiBar
        config={kpiConfig}
        results={kpiResults}
        availableFields={USER_KPI_FIELDS}
        isEditMode={isKpiEditMode}
        onConfigChange={(newConfig) => {
          setKpiConfig(newConfig);
          const allKpiConfigs = newConfig.blocks.flatMap((b) => b.kpis);
          setKpiResults(
            computeAllKpis(
              allUsers as unknown as Record<string, unknown>[],
              allKpiConfigs
            )
          );
        }}
        projectId=""
        tenantId=""
      />

      {/* White card — search, filters, table */}
      <div
        className="rounded-2xl border border-gray-200 flex flex-col gap-5 p-5"
        style={{ backgroundColor: '#ffffff' }}
      >
        <UserFilters
          search={search}
          onSearchChange={setSearch}
          filter={filter}
          onFilterChange={setFilter}
          sort={sort}
          onSortChange={setSort}
          totalCount={allUsers.length}
          filteredCount={processedUsers.length}
        />
        <UserTable
          users={processedUsers}
          sort={sort}
          onSortChange={setSort}
          onRowClick={setSelectedUser}
          isLoading={isLoading}
        />
      </div>

      <UserDrawer
        user={selectedUser}
        isLastAdmin={selectedUser ? isLastAdmin(selectedUser.user_id) : false}
        currentUserId={currentUserId}
        onClose={() => setSelectedUser(null)}
        onRoleChange={handleRoleChange}
        onStatusChange={handleStatusChange}
        onDelete={handleDelete}
        onPasswordReset={handlePasswordReset}
      />

      {toast && (
        <div className={`fixed bottom-6 right-6 z-50 px-4 py-3 rounded-xl shadow-lg
                         text-sm font-medium text-white transition-all ${
          toast.type === 'success' ? 'bg-emerald-600' : 'bg-red-500'
        }`}>
          {toast.message}
        </div>
      )}
    </div>
  );
}