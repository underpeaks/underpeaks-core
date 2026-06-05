'use client'

/**
 * ClientListTemplate.tsx
 * Location: app/[locale]/console/[slug]/components/client/ClientListTemplate.tsx
 *
 * Client/public-facing list template (page_type='client').
 *
 * Differences from admin ListTemplate:
 *   - No KPI bar
 *   - No add button, no drawer, no delete
 *   - Row click navigates to /[locale]/console/[slug]/[id] detail page
 *   - Export capped at 1000 rows on self-hosted
 *   - Pagination with bigger page size (suits client browsing)
 *
 * Features:
 *   - Scroll wrapper for long tables
 *   - Token resolution via clientAuth helper (reads localStorage)
 *   - Fields sorted by their order property when set
 *   - Locale-aware row navigation
 */

import { useState, useEffect, useMemo, useCallback } from 'react'
import {
  FiSearch, FiChevronUp, FiChevronDown,
  FiChevronLeft, FiChevronRight, FiDownload, FiX,
} from 'react-icons/fi'
import { LuChevronsUpDown, LuSlidersHorizontal } from 'react-icons/lu'
import { useLocale }                              from 'next-intl'
import Link                                       from 'next/link'

import { getAuthToken }                           from '@/app/lib/clientAuth'
import {
  ModelColumn, DataRecord, AdminTemplateProps,
  PaginationMeta, Toast,
} from '../../types'

const PAGE_SIZE    = 25
const EXPORT_LIMIT = 1000

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getPkColumn(columns: ModelColumn[]): ModelColumn | undefined {
  return columns.find((c) => c.is_primary)
}

function resolveId(record: DataRecord, columns: ModelColumn[]): string {
  const pk = getPkColumn(columns)
  if (pk && record[pk.name]) return String(record[pk.name])
  return String(record.id ?? record._id ?? '')
}

function getVisibleColumns(columns: ModelColumn[]): ModelColumn[] {
  const visible = columns.filter((c) => !c.hidden && !c.is_primary)
  return visible.sort((a, b) => {
    const ao = (a as any).order ?? Number.MAX_SAFE_INTEGER
    const bo = (b as any).order ?? Number.MAX_SAFE_INTEGER
    return ao - bo
  })
}

