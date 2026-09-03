//app/[locale]/console/models/create/page.tsx
'use client'

import { useState, useEffect }   from 'react'
import { useRouter }             from 'next/navigation'
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
import { useAuth }               from '../../layout'
import { ConfirmDialog }         from '../../../components_cus/confirmDialog'
import {
  FIELD_TYPES, getDefaultUiType, ON_DELETE_OPTIONS, UI_TYPE_OPTIONS, UI_TYPE_GROUPS,
  DISPLAY_UI_TYPE_OPTIONS, getDefaultDisplayUiType,
}                                from '@/app/api/models/uitypes'
import ForeignKeySelector        from '@/app/[locale]/console/models/components/ForeignKeySelector'
import { logActivity }           from '@/app/lib/logActivity'
import { defaultField, Field, ForeignKey, ModelSummary, OptionsSource } from '../modelTypes'


const SELECT_UI_TYPES = ['select', 'multi-select']

export default function CreateModelPage() {
  const t        = useTranslations('createModel')
  const router   = useRouter()
  const { user } = useAuth()

  const [modelName,      setModelName]      = useState('')
  const [fields,         setFields]         = useState<Field[]>([{ ...defaultField(), order: 0 }])
  const [saving,         setSaving]         = useState(false)
  const [error,          setError]          = useState<string | null>(null)
  const [existingModels, setExistingModels] = useState<ModelSummary[]>([])
  const [expandedIndex,  setExpandedIndex]  = useState<number | null>(null)
  const [confirmOpen,    setConfirmOpen]    = useState(false)
  const [fieldToDelete,  setFieldToDelete]  = useState<number | null>(null)
  const [tagInputs,      setTagInputs]      = useState<Record<number, string>>({})

  useEffect(() => {
    if (!user) return
    const userId = user.user_id || user.id
    fetch(`/api/models/names?user_id=${userId}`)
      .then((r) => r.text())
      .then((text) => {
        if (!text) return
        const data = JSON.parse(text)
        setExistingModels(data.models ?? [])
      })
      .catch(() => {})
  }, [user])

  // Reassign order values based on current array position
  const reindexOrder = (arr: Field[]): Field[] =>
    arr.map((f, i) => ({ ...f, order: i }))

  const updateField = (index: number, key: keyof Field, value: any) => {
    setFields((prev) => {
      const updated = [...prev]
      updated[index] = { ...updated[index], [key]: value }

      if (key === 'type') {
        updated[index].ui_type = getDefaultUiType(value as string)
        updated[index].display_ui_type = getDefaultDisplayUiType(updated[index].ui_type ?? '')
        if (!['string', 'uuid', 'integer'].includes(value as string)) {
          delete updated[index].foreign_key
        }
        if (!SELECT_UI_TYPES.includes(updated[index].ui_type ?? '')) {
          delete updated[index].options_mode
          delete updated[index].options
          delete updated[index].options_source
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
        updated.forEach((f, i) => {
          if (i !== index) updated[i] = { ...f, is_primary: false }
        })
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

  const updateForeignKey = (index: number, key: keyof ForeignKey, value: string) => {
    setFields((prev) => {
      const updated = [...prev]
      updated[index] = {
        ...updated[index],
        foreign_key: {
          ...(updated[index].foreign_key ?? { references: '' }),
          [key]: value,
        },
      }
      return updated
    })
  }

  const addField = () => {
    setFields((prev) => reindexOrder([...prev, defaultField()]))
    setExpandedIndex(fields.length)
  }

  const requestDelete = (index: number) => {
    setFieldToDelete(index)
    setConfirmOpen(true)
  }

  const confirmDelete = () => {
    if (fieldToDelete === null) return
    setFields((prev) => reindexOrder(prev.filter((_, i) => i !== fieldToDelete)))
    if (expandedIndex === fieldToDelete) setExpandedIndex(null)
    setFieldToDelete(null)
    setConfirmOpen(false)
  }

  // Drag-and-drop reorder
  const onDragEnd = (result: DropResult) => {
    if (!result.destination) return
    if (result.destination.index === result.source.index) return

    setFields((prev) => {
      const updated = [...prev]
      const [moved] = updated.splice(result.source.index, 1)
      updated.splice(result.destination!.index, 0, moved)
      return reindexOrder(updated)
    })

    // Keep expanded row tracking the moved field
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

  const validateSelectFields = (): string | null => {
    for (let i = 0; i < fields.length; i++) {
      const f = fields[i]
      if (!SELECT_UI_TYPES.includes(f.ui_type ?? '')) continue

      if (!f.options_mode) {
        return `Field "${f.name || `#${i + 1}`}" is a ${f.ui_type} — please choose Manual options or Dynamic source.`
      }
      if (f.options_mode === 'manual' && (!f.options || f.options.length === 0)) {
        return `Field "${f.name || `#${i + 1}`}" is a ${f.ui_type} with manual options — add at least one option.`
      }
      if (f.options_mode === 'dynamic') {
        const src = f.options_source
        if (!src?.table || !src?.label_column || !src?.value_column) {
          return `Field "${f.name || `#${i + 1}`}" is a ${f.ui_type} with dynamic source — select a table, label column, and value column.`
        }
      }
    }
    return null
  }

  const handleSubmit = async () => {
    setError(null)
    if (!modelName.trim())                    { setError(t('validation.modelNameRequired')); return }
    if (fields.some((f) => !f.name.trim()))   { setError(t('validation.fieldsInvalid'));     return }
    const names = fields.map((f) => f.name.trim().toLowerCase())
    if (new Set(names).size !== names.length) { setError(t('validation.fieldNameUnique'));   return }
    // FIX: previously only guarded against MORE than one primary key —
    // nothing stopped saving a model with ZERO fields marked is_primary,
    // which is exactly how nxf_returns/nxf_reviews/nxf_shipping ended up
    // with no real PK and broke every provider/repository template that
    // assumes one exists (undefined_getter 'id' at Flutter analyze time).
    // Plain hardcoded string rather than a translation key — adding a new
    // key here means updating 18 other locale files, deferred to a
    // post-launch i18n pass per Anton's call.
    if (fields.filter((f) => f.is_primary).length === 0) { setError('Select one field as the primary key before saving.'); return }
    if (fields.filter((f) => f.is_primary).length > 1)   { setError(t('validation.singlePrimaryKey')); return }

    const selectError = validateSelectFields()
    if (selectError) { setError(selectError); return }

    setSaving(true)
    try {
      const userId   = user?.user_id || user?.id
      const fullName = 'nxf_' + modelName.trim()

      // Ensure order is set on every field before saving
      const columnsWithOrder = reindexOrder(fields)

      const schemaPayload = {
        version:      '1.0',
        columns:      columnsWithOrder,
        hooks:        [],
        integrations: [],
      }

      const res  = await fetch('/api/models', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ user_id: userId, name: fullName, schema: schemaPayload }),
      })
      const text = await res.text()
      const data = text ? JSON.parse(text) : {}
      if (!res.ok) throw new Error(data.error || t('errors.createFailed'))

      if (userId) {
        await logActivity(userId, 'model_created', { model_name: fullName })
      }

      router.push('/console/models')
    } catch (err: any) {
      setError(err.message || t('errors.createFailed'))
    } finally {
      setSaving(false)
    }
  }

  // FIX: the "Source table" dropdown for dynamic select options was
  // rendering every model returned by /api/models/names with no filtering
  // — including internal system tables (nxf_system_*, nxf_users, etc.).
  // /api/models/names already returns an is_system flag on every row, same
  // as the FK selector uses; filter it out here too.
  const selectableSourceModels = existingModels.filter((m: any) => !m.is_system)

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
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-400 font-mono">nxf_</span>
            <input
              type="text"
              value={modelName}
              onChange={(e) => setModelName(e.target.value)}
              placeholder={t('form.modelNamePlaceholder')}
              className="flex-1 px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-300"
            />
          </div>
        </div>

        {/* Field rows — draggable */}
        <DragDropContext onDragEnd={onDragEnd}>
          <Droppable droppableId="fields-list">
            {(provided) => (
              <div
                ref={provided.innerRef}
                {...provided.droppableProps}
                className="space-y-3 mb-4"
              >
                {fields.map((field, index) => {
                  const isExpanded    = expandedIndex === index
                  const fkModel       = existingModels.find((m) =>
                    field.foreign_key?.references?.startsWith(m.name + '(')
                  )
                  const hasPk         = fields.some((f, i) => f.is_primary && i !== index)
                  const isSelectType  = SELECT_UI_TYPES.includes(field.ui_type ?? '')
                  const dynamicModel  = field.options_mode === 'dynamic' && field.options_source?.table
                    ? selectableSourceModels.find((m) => m.name === field.options_source!.table)
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
                          {/* Basic row */}
                          <div className="flex items-center gap-3 px-4 py-3">
                            {/* Drag handle */}
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

                          {/* Advanced options */}
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
                                    {(UI_TYPE_GROUPS[field.type] ?? [{ label: 'Options', options: UI_TYPE_OPTIONS[field.type] ?? ['textfield'] }]).map((group) => (
                                      <optgroup key={group.label} label={group.label}>
                                        {group.options.map((opt) => (
                                          <option key={opt} value={opt}>{opt}</option>
                                        ))}
                                      </optgroup>
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

                              {/* Select / Multi-select options */}
                              {isSelectType && (
                                <div className="border border-amber-200 bg-amber-50 rounded-lg p-4 space-y-3">
                                  <div className="flex items-center justify-between">
                                    <p className="text-xs font-semibold text-amber-700 uppercase tracking-wide">
                                      {field.ui_type === 'select' ? 'Select Options' : 'Multi-Select Options'}
                                    </p>
                                    {!field.options_mode && (
                                      <span className="text-[10px] text-red-500 font-medium">Required</span>
                                    )}
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
                                        <p className="text-xs text-gray-400">No options added yet — add at least one.</p>
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
                                          {selectableSourceModels.map((m) => (
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

                              {/* FK column */}
                              {fkModel && (
                                <div>
                                  <label className="block text-xs font-medium text-gray-500 mb-1">
                                    {t('form.foreignKeyColumn')}
                                  </label>
                                  <select
                                    value={field.foreign_key?.references?.match(/\((.+)\)/)?.[1] ?? ''}
                                    onChange={(e) =>
                                      updateForeignKey(index, 'references', `${fkModel.name}(${e.target.value})`)
                                    }
                                    className="w-full px-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-300"
                                  >
                                    <option value="">{t('form.selectColumn')}</option>
                                    {(fkModel.schema ?? []).map((col) => (
                                      <option key={col.name} value={col.name}>
                                        {col.name} ({col.type})
                                      </option>
                                    ))}
                                  </select>
                                </div>
                              )}

                              {/* On delete */}
                              {field.foreign_key?.references?.match(/\(.+\)/) && (
                                <div>
                                  <label className="block text-xs font-medium text-gray-500 mb-1">
                                    {t('form.onDelete')}
                                  </label>
                                  <select
                                    value={field.foreign_key?.on_delete ?? 'CASCADE'}
                                    onChange={(e) => updateForeignKey(index, 'on_delete', e.target.value)}
                                    className="w-full px-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-300"
                                  >
                                    {ON_DELETE_OPTIONS.map((opt) => (
                                      <option key={opt} value={opt}>{opt}</option>
                                    ))}
                                  </select>
                                </div>
                              )}
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
    </div>
  )
}