/**
 * PreviewSchema.tsx
 * ------------------
 * This component renders the model field editor panel and an optional live schema preview.
 *
 * What is this component used for?
 * ---------------------------------
 * When a developer or admin is building a data model in the CMS (e.g. defining the fields
 * for a "BlogPost" or "Product"), this component provides:
 *
 *  1. A list of all current fields on the model, each rendered as an editable row with:
 *     - A text input for the field name (e.g. "title", "price")
 *     - A dropdown to select the field type (e.g. string, number, boolean)
 *     - A second dropdown for element type (only shown for array and map fields)
 *     - A checkbox to mark the field as required
 *     - A remove button to delete the field from the model
 *
 *  2. Action buttons at the bottom:
 *     - Save      — triggers the parent's save handler to persist the model
 *     - Preview   — toggles a live schema preview panel on the right side
 *     - Add Field — triggers the parent's handler to append a new blank field
 *
 *  3. An optional right-side panel showing a live preview of the schema
 *     (rendered by the SchemaPreview component) that appears when Preview is toggled on.
 *
 * How does this component communicate with its parent?
 * -----------------------------------------------------
 * This component is "controlled" — it does not manage the model data itself.
 * All data and all changes flow through props:
 *  - The parent passes the model data DOWN via props
 *  - When the user makes a change, this component calls the appropriate callback prop
 *    (onFieldChange, onAddField, onRemoveField, onSave) to notify the parent
 *  - The parent updates its own state and passes the updated data back down
 * This pattern keeps all model state in one place (the parent) and makes this
 * component easy to test and reuse.
 *
 * Layout behaviour:
 * ------------------
 * The component uses a side-by-side layout. When the preview is hidden, the field
 * editor takes up the full width. When the preview is shown, both panels share
 * equal width (50/50 split) with a smooth CSS transition.
 */

'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { Button } from '@/components/ui/button'
import { SchemaPreview } from './actions/schemaPreview'

/**
 * Field
 * -----
 * Represents a single field on a data model.
 *
 * @prop name        - The field name as it will appear in the database (e.g. "title", "price")
 * @prop type        - The data type of the field (e.g. "string", "num", "boolean")
 * @prop elementType - Only used for 'array' and 'map' types — defines what type the
 *                     elements inside the array/map are (e.g. an array of "string")
 * @prop meta        - Optional metadata about the field, currently just holds 'required'
 */
interface Field {
  name: string
  type: string
  elementType?: string
  meta?: { required?: boolean }
}

/**
 * PreviewSchemaProps
 * -------------------
 * The props (inputs) this component expects from its parent.
 *
 * @prop model          - The full model definition including its name and all its fields
 * @prop onSave         - Called when the user clicks "Save" — the parent handles persistence
 * @prop onFieldChange  - Called when the user edits any property of a field.
 *                        Receives the field index, the key that changed, and the new value.
 *                        The key can be any Field property or 'required' (a special case
 *                        that lives inside field.meta rather than at the top level).
 * @prop onAddField     - Called when the user clicks "Add Field" — the parent adds a new blank field
 * @prop onRemoveField  - Called when the user clicks "Remove" on a field row — the parent removes it
 */
interface PreviewSchemaProps {
  model: {
    name: string
    fields: Field[]
  }
  onSave: () => void
  onFieldChange: (
    index: number,
    key: keyof Field | 'required',
    value: string | boolean
  ) => void
  onAddField: () => void
  onRemoveField: (index: number) => void
}

/**
 * PreviewSchema
 * --------------
 * The main component. Renders the field editor list and optional schema preview panel.
 *
 * @param model         - The model whose fields are being edited
 * @param onSave        - Save callback from the parent
 * @param onFieldChange - Field change callback from the parent
 * @param onAddField    - Add field callback from the parent
 * @param onRemoveField - Remove field callback from the parent
 */
