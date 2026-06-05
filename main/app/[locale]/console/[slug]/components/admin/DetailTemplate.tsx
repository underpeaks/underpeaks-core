'use client'

/**
 * DetailTemplate.tsx
 * Location: app/[locale]/console/[slug]/components/admin/DetailTemplate.tsx
 *
 * Admin template — single record detail view.
 * Used at route /[locale]/console/[slug]/[id] when admin clicks a record
 * from a list/grid for a full read-friendly layout.
 *
 * Features:
 *   - Scroll wrapper for long records
 *   - Token resolution via clientAuth helper (reads localStorage)
 *   - Fields sorted by their order property when set
 *   - Image carousel for array-type image fields
 *   - Single image preview for string-type image fields
 *   - Locale-aware back navigation
 *   - DataDrawer for editing
 */

import { useState, useEffect, useCallback, useMemo } from 'react'
import { useRouter }                                 from 'next/navigation'
import { useLocale }                                 from 'next-intl'
import Link                                          from 'next/link'
import {
  FiArrowLeft, FiEdit2, FiTrash2, FiAlertTriangle, FiCheck,
  FiChevronLeft, FiChevronRight,
} from 'react-icons/fi'
import { AdminTemplateProps, DataRecord, ModelColumn, Toast } from '../../types'
import DataDrawer    from '../shared/DataDrawer'
import { getAuthToken, getUserId } from '@/app/lib/clientAuth'

