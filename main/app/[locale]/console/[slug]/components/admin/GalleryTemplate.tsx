'use client'

/**
 * GalleryTemplate.tsx
 * Location: app/[locale]/console/[slug]/components/admin/GalleryTemplate.tsx
 *
 * Admin template — image-focused gallery layout.
 *
 * Structure:
 *   Header (page name + Add button + Edit KPIs)
 *   KpiBar
 *   White card:
 *     Search bar
 *     Toggle: show records with images only / show all
 *     Large image grid (6 cols desktop, 4 tablet, 2 mobile)
 *     Hover reveals title overlay
 *     Pagination
 *   DataDrawer
 *
 * Features:
 *   - Scroll wrapper for long galleries
 *   - Token resolution via clientAuth helper (reads localStorage)
 *   - Fields sorted by their order property when set
 *   - First image of array used as gallery tile
 *
 * Designed for media libraries, product catalogues with photos, portfolios.
 */

import { useState, useEffect, useMemo, useCallback } from 'react'
import {
  FiPlus, FiSearch, FiChevronLeft, FiChevronRight, FiImage, FiEye, FiEyeOff,
} from 'react-icons/fi'
import { Settings2, Save }                from 'lucide-react'
import UserKpiBar                         from '../../../cmsusers/components/UserKpiBar'
import { KpiPageConfig, KpiResult }       from '../../../kpi/kpi'
import { computeAllKpis }                 from '../../../kpi/kpiEngine'
import { getAuthToken, getUserId }                   from '@/app/lib/clientAuth'
import {
  ModelColumn, DataRecord, AdminTemplateProps,
  PaginationMeta, DrawerMode, Toast,
} from '../../types'
import DataDrawer from '../shared/DataDrawer'

const PAGE_SIZE = 36

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

function findImageField(columns: ModelColumn[]): ModelColumn | undefined {
  return columns.find((c) =>
    c.ui_type === 'image-upload' ||
    c.ui_type === 'image-url'    ||
    c.ui_type === 'media-picker'
  )
}

function findTitleField(columns: ModelColumn[]): ModelColumn | undefined {
  const priority = ['title', 'name', 'label']
  for (const p of priority) {
    const found = columns.find((c) =>
      c.name.toLowerCase() === p && !c.hidden && !c.is_primary
    )
    if (found) return found
  }
  return columns.find((c) =>
    !c.hidden && !c.is_primary && c.type === 'string'
  )
}

function getImageUrl(value: unknown): string | null {
  if (!value) return null
  if (Array.isArray(value)) return value[0] ? String(value[0]) : null
  return String(value)
}

function recordHasImage(record: DataRecord, imageField?: ModelColumn): boolean {
  if (!imageField) return true
  const val = record[imageField.name]
  if (!val) return false
  if (Array.isArray(val)) return val.length > 0
  return Boolean(val)
}

// ---------------------------------------------------------------------------
// Gallery tile
// ---------------------------------------------------------------------------

