'use client'

/**
 * DashboardTemplate.tsx
 * Location: app/[locale]/console/[slug]/components/admin/DashboardTemplate.tsx
 *
 * Admin template — KPI-focused dashboard with summary stats and recent activity.
 *
 * Structure:
 *   Header (page name + Edit KPIs)
 *   Large KPI bar (the main focus)
 *   Two-column layout:
 *     Left: Recent records feed (last 10 records from this model)
 *     Right: Summary stats card (totals, latest, oldest)
 *
 * Features:
 *   - Scroll wrapper for long content
 *   - Token resolution via clientAuth helper (reads localStorage)
 *   - Locale-aware navigation
 *   - Fields sorted by order property when set
 *
 * No add button, no drawer — dashboards are read-only views.
 */

import { useState, useEffect, useMemo, useCallback } from 'react'
import { useLocale }                                  from 'next-intl'
import { Settings2, Save }                            from 'lucide-react'
import { FiActivity, FiClock, FiTrendingUp, FiArrowRight } from 'react-icons/fi'
import Link                                            from 'next/link'
import { computeAllKpis }                              from '../../../kpi/kpiEngine'
import { getAuthToken, getUserId }                                from '@/app/lib/clientAuth'
import type { KpiPageConfig, KpiResult }               from '../../../kpi/kpi'
import type {
  AdminTemplateProps, DataRecord, ModelColumn, Toast,
} from '../../types'
import UserKpiBar from '../../../cmsusers/components/UserKpiBar'

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

function findTitleField(columns: ModelColumn[]): ModelColumn | undefined {
  const priority = ['title', 'name', 'label']
  for (const p of priority) {
    const found = columns.find((c) =>
      c.name.toLowerCase() === p && !c.hidden && !c.is_primary
    )
    if (found) return found
  }
  return columns.find((c) => !c.hidden && !c.is_primary && c.type === 'string')
}

