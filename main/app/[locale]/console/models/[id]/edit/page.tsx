//app/[locale]/console/models/[id]/edit/page.tsx
'use client'

import { useState, useEffect }   from 'react'
import { useParams, useRouter }  from 'next/navigation'
import Link                      from 'next/link'
import { useTranslations }       from 'next-intl'
import {
  DragDropContext, Droppable, Draggable, DropResult,
}                                from '@hello-pangea/dnd'
import {
  FiPlus,
  FiTrash2,
  FiChevronDown,
  FiChevronUp,
  FiArrowLeft,
  FiX,
}                                from 'react-icons/fi'
import { GripVertical }          from 'lucide-react'
import { useAuth }               from '../../../layout'
import { ConfirmDialog }         from '../../../../components_cus/confirmDialog'
import {
  FIELD_TYPES, getDefaultUiType, UI_TYPE_OPTIONS,
  DISPLAY_UI_TYPE_OPTIONS, getDefaultDisplayUiType,
}                                from '@/app/api/models/uitypes'
import ForeignKeySelector        from '@/app/[locale]/console/models/components/ForeignKeySelector'
import Loader                    from '../../../Loading'
import { logActivity }           from '@/app/lib/logActivity'
import { Field, ModelSummary, OptionsSource } from '../../modelTypes'