export default function PreviewSchema({
  model,
  onSave,
  onFieldChange,
  onAddField,
  onRemoveField,
}: PreviewSchemaProps) {
  // Controls whether the right-side schema preview panel is visible.
  // Toggled by the Preview / Hide Preview button.
  const [showPreview, setShowPreview] = useState(false)

  // Access translated strings for this component
  const t = useTranslations('previewSchema')

  return (
    <div className="flex w-full gap-4 transition-all">

      {/* ── Left Panel: Field Editor ── */}
      {/* Width transitions between full-width and 50% depending on preview state */}
      <div className={`transition-all duration-300 ${showPreview ? 'w-1/2' : 'w-full'}`}>

        <h2 className="text-xl font-semibold mb-4">{t('fieldsHeading')}</h2>

        {/* ── Field Rows ── */}
        {/* Each field in the model is rendered as one editable row */}
        {/*
          TODO: Replace `index` as the key with a stable unique field ID (e.g. field.id).
          Using the array index as a key works when the list is static, but causes subtle
          rendering bugs in React when fields are reordered or removed from the middle —
          React may reuse the wrong DOM element for the wrong field.
          Fix: add an `id: string` property to the Field interface and generate a UUID
          (e.g. crypto.randomUUID()) when a new field is created in the parent component.
        */}
        {model.fields.map((field, index) => (
          <div
            key={index}
            className="flex items-center gap-4 mb-4 flex-wrap border border-gray-300 rounded p-3"
          >
            {/* Field name input */}
            <input
              type="text"
              value={field.name}
              onChange={(e) => onFieldChange(index, 'name', e.target.value)}
              placeholder={t('fieldNamePlaceholder')}
              className="flex-1 min-w-[150px] border px-2 py-1 rounded"
              aria-label={t('aria.fieldName', { index: index + 1 })}
            />

            {/* Field type selector */}
            {/*
              These are the supported CMS field types.
              Each option value maps to a type in your model schema.
              'array' and 'map' show an additional element type selector when selected.
            */}
            <select
              value={field.type}
              onChange={(e) => onFieldChange(index, 'type', e.target.value)}
              className="border px-3 py-1 rounded min-w-[120px]"
              aria-label={t('aria.fieldType', { index: index + 1 })}
            >
              <option value="string">{t('types.string')}</option>
              <option value="num">{t('types.num')}</option>
              <option value="boolean">{t('types.boolean')}</option>
              <option value="datetime">{t('types.datetime')}</option>
              <option value="array">{t('types.array')}</option>
              <option value="map">{t('types.map')}</option>
              <option value="null">{t('types.null')}</option>
            </select>

            {/* Element type selector — only shown for array and map fields */}
            {/* This defines what type the items inside the array/map are */}
            {(field.type === 'array' || field.type === 'map') && (
              <select
                value={field.elementType || 'string'}
                onChange={(e) => onFieldChange(index, 'elementType', e.target.value)}
                className="border px-3 py-1 rounded min-w-[140px]"
                aria-label={t('aria.elementType', { index: index + 1 })}
              >
                <option value="string">{t('types.string')}</option>
                <option value="num">{t('types.num')}</option>
              </select>
            )}

            {/* Required checkbox */}
            {/* Marks this field as mandatory in the model schema */}
            <label className="flex items-center gap-1 whitespace-nowrap">
              <input
                type="checkbox"
                checked={!!field.meta?.required}
                onChange={(e) => onFieldChange(index, 'required', e.target.checked)}
                className="custom-checkbox"
                aria-label={t('aria.required', { index: index + 1 })}
              />
              {t('requiredLabel')}
            </label>

            {/* Remove field button — deletes this field from the model */}
            <button
              type="button"
              onClick={() => onRemoveField(index)}
              className="text-red-500 hover:underline"
              aria-label={t('aria.removeField', { index: index + 1 })}
            >
              {t('removeButton')}
            </button>
          </div>
        ))}

        {/* ── Bottom Action Buttons ── */}
        <div className="flex justify-between mt-4">
          {/* Save — persists the current model state via the parent's onSave handler */}
          <Button onClick={onSave}>
            {t('saveButton')}
          </Button>

          {/* Preview toggle — shows or hides the right-side schema preview panel */}
          <Button variant="outline" onClick={() => setShowPreview((prev) => !prev)}>
            {showPreview ? t('hidePreviewButton') : t('previewButton')}
          </Button>
        </div>

        {/* Add Field button — appends a new blank field via the parent's onAddField handler */}
        <div className="mt-4">
          <Button variant="secondary" onClick={onAddField}>
            {t('addFieldButton')}
          </Button>
        </div>

      </div>

      {/* ── Right Panel: Schema Preview ── */}
      {/* Only rendered when showPreview is true */}
      {/* SchemaPreview renders a read-only visual representation of the current schema */}
      {showPreview && (
        <div className="w-1/2 border rounded-lg p-4 bg-muted">
          <SchemaPreview fields={model.fields} />
        </div>
      )}

    </div>
  )
}