function formatRelative(iso: string): string {
  try {
    const d    = new Date(iso)
    const diff = Date.now() - d.getTime()
    const m    = Math.floor(diff / 60000)
    const h    = Math.floor(diff / 3600000)
    const days = Math.floor(diff / 86400000)
    if (m < 1)    return 'just now'
    if (m < 60)   return `${m}m ago`
    if (h < 24)   return `${h}h ago`
    if (days < 7) return `${days}d ago`
    return d.toLocaleDateString(undefined, { day: 'numeric', month: 'short' })
  } catch { return iso }
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export default function DashboardTemplate({
  page, model, projectId, tenantId,
}: AdminTemplateProps) {
  const locale       = useLocale()
  const columns      = model.schema.columns
  const visibleCols  = useMemo(() => getVisibleColumns(columns), [columns])
  const titleField   = useMemo(() => findTitleField(columns), [columns])

  const [records,      setRecords]      = useState<DataRecord[]>([])
  const [total,        setTotal]        = useState(0)
  const [isLoading,    setIsLoading]    = useState(true)
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

  // Fetch recent records — sorted by created_at desc, limit 100
  const fetchRecords = useCallback(async () => {
    setIsLoading(true)
    try {
      const params = new URLSearchParams({
        limit:      '100',
        project_id: projectId,
        sort_field: 'created_at',
        sort_dir:   'desc',
      })

      const token = getAuthToken()
      const res = await fetch(`/api-cms/data/${model.name}?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = await res.json()
      setRecords(data.records ?? [])
      setTotal(data.total ?? 0)
    } catch {
      showToast('Failed to load dashboard data', 'error')
    } finally {
      setIsLoading(false)
    }
  }, [model.name, projectId])

  useEffect(() => { fetchRecords() }, [fetchRecords])

  // Load KPI config for this page
  useEffect(() => {
    if (!userId) return
    fetch(`/api/kpi-config?page=${page.page_id}&user_id=${userId}`)
      .then((r) => r.json())
      .then((d) => setKpiConfig(d.config ?? null))
      .catch(() => {})
  }, [userId, page.page_id])

  // Recompute KPIs whenever data changes
  useEffect(() => {
    if (!kpiConfig || records.length === 0) { setKpiResults([]); return }
    const allKpis = kpiConfig.blocks.flatMap((b) => b.kpis)
    setKpiResults(computeAllKpis(records as Record<string, unknown>[], allKpis))
  }, [kpiConfig, records])

  // KPI fields derived from the model schema
  const kpiFields = useMemo(() =>
    visibleCols.map((c) => ({ value: c.name, label: c.name })),
  [visibleCols])

  function showToast(message: string, type: 'success' | 'error') {
    setToast({ message, type })
    setTimeout(() => setToast(null), 3500)
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

  const slugPath = page.slug.replace(/^\//, '')
  const recent10 = records.slice(0, 10)

  // Summary stats
  const oldestDate = records.length > 0
    ? records.reduce((acc, r) => {
        const d = String(r.created_at ?? '')
        if (!acc || (d && d < acc)) return d
        return acc
      }, '' as string)
    : ''

  const newestDate = records.length > 0
    ? String(records[0]?.created_at ?? '')
    : ''

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
              {total} {total === 1 ? 'record' : 'records'}
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

        {/* Two-column layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* Recent activity (2 columns wide on desktop) */}
          <div className="lg:col-span-2 rounded-2xl border border-gray-200 bg-white">
            <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FiActivity size={15} className="text-[var(--color-primary)]" />
                <p className="text-sm font-semibold text-[var(--color-text)]">Recent activity</p>
              </div>
              <Link
                href={`/${locale}/console/${slugPath}`}
                className="text-xs text-[var(--color-primary)] hover:underline flex items-center gap-1"
              >
                View all <FiArrowRight size={12} />
              </Link>
            </div>

            {isLoading ? (
              <div className="divide-y divide-gray-100">
                {[...Array(6)].map((_, i) => (
                  <div key={i} className="px-5 py-3 flex items-center gap-3">
                    <div className="w-2 h-2 rounded-full bg-gray-200 animate-pulse" />
                    <div className="h-4 bg-gray-100 rounded animate-pulse flex-1" />
                    <div className="h-3 bg-gray-100 rounded animate-pulse w-16" />
                  </div>
                ))}
              </div>
            ) : recent10.length === 0 ? (
              <div className="px-5 py-12 text-center text-sm text-gray-400">
                No records yet
              </div>
            ) : (
              <div className="divide-y divide-gray-100">
                {recent10.map((record, idx) => {
                  const id    = resolveId(record, columns)
                  const title = titleField ? String(record[titleField.name] ?? '') : `Record ${idx + 1}`
                  const date  = String(record.created_at ?? '')

                  return (
                    <Link
                      key={id || idx}
                      href={`/${locale}/console/${slugPath}/${id}`}
                      className="flex items-center gap-3 px-5 py-3 hover:bg-gray-50 transition"
                    >
                      <span className="w-2 h-2 rounded-full bg-[var(--color-primary)] flex-shrink-0" />
                      <p className="text-sm text-[var(--color-text)] truncate flex-1">{title}</p>
                      {date && (
                        <span className="text-xs text-gray-400 whitespace-nowrap">
                          {formatRelative(date)}
                        </span>
                      )}
                    </Link>
                  )
                })}
              </div>
            )}
          </div>

          {/* Summary card */}
          <div className="rounded-2xl border border-gray-200 bg-white">
            <div className="px-5 py-4 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <FiTrendingUp size={15} className="text-[var(--color-primary)]" />
                <p className="text-sm font-semibold text-[var(--color-text)]">Summary</p>
              </div>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <p className="text-xs text-gray-400 mb-1">Total records</p>
                <p className="text-2xl font-bold text-[var(--color-text)]">{total}</p>
              </div>

              {newestDate && (
                <div>
                  <p className="text-xs text-gray-400 mb-1 flex items-center gap-1">
                    <FiClock size={11} /> Latest record
                  </p>
                  <p className="text-sm font-medium text-[var(--color-text)]">
                    {formatRelative(newestDate)}
                  </p>
                </div>
              )}

              {oldestDate && oldestDate !== newestDate && (
                <div>
                  <p className="text-xs text-gray-400 mb-1 flex items-center gap-1">
                    <FiClock size={11} /> Oldest record
                  </p>
                  <p className="text-sm font-medium text-[var(--color-text)]">
                    {formatRelative(oldestDate)}
                  </p>
                </div>
              )}

              <div className="pt-3 border-t border-gray-100">
                <p className="text-xs text-gray-400 mb-1">Visible fields</p>
                <p className="text-sm font-medium text-[var(--color-text)]">
                  {visibleCols.length}
                </p>
              </div>
            </div>
          </div>
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