function GalleryTile({
  record, imageField, titleField, onClick,
}: {
  record:      DataRecord
  imageField?: ModelColumn
  titleField?: ModelColumn
  onClick:     () => void
}) {
  const imageUrl = imageField ? getImageUrl(record[imageField.name]) : null
  const title    = titleField ? String(record[titleField.name] ?? '') : 'Untitled'

  return (
    <button
      onClick={onClick}
      className="group relative aspect-square rounded-xl overflow-hidden
                 bg-gray-100 hover:ring-2 hover:ring-[var(--color-primary)]/40 transition-all"
    >
      {imageUrl ? (
        <img
          src={imageUrl}
          alt={title}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform"
          onError={(e) => {
            (e.target as HTMLImageElement).style.display = 'none'
          }}
        />
      ) : (
        <div className="w-full h-full flex items-center justify-center">
          <FiImage size={32} className="text-gray-300" />
        </div>
      )}

      {/* Hover overlay with title */}
      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent
                      opacity-0 group-hover:opacity-100 transition-opacity p-3">
        <p className="text-xs font-medium text-white truncate text-left">
          {title}
        </p>
      </div>
    </button>
  )
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export default function GalleryTemplate({
  page, model, projectId, tenantId,
}: AdminTemplateProps) {
  const columns     = model.schema.columns
  const visibleCols = useMemo(() => getVisibleColumns(columns), [columns])
  const imageField  = useMemo(() => findImageField(columns), [columns])
  const titleField  = useMemo(() => findTitleField(columns), [columns])

  const [records,      setRecords]      = useState<DataRecord[]>([])
  const [pagination,   setPagination]   = useState<PaginationMeta>({
    total: 0, page: 1, limit: PAGE_SIZE, pages: 1,
  })
  const [isLoading,    setIsLoading]    = useState(true)
  const [search,       setSearch]       = useState('')
  const [currentPage,  setCurrentPage]  = useState(1)
  const [showAll,      setShowAll]      = useState(false) // include records without images
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

  const fetchRecords = useCallback(async (pg: number = 1, sq: string = search) => {
    setIsLoading(true)
    try {
      const params = new URLSearchParams({
        page:       String(pg),
        limit:      String(PAGE_SIZE),
        project_id: projectId,
      })
      if (sq.trim()) params.set('search', sq.trim())

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
  }, [model.name, projectId, search])

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

  // Filter records by image presence client-side after server fetch
  const displayedRecords = useMemo(() => {
    if (showAll || !imageField) return records
    return records.filter((r) => recordHasImage(r, imageField))
  }, [records, imageField, showAll])

  function showToast(message: string, type: 'success' | 'error') {
    setToast({ message, type })
    setTimeout(() => setToast(null), 3500)
  }

  function handleSearch(q: string) {
    setSearch(q)
    setCurrentPage(1)
    fetchRecords(1, q)
  }

  function handlePageChange(pg: number) {
    setCurrentPage(pg)
    fetchRecords(pg, search)
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
    fetchRecords(currentPage, search)
  }

  function handleDeleted() {
    setDrawerOpen(false)
    showToast('Record deleted', 'success')
    fetchRecords(currentPage, search)
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
        <div className="rounded-2xl border border-gray-200 flex flex-col gap-5 p-5 bg-white">

          {/* Controls */}
          <div className="flex items-center gap-3 flex-wrap">
            <div className="relative flex-1 min-w-[200px]">
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

            {imageField && (
              <button
                onClick={() => setShowAll((p) => !p)}
                className={`flex items-center gap-1.5 px-3 py-2 text-xs rounded-lg border transition ${
                  showAll
                    ? 'border-[var(--color-primary)] text-[var(--color-primary)] bg-[var(--color-primary)]/10'
                    : 'border-gray-200 text-gray-500 hover:bg-gray-50'
                }`}
              >
                {showAll ? <FiEye size={12} /> : <FiEyeOff size={12} />}
                {showAll ? 'All records' : 'With images only'}
              </button>
            )}

            <p className="text-xs text-gray-400 whitespace-nowrap">
              {displayedRecords.length} shown
            </p>
          </div>

          {/* Gallery grid */}
          {isLoading ? (
            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3">
              {[...Array(12)].map((_, i) => (
                <div key={i} className="aspect-square rounded-xl bg-gray-100 animate-pulse" />
              ))}
            </div>
          ) : displayedRecords.length === 0 ? (
            <div className="py-16 text-center text-sm text-gray-400">
              <FiImage size={32} className="mx-auto mb-3 text-gray-200" />
              {imageField && !showAll
                ? 'No records with images found'
                : 'No records found'}
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3">
              {displayedRecords.map((record, idx) => {
                const id = resolveId(record, columns)
                return (
                  <GalleryTile
                    key={id || idx}
                    record={record}
                    imageField={imageField}
                    titleField={titleField}
                    onClick={() => openEdit(record)}
                  />
                )
              })}
            </div>
          )}

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