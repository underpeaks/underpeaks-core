'use client'

/**
 * FieldRenderer.tsx
 * Location: app/[locale]/console/[slug]/components/shared/FieldRenderer.tsx
 *
 * Renders the correct form input for a model field based on its ui_type.
 * Used in DataDrawer and FormTemplate for all field rendering.
 *
 * Handles ui_types: textfield, textarea, rich-text, number-input, currency-input,
 * toggle, checkbox, radio-yes-no, select, multi-select, tags-input, list,
 * checklist, datetime-picker, date-picker, time-picker, image-upload, image-url,
 * media-picker, code-editor, json-viewer, key-value-editor, markdown-editor,
 * slug-input, url-input, email-input, phone-input, password-input, color-picker,
 * rating, slider, autocomplete, stepper, hidden.
 *
 * Image fields:
 *   - column.type === 'array' → multi-image mode with drag-to-reorder and carousel intent
 *   - column.type === 'string' → single image, replaces on new upload
 *   - All variants support file upload, URL paste, replace, delete
 *
 * Dynamic select/multi-select options are passed in as SelectOption[]
 * by the parent (DataDrawer fetches them from /api-cms/data/[table]).
 */

import { useState, useRef }                                from 'react'
import {
  FiX, FiPlus, FiEye, FiEyeOff, FiUpload, FiMove, FiImage,
}                                                          from 'react-icons/fi'
import { getAuthToken }                                    from '@/app/lib/clientAuth'
import type { ModelColumn, SelectOption }                  from '../../types'