const EDITABLE_SYSTEM_TABLES = ['nxf_users', 'nxf_messages', 'nxf_notifications']
const SELECT_UI_TYPES        = ['select', 'multi-select']

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

  const [modelName,         setModelName]         = useState('')
  const [originalName,      setOriginalName]      = useState('')
  const [fields,            setFields]            = useState<Field[]>([])
  const [originalSchema,    setOriginalSchema]    = useState<Field[]>([])
  const [loading,           setLoading]           = useState(true)
  const [saving,            setSaving]            = useState(false)
  const [error,             setError]             = useState<string | null>(null)
  const [existingModels,    setExistingModels]    = useState<ModelSummary[]>([])
  const [expandedIndex,     setExpandedIndex]     = useState<number | null>(null)
  const [confirmOpen,       setConfirmOpen]       = useState(false)
  const [fieldToDelete,     setFieldToDelete]     = useState<number | null>(null)
  const [warningOpen,       setWarningOpen]       = useState(false)
  const [warningChecked,    setWarningChecked]    = useState(false)
  const [warningFieldIndex, setWarningFieldIndex] = useState<number | null>(null)
  const [tagInputs,         setTagInputs]         = useState<Record<number, string>>({})

  const reindexOrder = (arr: Field[]): Field[] =>
    arr.map((f, i) => ({ ...f, order: i }))

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

      let rawColumns: any[] = []
      const rawSchema = model.schema

      if (Array.isArray(rawSchema)) {
        rawColumns = rawSchema
      } else if (rawSchema && typeof rawSchema === 'object' && Array.isArray(rawSchema.columns)) {
        rawColumns = rawSchema.columns
      }

      const sorted = [...rawColumns].sort((a: any, b: any) => {
        const ao = a.order ?? Number.MAX_SAFE_INTEGER
        const bo = b.order ?? Number.MAX_SAFE_INTEGER
        return ao - bo
      })

      const schema: Field[] = sorted.map((f: any, i: number) => {
        const ui_type  = f.ui_type ?? getDefaultUiType(f.type ?? 'string')
        const isSelect = SELECT_UI_TYPES.includes(ui_type) && !f.foreign_key

        return {
          name:            f.name            ?? '',
          type:            f.type            ?? 'string',
          nullable:        f.nullable        ?? true,
          unique:          f.unique          ?? false,
          is_primary:      f.is_primary      ?? false,
          hidden:          f.hidden          ?? false,
          ui_type,
          display_ui_type: f.display_ui_type ?? getDefaultDisplayUiType(ui_type),
          foreign_key:     f.foreign_key,
          options_mode:    f.options_mode ?? (isSelect ? 'manual' : undefined),
          options:         f.options ?? (isSelect ? [] : undefined),
          options_source:  f.options_source,
          order:           f.order ?? i,
        }
      })
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

      if (key === 'type') {
        updated[index].ui_type = getDefaultUiType(value as string)
        updated[index].display_ui_type = getDefaultDisplayUiType(updated[index].ui_type ?? '')
        if (!SELECT_UI_TYPES.includes(updated[index].ui_type ?? '')) {
          delete updated[index].options_mode
          delete updated[index].options
          delete updated[index].options_source
        } else if (!updated[index].options_mode) {
          updated[index].options_mode = 'manual'
          updated[index].options      = []
        }
      }

      if (key === 'ui_type') {
        updated[index].display_ui_type = getDefaultDisplayUiType(value as string)
        if (!SELECT_UI_TYPES.includes(value as string)) {
          delete updated[index].options_mode
          delete updated[index].options
          delete updated[index].options_source
        } else if (!updated[index].options_mode) {
          updated[index].options_mode = 'manual'
          updated[index].options      = []
        }
      }

      if (key === 'is_primary' && value === true) {
        updated.forEach((f, i) => { if (i !== index) updated[i] = { ...f, is_primary: false } })
      }

      return updated
    })
  }

  const updateOptionsSource = (index: number, key: keyof OptionsSource, value: string) => {
    setFields((prev) => {
      const updated = [...prev]
      updated[index] = {
        ...updated[index],
        options_source: {
          ...(updated[index].options_source ?? { table: '', label_column: '', value_column: '' }),
          [key]: value,
        },
      }
      return updated
    })
  }

  const addManualOption = (index: number) => {
    const tag = (tagInputs[index] ?? '').trim()
    if (!tag) return
    setFields((prev) => {
      const updated  = [...prev]
      const existing = updated[index].options ?? []
      if (existing.includes(tag)) return prev
      updated[index] = { ...updated[index], options: [...existing, tag] }
      return updated
    })
    setTagInputs((prev) => ({ ...prev, [index]: '' }))
  }

  const removeManualOption = (fieldIndex: number, optionValue: string) => {
    setFields((prev) => {
      const updated = [...prev]
      updated[fieldIndex] = {
        ...updated[fieldIndex],
        options: (updated[fieldIndex].options ?? []).filter((o) => o !== optionValue),
      }
      return updated
    })
  }

  const addField = () => {
    const ui_type = getDefaultUiType('string')
    setFields((prev) => reindexOrder([...prev, {
      name: '', type: 'string', nullable: true,
      unique: false, is_primary: false, hidden: false,
      ui_type,
      display_ui_type: getDefaultDisplayUiType(ui_type),
    }]))
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
    setFields((prev) => reindexOrder(prev.filter((_, i) => i !== fieldToDelete)))
    if (expandedIndex === fieldToDelete) setExpandedIndex(null)
    setFieldToDelete(null)
    setConfirmOpen(false)
  }

  const confirmWarningDelete = () => {
    if (warningFieldIndex === null) return
    setFields((prev) => reindexOrder(prev.filter((_, i) => i !== warningFieldIndex)))
    if (expandedIndex === warningFieldIndex) setExpandedIndex(null)
    setWarningFieldIndex(null)
    setWarningOpen(false)
    setWarningChecked(false)
  }

  const onDragEnd = (result: DropResult) => {
    if (!result.destination) return
    if (result.destination.index === result.source.index) return

    setFields((prev) => {
      const updated = [...prev]
      const [moved] = updated.splice(result.source.index, 1)
      updated.splice(result.destination!.index, 0, moved)
      return reindexOrder(updated)
    })

    if (expandedIndex === result.source.index) {
      setExpandedIndex(result.destination.index)
    } else if (
      expandedIndex !== null &&
      expandedIndex > result.source.index &&
      expandedIndex <= result.destination.index
    ) {
      setExpandedIndex(expandedIndex - 1)
    } else if (
      expandedIndex !== null &&
      expandedIndex < result.source.index &&
      expandedIndex >= result.destination.index
    ) {
      setExpandedIndex(expandedIndex + 1)
    }
  }

  // RELAXED FOR CORE: select fields no longer require populated options or a
  // fully-configured dynamic source to save. options_mode still gets tagged
  // if present, but an empty/unset select is allowed through — Anton's call:
  // self-hosted users can leave a select's options empty if they don't need them.
  const validateSelectFields = (): string | null => {
    return null
  }

  const handleSubmit = async () => {
    setError(null)
    if (!modelName.trim())                    { setError(t('validation.modelNameRequired')); return }
    if (fields.some((f) => !f.name.trim()))   { setError(t('validation.fieldsInvalid'));     return }
    const names = fields.map((f) => f.name.trim().toLowerCase())
    if (new Set(names).size !== names.length) { setError(t('validation.fieldNameUnique'));   return }
    if (fields.filter((f) => f.is_primary).length > 1) { setError(t('validation.singlePrimaryKey')); return }

    const selectError = validateSelectFields()
    if (selectError) { setError(selectError); return }

    setSaving(true)
    try {
      const columnsWithOrder = reindexOrder(fields)

      const schemaPayload = {
        version:      '1.0',
        columns:      columnsWithOrder,
        hooks:        [],
        integrations: [],
      }

      const res  = await fetch(`/api/models/${id}`, {
        method:  'PUT',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({
          user_id:    user?.user_id || user?.id,
          name:       modelName.trim(),
          schema:     schemaPayload,
          old_name:   originalName,
          old_schema: originalSchema,
        }),
      })
      const text = await res.text()
      const data = text ? JSON.parse(text) : {}
      if (!res.ok) throw new Error(data.error || t('errors.updateModelFailed'))

      const userId = user?.user_id || user?.id
      if (userId) {
        await logActivity(userId, 'model_updated', { model_name: modelName.trim() })
      }

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

        {error && (
          <div className="mb-4 px-4 py-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">
            {error}
          </div>
        )}

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

        <DragDropContext onDragEnd={onDragEnd}>
          <Droppable droppableId="fields-list">
            {(provided) => (
              <div
                ref={provided.innerRef}
                {...provided.droppableProps}
                className="space-y-3 mb-4"
              >
                {fields.map((field, index) => {
                  const isExpanded   = expandedIndex === index
                  const hasPk        = fields.some((f, i) => f.is_primary && i !== index)
                  const isSelectType = SELECT_UI_TYPES.includes(field.ui_type ?? '')
                  const dynamicModel = field.options_mode === 'dynamic' && field.options_source?.table
                    ? existingModels.find((m) => m.name === field.options_source!.table)
                    : null
                  const displayOptions = DISPLAY_UI_TYPE_OPTIONS[field.ui_type ?? ''] ?? ['label']

                  return (
                    <Draggable
                      key={`field-${index}`}
                      draggableId={`field-${index}`}
                      index={index}
                    >
                      {(dragProvided, dragSnapshot) => (
                        <div
                          ref={dragProvided.innerRef}
                          {...dragProvided.draggableProps}
                          className={`bg-white border rounded-xl transition-shadow ${
                            dragSnapshot.isDragging
                              ? 'border-[var(--color-primary)] shadow-lg'
                              : 'border-gray-200'
                          }`}
                        >
                          <div className="flex items-center gap-3 px-4 py-3">
                            <div
                              {...dragProvided.dragHandleProps}
                              className="cursor-grab active:cursor-grabbing text-gray-300 hover:text-gray-500 p-1 -ml-1"
                              title="Drag to reorder"
                            >
                              <GripVertical size={16} />
                            </div>

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

                          {isExpanded && (
                            <div className="px-4 pb-4 pt-1 border-t border-gray-100 space-y-4">
                              <div className="grid grid-cols-2 gap-4">
                                <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                                  <input
                                    type="checkbox"
                                    checked={field.unique}
                                    onChange={(e) => updateField(index, 'unique', e.target.checked)}
                                    className="rounded"
                                  />
                                  {t('form.unique')}
                                </label>

                                <label className={`flex items-center gap-2 text-sm cursor-pointer ${hasPk ? 'text-gray-400' : 'text-gray-700'}`}>
                                  <input
                                    type="checkbox"
                                    checked={field.is_primary}
                                    disabled={hasPk && !field.is_primary}
                                    onChange={(e) => updateField(index, 'is_primary', e.target.checked)}
                                    className="rounded"
                                  />
                                  {t('form.primaryKey')}
                                  {hasPk && !field.is_primary && (
                                    <span className="text-[10px] text-gray-400">({t('form.primaryKeyTaken')})</span>
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
                                  <p className="text-[10px] text-gray-400 mt-1">
                                    Editable widget used on admin pages.
                                  </p>
                                </div>

                                <div>
                                  <label className="block text-xs font-medium text-gray-500 mb-1">
                                    Public Display As
                                  </label>
                                  <select
                                    value={field.display_ui_type ?? getDefaultDisplayUiType(field.ui_type ?? '')}
                                    onChange={(e) => updateField(index, 'display_ui_type', e.target.value)}
                                    className="w-full px-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-300"
                                  >
                                    {displayOptions.map((opt) => (
                                      <option key={opt} value={opt}>{opt}</option>
                                    ))}
                                  </select>
                                  <p className="text-[10px] text-gray-400 mt-1">
                                    Read-only rendering used on public pages.
                                  </p>
                                </div>
                              </div>

                              {isSelectType && (
                                <div className="border border-amber-200 bg-amber-50 rounded-lg p-4 space-y-3">
                                  <div className="flex items-center justify-between">
                                    <p className="text-xs font-semibold text-amber-700 uppercase tracking-wide">
                                      {field.ui_type === 'select' ? 'Select Options' : 'Multi-Select Options'}
                                    </p>
                                  </div>

                                  <div className="flex rounded-lg border border-gray-200 overflow-hidden">
                                    <button
                                      type="button"
                                      onClick={() => {
                                        updateField(index, 'options_mode', 'manual')
                                        updateField(index, 'options_source', undefined)
                                        if (!field.options) updateField(index, 'options', [])
                                      }}
                                      className={`flex-1 py-1.5 text-xs font-medium transition-colors ${
                                        field.options_mode === 'manual'
                                          ? 'bg-gray-900 text-white'
                                          : 'text-gray-500 hover:bg-gray-50 bg-white'
                                      }`}
                                    >
                                      Manual options
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        updateField(index, 'options_mode', 'dynamic')
                                        updateField(index, 'options', undefined)
                                        if (!field.options_source) {
                                          updateField(index, 'options_source', { table: '', label_column: '', value_column: '' })
                                        }
                                      }}
                                      className={`flex-1 py-1.5 text-xs font-medium transition-colors ${
                                        field.options_mode === 'dynamic'
                                          ? 'bg-gray-900 text-white'
                                          : 'text-gray-500 hover:bg-gray-50 bg-white'
                                      }`}
                                    >
                                      From database
                                    </button>
                                  </div>

                                  {field.options_mode === 'manual' && (
                                    <div className="space-y-2">
                                      <div className="flex gap-2">
                                        <input
                                          type="text"
                                          value={tagInputs[index] ?? ''}
                                          onChange={(e) => setTagInputs((prev) => ({ ...prev, [index]: e.target.value }))}
                                          onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addManualOption(index) } }}
                                          placeholder="Type an option and press Enter"
                                          className="flex-1 px-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-300"
                                        />
                                        <button
                                          type="button"
                                          onClick={() => addManualOption(index)}
                                          className="px-3 py-1.5 text-sm bg-gray-900 text-white rounded-lg hover:bg-gray-700 transition"
                                        >
                                          Add
                                        </button>
                                      </div>
                                      {(field.options ?? []).length > 0 && (
                                        <div className="flex flex-wrap gap-1.5">
                                          {(field.options ?? []).map((opt) => (
                                            <span
                                              key={opt}
                                              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-gray-100 text-gray-700 text-xs"
                                            >
                                              {opt}
                                              <button
                                                type="button"
                                                onClick={() => removeManualOption(index, opt)}
                                                className="text-gray-400 hover:text-red-500 transition"
                                              >
                                                <FiX size={10} />
                                              </button>
                                            </span>
                                          ))}
                                        </div>
                                      )}
                                      {(field.options ?? []).length === 0 && (
                                        <p className="text-xs text-gray-400">No options added yet (optional).</p>
                                      )}
                                    </div>
                                  )}

                                  {field.options_mode === 'dynamic' && (
                                    <div className="space-y-2">
                                      <div>
                                        <label className="block text-xs font-medium text-gray-500 mb-1">Source table</label>
                                        <select
                                          value={field.options_source?.table ?? ''}
                                          onChange={(e) => updateOptionsSource(index, 'table', e.target.value)}
                                          className="w-full px-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-300"
                                        >
                                          <option value="">Select a model…</option>
                                          {existingModels.map((m) => (
                                            <option key={m.sm_id} value={m.name}>{m.name}</option>
                                          ))}
                                        </select>
                                      </div>
                                      {dynamicModel && (
                                        <>
                                          <div>
                                            <label className="block text-xs font-medium text-gray-500 mb-1">Label column (shown to user)</label>
                                            <select
                                              value={field.options_source?.label_column ?? ''}
                                              onChange={(e) => updateOptionsSource(index, 'label_column', e.target.value)}
                                              className="w-full px-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-300"
                                            >
                                              <option value="">Select column…</option>
                                              {dynamicModel.schema.map((col) => (
                                                <option key={col.name} value={col.name}>{col.name} ({col.type})</option>
                                              ))}
                                            </select>
                                          </div>
                                          <div>
                                            <label className="block text-xs font-medium text-gray-500 mb-1">Value column (stored in record)</label>
                                            <select
                                              value={field.options_source?.value_column ?? ''}
                                              onChange={(e) => updateOptionsSource(index, 'value_column', e.target.value)}
                                              className="w-full px-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-300"
                                            >
                                              <option value="">Select column…</option>
                                              {dynamicModel.schema.map((col) => (
                                                <option key={col.name} value={col.name}>{col.name} ({col.type})</option>
                                              ))}
                                            </select>
                                          </div>
                                        </>
                                      )}
                                    </div>
                                  )}
                                </div>
                              )}

                              <div>
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
                      )}
                    </Draggable>
                  )
                })}
                {provided.placeholder}
              </div>
            )}
          </Droppable>
        </DragDropContext>

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