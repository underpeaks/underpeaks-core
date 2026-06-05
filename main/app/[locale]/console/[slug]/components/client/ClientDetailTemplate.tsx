'use client'

/**
 * ClientDetailTemplate.tsx
 * Location: app/[locale]/console/[slug]/components/client/ClientDetailTemplate.tsx
 *
 * Client/public-facing detail view.
 * Read-only — no edit, no delete.
 *
 * Features:
 *   - Scroll wrapper for long records
 *   - Token resolution via clientAuth helper (reads localStorage)
 *   - Fields sorted by their order property when set
 *   - Image carousel for array-type image fields
 *   - Locale-aware back navigation
 *
 * Route: /[locale]/console/[slug]/[id]
 */

import { useState, useEffect, useCallback, useMemo } from 'react'
import { useLocale }                                 from 'next-intl'
import Link                                          from 'next/link'
import {
  FiArrowLeft, FiAlertTriangle, FiCheck,
  FiChevronLeft, FiChevronRight,
}                                                    from 'react-icons/fi'
import { AdminTemplateProps, ModelColumn, DataRecord } from '../../types'
import { getAuthToken } from '@/app/lib/clientAuth'

interface ClientDetailTemplateProps extends AdminTemplateProps {
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
// Image carousel (multi-image only)
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
      <div className="relative w-full max-w-2xl">
        <div className="aspect-video bg-gray-50 rounded-xl border border-gray-200 overflow-hidden">
          <img
            src={urls[activeIndex]}
            alt=""
            className="w-full h-full object-cover"
            onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
          />
        </div>

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

        <div className="absolute bottom-3 right-3 px-2 py-0.5 rounded-full
                        bg-black/60 text-white text-xs font-medium">
          {activeIndex + 1} / {urls.length}
        </div>
      </div>

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
// Value formatter
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

  // Image fields — carousel for arrays, single image for strings
  if (isImageField(col)) {
    const urls = asImageUrls(value)
    if (isMultiImageField(col)) {
      return <ImageCarousel urls={urls} />
    }
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

  if (col.ui_type === 'tags-input' || col.ui_type === 'multi-select' || col.ui_type === 'list') {
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
      return new Date(String(value)).toLocaleDateString(undefined, {
        day: 'numeric', month: 'short', year: 'numeric',
      })
    } catch { return String(value) }
  }

  if (col.ui_type === 'currency-input') {
    return <span className="font-semibold">R {Number(value).toFixed(2)}</span>
  }

  if (col.ui_type === 'rich-text' || col.ui_type === 'textarea' || col.ui_type === 'markdown-editor') {
    return <p className="whitespace-pre-wrap leading-relaxed">{String(value)}</p>
  }

  if (col.ui_type === 'url-input') {
    return (
      <a href={String(value)} target="_blank" rel="noopener noreferrer"
         className="text-[var(--color-primary)] hover:underline break-all">
        {String(value)}
      </a>
    )
  }

  if (col.ui_type === 'email-input') {
    return (
      <a href={`mailto:${value}`} className="text-[var(--color-primary)] hover:underline">
        {String(value)}
      </a>
    )
  }

  return <span className="break-words">{String(value)}</span>
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export default function ClientDetailTemplate({
  page, model, projectId, recordId,
}: ClientDetailTemplateProps) {
  const locale  = useLocale()
  const columns = model.schema.columns

  const visibleColumns = useMemo(() => getVisibleColumns(columns), [columns])
  const pkCol          = useMemo(() => getPkColumn(columns), [columns])

  const [record,    setRecord]    = useState<DataRecord | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error,     setError]     = useState<string | null>(null)

  const slugPath = page.slug.replace(/^\//, '')
  const backUrl  = `/${locale}/console/${slugPath}`

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

  // ── Loading ──
  if (isLoading) {
    return (
      <div className="h-full overflow-y-auto">
        <div className="flex flex-col gap-6 p-6 max-w-3xl mx-auto">
          <div className="h-8 bg-gray-100 rounded animate-pulse w-1/3" />
          <div className="rounded-2xl border border-gray-200 bg-white p-6 space-y-4">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-4 bg-gray-100 rounded animate-pulse" />
            ))}
          </div>
        </div>
      </div>
    )
  }

  // ── Error ──
  if (error || !record) {
    return (
      <div className="h-full overflow-y-auto">
        <div className="flex flex-col gap-4 p-6 max-w-3xl mx-auto">
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
      <div className="flex flex-col gap-6 p-6 max-w-3xl mx-auto">

        {/* Header */}
        <div className="flex items-center gap-3">
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
            <p className="text-sm text-[var(--color-text-muted)]">
              {page.name ?? page.title}
            </p>
          </div>
        </div>

        {/* Detail card */}
        <div className="rounded-2xl border border-gray-200 bg-white">
          <div className="divide-y divide-gray-100">
            {visibleColumns.map((col) => (
              <div
                key={col.name}
                className="grid grid-cols-1 sm:grid-cols-3 gap-3 px-6 py-4
                           hover:bg-gray-50/50 transition"
              >
                <p className="text-xs font-medium text-gray-500">{col.name}</p>
                <div className="sm:col-span-2 text-sm text-[var(--color-text)]">
                  {formatValue(record[col.name], col)}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}