interface FieldRendererProps {
  column:          ModelColumn
  value:           unknown
  onChange:        (value: unknown) => void
  dynamicOptions?: SelectOption[]
  disabled?:       boolean
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function asString(v: unknown): string {
  if (v === null || v === undefined) return ''
  return String(v)
}

function asBoolean(v: unknown): boolean {
  if (typeof v === 'boolean') return v
  if (v === 'true' || v === 1)  return true
  return false
}

function asArray(v: unknown): string[] {
  if (Array.isArray(v)) return v.map(String)
  if (typeof v === 'string') {
    try { const p = JSON.parse(v); if (Array.isArray(p)) return p.map(String) } catch {}
    return v.split(',').map((s) => s.trim()).filter(Boolean)
  }
  return []
}

function formatDatetimeLocal(v: unknown): string {
  if (!v) return ''
  try {
    const d = new Date(String(v))
    if (isNaN(d.getTime())) return ''
    return d.toISOString().slice(0, 16)
  } catch { return '' }
}

function formatDate(v: unknown): string {
  if (!v) return ''
  try {
    const d = new Date(String(v))
    if (isNaN(d.getTime())) return ''
    return d.toISOString().slice(0, 10)
  } catch { return '' }
}

// ---------------------------------------------------------------------------
// Tags input
// ---------------------------------------------------------------------------

function TagsInput({
  value, onChange, disabled, placeholder = 'Add tag…',
}: {
  value: string[]; onChange: (v: string[]) => void; disabled?: boolean; placeholder?: string
}) {
  const [input, setInput] = useState('')

  const add = () => {
    const tag = input.trim()
    if (!tag || value.includes(tag)) return
    onChange([...value, tag])
    setInput('')
  }

  const remove = (tag: string) => onChange(value.filter((t) => t !== tag))

  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <input
          type="text"
          value={input}
          disabled={disabled}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); add() } }}
          placeholder={placeholder}
          className="flex-1 px-3 py-2 text-sm border border-gray-200 rounded-lg
                     focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]
                     disabled:opacity-50 disabled:cursor-not-allowed"
        />
        <button
          type="button"
          onClick={add}
          disabled={disabled}
          className="px-3 py-2 text-sm bg-gray-100 hover:bg-gray-200 rounded-lg
                     transition disabled:opacity-50"
        >
          <FiPlus size={14} />
        </button>
      </div>
      {value.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {value.map((tag) => (
            <span
              key={tag}
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full
                         bg-[var(--color-primary)]/10 text-[var(--color-primary)] text-xs"
            >
              {tag}
              {!disabled && (
                <button
                  type="button"
                  onClick={() => remove(tag)}
                  className="hover:text-red-500 transition"
                >
                  <FiX size={10} />
                </button>
              )}
            </span>
          ))}
        </div>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Multi-select checkboxes
// ---------------------------------------------------------------------------

function MultiSelectCheckboxes({
  options, value, onChange, disabled,
}: {
  options: SelectOption[]; value: string[]; onChange: (v: string[]) => void; disabled?: boolean
}) {
  const toggle = (val: string) => {
    if (value.includes(val)) onChange(value.filter((v) => v !== val))
    else                     onChange([...value, val])
  }

  return (
    <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
      {options.map((opt) => (
        <label key={opt.value} className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={value.includes(opt.value)}
            disabled={disabled}
            onChange={() => toggle(opt.value)}
            className="rounded border-gray-300 text-[var(--color-primary)]
                       focus:ring-[var(--color-primary)] disabled:opacity-50"
          />
          <span className="text-sm text-[var(--color-text)]">{opt.label}</span>
        </label>
      ))}
      {options.length === 0 && (
        <p className="text-xs text-gray-400">No options available</p>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Star rating
// ---------------------------------------------------------------------------

function StarRating({
  value, onChange, max = 5, disabled,
}: {
  value: number; onChange: (v: number) => void; max?: number; disabled?: boolean
}) {
  const [hover, setHover] = useState(0)
  return (
    <div className="flex gap-1">
      {Array.from({ length: max }, (_, i) => i + 1).map((star) => (
        <button
          key={star}
          type="button"
          disabled={disabled}
          onClick={() => onChange(star)}
          onMouseEnter={() => setHover(star)}
          onMouseLeave={() => setHover(0)}
          className="text-2xl leading-none transition disabled:cursor-not-allowed"
        >
          <span className={(hover || value) >= star ? 'text-amber-400' : 'text-gray-200'}>★</span>
        </button>
      ))}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Image field — handles single and multi via column.type
// ---------------------------------------------------------------------------

function ImageField({
  column, value, onChange, disabled,
}: {
  column:   ModelColumn
  value:    unknown
  onChange: (v: unknown) => void
  disabled?: boolean
}) {
  const isMulti       = column.type === 'array'
  const urls          = asArray(value)
  const fileInputRef  = useRef<HTMLInputElement>(null)
  const replaceIdxRef = useRef<number | null>(null)

  const [uploading,   setUploading]   = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [urlInput,    setUrlInput]    = useState('')
  const [dragIdx,     setDragIdx]     = useState<number | null>(null)

  // ── Helper to write back the correct shape ─────────────────────────────
  const writeUrls = (next: string[]) => {
    if (isMulti) {
      onChange(next)
    } else {
      // Single mode — store as string (first URL only) or null
      onChange(next[0] ?? null)
    }
  }

  // ── Upload one or more files ───────────────────────────────────────────
  const uploadFiles = async (files: FileList) => {
    setUploadError(null)
    setUploading(true)
    try {
      const newUrls: string[] = []
      for (const file of Array.from(files)) {
        if (!file.type.startsWith('image/')) {
          throw new Error(`${file.name} is not an image`)
        }
        if (file.size > 10 * 1024 * 1024) {
          throw new Error(`${file.name} is larger than 10MB`)
        }

        const formData = new FormData()
        formData.append('file',   file)
        formData.append('folder', 'products')

        const token = getAuthToken()
        const res = await fetch('/api/storage/upload', {
          method:  'POST',
          headers: { Authorization: `Bearer ${token}` },
          body:    formData,
        })
        const data = await res.json()
        if (!res.ok) throw new Error(data.error ?? 'Upload failed')
        newUrls.push(data.url)
      }

      // Replace a specific index?
      if (replaceIdxRef.current !== null) {
        const idx = replaceIdxRef.current
        replaceIdxRef.current = null
        const next = [...urls]
        next[idx] = newUrls[0]
        writeUrls(next)
        return
      }

      // Otherwise:
      // - Single mode: overwrite with the first uploaded URL
      // - Multi mode: append all uploaded URLs
      if (isMulti) {
        writeUrls([...urls, ...newUrls])
      } else {
        writeUrls([newUrls[0]])
      }
    } catch (err: any) {
      setUploadError(err.message ?? 'Upload failed')
    } finally {
      setUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  const handleFileSelect = (files: FileList | null) => {
    if (!files || files.length === 0) return
    void uploadFiles(files)
  }

  const handleUrlAdd = () => {
    const url = urlInput.trim()
    if (!url) return
    if (urls.includes(url)) {
      setUploadError('That URL is already in the list')
      return
    }
    if (isMulti) {
      writeUrls([...urls, url])
    } else {
      writeUrls([url])
    }
    setUrlInput('')
    setUploadError(null)
  }

  const handleDelete = (idx: number) => {
    writeUrls(urls.filter((_, i) => i !== idx))
  }

  const handleReplaceClick = (idx: number) => {
    replaceIdxRef.current = idx
    fileInputRef.current?.click()
  }

  // ── Drag-to-reorder (multi mode only) ──────────────────────────────────
  const handleDragStart = (idx: number) => {
    setDragIdx(idx)
  }

  const handleDragOver = (e: React.DragEvent, idx: number) => {
    if (dragIdx === null || dragIdx === idx) return
    e.preventDefault()
  }

  const handleDrop = (e: React.DragEvent, dropIdx: number) => {
    e.preventDefault()
    if (dragIdx === null || dragIdx === dropIdx) {
      setDragIdx(null)
      return
    }
    const next = [...urls]
    const [moved] = next.splice(dragIdx, 1)
    next.splice(dropIdx, 0, moved)
    writeUrls(next)
    setDragIdx(null)
  }

  // ── Render thumbnails ──────────────────────────────────────────────────
  const thumbnails = (
    <div className={isMulti
      ? 'grid grid-cols-3 gap-2'
      : 'flex gap-2'
    }>
      {urls.map((url, i) => (
        <div
          key={i}
          draggable={isMulti && !disabled}
          onDragStart={() => handleDragStart(i)}
          onDragOver={(e) => handleDragOver(e, i)}
          onDrop={(e) => handleDrop(e, i)}
          onDragEnd={() => setDragIdx(null)}
          className={`relative group rounded-lg border border-gray-200 overflow-hidden
                      bg-gray-50 ${isMulti ? 'aspect-square' : 'w-32 h-32'} ${
            dragIdx === i ? 'opacity-40' : ''
          } ${isMulti && !disabled ? 'cursor-move' : ''}`}
        >
          <img
            src={url}
            alt=""
            className="w-full h-full object-cover"
            onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
          />

          {/* Primary badge on first image in multi mode */}
          {isMulti && i === 0 && (
            <div className="absolute top-1 left-1 px-1.5 py-0.5 rounded text-[9px]
                            font-medium bg-[var(--color-primary)] text-white">
              Primary
            </div>
          )}

          {/* Drag handle indicator for multi mode */}
          {isMulti && !disabled && (
            <div className="absolute top-1 right-1 p-1 rounded bg-black/40 text-white
                            opacity-0 group-hover:opacity-100 transition pointer-events-none">
              <FiMove size={10} />
            </div>
          )}

          {/* Hover overlay with replace + delete */}
          {!disabled && (
            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40
                            transition-colors flex items-center justify-center gap-2
                            opacity-0 group-hover:opacity-100">
              <button
                type="button"
                onClick={() => handleReplaceClick(i)}
                className="p-1.5 bg-white rounded-md text-gray-700 hover:bg-gray-100 transition"
                title="Replace"
              >
                <FiUpload size={11} />
              </button>
              <button
                type="button"
                onClick={() => handleDelete(i)}
                className="p-1.5 bg-red-500 rounded-md text-white hover:bg-red-600 transition"
                title="Delete"
              >
                <FiX size={11} />
              </button>
            </div>
          )}
        </div>
      ))}
    </div>
  )

  // ── Hide upload UI when single + already has an image (replace via hover) ──
  const canAddMore = isMulti || urls.length === 0

  return (
    <div className="space-y-3">
      {urls.length > 0 && thumbnails}

      {!disabled && canAddMore && (
        <>
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="w-full px-4 py-5 border-2 border-dashed border-gray-200 rounded-lg
                       hover:border-[var(--color-primary)] hover:bg-gray-50 transition
                       flex flex-col items-center gap-2 cursor-pointer
                       disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <div className="w-8 h-8 rounded-full bg-[var(--color-primary)]/10
                            flex items-center justify-center">
              {urls.length === 0 ? (
                <FiImage size={14} className="text-[var(--color-primary)]" />
              ) : (
                <FiPlus size={14} className="text-[var(--color-primary)]" />
              )}
            </div>
            <p className="text-xs font-medium text-gray-700">
              {uploading
                ? 'Uploading…'
                : isMulti
                  ? (urls.length === 0 ? 'Upload images' : 'Add more images')
                  : 'Upload image'}
            </p>
            <p className="text-[10px] text-gray-400">
              PNG, JPG, WebP up to 10MB
            </p>
          </button>

          {/* OR paste URL */}
          <div className="flex items-center gap-2">
            <div className="flex-1 h-px bg-gray-200" />
            <span className="text-[10px] text-gray-400 uppercase tracking-wider">
              or paste URL
            </span>
            <div className="flex-1 h-px bg-gray-200" />
          </div>

          <div className="flex gap-2">
            <input
              type="url"
              value={urlInput}
              onChange={(e) => setUrlInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault()
                  handleUrlAdd()
                }
              }}
              placeholder="https://…"
              disabled={uploading}
              className="flex-1 px-3 py-2 text-sm border border-gray-200 rounded-lg
                         focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]
                         disabled:opacity-50"
            />
            <button
              type="button"
              onClick={handleUrlAdd}
              disabled={uploading || !urlInput.trim()}
              className="px-3 py-2 text-sm bg-gray-100 hover:bg-gray-200 rounded-lg
                         transition disabled:opacity-50"
            >
              Add
            </button>
          </div>
        </>
      )}

      {/* Hidden file input — shared between "add new" and "replace" paths */}
      <input
        ref={fileInputRef}
        type="file"
        multiple={isMulti}
        accept="image/*"
        className="hidden"
        onChange={(e) => handleFileSelect(e.target.files)}
        disabled={uploading}
      />

      {uploadError && (
        <p className="text-xs text-red-500">{uploadError}</p>
      )}

      {isMulti && urls.length > 1 && (
        <p className="text-[11px] text-gray-400">
          Drag thumbnails to reorder. First image is the primary.
        </p>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export default function FieldRenderer({
  column, value, onChange, dynamicOptions = [], disabled = false,
}: FieldRendererProps) {
  const [showPassword, setShowPassword] = useState(false)

  const uiType = column.ui_type ?? 'textfield'
  const label  = column.name

  const selectOptions: SelectOption[] = column.options_mode === 'dynamic'
    ? dynamicOptions
    : (column.options ?? []).map((o) => ({ label: o, value: o }))

  const baseInput = `w-full px-3 py-2 text-sm border border-gray-200 rounded-lg
    focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]
    bg-white text-[var(--color-text)]
    disabled:opacity-50 disabled:cursor-not-allowed`

  // Hidden — never render
  if (uiType === 'hidden' || column.hidden) return null

  // Toggle / checkbox
  if (uiType === 'toggle' || uiType === 'checkbox') {
    return (
      <div className="flex items-center gap-3">
        <button
          type="button"
          disabled={disabled}
          onClick={() => onChange(!asBoolean(value))}
          className={`relative w-10 h-6 rounded-full transition-colors
                      disabled:opacity-50 disabled:cursor-not-allowed ${
            asBoolean(value) ? 'bg-[var(--color-primary)]' : 'bg-gray-200'
          }`}
        >
          <span
            className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${
              asBoolean(value) ? 'translate-x-4' : 'translate-x-0'
            }`}
          />
        </button>
        <span className="text-sm text-[var(--color-text)]">{asBoolean(value) ? 'Yes' : 'No'}</span>
      </div>
    )
  }

  if (uiType === 'radio-yes-no') {
    return (
      <div className="flex gap-4">
        {['Yes', 'No'].map((opt) => (
          <label key={opt} className="flex items-center gap-2 cursor-pointer">
            <input
              type="radio"
              disabled={disabled}
              checked={asBoolean(value) === (opt === 'Yes')}
              onChange={() => onChange(opt === 'Yes')}
              className="text-[var(--color-primary)] focus:ring-[var(--color-primary)]"
            />
            <span className="text-sm text-[var(--color-text)]">{opt}</span>
          </label>
        ))}
      </div>
    )
  }

  if (uiType === 'select' || uiType === 'radio') {
    return (
      <select
        value={asString(value)}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
        className={baseInput}
      >
        <option value="">Select…</option>
        {selectOptions.map((opt) => (
          <option key={opt.value} value={opt.value}>{opt.label}</option>
        ))}
      </select>
    )
  }

  if (uiType === 'multi-select' || uiType === 'checklist') {
    return (
      <MultiSelectCheckboxes
        options={selectOptions}
        value={asArray(value)}
        onChange={onChange}
        disabled={disabled}
      />
    )
  }

  if (uiType === 'tags-input' || uiType === 'list') {
    return <TagsInput value={asArray(value)} onChange={onChange} disabled={disabled} />
  }

  if (uiType === 'number-input' || uiType === 'stepper') {
    return (
      <input
        type="number"
        value={asString(value)}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value === '' ? null : Number(e.target.value))}
        className={baseInput}
      />
    )
  }

  if (uiType === 'currency-input') {
    return (
      <div className="relative">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-gray-400">R</span>
        <input
          type="number"
          step="0.01"
          value={asString(value)}
          disabled={disabled}
          onChange={(e) => onChange(e.target.value === '' ? null : Number(e.target.value))}
          className={`${baseInput} pl-7`}
        />
      </div>
    )
  }

  if (uiType === 'slider') {
    return (
      <div className="space-y-1">
        <input
          type="range"
          min={0}
          max={100}
          value={asString(value) || '0'}
          disabled={disabled}
          onChange={(e) => onChange(Number(e.target.value))}
          className="w-full accent-[var(--color-primary)] disabled:opacity-50"
        />
        <p className="text-xs text-gray-400 text-right">{asString(value) || '0'}</p>
      </div>
    )
  }

  if (uiType === 'rating') {
    return (
      <StarRating
        value={Number(asString(value)) || 0}
        onChange={onChange}
        disabled={disabled}
      />
    )
  }

  if (uiType === 'datetime-picker') {
    return (
      <input
        type="datetime-local"
        value={formatDatetimeLocal(value)}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value ? new Date(e.target.value).toISOString() : null)}
        className={baseInput}
      />
    )
  }

  if (uiType === 'date-picker') {
    return (
      <input
        type="date"
        value={formatDate(value)}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value || null)}
        className={baseInput}
      />
    )
  }

  if (uiType === 'time-picker') {
    return (
      <input
        type="time"
        value={asString(value)}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value || null)}
        className={baseInput}
      />
    )
  }

  // ── IMAGE FIELDS — delegated to ImageField component ─────────────────
  if (uiType === 'image-upload' || uiType === 'image-url' || uiType === 'media-picker') {
    return (
      <ImageField
        column={column}
        value={value}
        onChange={onChange}
        disabled={disabled}
      />
    )
  }

  if (
    uiType === 'code-editor'      ||
    uiType === 'json-viewer'      ||
    uiType === 'key-value-editor' ||
    uiType === 'markdown-editor'
  ) {
    const raw = typeof value === 'object' ? JSON.stringify(value, null, 2) : asString(value)
    return (
      <textarea
        value={raw}
        disabled={disabled}
        rows={8}
        onChange={(e) => {
          try { onChange(JSON.parse(e.target.value)) }
          catch { onChange(e.target.value) }
        }}
        className={`${baseInput} font-mono text-xs resize-y`}
        placeholder={uiType === 'json-viewer' ? '{}' : ''}
      />
    )
  }

  if (uiType === 'rich-text') {
    return (
      <div className="space-y-1">
        <textarea
          value={asString(value)}
          disabled={disabled}
          rows={6}
          onChange={(e) => onChange(e.target.value)}
          className={`${baseInput} resize-y`}
          placeholder="Enter rich text content…"
        />
        <p className="text-[11px] text-gray-400">
          Full rich text editor available on the hosted plan
        </p>
      </div>
    )
  }

  if (uiType === 'textarea') {
    return (
      <textarea
        value={asString(value)}
        disabled={disabled}
        rows={4}
        onChange={(e) => onChange(e.target.value)}
        className={`${baseInput} resize-y`}
      />
    )
  }

  if (uiType === 'slug-input') {
    return (
      <input
        type="text"
        value={asString(value)}
        disabled={disabled}
        onChange={(e) => {
          const slug = e.target.value.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-/]/g, '')
          onChange(slug)
        }}
        className={`${baseInput} font-mono`}
        placeholder="/my-slug"
      />
    )
  }

  if (uiType === 'password-input') {
    return (
      <div className="relative">
        <input
          type={showPassword ? 'text' : 'password'}
          value={asString(value)}
          disabled={disabled}
          onChange={(e) => onChange(e.target.value)}
          className={`${baseInput} pr-10`}
        />
        <button
          type="button"
          onClick={() => setShowPassword((p) => !p)}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
        >
          {showPassword ? <FiEyeOff size={14} /> : <FiEye size={14} />}
        </button>
      </div>
    )
  }

  if (uiType === 'color-picker') {
    return (
      <div className="flex items-center gap-3">
        <input
          type="color"
          value={asString(value) || '#000000'}
          disabled={disabled}
          onChange={(e) => onChange(e.target.value)}
          className="w-10 h-10 rounded-lg border border-gray-200 cursor-pointer p-0.5
                     disabled:opacity-50 disabled:cursor-not-allowed"
        />
        <input
          type="text"
          value={asString(value)}
          disabled={disabled}
          onChange={(e) => onChange(e.target.value)}
          placeholder="#000000"
          className={`${baseInput} flex-1 font-mono`}
        />
      </div>
    )
  }

  if (uiType === 'url-input') {
    return (
      <input
        type="url"
        value={asString(value)}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
        placeholder="https://"
        className={baseInput}
      />
    )
  }

  if (uiType === 'email-input') {
    return (
      <input
        type="email"
        value={asString(value)}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
        className={baseInput}
      />
    )
  }

  if (uiType === 'phone-input') {
    return (
      <input
        type="tel"
        value={asString(value)}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
        placeholder="+1 (555) 000-0000"
        className={baseInput}
      />
    )
  }

  if (uiType === 'autocomplete') {
    const listId = `autocomplete-${label}`
    return (
      <div>
        <input
          type="text"
          value={asString(value)}
          disabled={disabled}
          list={listId}
          onChange={(e) => onChange(e.target.value)}
          className={baseInput}
        />
        <datalist id={listId}>
          {selectOptions.map((opt) => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </datalist>
      </div>
    )
  }

  // textfield (default)
  return (
    <input
      type="text"
      value={asString(value)}
      disabled={disabled}
      onChange={(e) => onChange(e.target.value)}
      className={baseInput}
      placeholder={`Enter ${label}…`}
    />
  )
}