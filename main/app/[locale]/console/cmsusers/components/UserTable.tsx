// ============================================================
// FILE: app/[locale]/console/users/components/UserTable.tsx
// PURPOSE: Column definitions updated to match actual schema:
//          user_email instead of email, last_login instead of
//          last_login_at, no display_name sort (derived field)
// ============================================================

'use client';

import { ChevronUp, ChevronDown, ChevronsUpDown } from 'lucide-react';
import UserAvatar from './UserAvatar';
import { UserListRow, SortState, SortField } from '../../types/users';


interface UserTableProps {
  users:         UserListRow[];
  sort:          SortState;
  onSortChange:  (sort: SortState) => void;
  onRowClick:    (user: UserListRow) => void;
  isLoading:     boolean;
}

const COLUMNS: { field: SortField; label: string }[] = [
  { field: 'display_name', label: 'Name' },
  { field: 'user_email',   label: 'Email' },
  { field: 'role',         label: 'Role' },
  { field: 'status',       label: 'Status' },
  { field: 'last_login',   label: 'Last login' },
  { field: 'created_at',   label: 'Joined' },
];

function SortIcon({ field, sort }: { field: SortField; sort: SortState }) {
  if (sort.field !== field) return <ChevronsUpDown size={13} className="opacity-30" />;
  return sort.direction === 'asc'
    ? <ChevronUp size={13} className="text-[var(--color-primary)]" />
    : <ChevronDown size={13} className="text-[var(--color-primary)]" />;
}

function RoleBadge({ role }: { role: UserListRow['role'] }) {
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
      role === 'admin'
        ? 'bg-[var(--color-primary)]/15 text-[var(--color-primary)]'
        : 'bg-gray-100 text-gray-500'
    }`}>
      {role === 'admin' ? 'Admin' : 'User'}
    </span>
  );
}

function StatusBadge({ status }: { status: UserListRow['status'] }) {
  const styles: Record<string, string> = {
    active:    'bg-emerald-500/15 text-emerald-600',
    suspended: 'bg-amber-500/15 text-amber-600',
    disabled:  'bg-red-500/15 text-red-500',
  };
  return (
    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full
                      text-xs font-medium ${styles[status]}`}>
      <span className="w-1.5 h-1.5 rounded-full bg-current" />
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  );
}

function formatDate(iso?: string): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString(undefined, {
    day: 'numeric', month: 'short', year: 'numeric',
  });
}

function SkeletonRow() {
  return (
    <tr className="border-b border-gray-100">
      {[...Array(6)].map((_, i) => (
        <td key={i} className="px-4 py-3">
          <div className="h-4 rounded bg-gray-100 animate-pulse w-3/4" />
        </td>
      ))}
    </tr>
  );
}

export default function UserTable({
  users, sort, onSortChange, onRowClick, isLoading,
}: UserTableProps) {
  function handleSort(field: SortField) {
    onSortChange({
      field,
      direction: sort.field === field && sort.direction === 'asc' ? 'desc' : 'asc',
    });
  }

  return (
    <div className="w-full overflow-x-auto rounded-xl border border-gray-200">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-200 bg-gray-50">
            {COLUMNS.map((col) => (
              <th
                key={col.field}
                onClick={() => handleSort(col.field)}
                className="px-4 py-3 text-left text-xs font-semibold text-gray-500
                           uppercase tracking-wider whitespace-nowrap cursor-pointer select-none"
              >
                <div className="flex items-center gap-1.5">
                  {col.label}
                  <SortIcon field={col.field} sort={sort} />
                </div>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {isLoading ? (
            [...Array(6)].map((_, i) => <SkeletonRow key={i} />)
          ) : users.length === 0 ? (
            <tr>
              <td colSpan={6} className="px-4 py-12 text-center text-sm text-gray-400">
                No users found
              </td>
            </tr>
          ) : (
            users.map((user) => (
              <tr
                key={user.user_id}
                onClick={() => onRowClick(user)}
                className="border-b border-gray-100 last:border-0
                           hover:bg-gray-50 cursor-pointer transition-colors"
              >
                {/* Name + avatar */}
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <div className="relative">
                      <UserAvatar
                        initials={user.avatar_initials}
                        colour={user.avatar_colour}
                        size="sm"
                      />
                      {user.is_logged_in && (
                        <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5
                                         rounded-full bg-emerald-500 border-2 border-white" />
                      )}
                    </div>
                    <span className="font-medium text-gray-900">
                      {user.display_name}
                    </span>
                  </div>
                </td>

                {/* Email */}
                <td className="px-4 py-3 text-gray-500">{user.user_email}</td>

                {/* Role */}
                <td className="px-4 py-3"><RoleBadge role={user.role} /></td>

                {/* Status */}
                <td className="px-4 py-3"><StatusBadge status={user.status} /></td>

                {/* Last login */}
                <td className="px-4 py-3 text-gray-500">{formatDate(user.last_login)}</td>

                {/* Joined */}
                <td className="px-4 py-3 text-gray-500">{formatDate(user.created_at)}</td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}