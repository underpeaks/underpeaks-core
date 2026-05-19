'use client'

/**
 * ModelViewPage
 *
 * Read-only view of a pure system table (nxf_system_*).
 * Shown when the user clicks on a system table row in the models list.
 *
 * Displays all fields with their type, constraint badges (PK, UQ, FK),
 * nullable status, default value, and UI type in a clean table layout.
 * No editing is possible from this page.
 *
 * Navigation:
 *   Back button → /console/models
 */

import { useEffect, useState } from 'react'
import { useParams }           from 'next/navigation'
import Link                    from 'next/link'
import { useTranslations }     from 'next-intl'
import { FiArrowLeft, FiLock } from 'react-icons/fi'
import { useAuth }             from '../../../layout'
import Loader from '../../../Loading'

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
  ui_type?:     string
  hidden?:      boolean
  default?:     any
}

interface Model {
  sm_id:      string
  name:       string
  project_id: string
  schema:     ModelField[]
  created_at: string
  updated_at: string
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function ModelViewPage() {
  const t        = useTranslations('modelView')
  const { id }   = useParams<{ id: string }>()
  const { user } = useAuth()

  const [model,   setModel]   = useState<Model | null>(null)
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState<string | null>(null)

  // ── Load ───────────────────────────────────────────────────────────────

  useEffect(() => {
    if (!user || !id) return
    loadModel(user.user_id || user.id)
  }, [user, id])

  async function loadModel(userId: string) {
    setLoading(true)
    setError(null)
    try {
      const res  = await fetch(`/api/models?user_id=${userId}`)
      const text = await res.text()
      if (!text) throw new Error(t('errors.loadFailed'))
      const data = JSON.parse(text)
      if (!res.ok) throw new Error(data.error || t('errors.loadFailed'))

      const found = (data.models ?? []).find((m: any) => m.sm_id === id)
      if (!found) throw new Error(t('errors.notFound'))
      setModel(found)
    } catch (err: any) {
      setError(err.message || t('errors.loadFailed'))
    } finally {
      setLoading(false)
    }
  }

  // ── Loading state ──────────────────────────────────────────────────────

if (loading) return <Loader />

  // ── Error state ────────────────────────────────────────────────────────

  if (error || !model) {
    return (
      <div className="p-6 max-w-4xl mx-auto">
        <div className="px-4 py-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">
          {error || t('errors.notFound')}
        </div>
      </div>
    )
  }

  // ── Render ─────────────────────────────────────────────────────────────

  return (
    <div className="h-full overflow-y-auto">
      <div className="p-6 max-w-4xl mx-auto">

        {/* ── Header ── */}
        <div className="flex items-center gap-3 mb-6">
          <Link
            href="/console/models"
            className="p-2 rounded-lg hover:bg-gray-100 text-gray-500 hover:text-gray-700 transition"
            aria-label={t('actions.back')}
          >
            <FiArrowLeft size={18} />
          </Link>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <FiLock size={15} className="text-gray-400 shrink-0" />
              <h1 className="text-2xl font-bold text-gray-900 truncate">
                {model.name}
              </h1>
              <span className="shrink-0 text-[11px] font-medium px-2 py-0.5 rounded-full bg-gray-100 text-gray-500">
                {t('systemBadge')}
              </span>
            </div>
            <p className="text-sm text-gray-500 mt-0.5">{t('subtitle')}</p>
          </div>
        </div>

        {/* ── Stats row ── */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="bg-white border border-gray-200 rounded-xl px-4 py-3">
            <p className="text-xs text-gray-500 mb-0.5">{t('stats.fields')}</p>
            <p className="text-xl font-bold text-gray-900">{model.schema.length}</p>
          </div>
          <div className="bg-white border border-gray-200 rounded-xl px-4 py-3">
            <p className="text-xs text-gray-500 mb-0.5">{t('stats.created')}</p>
            <p className="text-sm font-medium text-gray-700">
              {new Date(model.created_at).toLocaleDateString('en-GB', {
                day: '2-digit', month: 'short', year: 'numeric',
              })}
            </p>
          </div>
          <div className="bg-white border border-gray-200 rounded-xl px-4 py-3">
            <p className="text-xs text-gray-500 mb-0.5">{t('stats.updated')}</p>
            <p className="text-sm font-medium text-gray-700">
              {new Date(model.updated_at).toLocaleDateString('en-GB', {
                day: '2-digit', month: 'short', year: 'numeric',
              })}
            </p>
          </div>
        </div>

        {/* ── Field table ── */}
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100 bg-gray-50">
            <h2 className="text-sm font-semibold text-gray-700">
              {t('fieldsHeading')}
            </h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50 text-xs text-gray-500 uppercase tracking-wide">
                  <th className="px-4 py-2.5 text-left font-medium">{t('table.name')}</th>
                  <th className="px-4 py-2.5 text-left font-medium">{t('table.type')}</th>
                  <th className="px-4 py-2.5 text-left font-medium">{t('table.constraints')}</th>
                  <th className="px-4 py-2.5 text-left font-medium">{t('table.nullable')}</th>
                  <th className="px-4 py-2.5 text-left font-medium">{t('table.default')}</th>
                  <th className="px-4 py-2.5 text-left font-medium">{t('table.uiType')}</th>
                </tr>
              </thead>
              <tbody>
                {model.schema.map((field, idx) => (
                  <tr
                    key={idx}
                    className={`border-b border-gray-50 last:border-0 ${
                      idx % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'
                    }`}
                  >
                    {/* Name */}
                    <td className="px-4 py-3 font-medium text-gray-800">
                      {field.name}
                    </td>

                    {/* Type */}
                    <td className="px-4 py-3">
                      <span className="px-2 py-0.5 bg-blue-50 text-blue-700 text-xs rounded font-mono">
                        {field.type}
                      </span>
                    </td>

                    {/* Constraint badges */}
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1 flex-wrap">
                        {field.is_primary && (
                          <span className="px-1.5 py-0.5 text-[10px] font-medium bg-amber-50 text-amber-700 rounded">
                            PK
                          </span>
                        )}
                        {field.unique && (
                          <span className="px-1.5 py-0.5 text-[10px] font-medium bg-blue-50 text-blue-700 rounded">
                            UQ
                          </span>
                        )}
                        {field.foreign_key && (
                          <span
                            className="px-1.5 py-0.5 text-[10px] font-medium bg-purple-50 text-purple-700 rounded cursor-help"
                            title={`→ ${field.foreign_key.references}${
                              field.foreign_key.on_delete
                                ? ` (${field.foreign_key.on_delete})`
                                : ''
                            }`}
                          >
                            FK
                          </span>
                        )}
                        {field.hidden && (
                          <span className="px-1.5 py-0.5 text-[10px] font-medium bg-gray-100 text-gray-500 rounded">
                            {t('badges.hidden')}
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Nullable */}
                    <td className="px-4 py-3 text-sm">
                      {field.nullable === false
                        ? <span className="text-red-500 font-medium text-xs">{t('badges.required')}</span>
                        : <span className="text-gray-400 text-xs">{t('badges.optional')}</span>
                      }
                    </td>

                    {/* Default */}
                    <td className="px-4 py-3 text-xs text-gray-500 font-mono">
                      {field.default !== undefined && field.default !== null
                        ? String(field.default)
                        : <span className="text-gray-300">—</span>
                      }
                    </td>

                    {/* UI type */}
                    <td className="px-4 py-3 text-xs text-gray-500">
                      {field.ui_type
                        ? field.ui_type
                        : <span className="text-gray-300">—</span>
                      }
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}