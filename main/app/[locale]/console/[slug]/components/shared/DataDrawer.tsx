'use client'

/**
 * DataDrawer.tsx
 * Location: app/[locale]/console/[slug]/components/shared/DataDrawer.tsx
 *
 * Generic right-side drawer for adding, editing, and viewing records
 * from any model table.
 *
 * Features:
 *   - Fields rendered by FieldRenderer based on model schema ui_type
 *   - Hidden fields skipped
 *   - Primary key fields read-only in edit mode, hidden in create mode
 *   - Fields sorted by their order property when set
 *   - Dynamic select/multi-select options fetched via /api-cms/data/[table]
 *   - Token resolution via clientAuth helper (reads localStorage)
 *   - Save calls /api-cms/data/[table] POST (create) or PATCH (edit)
 *   - Delete calls /api-cms/data/[table] DELETE with confirmation
 */

import { useState, useEffect, useCallback, useMemo } from 'react'
import { FiX, FiTrash2, FiSave, FiAlertTriangle }    from 'react-icons/fi'
import FieldRenderer    from './FieldRenderer'
import { getAuthToken } from '@/app/lib/clientAuth'
import type {
  ModelRecord, ModelColumn, DataRecord, DrawerMode, SelectOption,
} from '../../types'

interface DataDrawerProps {
  open:       boolean
  mode:       DrawerMode
  model:      ModelRecord
  record?:    DataRecord | null
  projectId:  string
  tenantId:   string
  /** Optional. If not provided, drawer reads token from localStorage via clientAuth. */
  authToken?: string
  userId:     string
  onClose:    () => void
  onSaved:    (record: DataRecord) => void
  onDeleted:  (id: string) => void
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function resolveRecordId(record: DataRecord, columns: ModelColumn[]): string {
  const pkCol = columns.find((c) => c.is_primary)
  if (pkCol && record[pkCol.name]) return String(record[pkCol.name])
  return String(
    record.id      ??
    record._id     ??
    record.prod_id ??
    record.page_id ??
    record.menu_id ??
    ''
  )
}

function getPkColumn(columns: ModelColumn[]): ModelColumn | undefined {
  return columns.find((c) => c.is_primary)
}

function getVisibleColumns(columns: ModelColumn[], mode: DrawerMode): ModelColumn[] {
  const visible = columns.filter((col) => {
    if (col.hidden) return false
    if (col.is_primary && mode === 'create') return false
    return true
  })
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
      record[col.name] = col.nullable === false ? false : null
    } else if (
      col.ui_type === 'tags-input'   ||
      col.ui_type === 'multi-select' ||
      col.ui_type === 'list'         ||
      col.ui_type === 'checklist'
    ) {
      record[col.name] = []
    } else if (col.type === 'array') {
      record[col.name] = []
    } else {
      record[col.name] = null
    }
  })
  return record
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export default function DataDrawer({
  open, mode, model, record, projectId, tenantId, userId,
  onClose, onSaved, onDeleted,
}: DataDrawerProps) {
  const columns = model.schema.columns

  const [formData,       setFormData]       = useState<DataRecord>({})
  const [saving,         setSaving]         = useState(false)
  const [deleting,       setDeleting]       = useState(false)
  const [showDeleteConf, setShowDeleteConf] = useState(false)
  const [error,          setError]          = useState<string | null>(null)
  const [dynamicOptions, setDynamicOptions] = useState<Record<string, SelectOption[]>>({})

  const visibleColumns = useMemo(
    () => getVisibleColumns(columns, mode),
    [columns, mode]
  )

  // Reset state when drawer opens / mode or record changes
  useEffect(() => {
    if (!open) return
    setError(null)
    setShowDeleteConf(false)
    if (mode === 'create') setFormData(buildEmptyRecord(columns))
    else                   setFormData(record ? { ...record } : {})
  }, [open, mode, record, columns])

  // Load dynamic select options
  useEffect(() => {
    if (!open) return
    const dynamicCols = columns.filter(
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
        // Field renders with no options on failure — acceptable graceful fallback
      }
    })
  }, [open, columns, projectId])

  const handleChange = useCallback((colName: string, value: unknown) => {
    setFormData((prev) => ({ ...prev, [colName]: value }))
  }, [])

  async function handleSave() {
    setError(null)
    setSaving(true)
    try {
      const isCreate = mode === 'create'
      const url      = `/api-cms/data/${model.name}`
      const pkCol    = getPkColumn(columns)
      const recordId = record ? resolveRecordId(record, columns) : ''

      const payload: DataRecord = {
        ...formData,
        project_id: projectId,
        tenant_id:  tenantId,
      }
      if (isCreate && pkCol) delete payload[pkCol.name]

      const method = isCreate ? 'POST' : 'PATCH'
      const body   = isCreate
        ? payload
        : { ...payload, id: recordId, id_column: pkCol?.name ?? 'id' }

      const token = getAuthToken()
      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization:  `Bearer ${token}`,
        },
        body: JSON.stringify(body),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Save failed')
      onSaved(data.record ?? body)
    } catch (err: any) {
      setError(err.message || 'Save failed')
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete() {
    if (!record) return
    setDeleting(true)
    setError(null)
    try {
      const pkCol    = getPkColumn(columns)
      const recordId = resolveRecordId(record, columns)

      const token = getAuthToken()
      const res = await fetch(`/api-cms/data/${model.name}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          Authorization:  `Bearer ${token}`,
        },
        body: JSON.stringify({
          id:         recordId,
          id_column:  pkCol?.name ?? 'id',
          project_id: projectId,
          tenant_id:  tenantId,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Delete failed')
      onDeleted(recordId)
    } catch (err: any) {
      setError(err.message || 'Delete failed')
      setDeleting(false)
    }
  }

  if (!open) return null

  const pkCol      = getPkColumn(columns)
  const recordId   = record ? resolveRecordId(record, columns) : ''
  const isViewMode = mode === 'view'

  return (
    <>
      <div
        className="fixed inset-0 bg-black/40 z-40 transition-opacity"
        onClick={onClose}
      />

      <div className="fixed right-0 top-0 h-full w-full max-w-md z-50
                      bg-white border-l border-gray-200 flex flex-col shadow-2xl">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4
                        border-b border-gray-200 flex-shrink-0">
          <div>
            <h2 className="text-base font-semibold text-[var(--color-text)]">
              {mode === 'create' ? 'Add record' :
               mode === 'edit'   ? 'Edit record' : 'View record'}
            </h2>
            {mode === 'edit' && recordId && (
              <p className="text-xs text-gray-400 mt-0.5 font-mono truncate max-w-[280px]">
                {pkCol?.name ?? 'id'}: {recordId}
              </p>
            )}
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 transition-colors"
          >
            <FiX size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
          {error && (
            <div className="px-4 py-3 bg-red-50 border border-red-200 rounded-lg
                            text-sm text-red-600 flex items-center gap-2">
              <FiAlertTriangle size={14} className="shrink-0" />
              {error}
            </div>
          )}

          {visibleColumns.map((col) => {
            const isReadOnly = isViewMode || (mode === 'edit' && col.is_primary)
            return (
              <div key={col.name} className="space-y-1.5">
                <label className="flex items-center gap-1.5 text-xs font-medium text-gray-600">
                  {col.name}
                  {col.nullable === false && !col.is_primary && (
                    <span className="text-red-400">*</span>
                  )}
                  {col.ui_type && col.ui_type !== 'textfield' && (
                    <span className="text-[10px] text-gray-400 font-normal">
                      ({col.ui_type})
                    </span>
                  )}
                </label>
                <FieldRenderer
                  column={col}
                  value={formData[col.name]}
                  onChange={(val) => handleChange(col.name, val)}
                  dynamicOptions={dynamicOptions[col.name] ?? []}
                  disabled={isReadOnly}
                />
              </div>
            )
          })}
        </div>

        {/* Footer */}
        {!isViewMode && (
          <div className="flex-shrink-0 border-t border-gray-200 px-6 py-4">
            {showDeleteConf && mode === 'edit' && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-xs text-red-600 font-medium mb-2">
                  Permanently delete this record? This cannot be undone.
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={() => setShowDeleteConf(false)}
                    className="flex-1 px-3 py-1.5 text-xs rounded-lg border
                               border-gray-200 text-[var(--color-text)]
                               hover:bg-gray-50 transition"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleDelete}
                    disabled={deleting}
                    className="flex-1 px-3 py-1.5 text-xs rounded-lg bg-red-500
                               text-white hover:bg-red-600 transition disabled:opacity-50"
                  >
                    {deleting ? 'Deleting…' : 'Yes, delete'}
                  </button>
                </div>
              </div>
            )}

            <div className="flex gap-2">
              {mode === 'edit' && !showDeleteConf && (
                <button
                  onClick={() => setShowDeleteConf(true)}
                  className="flex items-center gap-1.5 px-3 py-2 text-sm rounded-lg
                             border border-red-200 text-red-500 hover:bg-red-50 transition"
                >
                  <FiTrash2 size={14} />
                  Delete
                </button>
              )}
              <button
                onClick={onClose}
                className="flex-1 px-4 py-2 text-sm rounded-lg border border-gray-200
                           text-[var(--color-text)] hover:bg-gray-50 transition"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2
                           text-sm rounded-lg bg-[var(--color-primary)] text-white
                           hover:opacity-90 transition disabled:opacity-50"
              >
                <FiSave size={14} />
                {saving ? 'Saving…' : mode === 'create' ? 'Create' : 'Save'}
              </button>
            </div>
          </div>
        )}
      </div>
    </>
  )
}