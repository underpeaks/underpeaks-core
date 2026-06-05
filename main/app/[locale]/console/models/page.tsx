'use client'

/**
 * ModelsListPage
 *
 * Displays all models from nxf_system_models as a list.
 *
 * Row click routing:
 *   nxf_system_* tables         → /console/models/[id]/view  (read-only)
 *   nxf_users / nxf_messages /
 *   nxf_notifications            → /console/models/[id]/edit  (partial edit)
 *   All other models             → /console/models/[id]/edit  (full edit)
 *
 * Filters: All | User | System (toggle buttons)
 *
 * Delete:
 *   Only available on user tables (non-system).
 *   Calls DELETE /api/models/[id] which drops the table and removes the
 *   nxf_system_models record.
 */

import { useEffect, useState }  from 'react'
import { useRouter }            from 'next/navigation'
import { useTranslations }      from 'next-intl'
import Link                     from 'next/link'
import {
  FiPlus,
  FiLock,
  FiTrash2,
  FiChevronRight,
  FiDatabase,
}                               from 'react-icons/fi'
import { useAuth }              from '../layout'
import { ConfirmDialog }        from '../../components_cus/confirmDialog'
import Loader from '../Loading'

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const EDITABLE_SYSTEM_TABLES = ['nxf_users', 'nxf_messages', 'nxf_notifications']

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ModelField {
  name:         string
  type:         string
  nullable?:    boolean
  unique?:      boolean
  is_primary?:  boolean
  foreign_key?: { references: string; on_delete?: string }
}

interface VersionedSchema {
  version:      string
  columns:      ModelField[]
  hooks?:       any[]
  integrations?: any[]
}

interface Model {
  sm_id:      string
  name:       string
  project_id: string
  schema:     VersionedSchema | ModelField[]   // versioned object (canonical) or legacy array
  created_at: string
  updated_at: string
}

type FilterType = 'all' | 'user' | 'system'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function isSystemTable(name: string): boolean {
  return (
    name.toLowerCase().startsWith('nxf_system_') ||
    EDITABLE_SYSTEM_TABLES.includes(name.toLowerCase())
  )
}

function isPureSystemTable(name: string): boolean {
  return name.toLowerCase().startsWith('nxf_system_')
}

function getRowHref(model: Model): string {
  if (isPureSystemTable(model.name)) {
    return `/console/models/${model.sm_id}/view`
  }
  return `/console/models/${model.sm_id}/edit`
}

/**
 * Extracts the columns array from a model's schema, regardless of whether
 * it's stored as the canonical versioned object or a legacy bare array.
 */