function formatCell(value: unknown, col: ModelColumn): React.ReactNode {
  if (value === null || value === undefined) return <span className="text-gray-300">—</span>

  if (col.ui_type === 'toggle' || col.ui_type === 'checkbox') {
    return (
      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
        value ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-500'
      }`}>
        {value ? 'Yes' : 'No'}
      </span>
    )
  }

  if (col.ui_type === 'select') {
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs
                       font-medium bg-[var(--color-primary)]/10 text-[var(--color-primary)]">
        {String(value)}
      </span>
    )
  }

  if (col.ui_type === 'image-upload' || col.ui_type === 'image-url' || col.ui_type === 'media-picker') {
    const urls = Array.isArray(value) ? value : [String(value)]
    const first = urls[0]
    if (!first) return <span className="text-gray-300">—</span>
    return (
      <img
        src={String(first)}
        alt=""
        className="w-8 h-8 object-cover rounded"
        onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
      />
    )
  }

  if (col.ui_type === 'datetime-picker' || col.ui_type === 'date-picker') {
    try {
      return new Date(String(value)).toLocaleDateString(undefined, {
        day: 'numeric', month: 'short', year: 'numeric',
      })
    } catch { return String(value) }
  }

  if (col.ui_type === 'currency-input') {
    return <span className="font-medium">R {Number(value).toFixed(2)}</span>
  }

  if (Array.isArray(value)) {
    return (
      <span className="text-xs text-gray-500">
        {value.slice(0, 2).join(', ')}{value.length > 2 ? '…' : ''}
      </span>
    )
  }

  const str = String(value)
  return str.length > 60 ? str.slice(0, 60) + '…' : str
}

function SortIcon({ field, sortField, sortDir }: {
  field: string; sortField: string; sortDir: 'asc' | 'desc'
}) {
  if (sortField !== field) return <LuChevronsUpDown size={12} className="opacity-30" />
  return sortDir === 'asc'
    ? <FiChevronUp size={12} className="text-[var(--color-primary)]" />
    : <FiChevronDown size={12} className="text-[var(--color-primary)]" />
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export default function ClientListTemplate({
  page, model, projectId,
}: AdminTemplateProps) {
  const locale         = useLocale()
  const columns        = model.schema.columns
  const visibleCols    = useMemo(() => getVisibleColumns(columns), [columns])
  const filterableCols = useMemo(
    () => visibleCols.filter((c) =>
      c.ui_type === 'select' || c.ui_type === 'toggle' || c.ui_type === 'checkbox'
    ),
    [visibleCols]
  )

  const [records,     setRecords]     = useState<DataRecord[]>([])
  const [pagination,  setPagination]  = useState<PaginationMeta>({
    total: 0, page: 1, limit: PAGE_SIZE, pages: 1,
  })
  const [isLoading,   setIsLoading]   = useState(true)
  const [search,      setSearch]      = useState('')
  const [sortField,   setSortField]   = useState('')
  const [sortDir,     setSortDir]     = useState<'asc' | 'desc'>('asc')
  const [filters,     setFilters]     = useState<Record<string, string>>({})
  const [showFilters, setShowFilters] = useState(false)
  const [currentPage, setCurrentPage] = useState(1)
  const [exporting,   setExporting]   = useState(false)
  const [toast,       setToast]       = useState<Toast | null>(null)

  // Fetch records
  const fetchRecords = useCallback(async (
    pg: number = 1,
    sq: string = search,
    sf: string = sortField,
    sd: string = sortDir,
    fl: Record<string, string> = filters,
  ) => {
    setIsLoading(true)
    try {
      const params = new URLSearchParams({
        page:       String(pg),
        limit:      String(PAGE_SIZE),
        project_id: projectId,
      })
      if (sq.trim()) params.set('search', sq.trim())
      if (sf)        params.set('sort_field', sf)
      if (sd)        params.set('sort_dir', sd)

      Object.entries(fl).forEach(([k, v]) => {
        if (v) params.set(k, v)
      })

      const token = getAuthToken()
      const res = await fetch(`/api-cms/data/${model.name}?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = await res.json()
      setRecords(data.records ?? [])
      setPagination({
        total: data.total ?? 0,
        page:  data.page  ?? 1,
        limit: data.limit ?? PAGE_SIZE,
        pages: data.pages ?? 1,
      })
    } catch {
      showToast('Failed to load data', 'error')
    } finally {
      setIsLoading(false)
    }
  }, [model.name, projectId, search, sortField, sortDir, filters])

  useEffect(() => { fetchRecords(1) }, [])

  function showToast(message: string, type: 'success' | 'error') {
    setToast({ message, type })
    setTimeout(() => setToast(null), 3500)
  }

  function handleSort(field: string) {
    const newDir = sortField === field && sortDir === 'asc' ? 'desc' : 'asc'
    setSortField(field)
    setSortDir(newDir)
    setCurrentPage(1)
    fetchRecords(1, search, field, newDir, filters)
  }

  function handleSearch(q: string) {
    setSearch(q)
    setCurrentPage(1)
    fetchRecords(1, q, sortField, sortDir, filters)
  }

  function handleFilterChange(field: string, value: string) {
    const newFilters = { ...filters, [field]: value }
    if (!value) delete newFilters[field]
    setFilters(newFilters)
    setCurrentPage(1)
    fetchRecords(1, search, sortField, sortDir, newFilters)
  }

  function handlePageChange(pg: number) {
    setCurrentPage(pg)
    fetchRecords(pg, search, sortField, sortDir, filters)
  }

  async function handleExport() {
    setExporting(true)
    try {
      const params = new URLSearchParams({
        limit:      String(EXPORT_LIMIT),
        project_id: projectId,
      })
      if (search.trim()) params.set('search', search.trim())

      const token = getAuthToken()
      const res = await fetch(`/api-cms/data/${model.name}?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!res.ok) throw new Error('Export failed')
      const data = await res.json()
      const rows = data.records ?? []

      // Build CSV
      const headers = visibleCols.map((c) => c.name).join(',')
      const csv     = rows.map((r: DataRecord) =>
        visibleCols.map((c) => {
          const v   = r[c.name] ?? ''
          const str = Array.isArray(v) ? v.join('|') : String(v)
          return `"${str.replace(/"/g, '""')}"`
        }).join(',')
      ).join('\n')

      const blob = new Blob([`${headers}\n${csv}`], { type: 'text/csv' })
      const url  = URL.createObjectURL(blob)
      const a    = document.createElement('a')
      a.href     = url
      a.download = `${model.name}-${new Date().toISOString().slice(0, 10)}.csv`
      a.click()
      URL.revokeObjectURL(url)

      showToast(
        `Exported ${rows.length} records${rows.length === EXPORT_LIMIT ? ' (limit reached)' : ''}`,
        'success'
      )
    } catch {
      showToast('Export failed', 'error')
    } finally {
      setExporting(false)
    }
  }

  const hasActiveFilters = Object.values(filters).some(Boolean)
  const slugPath         = page.slug.replace(/^\//, '')

  return (
    <div className="h-full overflow-y-auto">
      <div className="flex flex-col gap-6 p-6 max-w-[1400px] mx-auto">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-[var(--color-text)]">
              {page.name ?? page.title}
            </h1>
            <p className="text-sm text-[var(--color-text-muted)]">
              {pagination.total} {pagination.total === 1 ? 'record' : 'records'}
            </p>
          </div>

          <button
            onClick={handleExport}
            disabled={exporting || pagination.total === 0}
            className="flex items-center gap-2 px-3 py-2 text-sm rounded-lg border
                       border-gray-200 text-gray-600 hover:bg-gray-50 transition
                       disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <FiDownload size={14} />
            {exporting ? 'Exporting…' : `Export (max ${EXPORT_LIMIT})`}
          </button>
        </div>

        {/* White card */}
        <div className="rounded-2xl border border-gray-200 flex flex-col gap-4 p-5 bg-white">

          {/* Search + filter toggle */}
          <div className="flex items-center gap-3">
            <div className="relative flex-1">
              <FiSearch
                size={15}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
              />
              <input
                type="text"
                value={search}
                onChange={(e) => handleSearch(e.target.value)}
                placeholder="Search…"
                className="w-full pl-9 pr-4 py-2 text-sm rounded-lg border border-gray-200
                           bg-gray-50 focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
              />
            </div>
            {filterableCols.length > 0 && (
              <button
                onClick={() => setShowFilters((p) => !p)}
                className={`flex items-center gap-1.5 px-3 py-2 text-xs rounded-lg border transition ${
                  showFilters || hasActiveFilters
                    ? 'border-[var(--color-primary)] text-[var(--color-primary)] bg-[var(--color-primary)]/10'
                    : 'border-gray-200 text-gray-500 hover:bg-gray-50'
                }`}
              >
                <LuSlidersHorizontal size={12} />
                Filters
                {hasActiveFilters && (
                  <span className="w-2 h-2 rounded-full bg-[var(--color-primary)]" />
                )}
              </button>
            )}
          </div>

          {/* Filter panel */}
          {showFilters && filterableCols.length > 0 && (
            <div className="border border-gray-200 rounded-lg p-4 bg-gray-50 grid grid-cols-2 gap-3">
              {filterableCols.map((col) => {
                const options = col.options_mode === 'manual'
                  ? (col.options ?? [])
                  : col.ui_type === 'toggle' || col.ui_type === 'checkbox'
                    ? ['true', 'false']
                    : []
                return (
                  <div key={col.name}>
                    <label className="block text-xs font-medium text-gray-600 mb-1">{col.name}</label>
                    <select
                      value={filters[col.name] ?? ''}
                      onChange={(e) => handleFilterChange(col.name, e.target.value)}
                      className="w-full px-2 py-1.5 text-sm border border-gray-200 rounded-lg
                                 focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] bg-white"
                    >
                      <option value="">All</option>
                      {options.map((opt) => (
                        <option key={opt} value={opt}>{opt}</option>
                      ))}
                    </select>
                  </div>
                )
              })}
              {hasActiveFilters && (
                <button
                  onClick={() => { setFilters({}); fetchRecords(1, search, sortField, sortDir, {}) }}
                  className="col-span-2 flex items-center justify-center gap-1.5 px-3 py-1.5
                             text-xs text-gray-600 hover:text-red-500 transition"
                >
                  <FiX size={12} /> Clear all filters
                </button>
              )}
            </div>
          )}

          {/* Table */}
          <div className="w-full overflow-x-auto rounded-xl border border-gray-200">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50">
                  {visibleCols.map((col) => (
                    <th
                      key={col.name}
                      onClick={() => handleSort(col.name)}
                      className="px-4 py-3 text-left text-xs font-semibold text-gray-500
                                 uppercase tracking-wider whitespace-nowrap cursor-pointer select-none"
                    >
                      <div className="flex items-center gap-1.5">
                        {col.name}
                        <SortIcon field={col.name} sortField={sortField} sortDir={sortDir} />
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  [...Array(8)].map((_, i) => (
                    <tr key={i} className="border-b border-gray-100">
                      {visibleCols.map((col) => (
                        <td key={col.name} className="px-4 py-3">
                          <div className="h-4 bg-gray-100 rounded animate-pulse w-3/4" />
                        </td>
                      ))}
                    </tr>
                  ))
                ) : records.length === 0 ? (
                  <tr>
                    <td colSpan={visibleCols.length} className="px-4 py-12 text-center text-sm text-gray-400">
                      No records found
                    </td>
                  </tr>
                ) : (
                  records.map((record, idx) => {
                    const id = resolveId(record, columns)
                    return (
                      <tr
                        key={id || idx}
                        className="border-b border-gray-100 last:border-0 hover:bg-gray-50 transition-colors"
                      >
                        {visibleCols.map((col, ci) => (
                          <td key={col.name} className="px-4 py-3">
                            {ci === 0 ? (
                              <Link
                                href={`/${locale}/console/${slugPath}/${id}`}
                                className="text-[var(--color-text)] hover:text-[var(--color-primary)] font-medium"
                              >
                                {formatCell(record[col.name], col)}
                              </Link>
                            ) : (
                              formatCell(record[col.name], col)
                            )}
                          </td>
                        ))}
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {pagination.pages > 1 && (
            <div className="flex items-center justify-between pt-2">
              <p className="text-xs text-gray-400">
                Page {pagination.page} of {pagination.pages} · {pagination.total} records
              </p>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={currentPage <= 1}
                  className="p-1.5 rounded-lg border border-gray-200 hover:bg-gray-50
                             transition disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <FiChevronLeft size={14} />
                </button>
                {Array.from({ length: Math.min(5, pagination.pages) }, (_, i) => {
                  let pg = i + 1
                  if (pagination.pages > 5) {
                    const start = Math.max(1, currentPage - 2)
                    pg = start + i
                    if (pg > pagination.pages) return null
                  }
                  return (
                    <button
                      key={pg}
                      onClick={() => handlePageChange(pg)}
                      className={`w-8 h-8 text-xs rounded-lg border transition ${
                        pg === currentPage
                          ? 'bg-[var(--color-primary)] text-white border-[var(--color-primary)]'
                          : 'border-gray-200 hover:bg-gray-50 text-gray-600'
                      }`}
                    >
                      {pg}
                    </button>
                  )
                })}
                <button
                  onClick={() => handlePageChange(currentPage + 1)}
                  disabled={currentPage >= pagination.pages}
                  className="p-1.5 rounded-lg border border-gray-200 hover:bg-gray-50
                             transition disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <FiChevronRight size={14} />
                </button>
              </div>
            </div>
          )}
        </div>

        {toast && (
          <div className={`fixed bottom-6 right-6 z-50 px-4 py-3 rounded-xl shadow-lg
                           text-sm font-medium text-white ${
            toast.type === 'success' ? 'bg-emerald-600' : 'bg-red-500'
          }`}>
            {toast.message}
          </div>
        )}
      </div>
    </div>
  )
}