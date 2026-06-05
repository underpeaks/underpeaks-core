'use client'

/**
 * FormTemplate.tsx
 * Location: app/[locale]/console/[slug]/components/admin/FormTemplate.tsx
 *
 * Admin template — full-page form for data entry.
 *
 * Structure:
 *   Centred header (page name + description)
 *   Single column form with all visible fields rendered by FieldRenderer
 *   Submit button at the bottom
 *
 * Use cases:
 *   - Contact form admin
 *   - One-off submission pages
 *   - Settings forms tied to a single record per project
 *
 * Features:
 *   - Scroll wrapper for long forms
 *   - Token resolution via clientAuth helper (reads localStorage)
 *   - Fields sorted by their order property when set
 *   - Required field validation before submit
 *   - Dynamic select options loaded from related models
 */

import { useState, useEffect, useCallback, useMemo } from 'react'
import { FiSend, FiCheck, FiAlertTriangle }          from 'react-icons/fi'
import {
  ModelColumn, DataRecord, AdminTemplateProps, SelectOption, Toast,
} from '../../types'
import FieldRenderer    from '../shared/FieldRenderer'
import { getAuthToken } from '@/app/lib/clientAuth'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getVisibleColumns(columns: ModelColumn[]): ModelColumn[] {
  const visible = columns.filter((c) => !c.hidden && !c.is_primary)
  return visible.sort((a, b) => {
    const ao = (a as any).order ?? Number.MAX_SAFE_INTEGER
    const bo = (b as any).order ?? Number.MAX_SAFE_INTEGER
    return ao - bo
  })
}

function buildEmptyRecord(columns: ModelColumn[]): DataRecord {
  const record: DataRecord = {}
  columns.forEach((col) => {
    if (col.is_primary || col.hidden) return
    if (col.ui_type === 'toggle' || col.ui_type === 'checkbox') {
      record[col.name] = false
    } else if (
      col.ui_type === 'tags-input'    ||
      col.ui_type === 'multi-select'  ||
      col.ui_type === 'list'          ||
      col.ui_type === 'checklist'
    ) {
      record[col.name] = []
    } else if (col.type === 'array') {
      record[col.name] = []
    } else {
      record[col.name] = ''
    }
  })
  return record
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export default function FormTemplate({
  page, model, projectId, tenantId,
}: AdminTemplateProps) {
  const visibleColumns = useMemo(
    () => getVisibleColumns(model.schema.columns),
    [model.schema.columns]
  )

  const [formData,       setFormData]       = useState<DataRecord>(
    () => buildEmptyRecord(model.schema.columns)
  )
  const [saving,         setSaving]         = useState(false)
  const [error,          setError]          = useState<string | null>(null)
  const [success,        setSuccess]        = useState(false)
  const [dynamicOptions, setDynamicOptions] = useState<Record<string, SelectOption[]>>({})
  const [toast,          setToast]          = useState<Toast | null>(null)

  // Fetch dynamic select options for select / multi-select fields with options_mode = 'dynamic'
  useEffect(() => {
    const dynamicCols = model.schema.columns.filter(
      (c) => (c.ui_type === 'select' || c.ui_type === 'multi-select') &&
              c.options_mode === 'dynamic' &&
              c.options_source?.table
    )
    if (dynamicCols.length === 0) return

    dynamicCols.forEach(async (col) => {
      const src = col.options_source!
      try {
        const token = getAuthToken()
        const res = await fetch(
          `/api-cms/data/${src.table}?project_id=${projectId}&limit=200`,
          { headers: { Authorization: `Bearer ${token}` } }
        )
        if (!res.ok) return
        const data = await res.json()
        const opts: SelectOption[] = (data.records ?? []).map((row: DataRecord) => ({
          label: String(row[src.label_column] ?? ''),
          value: String(row[src.value_column] ?? ''),
        }))
        setDynamicOptions((prev) => ({ ...prev, [col.name]: opts }))
      } catch {
        // Silent fail — the field will just have no options
      }
    })
  }, [model, projectId])

  const handleChange = useCallback((colName: string, value: unknown) => {
    setFormData((prev) => ({ ...prev, [colName]: value }))
  }, [])

  function showToast(message: string, type: 'success' | 'error') {
    setToast({ message, type })
    setTimeout(() => setToast(null), 3500)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setSaving(true)

    // Required field validation
    const missing = visibleColumns.find((col) => {
      if (col.nullable === false) {
        const val = formData[col.name]
        if (val === null || val === undefined || val === '') return true
        if (Array.isArray(val) && val.length === 0) return true
      }
      return false
    })

    if (missing) {
      setError(`${missing.name} is required`)
      setSaving(false)
      return
    }

    try {
      const token = getAuthToken()
      const res = await fetch(`/api-cms/data/${model.name}`, {
        method:  'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization:  `Bearer ${token}`,
        },
        body: JSON.stringify({
          ...formData,
          project_id: projectId,
          tenant_id:  tenantId,
        }),
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Submission failed')

      setSuccess(true)
      setFormData(buildEmptyRecord(model.schema.columns))
      showToast('Submitted successfully', 'success')
      setTimeout(() => setSuccess(false), 4000)
    } catch (err: any) {
      setError(err.message || 'Submission failed')
      showToast(err.message || 'Submission failed', 'error')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="h-full overflow-y-auto">
      <div className="flex flex-col gap-6 p-6 max-w-2xl mx-auto">

        {/* Header */}
        <div className="text-center">
          <h1 className="text-2xl font-bold text-[var(--color-text)]">
            {page.name ?? page.title}
          </h1>
          {page.seo_description && (
            <p className="text-sm text-[var(--color-text-muted)] mt-2 max-w-md mx-auto">
              {page.seo_description}
            </p>
          )}
        </div>

        {/* Success banner */}
        {success && (
          <div className="px-4 py-3 bg-emerald-50 border border-emerald-200 rounded-lg
                          text-sm text-emerald-700 flex items-center gap-2">
            <FiCheck size={14} />
            Your submission has been received successfully.
          </div>
        )}

        {/* Error banner */}
        {error && (
          <div className="px-4 py-3 bg-red-50 border border-red-200 rounded-lg
                          text-sm text-red-600 flex items-center gap-2">
            <FiAlertTriangle size={14} />
            {error}
          </div>
        )}

        {/* Form */}
        <form
          onSubmit={handleSubmit}
          className="rounded-2xl border border-gray-200 bg-white p-6 space-y-5"
        >
          {visibleColumns.map((col) => (
            <div key={col.name} className="space-y-1.5">
              <label className="flex items-center gap-1.5 text-sm font-medium text-[var(--color-text)]">
                {col.name}
                {col.nullable === false && <span className="text-red-400">*</span>}
              </label>
              <FieldRenderer
                column={col}
                value={formData[col.name]}
                onChange={(val) => handleChange(col.name, val)}
                dynamicOptions={dynamicOptions[col.name] ?? []}
                disabled={saving}
              />
            </div>
          ))}

          <button
            type="submit"
            disabled={saving}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 mt-4
                       text-sm font-medium rounded-lg bg-[var(--color-primary)] text-white
                       hover:opacity-90 transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <FiSend size={14} />
            {saving ? 'Submitting…' : 'Submit'}
          </button>
        </form>

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