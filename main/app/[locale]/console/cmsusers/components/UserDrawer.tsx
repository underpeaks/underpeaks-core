// ============================================================
// FILE: app/[locale]/console/users/components/UserDrawer.tsx
// PURPOSE: Right-side drawer showing full user detail.
//          Fixed: user_email instead of email, last_login
//          instead of last_login_at, is_logged_in instead of
//          is_online, login history fetch uses user_id param
//          instead of project_id/tenant_id.
// ============================================================

'use client';

import { useState, useEffect } from 'react';
import {
  X, Shield, UserX, Trash2, KeyRound,
  Clock, Monitor, Smartphone, Globe,
  ChevronDown, AlertTriangle,
} from 'lucide-react';
import UserAvatar from './UserAvatar';
import { UserListRow, LoginHistoryEvent } from '../../types/users';

interface UserDrawerProps {
  user:            UserListRow | null;
  isLastAdmin:     boolean;
  currentUserId:   string;
  onClose:         () => void;
  onRoleChange:    (userId: string, role: 'admin' | 'user') => Promise<void>;
  onStatusChange:  (userId: string, status: 'active' | 'suspended' | 'disabled') => Promise<void>;
  onDelete:        (userId: string) => Promise<void>;
  onPasswordReset: (userId: string, email: string) => Promise<void>;
}

function LoginHistoryItem({ event }: { event: LoginHistoryEvent }) {
  const iconMap: Record<string, React.ReactNode> = {
    user_login:  <Globe      size={13} className="text-emerald-500" />,
    user_logout: <Clock      size={13} className="text-[var(--color-text-muted)]" />,
    user_online: <Monitor    size={13} className="text-blue-400" />,
    user_offline:<Smartphone size={13} className="text-[var(--color-text-muted)]" />,
  };

  const labelMap: Record<string, string> = {
    user_login:  'Signed in',
    user_logout: 'Signed out',
    user_online: 'Online',
    user_offline:'Went offline',
  };

  return (
    <div className="flex items-start gap-3 py-2">
      <div className="mt-0.5 flex-shrink-0">{iconMap[event.action]}</div>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-medium text-[var(--color-text)]">
          {labelMap[event.action] ?? event.action}
        </p>
        {event.context?.browser && (
          <p className="text-xs text-[var(--color-text-muted)] truncate">
            {event.context.browser}
            {event.context.os ? ` · ${event.context.os}` : ''}
            {event.context.ip ? ` · ${event.context.ip}` : ''}
          </p>
        )}
      </div>
      <span className="text-xs text-[var(--color-text-muted)] whitespace-nowrap flex-shrink-0">
        {new Date(event.created_at).toLocaleDateString(undefined, {
          day: 'numeric', month: 'short',
        })}
        {' '}
        {new Date(event.created_at).toLocaleTimeString(undefined, {
          hour: '2-digit', minute: '2-digit',
        })}
      </span>
    </div>
  );
}