function getColumns(schema: VersionedSchema | ModelField[] | null | undefined): ModelField[] {
  if (!schema) return []
  if (Array.isArray(schema)) return schema
  if (typeof schema === 'object' && Array.isArray(schema.columns)) return schema.columns
  return []
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function ModelsListPage() {
  const t        = useTranslations('modelsListPage')
  const router   = useRouter()
  const { user } = useAuth()

  const [models,        setModels]        = useState<Model[]>([])
  const [loading,       setLoading]       = useState(true)
  const [error,         setError]         = useState<string | null>(null)
  const [filter,        setFilter]        = useState<FilterType>('user')
  const [confirmOpen,   setConfirmOpen]   = useState(false)
  const [modelToDelete, setModelToDelete] = useState<Model | null>(null)
  const [deleting,      setDeleting]      = useState(false)

  useEffect(() => {
    if (!user) return
    loadModels()
  }, [user])

  async function loadModels() {
    setLoading(true)
    setError(null)
    try {
      const userId = user?.user_id || user?.id
      const res    = await fetch(`/api/models?user_id=${userId}`)
      const text   = await res.text()
      if (!text) throw new Error(t('errors.loadFailed'))
      const data = JSON.parse(text)
      if (!res.ok) throw new Error(data.error || t('errors.loadFailed'))
      setModels(data.models ?? [])
    } catch (err: any) {
      setError(err.message || t('errors.loadFailed'))
    } finally {
      setLoading(false)
    }
  }

  const filteredModels = models.filter((m) => {
    if (filter === 'system') return isSystemTable(m.name)
    if (filter === 'user')   return !isSystemTable(m.name)
    return true
  })

  const onDeleteClick = (e: React.MouseEvent, model: Model) => {
    e.preventDefault()
    e.stopPropagation()
    setModelToDelete(model)
    setConfirmOpen(true)
  }

  const handleConfirmDelete = async () => {
    if (!modelToDelete) return
    setDeleting(true)
    setError(null)
    try {
      const res  = await fetch(`/api/models/${modelToDelete.sm_id}`, {
        method:  'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ name: modelToDelete.name }),
      })
      const text = await res.text()
      const data = text ? JSON.parse(text) : {}
      if (!res.ok) throw new Error(data.error || t('errors.deleteFailed'))

      setModels((prev) => prev.filter((m) => m.sm_id !== modelToDelete.sm_id))
      setConfirmOpen(false)
      setModelToDelete(null)
    } catch (err: any) {
      setError(err.message || t('errors.deleteFailed'))
    } finally {
      setDeleting(false)
    }
  }

  return (
    <div className="h-full overflow-y-auto">
      <div className="p-6 max-w-5xl mx-auto">

        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              {t('header.title')}
            </h1>
            <p className="text-sm text-gray-500 mt-0.5">
              {t('header.subtitle')}
            </p>
          </div>
          <Link
            href="/console/models/create"
            className="flex items-center gap-2 px-4 py-2 bg-gray-900 text-white text-sm font-medium rounded-lg hover:bg-gray-700 transition"
          >
            <FiPlus size={15} />
            {t('header.createButton')}
          </Link>
        </div>

        {/* Error banner */}
        {error && (
          <div className="mb-4 px-4 py-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">
            {error}
          </div>
        )}

        {/* Filter toggles */}
        <div className="flex items-center gap-2 mb-4">
          {(['all', 'user', 'system'] as FilterType[]).map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => setFilter(f)}
              className={`px-3 py-1.5 text-xs font-medium rounded-full border transition ${
                filter === f
                  ? 'bg-gray-900 text-white border-gray-900'
                  : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
              }`}
            >
              {t(`filter.${f}`)}
              <span className="ml-1.5 opacity-60">
                {f === 'all'    && `(${models.length})`}
                {f === 'user'   && `(${models.filter((m) => !isSystemTable(m.name)).length})`}
                {f === 'system' && `(${models.filter((m) => isSystemTable(m.name)).length})`}
              </span>
            </button>
          ))}
        </div>

        {/* Content */}
        {loading ? (
          <Loader />
        ) : filteredModels.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-gray-400">
            <FiDatabase size={32} className="mb-3 opacity-30" />
            <p className="text-base font-medium">{t('states.empty')}</p>
            <p className="text-sm mt-1">{t('states.emptyHint')}</p>
          </div>
        ) : (
          <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
            {filteredModels.map((model, idx) => {
              const isSystem     = isSystemTable(model.name)
              const isPureSystem = isPureSystemTable(model.name)
              const href         = getRowHref(model)
              const columns      = getColumns(model.schema)
              const pkField      = columns.find((f) => f.is_primary)
              const fkCount      = columns.filter((f) => f.foreign_key).length

              return (
                <div
                  key={model.sm_id}
                  onClick={() => router.push(href)}
                  className={`flex items-center gap-4 px-5 py-4 cursor-pointer hover:bg-gray-50 transition ${
                    idx !== filteredModels.length - 1
                      ? 'border-b border-gray-100'
                      : ''
                  }`}
                >
                  {/* Icon */}
                  <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${
                    isPureSystem
                      ? 'bg-gray-100'
                      : isSystem
                        ? 'bg-blue-50'
                        : 'bg-emerald-50'
                  }`}>
                    {isPureSystem
                      ? <FiLock     size={15} className="text-gray-400" />
                      : <FiDatabase size={15} className={isSystem ? 'text-blue-500' : 'text-emerald-500'} />
                    }
                  </div>

                  {/* Name + meta */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-semibold text-gray-900 truncate">
                        {model.name}
                      </span>

                      {isPureSystem && (
                        <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-gray-100 text-gray-500 shrink-0">
                          {t('badges.system')}
                        </span>
                      )}

                      {!isPureSystem && isSystem && (
                        <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-blue-50 text-blue-600 shrink-0">
                          {t('badges.partialSystem')}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-3 mt-0.5 text-[11px] text-gray-400">
                      <span>{t('meta.fields', { count: columns.length })}</span>
                      {pkField && (
                        <span>
                          PK: <span className="font-mono">{pkField.name}</span>
                        </span>
                      )}
                      {fkCount > 0 && (
                        <span>{t('meta.foreignKeys', { count: fkCount })}</span>
                      )}
                    </div>
                  </div>

                  {/* Updated date */}
                  <span className="text-xs text-gray-400 shrink-0 hidden sm:block">
                    {new Date(model.updated_at).toLocaleDateString('en-GB', {
                      day: '2-digit', month: 'short', year: 'numeric',
                    })}
                  </span>

                  {/* Delete button — hidden for system tables */}
                  {!isSystem ? (
                    <button
                      type="button"
                      aria-label={t('card.deleteAriaLabel', { name: model.name })}
                      onClick={(e) => onDeleteClick(e, model)}
                      className="p-1.5 rounded hover:bg-red-50 text-gray-400 hover:text-red-600 transition shrink-0"
                    >
                      <FiTrash2 size={15} />
                    </button>
                  ) : (
                    <div className="w-7 shrink-0" />
                  )}

                  {/* Row chevron */}
                  <FiChevronRight size={15} className="text-gray-300 shrink-0" />
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Confirm delete dialog */}
      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title={t('confirmDelete.title')}
        description={t('confirmDelete.description', { name: modelToDelete?.name ?? '' })}
        confirmText={deleting ? t('confirmDelete.deleting') : t('confirmDelete.confirm')}
        cancelText={t('confirmDelete.cancel')}
        onConfirm={handleConfirmDelete}
        onCancel={() => {
          setConfirmOpen(false)
          setModelToDelete(null)
        }}
      />
    </div>
  )
}