'use client'

import { useState, useEffect }   from 'react'
import { useParams, useRouter }  from 'next/navigation'
import Link                      from 'next/link'
import { useTranslations }       from 'next-intl'
import {
  FiPlus,
  FiTrash2,
  FiChevronDown,
  FiChevronUp,
  FiArrowLeft,
}                                from 'react-icons/fi'
import { useAuth }               from '../../../layout'
import { ConfirmDialog }         from '../../../../components_cus/confirmDialog'
import { FIELD_TYPES, getDefaultUiType, UI_TYPE_OPTIONS } from '@/app/api/models/uitypes'
import ForeignKeySelector        from '@/app/[locale]/console/models/components/ForeignKeySelector'
import Loader                    from '../../../Loading'

const EDITABLE_SYSTEM_TABLES = ['nxf_users', 'nxf_messages', 'nxf_notifications']

interface ForeignKey {
  references: string
  on_delete?: string
}

interface Field {
  name:         string
  type:         string
  nullable:     boolean
  unique:       boolean
  is_primary:   boolean
  foreign_key?: ForeignKey
  ui_type?:     string
  hidden:       boolean
}

interface ModelSummary {
  sm_id:  string
  name:   string
  schema: { name: string; type: string; is_primary?: boolean; foreign_key?: any }[]
}

function isEditableSystemTable(name: string): boolean {
  return EDITABLE_SYSTEM_TABLES.includes(name.toLowerCase())
}

function isLockedField(field: Field): boolean {
  return field.is_primary || !!field.foreign_key
}