export default function UserDrawer({
  user,
  isLastAdmin,
  currentUserId,
  onClose,
  onRoleChange,
  onStatusChange,
  onDelete,
  onPasswordReset,
}: UserDrawerProps) {
  const [loginHistory,      setLoginHistory]      = useState<LoginHistoryEvent[]>([]);
  const [historyLoading,    setHistoryLoading]    = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [actionLoading,     setActionLoading]     = useState<string | null>(null);
  const [showHistory,       setShowHistory]       = useState(true);

  useEffect(() => {
    if (!user) return;
    setShowDeleteConfirm(false);
    setLoginHistory([]);

    const fetchHistory = async () => {
      setHistoryLoading(true);
      try {
        const res = await fetch(
          `/api/users/${user.user_id}/login-history?user_id=${currentUserId}`
        );
        const data = await res.json();
        setLoginHistory(data.history ?? []);
      } catch {
        setLoginHistory([]);
      } finally {
        setHistoryLoading(false);
      }
    };
    fetchHistory();
  }, [user?.user_id]);

  if (!user) return null;

  async function handle(action: string, fn: () => Promise<void>) {
    setActionLoading(action);
    try {
      await fn();
    } finally {
      setActionLoading(null);
    }
  }

  const isCurrentAdmin = user.role === 'admin';
  const canDelete      = !(isCurrentAdmin && isLastAdmin);
  const canDemote      = !(isCurrentAdmin && isLastAdmin);

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/40 z-40 transition-opacity"
        onClick={onClose}
      />

      {/* Drawer */}
      <div className="fixed right-0 top-0 h-full w-full max-w-md z-50
                      bg-white border-l border-gray-200
                      flex flex-col shadow-2xl overflow-hidden">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4
                        border-b border-gray-200 flex-shrink-0">
          <h2 className="text-base font-semibold text-[var(--color-text)]">
            User details
          </h2>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-gray-100
                       text-gray-400 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto">

          {/* ── Profile section ───────────────────────────── */}
          <div className="px-6 py-6 border-b border-gray-200">
            <div className="flex items-center gap-4">
              <div className="relative">
                <UserAvatar
                  initials={user.avatar_initials}
                  colour={user.avatar_colour}
                  size="lg"
                />
                {user.is_logged_in && (
                  <span className="absolute bottom-0 right-0 w-3.5 h-3.5
                                   rounded-full bg-emerald-500 border-2 border-white" />
                )}
              </div>
              <div>
                <p className="text-base font-semibold text-[var(--color-text)]">
                  {user.display_name}
                </p>
                <p className="text-sm text-gray-500">
                  {user.user_email}
                </p>
                <div className="flex items-center gap-2 mt-1.5">
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                    user.role === 'admin'
                      ? 'bg-[var(--color-primary)]/15 text-[var(--color-primary)]'
                      : 'bg-gray-100 text-gray-500'
                  }`}>
                    {user.role === 'admin' ? 'Admin' : 'User'}
                  </span>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                    user.status === 'active'
                      ? 'bg-emerald-500/15 text-emerald-600'
                      : user.status === 'suspended'
                      ? 'bg-amber-500/15 text-amber-600'
                      : 'bg-red-500/15 text-red-500'
                  }`}>
                    {user.status.charAt(0).toUpperCase() + user.status.slice(1)}
                  </span>
                </div>
              </div>
            </div>

            {/* Meta */}
            <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
              <div>
                <dt className="text-xs text-gray-400">Joined</dt>
                <dd className="text-[var(--color-text)] font-medium">
                  {user.created_at
                    ? new Date(user.created_at).toLocaleDateString(undefined, {
                        day: 'numeric', month: 'short', year: 'numeric',
                      })
                    : '—'}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-gray-400">Last login</dt>
                <dd className="text-[var(--color-text)] font-medium">
                  {user.last_login
                    ? new Date(user.last_login).toLocaleDateString(undefined, {
                        day: 'numeric', month: 'short', year: 'numeric',
                      })
                    : '—'}
                </dd>
              </div>
              {user.full_name && (
                <div className="col-span-2">
                  <dt className="text-xs text-gray-400">Full name</dt>
                  <dd className="text-[var(--color-text)] font-medium">{user.full_name}</dd>
                </div>
              )}
            </dl>
          </div>

          {/* ── Actions section ────────────────────────────── */}
          <div className="px-6 py-5 border-b border-gray-200 space-y-3">
            <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">
              Actions
            </p>

            {/* Change role */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm text-[var(--color-text)]">
                <Shield size={15} className="text-[var(--color-primary)]" />
                Role
              </div>
              <div className="relative">
                <select
                  value={user.role}
                  disabled={!canDemote || actionLoading === 'role'}
                  onChange={(e) =>
                    handle('role', () =>
                      onRoleChange(user.user_id, e.target.value as 'admin' | 'user')
                    )
                  }
                  className="appearance-none pl-3 pr-8 py-1.5 text-sm rounded-lg border
                             border-gray-200 bg-white text-[var(--color-text)]
                             focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]
                             disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <option value="admin">Admin</option>
                  <option value="user">User</option>
                </select>
                <ChevronDown
                  size={13}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2
                             text-gray-400 pointer-events-none"
                />
              </div>
            </div>

            {!canDemote && (
              <p className="text-xs text-amber-600 flex items-center gap-1.5">
                <AlertTriangle size={12} />
                Cannot demote — this is the last admin
              </p>
            )}

            {/* Status */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm text-[var(--color-text)]">
                <UserX size={15} className="text-amber-500" />
                Status
              </div>
              <div className="relative">
                <select
                  value={user.status}
                  disabled={actionLoading === 'status'}
                  onChange={(e) =>
                    handle('status', () =>
                      onStatusChange(
                        user.user_id,
                        e.target.value as 'active' | 'suspended' | 'disabled'
                      )
                    )
                  }
                  className="appearance-none pl-3 pr-8 py-1.5 text-sm rounded-lg border
                             border-gray-200 bg-white text-[var(--color-text)]
                             focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]
                             disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <option value="active">Active</option>
                  <option value="suspended">Suspended</option>
                  <option value="disabled">Disabled</option>
                </select>
                <ChevronDown
                  size={13}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2
                             text-gray-400 pointer-events-none"
                />
              </div>
            </div>

            {/* Reset password */}
            <button
              disabled={actionLoading === 'reset'}
              onClick={() =>
                handle('reset', () =>
                  onPasswordReset(user.user_id, user.user_email)
                )
              }
              className="w-full flex items-center gap-2 px-3 py-2 text-sm rounded-lg
                         border border-gray-200 text-[var(--color-text)]
                         hover:bg-gray-50 transition-colors
                         disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <KeyRound size={15} className="text-[var(--color-primary)]" />
              {actionLoading === 'reset' ? 'Sending…' : 'Send password reset email'}
            </button>

            {/* Delete */}
            {!showDeleteConfirm ? (
              <button
                disabled={!canDelete}
                onClick={() => setShowDeleteConfirm(true)}
                className="w-full flex items-center gap-2 px-3 py-2 text-sm rounded-lg
                           border border-red-200 text-red-500
                           hover:bg-red-50 transition-colors
                           disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <Trash2 size={15} />
                Delete user
              </button>
            ) : (
              <div className="rounded-lg border border-red-200 bg-red-50 p-3 space-y-2">
                <p className="text-xs text-red-500 font-medium">
                  Permanently delete this user? This cannot be undone.
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={() => setShowDeleteConfirm(false)}
                    className="flex-1 px-3 py-1.5 text-xs rounded-lg border
                               border-gray-200 text-[var(--color-text)]
                               hover:bg-gray-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    disabled={actionLoading === 'delete'}
                    onClick={() => handle('delete', () => onDelete(user.user_id))}
                    className="flex-1 px-3 py-1.5 text-xs rounded-lg bg-red-500
                               text-white hover:bg-red-600 transition-colors
                               disabled:opacity-50"
                  >
                    {actionLoading === 'delete' ? 'Deleting…' : 'Yes, delete'}
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* ── Login history ──────────────────────────────── */}
          <div className="px-6 py-5">
            <button
              onClick={() => setShowHistory((p) => !p)}
              className="flex items-center justify-between w-full mb-3"
            >
              <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">
                Login history
              </p>
              <ChevronDown
                size={14}
                className={`text-gray-400 transition-transform ${
                  showHistory ? 'rotate-180' : ''
                }`}
              />
            </button>

            {showHistory && (
              historyLoading ? (
                <div className="space-y-2">
                  {[...Array(4)].map((_, i) => (
                    <div key={i} className="h-8 rounded bg-gray-100 animate-pulse" />
                  ))}
                </div>
              ) : loginHistory.length === 0 ? (
                <p className="text-xs text-gray-400">
                  No login history recorded yet
                </p>
              ) : (
                <div className="divide-y divide-gray-100">
                  {loginHistory.map((event) => (
                    <LoginHistoryItem key={event.sal_id} event={event} />
                  ))}
                </div>
              )
            )}
          </div>
        </div>
      </div>
    </>
  );
}