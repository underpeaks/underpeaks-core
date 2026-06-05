'use client'

/**
 * ListTemplate.tsx
 * Location: app/[locale]/console/[slug]/components/admin/ListTemplate.tsx
 *
 * Admin list template — KPI bar + search/filter/sort + paginated table + drawer.
 *
 * Features:
 *   - Scroll wrapper for long tables
 *   - Token resolution via clientAuth helper (reads localStorage)
 *   - Fields sorted by their order property when set
 *   - Server-side search, filter, sort, pagination
 *   - First image of array used as table thumbnail
 */

import { useState, useEffect, useMemo, useCallback } from 'react'

import {
  FiChevronUp, FiChevronDown, FiPlus, FiSearch, FiX,
  FiChevronLeft, FiChevronRight,
}                                          from 'react-icons/fi'
import { LuChevronsUpDown, LuSlidersHorizontal } from 'react-icons/lu'
import { Settings2, Save }                 from 'lucide-react'

import DataDrawer                          from '../shared/DataDrawer'
import UserKpiBar                          from '../../../cmsusers/components/UserKpiBar'
import { computeAllKpis }                  from '../../../kpi/kpiEngine'
import { getAuthToken, getUserId }                    from '@/app/lib/clientAuth'
import type { KpiPageConfig, KpiResult }   from '../../../kpi/kpi'
import type {
  AdminTemplateProps, DataRecord, ModelColumn,
  PaginationMeta, Toast, DrawerMode,
} from '../../types'

const PAGE_SIZE = 50

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getPkColumn(cols: ModelColumn[]): ModelColumn | undefined {
  return cols.find((c) => c.is_primary)
}