export default function EditModelPage() {
  const t        = useTranslations('editModel')
  const router   = useRouter()
  const { id }   = useParams<{ id: string }>()
  const { user } = useAuth()

  const [modelName,       setModelName]       = useState('')
  const [originalName,    setOriginalName]    = useState('')
  const [fields,          setFields]          = useState<Field[]>([])
  const [originalSchema,  setOriginalSchema]  = useState<Field[]>([])
  const [loading,         setLoading]         = useState(true)
  const [saving,          setSaving]          = useState(false)
  const [error,           setError]           = useState<string | null>(null)
  const [existingModels,  setExistingModels]  = useState<ModelSummary[]>([])
  const [expandedIndex,   setExpandedIndex]   = useState<number | null>(null)
  const [confirmOpen,       setConfirmOpen]       = useState(false)
  const [fieldToDelete,     setFieldToDelete]     = useState<number | null>(null)
  const [warningOpen,       setWarningOpen]       = useState(false)
  const [warningChecked,    setWarningChecked]    = useState(false)
  const [warningFieldIndex, setWarningFieldIndex] = useState<number | null>(null)

  useEffect(() => {
    if (!user || !id) return
    const userId = user.user_id || user.id
    loadModel(userId)
    loadModelNames(userId)
  }, [user, id])

  async function loadModel(userId: string) {
    setLoading(true)
    setError(null)
    try {
      const res  = await fetch(`/api/models?user_id=${userId}`)
      const text = await res.text()
      if (!text) throw new Error(t('errors.loadModelFailed'))
      const data = JSON.parse(text)
      if (!res.ok) throw new Error(data.error || t('errors.loadModelFailed'))
      const model = (data.models ?? []).find((m: any) => m.sm_id === id)
      if (!model) throw new Error(t('errors.modelNotFound'))
      setModelName(model.name)
      setOriginalName(model.name)
      const schema: Field[] = (model.schema ?? []).map((f: any) => ({
        name:        f.name        ?? '',
        type:        f.type        ?? 'string',
        nullable:    f.nullable    ?? true,
        unique:      f.unique      ?? false,
        is_primary:  f.is_primary  ?? false,
        hidden:      f.hidden      ?? false,
        ui_type:     f.ui_type     ?? getDefaultUiType(f.type ?? 'string'),
        foreign_key: f.foreign_key,
      }))
      setFields(schema)
      setOriginalSchema(JSON.parse(JSON.stringify(schema)))
    } catch (err: any) {
      setError(err.message || t('errors.loadModelFailed'))
    } finally {
      setLoading(false)
    }
  }

  async function loadModelNames(userId: string) {
    try {
      const res  = await fetch(`/api/models/names?user_id=${userId}`)
      const text = await res.text()
      if (!text) return
      const data = JSON.parse(text)
      setExistingModels((data.models ?? []).filter((m: any) => m.sm_id !== id))
    } catch {}
  }

  const updateField = (index: number, key: keyof Field, value: any) => {
    setFields((prev) => {
      const updated = [...prev]
      updated[index] = { ...updated[index], [key]: value }
      if (key === 'type') updated[index].ui_type = getDefaultUiType(value as string)
      if (key === 'is_primary' && value === true) {
        updated.forEach((f, i) => { if (i !== index) updated[i] = { ...f, is_primary: false } })
      }
      return updated
    })
  }

  const addField = () => {
    setFields((prev) => [...prev, {
      name: '', type: 'string', nullable: true,
      unique: false, is_primary: false, hidden: false,
      ui_type: getDefaultUiType('string'),
    }])
    setExpandedIndex(fields.length)
  }

  const requestDelete = (index: number) => {
    const field = fields[index]
    if (isEditableSystemTable(originalName) && isLockedField(field)) {
      setWarningFieldIndex(index)
      setWarningChecked(false)
      setWarningOpen(true)
    } else {
      setFieldToDelete(index)
      setConfirmOpen(true)
    }
  }

  const confirmDelete = () => {
    if (fieldToDelete === null) return
    setFields((prev) => prev.filter((_, i) => i !== fieldToDelete))
    if (expandedIndex === fieldToDelete) setExpandedIndex(null)
    setFieldToDelete(null)
    setConfirmOpen(false)
  }

  const confirmWarningDelete = () => {
    if (warningFieldIndex === null) return
    setFields((prev) => prev.filter((_, i) => i !== warningFieldIndex))
    if (expandedIndex === warningFieldIndex) setExpandedIndex(null)
    setWarningFieldIndex(null)
    setWarningOpen(false)
    setWarningChecked(false)
  }

  const handleSubmit = async () => {
    setError(null)
    if (!modelName.trim())                    { setError(t('validation.modelNameRequired')); return }
    if (fields.some((f) => !f.name.trim()))   { setError(t('validation.fieldsInvalid'));     return }
    const names = fields.map((f) => f.name.trim().toLowerCase())
    if (new Set(names).size !== names.length) { setError(t('validation.fieldNameUnique'));   return }
    if (fields.filter((f) => f.is_primary).length > 1) { setError(t('validation.singlePrimaryKey')); return }

    setSaving(true)
    try {
      const res  = await fetch(`/api/models/${id}`, {
        method:  'PUT',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({
          user_id:    user?.user_id || user?.id,
          name:       modelName.trim(),
          schema:     fields,
          old_name:   originalName,
          old_schema: originalSchema,
        }),
      })
      const text = await res.text()
      const data = text ? JSON.parse(text) : {}
      if (!res.ok) throw new Error(data.error || t('errors.updateModelFailed'))
      router.push('/console/models')
    } catch (err: any) {
      setError(err.message || t('errors.updateModelFailed'))
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <Loader />

  return (
    <div className="h-full overflow-y-auto">
      <div className="p-6 max-w-4xl mx-auto">

        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center gap-3">
            <Link
              href="/console/models"
              className="p-2 rounded-lg hover:bg-gray-100 text-gray-500 hover:text-gray-700 transition"
              aria-label={t('actions.back')}
            >
              <FiArrowLeft size={18} />
            </Link>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{t('title')}</h1>
              <p className="text-sm text-gray-500 mt-0.5">{t('subtitle')}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={saving}
            className="px-4 py-2 bg-gray-900 text-white text-sm font-medium rounded-lg hover:bg-gray-700 disabled:opacity-50 transition"
          >
            {saving ? t('actions.saving') : t('actions.save')}
          </button>
        </div>

        {/* Error banner */}
        {error && (
          <div className="mb-4 px-4 py-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">
            {error}
          </div>
        )}

        {/* Model name */}
        <div className="mb-6 bg-white border border-gray-200 rounded-xl p-4">
          <label className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wide">
            {t('form.modelNameLabel')}
          </label>
          <input
            type="text"
            value={modelName}
            onChange={(e) => setModelName(e.target.value)}
            placeholder={t('form.modelNamePlaceholder')}
            className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-300"
          />
        </div>

        {/* Fields */}
        <div className="space-y-3 mb-4">
          {fields.map((field, index) => {
            const isExpanded = expandedIndex === index
            const hasPk      = fields.some((f, i) => f.is_primary && i !== index)

            return (
              <div
                key={index}
                // ↓ overflow-hidden removed — was clipping the FK dropdown
                className="bg-white border border-gray-200 rounded-xl"
              >
                {/* Basic row */}
                <div className="flex items-center gap-3 px-4 py-3">
                  <input
                    type="text"
                    value={field.name}
                    onChange={(e) => updateField(index, 'name', e.target.value)}
                    placeholder={t('form.fieldNamePlaceholder')}
                    className="flex-1 min-w-0 px-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-300"
                  />
                  <select
                    value={field.type}
                    onChange={(e) => updateField(index, 'type', e.target.value)}
                    className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-300 min-w-[110px]"
                  >
                    {FIELD_TYPES.map((type) => (
                      <option key={type} value={type}>{type}</option>
                    ))}
                  </select>
                  <label className="flex items-center gap-1.5 text-xs text-gray-600 whitespace-nowrap cursor-pointer">
                    <input
                      type="checkbox"
                      checked={!field.nullable}
                      onChange={(e) => updateField(index, 'nullable', !e.target.checked)}
                      className="rounded"
                    />
                    {t('form.required')}
                  </label>
                  <button
                    type="button"
                    onClick={() => setExpandedIndex(isExpanded ? null : index)}
                    className="p-1.5 rounded hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition"
                  >
                    {isExpanded ? <FiChevronUp size={15} /> : <FiChevronDown size={15} />}
                  </button>
                  <button
                    type="button"
                    onClick={() => requestDelete(index)}
                    className="p-1.5 rounded hover:bg-red-50 text-gray-400 hover:text-red-500 transition"
                  >
                    <FiTrash2 size={15} />
                  </button>
                </div>

                {/* Advanced options */}
                {isExpanded && (
                  <div className="px-4 pb-4 pt-1 border-t border-gray-100 grid grid-cols-2 gap-4">
                    <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={field.unique}
                        onChange={(e) => updateField(index, 'unique', e.target.checked)}
                        className="rounded"
                      />
                      {t('form.unique')}
                    </label>

                    <label className={`flex items-center gap-2 text-sm cursor-pointer ${
                      hasPk ? 'text-gray-400' : 'text-gray-700'
                    }`}>
                      <input
                        type="checkbox"
                        checked={field.is_primary}
                        disabled={hasPk && !field.is_primary}
                        onChange={(e) => updateField(index, 'is_primary', e.target.checked)}
                        className="rounded"
                      />
                      {t('form.primaryKey')}
                      {hasPk && !field.is_primary && (
                        <span className="text-[10px] text-gray-400">
                          ({t('form.primaryKeyTaken')})
                        </span>
                      )}
                    </label>

                    <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={field.hidden}
                        onChange={(e) => updateField(index, 'hidden', e.target.checked)}
                        className="rounded"
                      />
                      {t('form.hidden')}
                    </label>

                    <div>
                      <label className="block text-xs font-medium text-gray-500 mb-1">
                        {t('form.uiType')}
                      </label>
                      <select
                        value={field.ui_type ?? ''}
                        onChange={(e) => updateField(index, 'ui_type', e.target.value)}
                        className="w-full px-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-300"
                      >
                        {(UI_TYPE_OPTIONS[field.type] ?? ['textfield']).map((opt) => (
                          <option key={opt} value={opt}>{opt}</option>
                        ))}
                      </select>
                    </div>

                    {/* Foreign key */}
                    <div className="col-span-2">
                      <label className="block text-xs font-medium text-gray-500 mb-1">
                        {t('form.foreignKey')}
                      </label>
                      {!field.is_primary && (
                        <ForeignKeySelector
                          models={existingModels}
                          value={field.foreign_key?.references}
                          onDeleteValue={field.foreign_key?.on_delete}
                          onChange={(references) =>
                            updateField(index, 'foreign_key', { ...field.foreign_key, references })
                          }
                          onDeleteChange={(on_delete) =>
                            updateField(index, 'foreign_key', { ...field.foreign_key, on_delete })
                          }
                          onClear={() => updateField(index, 'foreign_key', undefined)}
                        />
                      )}
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>

        {/* Add field */}
        <button
          type="button"
          onClick={addField}
          className="flex items-center gap-2 px-4 py-2 text-sm text-gray-600 border border-dashed border-gray-300 rounded-lg hover:border-gray-400 hover:bg-gray-50 transition w-full justify-center"
        >
          <FiPlus size={15} />
          {t('form.addField')}
        </button>
      </div>

      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title={t('confirmDelete.title')}
        description={t('confirmDelete.description')}
        confirmText={t('confirmDelete.confirm')}
        cancelText={t('confirmDelete.cancel')}
        onConfirm={confirmDelete}
        onCancel={() => setConfirmOpen(false)}
      />

      {/* PK/FK warning dialog */}
      {warningOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full mx-4 p-6">
            <div className="flex items-start gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center shrink-0">
                <span className="text-red-600 text-lg font-bold">!</span>
              </div>
              <div>
                <h2 className="text-base font-bold text-gray-900">{t('warningDialog.title')}</h2>
                <p className="text-sm text-gray-500 mt-0.5">{t('warningDialog.subtitle')}</p>
              </div>
            </div>
            <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 mb-4 text-sm text-red-700">
              {warningFieldIndex !== null && fields[warningFieldIndex]?.is_primary
                ? t('warningDialog.primaryKeyWarning')
                : t('warningDialog.foreignKeyWarning')
              }
            </div>
            <label className="flex items-start gap-3 cursor-pointer mb-6">
              <input
                type="checkbox"
                checked={warningChecked}
                onChange={(e) => setWarningChecked(e.target.checked)}
                className="mt-0.5 rounded border-red-300 text-red-600 focus:ring-red-500"
              />
              <span className="text-sm text-gray-700">{t('warningDialog.checkboxLabel')}</span>
            </label>
            <div className="flex gap-3 justify-end">
              <button
                type="button"
                onClick={() => { setWarningOpen(false); setWarningFieldIndex(null) }}
                className="px-4 py-2 text-sm text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 transition"
              >
                {t('warningDialog.cancel')}
              </button>
              <button
                type="button"
                onClick={confirmWarningDelete}
                disabled={!warningChecked}
                className="px-4 py-2 text-sm font-medium bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-40 disabled:cursor-not-allowed transition"
              >
                {t('warningDialog.confirm')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}