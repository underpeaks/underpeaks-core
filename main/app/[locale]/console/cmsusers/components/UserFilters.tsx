// ============================================================
// FILE: app/[locale]/console/users/components/UserFilters.tsx
// PURPOSE: Search bar, filter block (role, status, date range)
//          and sort block (field + direction). All state is
//          lifted to the parent users page via callbacks.
// ============================================================

'use client';

import { useState } from 'react';
import { Search, SlidersHorizontal, ArrowUpDown, X } from 'lucide-react';
import { FilterState, SortState, SortField } from '../../types/users';


interface UserFiltersProps {
  search: string;
  onSearchChange: (value: string) => void;
  filter: FilterState;
  onFilterChange: (filter: FilterState) => void;
  sort: SortState;
  onSortChange: (sort: SortState) => void;
  totalCount: number;
  filteredCount: number;
}

const SORT_FIELDS: { value: SortField; label: string }[] = [
  { value: 'display_name', label: 'Name' },
  { value: 'user_email',   label: 'Email' },
  { value: 'role',         label: 'Role' },
  { value: 'status',       label: 'Status' },
  { value: 'created_at',   label: 'Date joined' },
  { value: 'last_login',   label: 'Last login' },
];

export default function UserFilters({
  search,
  onSearchChange,
  filter,
  onFilterChange,
  sort,
  onSortChange,
  totalCount,
  filteredCount,
}: UserFiltersProps) {
  const [showFilter, setShowFilter] = useState(false);
  const [showSort, setShowSort] = useState(false);

  const hasActiveFilter =
    filter.role !== 'all' ||
    filter.status !== 'all' ||
    !!filter.dateFrom ||
    !!filter.dateTo;

  function clearFilters() {
    onFilterChange({ role: 'all', status: 'all' });
  }

  return (
    <div className="space-y-3">
      {/* Search + toggle buttons row */}
      <div className="flex items-center gap-3">
        {/* Search */}
        <div className="relative flex-1">
          <Search
            size={16}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)]"
          />
          <input
            type="text"
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search by name or email…"
            className="w-full pl-9 pr-4 py-2 text-sm rounded-lg border
                       border-[var(--color-border)] bg-[var(--color-surface)]
                       text-[var(--color-text)] placeholder:text-[var(--color-text-muted)]
                       focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
          />
          {search && (
            <button
              onClick={() => onSearchChange('')}
              className="absolute right-3 top-1/2 -translate-y-1/2
                         text-[var(--color-text-muted)] hover:text-[var(--color-text)]"
            >
              <X size={14} />
            </button>
          )}
        </div>

        {/* Filter toggle */}
        <button
          onClick={() => { setShowFilter((p) => !p); setShowSort(false); }}
          className={`flex items-center gap-2 px-3 py-2 text-sm rounded-lg border
                      transition-colors ${
                        showFilter || hasActiveFilter
                          ? 'border-[var(--color-primary)] bg-[var(--color-primary)]/10 text-[var(--color-primary)]'
                          : 'border-[var(--color-border)] text-[var(--color-text-muted)] hover:text-[var(--color-text)]'
                      }`}
        >
          <SlidersHorizontal size={15} />
          Filter
          {hasActiveFilter && (
            <span className="w-2 h-2 rounded-full bg-[var(--color-primary)]" />
          )}
        </button>

        {/* Sort toggle */}
        <button
          onClick={() => { setShowSort((p) => !p); setShowFilter(false); }}
          className={`flex items-center gap-2 px-3 py-2 text-sm rounded-lg border
                      transition-colors ${
                        showSort
                          ? 'border-[var(--color-primary)] bg-[var(--color-primary)]/10 text-[var(--color-primary)]'
                          : 'border-[var(--color-border)] text-[var(--color-text-muted)] hover:text-[var(--color-text)]'
                      }`}
        >
          <ArrowUpDown size={15} />
          Sort
        </button>
      </div>

      {/* Result count */}
      <p className="text-xs text-[var(--color-text-muted)]">
        Showing {filteredCount} of {totalCount} users
      </p>

      {/* Filter panel */}
      {showFilter && (
        <div className="p-4 rounded-lg border border-[var(--color-border)]
                        bg-[var(--color-surface)] space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-[var(--color-text)]">
              Filters
            </span>
            {hasActiveFilter && (
              <button
                onClick={clearFilters}
                className="text-xs text-[var(--color-primary)] hover:underline"
              >
                Clear all
              </button>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            {/* Role */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-[var(--color-text-muted)]">
                Role
              </label>
              <select
                value={filter.role}
                onChange={(e) =>
                  onFilterChange({ ...filter, role: e.target.value as FilterState['role'] })
                }
                className="w-full px-3 py-2 text-sm rounded-lg border
                           border-[var(--color-border)] bg-[var(--color-background)]
                           text-[var(--color-text)] focus:outline-none
                           focus:ring-2 focus:ring-[var(--color-primary)]"
              >
                <option value="all">All roles</option>
                <option value="admin">Admin</option>
                <option value="user">User</option>
              </select>
            </div>

            {/* Status */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-[var(--color-text-muted)]">
                Status
              </label>
              <select
                value={filter.status}
                onChange={(e) =>
                  onFilterChange({ ...filter, status: e.target.value as FilterState['status'] })
                }
                className="w-full px-3 py-2 text-sm rounded-lg border
                           border-[var(--color-border)] bg-[var(--color-background)]
                           text-[var(--color-text)] focus:outline-none
                           focus:ring-2 focus:ring-[var(--color-primary)]"
              >
                <option value="all">All statuses</option>
                <option value="active">Active</option>
                <option value="suspended">Suspended</option>
                <option value="disabled">Disabled</option>
              </select>
            </div>

            {/* Date from */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-[var(--color-text-muted)]">
                Joined from
              </label>
              <input
                type="date"
                value={filter.dateFrom ?? ''}
                onChange={(e) =>
                  onFilterChange({ ...filter, dateFrom: e.target.value || undefined })
                }
                className="w-full px-3 py-2 text-sm rounded-lg border
                           border-[var(--color-border)] bg-[var(--color-background)]
                           text-[var(--color-text)] focus:outline-none
                           focus:ring-2 focus:ring-[var(--color-primary)]"
              />
            </div>

            {/* Date to */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-[var(--color-text-muted)]">
                Joined to
              </label>
              <input
                type="date"
                value={filter.dateTo ?? ''}
                onChange={(e) =>
                  onFilterChange({ ...filter, dateTo: e.target.value || undefined })
                }
                className="w-full px-3 py-2 text-sm rounded-lg border
                           border-[var(--color-border)] bg-[var(--color-background)]
                           text-[var(--color-text)] focus:outline-none
                           focus:ring-2 focus:ring-[var(--color-primary)]"
              />
            </div>
          </div>
        </div>
      )}

      {/* Sort panel */}
      {showSort && (
        <div className="p-4 rounded-lg border border-[var(--color-border)]
                        bg-[var(--color-surface)] space-y-4">
          <span className="text-sm font-medium text-[var(--color-text)]">
            Sort
          </span>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-[var(--color-text-muted)]">
                Sort by
              </label>
              <select
                value={sort.field}
                onChange={(e) =>
                  onSortChange({ ...sort, field: e.target.value as SortField })
                }
                className="w-full px-3 py-2 text-sm rounded-lg border
                           border-[var(--color-border)] bg-[var(--color-background)]
                           text-[var(--color-text)] focus:outline-none
                           focus:ring-2 focus:ring-[var(--color-primary)]"
              >
                {SORT_FIELDS.map((f) => (
                  <option key={f.value} value={f.value}>
                    {f.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-[var(--color-text-muted)]">
                Direction
              </label>
              <select
                value={sort.direction}
                onChange={(e) =>
                  onSortChange({
                    ...sort,
                    direction: e.target.value as 'asc' | 'desc',
                  })
                }
                className="w-full px-3 py-2 text-sm rounded-lg border
                           border-[var(--color-border)] bg-[var(--color-background)]
                           text-[var(--color-text)] focus:outline-none
                           focus:ring-2 focus:ring-[var(--color-primary)]"
              >
                <option value="asc">Ascending (A → Z)</option>
                <option value="desc">Descending (Z → A)</option>
              </select>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}