interface DetailTemplateProps extends AdminTemplateProps {
  recordId: string
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getPkColumn(columns: ModelColumn[]): ModelColumn | undefined {
  return columns.find((c) => c.is_primary)
}

function getVisibleColumns(columns: ModelColumn[]): ModelColumn[] {
  const visible = columns.filter((c) => !c.hidden)
  // Sort by order if any column has it set, otherwise preserve array order
  return visible.sort((a, b) => {
    const ao = (a as any).order ?? Number.MAX_SAFE_INTEGER
    const bo = (b as any).order ?? Number.MAX_SAFE_INTEGER
    return ao - bo
  })
}

function isImageField(col: ModelColumn): boolean {
  return col.ui_type === 'image-upload' ||
         col.ui_type === 'image-url'    ||
         col.ui_type === 'media-picker'
}

function isMultiImageField(col: ModelColumn): boolean {
  return isImageField(col) && col.type === 'array'
}

function asImageUrls(value: unknown): string[] {
  if (!value) return []
  if (Array.isArray(value)) return value.map((v) => String(v)).filter(Boolean)
  if (typeof value === 'string' && value.trim()) return [value]
  return []
}

// ---------------------------------------------------------------------------
// Image carousel — for multi-image fields
// ---------------------------------------------------------------------------

function ImageCarousel({ urls }: { urls: string[] }) {
  const [activeIndex, setActiveIndex] = useState(0)

  if (urls.length === 0) {
    return <span className="text-gray-300">—</span>
  }

  if (urls.length === 1) {
    return (
      <img
        src={urls[0]}
        alt=""
        className="w-full max-w-md rounded-xl border border-gray-200 object-cover aspect-video"
        onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
      />
    )
  }

  const goNext = () => setActiveIndex((i) => (i + 1) % urls.length)
  const goPrev = () => setActiveIndex((i) => (i - 1 + urls.length) % urls.length)

  return (
    <div className="space-y-3">
      {/* Main image with arrows */}
      <div className="relative w-full max-w-2xl">
        <div className="aspect-video bg-gray-50 rounded-xl border border-gray-200 overflow-hidden">
          <img
            src={urls[activeIndex]}
            alt=""
            className="w-full h-full object-cover"
            onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
          />
        </div>

        {/* Prev / Next */}
        <button
          type="button"
          onClick={goPrev}
          className="absolute left-2 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full
                     bg-white/90 hover:bg-white shadow-md flex items-center justify-center
                     text-gray-700 transition"
        >
          <FiChevronLeft size={18} />
        </button>
        <button
          type="button"
          onClick={goNext}
          className="absolute right-2 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full
                     bg-white/90 hover:bg-white shadow-md flex items-center justify-center
                     text-gray-700 transition"
        >
          <FiChevronRight size={18} />
        </button>

        {/* Counter */}
        <div className="absolute bottom-3 right-3 px-2 py-0.5 rounded-full
                        bg-black/60 text-white text-xs font-medium">
          {activeIndex + 1} / {urls.length}
        </div>
      </div>

      {/* Thumbnail strip */}
      <div className="flex gap-2 overflow-x-auto pb-1 max-w-2xl">
        {urls.map((url, i) => (
          <button
            key={i}
            type="button"
            onClick={() => setActiveIndex(i)}
            className={`flex-shrink-0 w-16 h-16 rounded-lg border-2 overflow-hidden transition ${
              i === activeIndex
                ? 'border-[var(--color-primary)] ring-2 ring-[var(--color-primary)]/20'
                : 'border-gray-200 hover:border-gray-300'
            }`}
          >
            <img
              src={url}
              alt=""
              className="w-full h-full object-cover"
              onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
            />
          </button>
        ))}
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Field value formatter
// ---------------------------------------------------------------------------

function formatValue(value: unknown, col: ModelColumn): React.ReactNode {
  if (value === null || value === undefined || value === '') {
    return <span className="text-gray-300">—</span>
  }

  if (col.ui_type === 'toggle' || col.ui_type === 'checkbox') {
    return (
      <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium ${
        value ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-500'
      }`}>
        {value ? <FiCheck size={10} /> : null}
        {value ? 'Yes' : 'No'}
      </span>
    )
  }

  // Image fields — carousel for arrays, single for strings
  if (isImageField(col)) {
    const urls = asImageUrls(value)
    if (isMultiImageField(col)) {
      return <ImageCarousel urls={urls} />
    }
    // Single image
    if (urls.length === 0) return <span className="text-gray-300">—</span>
    return (
      <img
        src={urls[0]}
        alt=""
        className="w-48 h-48 object-cover rounded-xl border border-gray-200"
        onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
      />
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

  if (col.ui_type === 'tags-input' || col.ui_type === 'multi-select' ||
      col.ui_type === 'list'       || col.ui_type === 'checklist') {
    const arr = Array.isArray(value) ? value : String(value).split(',').map((s) => s.trim())
    return (
      <div className="flex flex-wrap gap-1">
        {arr.map((tag, i) => (
          <span key={i} className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded-full text-xs">
            {String(tag)}
          </span>
        ))}
      </div>
    )
  }

  if (col.ui_type === 'datetime-picker' || col.ui_type === 'date-picker') {
    try {
      return (
        <span className="text-sm text-[var(--color-text)]">
          {new Date(String(value)).toLocaleDateString(undefined, {
            day:    'numeric',
            month:  'short',
            year:   'numeric',
            hour:   col.ui_type === 'datetime-picker' ? '2-digit' : undefined,
            minute: col.ui_type === 'datetime-picker' ? '2-digit' : undefined,
          })}
        </span>
      )
    } catch { return String(value) }
  }

  if (col.ui_type === 'currency-input') {
    return (
      <span className="text-sm font-semibold text-[var(--color-text)]">
        R {Number(value).toFixed(2)}
      </span>
    )
  }

  if (col.ui_type === 'color-picker') {
    return (
      <div className="flex items-center gap-2">
        <span
          className="w-6 h-6 rounded-lg border border-gray-200 inline-block"
          style={{ backgroundColor: String(value) }}
        />
        <span className="text-sm font-mono text-gray-600">{String(value)}</span>
      </div>
    )
  }

  if (col.ui_type === 'code-editor' || col.ui_type === 'json-viewer' || col.ui_type === 'key-value-editor') {
    const str = typeof value === 'object' ? JSON.stringify(value, null, 2) : String(value)
    return (
      <pre className="text-xs font-mono bg-gray-50 border border-gray-200 rounded-lg
                      p-3 overflow-x-auto whitespace-pre-wrap max-h-60 overflow-y-auto">
        {str}
      </pre>
    )
  }

  if (col.ui_type === 'rich-text' || col.ui_type === 'textarea' || col.ui_type === 'markdown-editor') {
    return (
      <p className="text-sm text-[var(--color-text)] whitespace-pre-wrap leading-relaxed">
        {String(value)}
      </p>
    )
  }

  if (col.ui_type === 'url-input') {
    return (
      <a
        href={String(value)}
        target="_blank"
        rel="noopener noreferrer"
        className="text-sm text-[var(--color-primary)] hover:underline break-all"
      >
        {String(value)}
      </a>
    )
  }

  if (col.ui_type === 'email-input') {
    return (
      <a
        href={`mailto:${value}`}
        className="text-sm text-[var(--color-primary)] hover:underline"
      >
        {String(value)}
      </a>
    )
  }

  if (col.ui_type === 'phone-input') {
    return (
      <a href={`tel:${value}`} className="text-sm text-[var(--color-primary)] hover:underline">
        {String(value)}
      </a>
    )
  }

  if (col.ui_type === 'rating') {
    const stars = Number(value) || 0
    return (
      <div className="flex gap-0.5">
        {[1, 2, 3, 4, 5].map((s) => (
          <span key={s} className={s <= stars ? 'text-amber-400' : 'text-gray-200'}>★</span>
        ))}
      </div>
    )
  }

  return (
    <span className="text-sm text-[var(--color-text)] break-words">{String(value)}</span>
  )
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export default function DetailTemplate({
  page, model, projectId, tenantId, recordId,
}: DetailTemplateProps) {
  const router  = useRouter()
  const locale  = useLocale()
  const columns = model.schema.columns

  const visibleColumns = useMemo(() => getVisibleColumns(columns), [columns])
  const pkCol          = useMemo(() => getPkColumn(columns), [columns])

  const [record,         setRecord]         = useState<DataRecord | null>(null)
  const [isLoading,      setIsLoading]      = useState(true)
  const [error,          setError]          = useState<string | null>(null)
  const [drawerOpen,     setDrawerOpen]     = useState(false)
  const [showDeleteConf, setShowDeleteConf] = useState(false)
  const [deleting,       setDeleting]       = useState(false)
  const [toast,          setToast]          = useState<Toast | null>(null)
  const [userId,         setUserId]         = useState('')

  const backUrl = `/${locale}/console/${page.slug.replace(/^\//, '')}`

  // Resolve userId from session token
  useEffect(() => {
  setUserId(getUserId())
}, [])

  // Fetch the record
  const fetchRecord = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const token = getAuthToken()
      const res = await fetch(
        `/api-cms/data/${model.name}?project_id=${projectId}&limit=1000`,
        { headers: { Authorization: `Bearer ${token}` } }
      )
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = await res.json()

      const pkName = pkCol?.name ?? 'id'
      const found  = (data.records ?? []).find((r: DataRecord) =>
        String(r[pkName]) === recordId ||
        String(r.id)      === recordId ||
        String(r._id)     === recordId
      )

      if (!found) throw new Error('Record not found')
      setRecord(found)
    } catch (err: any) {
      setError(err.message || 'Failed to load record')
    } finally {
      setIsLoading(false)
    }
  }, [model.name, projectId, recordId, pkCol])

  useEffect(() => { fetchRecord() }, [fetchRecord])

  function showToast(message: string, type: 'success' | 'error') {
    setToast({ message, type })
    setTimeout(() => setToast(null), 3500)
  }

  async function handleDelete() {
    if (!record) return
    setDeleting(true)
    try {
      const id = pkCol ? String(record[pkCol.name]) : String(record.id ?? record._id ?? '')
      const token = getAuthToken()

      const res = await fetch(`/api-cms/data/${model.name}`, {
        method:  'DELETE',
        headers: {
          'Content-Type': 'application/json',
          Authorization:  `Bearer ${token}`,
        },
        body: JSON.stringify({
          id,
          id_column:  pkCol?.name ?? 'id',
          project_id: projectId,
          tenant_id:  tenantId,
        }),
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error ?? 'Delete failed')
      }
      router.push(backUrl)
    } catch (err: any) {
      showToast(err.message || 'Delete failed', 'error')
      setDeleting(false)
    }
  }

  // ── Loading state ──
  if (isLoading) {
    return (
      <div className="h-full overflow-y-auto">
        <div className="flex flex-col gap-6 p-6 max-w-4xl mx-auto">
          <div className="h-8 bg-gray-100 rounded animate-pulse w-1/3" />
          <div className="rounded-2xl border border-gray-200 bg-white p-6 space-y-4">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="grid grid-cols-3 gap-4">
                <div className="h-4 bg-gray-100 rounded animate-pulse" />
                <div className="h-4 bg-gray-100 rounded animate-pulse col-span-2" />
              </div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  // ── Error state ──
  if (error || !record) {
    return (
      <div className="h-full overflow-y-auto">
        <div className="flex flex-col gap-4 p-6 max-w-4xl mx-auto">
          <Link
            href={backUrl}
            className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700"
          >
            <FiArrowLeft size={15} /> Back
          </Link>
          <div className="px-4 py-3 bg-red-50 border border-red-200 rounded-lg
                          text-sm text-red-600 flex items-center gap-2">
            <FiAlertTriangle size={14} />
            {error ?? 'Record not found'}
          </div>
        </div>
      </div>
    )
  }

  const titleVal = record.title ?? record.name ?? record.label ?? 'Detail'

  // ── Main view ──
  return (
    <div className="h-full overflow-y-auto">
      <div className="flex flex-col gap-6 p-6 max-w-4xl mx-auto">

        {/* Header */}
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <Link
              href={backUrl}
              className="p-2 rounded-lg hover:bg-gray-100 text-gray-500
                         hover:text-gray-700 transition flex-shrink-0"
            >
              <FiArrowLeft size={16} />
            </Link>
            <div className="min-w-0">
              <h1 className="text-xl font-bold text-[var(--color-text)] truncate">
                {String(titleVal)}
              </h1>
              <p className="text-sm text-[var(--color-text-muted)] truncate">
                {pkCol?.name ?? 'id'}: {recordId}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-shrink-0">
            <button
              onClick={() => setDrawerOpen(true)}
              className="flex items-center gap-2 px-3 py-2 text-sm rounded-lg
                         bg-[var(--color-primary)] text-white hover:opacity-90 transition"
            >
              <FiEdit2 size={14} />
              Edit
            </button>
            <button
              onClick={() => setShowDeleteConf(true)}
              className="flex items-center gap-2 px-3 py-2 text-sm rounded-lg
                         border border-red-200 text-red-500 hover:bg-red-50 transition"
            >
              <FiTrash2 size={14} />
              Delete
            </button>
          </div>
        </div>

        {/* Delete confirmation */}
        {showDeleteConf && (
          <div className="px-4 py-3 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-sm text-red-600 font-medium mb-2">
              Permanently delete this record? This cannot be undone.
            </p>
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => setShowDeleteConf(false)}
                className="px-3 py-1.5 text-xs rounded-lg border border-gray-200
                           text-gray-600 hover:bg-gray-50 transition"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="px-3 py-1.5 text-xs rounded-lg bg-red-500 text-white
                           hover:bg-red-600 transition disabled:opacity-50"
              >
                {deleting ? 'Deleting…' : 'Yes, delete'}
              </button>
            </div>
          </div>
        )}

        {/* Detail card */}
        <div className="rounded-2xl border border-gray-200 bg-white">
          <div className="px-6 py-4 border-b border-gray-100">
            <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">
              Record details
            </p>
          </div>
          <div className="divide-y divide-gray-100">
            {visibleColumns.map((col) => (
              <div
                key={col.name}
                className="grid grid-cols-1 sm:grid-cols-3 gap-3 px-6 py-4
                           hover:bg-gray-50/50 transition"
              >
                <div>
                  <p className="text-xs font-medium text-gray-500">{col.name}</p>
                  <p className="text-[10px] text-gray-400">{col.ui_type ?? col.type}</p>
                </div>
                <div className="sm:col-span-2">
                  {formatValue(record[col.name], col)}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Drawer */}
        <DataDrawer
          open={drawerOpen}
          mode="edit"
          model={model}
          record={record}
          projectId={projectId}
          tenantId={tenantId}
          authToken={getAuthToken()}
          userId={userId}
          onClose={() => setDrawerOpen(false)}
          onSaved={(saved) => {
            setRecord(saved)
            setDrawerOpen(false)
            showToast('Record updated', 'success')
          }}
          onDeleted={() => {
            router.push(backUrl)
          }}
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