function resolveId(record: DataRecord, cols: ModelColumn[]): string {
  const pk = getPkColumn(cols)
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

// ---------------------------------------------------------------------------
// Cell value renderer
// ---------------------------------------------------------------------------

function CellValue({ value, column }: { value: unknown; column: ModelColumn }) {
  if (value === null || value === undefined) return <span className="text-gray-300">—</span>

  if (column.ui_type === 'toggle' || column.ui_type === 'checkbox') {
    return (
      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
        value ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-500'
      }`}>
        {value ? 'Yes' : 'No'}
      </span>
    )
  }

  if (column.ui_type === 'image-upload' || column.ui_type === 'image-url' || column.ui_type === 'media-picker') {
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

  if (column.ui_type === 'select') {
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs
                       font-medium bg-[var(--color-primary)]/10 text-[var(--color-primary)]">
        {String(value)}
      </span>
    )
  }

  if (column.ui_type === 'tags-input' || column.ui_type === 'multi-select' || column.ui_type === 'list') {
    const arr = Array.isArray(value) ? value : String(value).split(',').map((s) => s.trim())
    return (
      <div className="flex flex-wrap gap-1">
        {arr.slice(0, 3).map((tag, i) => (
          <span key={i} className="px-1.5 py-0.5 bg-gray-100 text-gray-600 rounded text-[10px]">
            {String(tag)}
          </span>
        ))}
        {arr.length > 3 && (
          <span className="px-1.5 py-0.5 bg-gray-100 text-gray-400 rounded text-[10px]">+{arr.length - 3}</span>
        )}
      </div>
    )
  }

  if (column.ui_type === 'datetime-picker' || column.ui_type === 'date-picker') {
    try {
      return (
        <span className="text-sm text-gray-600">
          {new Date(String(value)).toLocaleDateString(undefined, {
            day: 'numeric', month: 'short', year: 'numeric',
          })}
        </span>
      )
    } catch { return String(value) }
  }

  if (column.ui_type === 'currency-input') {
    return <span className="text-sm font-medium">R {Number(value).toFixed(2)}</span>
  }

  if (column.ui_type === 'color-picker') {
    return (
      <div className="flex items-center gap-2">
        <span className="w-4 h-4 rounded-full border border-gray-200 inline-block"
              style={{ backgroundColor: String(value) }} />
        <span className="text-xs font-mono text-gray-500">{String(value)}</span>
      </div>
    )
  }

  const str = String(value)
  return <span className="text-sm text-gray-700">{str.length > 60 ? str.slice(0, 60) + '…' : str}</span>
}

// ---------------------------------------------------------------------------
// Sort icon
// ---------------------------------------------------------------------------

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

export default function ListTemplate({
  page, model, projectId, tenantId,
}: AdminTemplateProps) {
  const columns        = model.schema.columns
  const visibleCols    = useMemo(() => getVisibleColumns(columns), [columns])
  const filterableCols = useMemo(
    () => visibleCols.filter((c) =>
      c.ui_type === 'select' || c.ui_type === 'toggle' || c.ui_type === 'checkbox'
    ),
    [visibleCols]
  )

  const [records,      setRecords]      = useState<DataRecord[]>([])
  const [pagination,   setPagination]   = useState<PaginationMeta>({
    total: 0, page: 1, limit: PAGE_SIZE, pages: 1,
  })
  const [isLoading,    setIsLoading]    = useState(true)
  const [search,       setSearch]       = useState('')
  const [sortField,    setSortField]    = useState('')
  const [sortDir,      setSortDir]      = useState<'asc' | 'desc'>('asc')
  const [filters,      setFilters]      = useState<Record<string, string>>({})
  const [showFilters,  setShowFilters]  = useState(false)
  const [currentPage,  setCurrentPage]  = useState(1)
  const [drawerOpen,   setDrawerOpen]   = useState(false)
  const [drawerMode,   setDrawerMode]   = useState<DrawerMode>('create')
  const [activeRecord, setActiveRecord] = useState<DataRecord | null>(null)
  const [kpiConfig,    setKpiConfig]    = useState<KpiPageConfig | null>(null)
  const [kpiResults,   setKpiResults]   = useState<KpiResult[]>([])
  const [isKpiEdit,    setIsKpiEdit]    = useState(false)
  const [isSavingKpi,  setIsSavingKpi]  = useState(false)
  const [toast,        setToast]        = useState<Toast | null>(null)
  const [userId,       setUserId]       = useState('')

  // Resolve userId from session token
  useEffect(() => {
  setUserId(getUserId())
}, [])

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
      Object.entries(fl).forEach(([k, v]) => { if (v) params.set(k, v) })

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
      showToast('Failed to load records', 'error')
    } finally {
      setIsLoading(false)
    }
  }, [model.name, projectId, search, sortField, sortDir, filters])

  useEffect(() => { fetchRecords(1) }, [])

  // Load KPI config
  useEffect(() => {
    if (!userId) return
    fetch(`/api/kpi-config?page=${page.page_id}&user_id=${userId}`)
      .then((r) => r.json())
      .then((d) => setKpiConfig(d.config ?? null))
      .catch(() => {})
  }, [userId, page.page_id])

  // Recompute KPIs when records change
  useEffect(() => {
    if (!kpiConfig || records.length === 0) { setKpiResults([]); return }
    const allKpis = kpiConfig.blocks.flatMap((b) => b.kpis)
    setKpiResults(computeAllKpis(records as Record<string, unknown>[], allKpis))
  }, [kpiConfig, records])

  const kpiFields = useMemo(() =>
    visibleCols.map((c) => ({ value: c.name, label: c.name })),
  [visibleCols])

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

  function openCreate() {
    setActiveRecord(null)
    setDrawerMode('create')
    setDrawerOpen(true)
  }

  function openEdit(record: DataRecord) {
    setActiveRecord(record)
    setDrawerMode('edit')
    setDrawerOpen(true)
  }

  function handleSaved() {
    setDrawerOpen(false)
    showToast(drawerMode === 'create' ? 'Record created' : 'Record updated', 'success')
    fetchRecords(currentPage, search, sortField, sortDir, filters)
  }

  function handleDeleted() {
    setDrawerOpen(false)
    showToast('Record deleted', 'success')
    fetchRecords(currentPage, search, sortField, sortDir, filters)
  }

  async function handleSaveKpiConfig(config: KpiPageConfig) {
    setKpiConfig(config)
    setIsSavingKpi(true)
    try {
      const res = await fetch('/api/kpi-config', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ ...config, user_id: userId }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Failed to save')
      showToast('KPI layout saved', 'success')
    } catch (err: any) {
      showToast(err instanceof Error ? err.message : 'Save failed', 'error')
    } finally {
      setIsSavingKpi(false)
    }
  }

  const hasActiveFilters = Object.values(filters).some(Boolean)

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

          <div className="flex items-center gap-2">
            {isKpiEdit && (
              <button
                disabled={isSavingKpi}
                onClick={() => {
                  if (kpiConfig) handleSaveKpiConfig(kpiConfig)
                  setIsKpiEdit(false)
                }}
                className="flex items-center gap-2 px-3 py-2 text-sm rounded-lg
                           bg-[var(--color-primary)] text-white hover:opacity-90
                           transition disabled:opacity-50"
              >
                <Save size={14} />
                {isSavingKpi ? 'Saving…' : 'Save layout'}
              </button>
            )}
            <button
              onClick={() => setIsKpiEdit((p) => !p)}
              className={`flex items-center gap-2 px-3 py-2 text-sm rounded-lg border transition ${
                isKpiEdit
                  ? 'border-[var(--color-primary)] text-[var(--color-primary)] bg-[var(--color-primary)]/10'
                  : 'border-[var(--color-border)] text-[var(--color-text-muted)] hover:text-[var(--color-text)]'
              }`}
            >
              <Settings2 size={14} />
              {isKpiEdit ? 'Editing KPIs' : 'Edit KPIs'}
            </button>
            <button
              onClick={openCreate}
              className="flex items-center gap-2 px-4 py-2 text-sm rounded-lg
                         bg-[var(--color-primary)] text-white hover:opacity-90 transition"
            >
              <FiPlus size={15} />
              Add
            </button>
          </div>
        </div>

        {/* KPI bar */}
        <UserKpiBar
          config={kpiConfig}
          results={kpiResults}
          availableFields={kpiFields}
          isEditMode={isKpiEdit}
          onConfigChange={(newConfig) => {
            setKpiConfig(newConfig)
            const allKpis = newConfig.blocks.flatMap((b) => b.kpis)
            setKpiResults(computeAllKpis(records as Record<string, unknown>[], allKpis))
          }}
          projectId={projectId}
          tenantId={tenantId}
           page={page.page_id} 
        />

        {/* White card */}
        <div className="rounded-2xl border border-gray-200 flex flex-col gap-4 p-5 bg-white">

          {/* Search + filter toggle */}
          <div className="flex items-center gap-3">
            <div className="relative flex-1">
              <FiSearch size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => handleSearch(e.target.value)}
                placeholder="Search…"
                className="w-full pl-9 pr-4 py-2 text-sm rounded-lg border border-gray-200
                           bg-gray-50 text-[var(--color-text)]
                           focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
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
                {hasActiveFilters && <span className="w-2 h-2 rounded-full bg-[var(--color-primary)]" />}
              </button>
            )}
            <p className="text-xs text-gray-400 whitespace-nowrap">{pagination.total} total</p>
          </div>

          {/* Filters panel */}
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
                        onClick={() => openEdit(record)}
                        className="border-b border-gray-100 last:border-0 hover:bg-gray-50 cursor-pointer transition-colors"
                      >
                        {visibleCols.map((col) => (
                          <td key={col.name} className="px-4 py-3">
                            <CellValue value={record[col.name]} column={col} />
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

        {/* Drawer */}
        <DataDrawer
          open={drawerOpen}
          mode={drawerMode}
          model={model}
          record={activeRecord}
          projectId={projectId}
          tenantId={tenantId}
          authToken={getAuthToken()}
          userId={userId}
          onClose={() => setDrawerOpen(false)}
          onSaved={handleSaved}
          onDeleted={handleDeleted}
        />

        {/* Toast */}
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