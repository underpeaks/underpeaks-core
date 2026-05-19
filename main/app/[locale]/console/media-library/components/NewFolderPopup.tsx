'use client'

/**
 * @file NewFolderPopup.tsx
 * @description
 * A compact inline form that appears inside the FolderSidebar when the user
 * clicks the "+" (new folder) button. It lets the user type a folder name
 * and either confirm or cancel the creation.
 *
 * ─── How does it work? ───────────────────────────────────────────────────────
 *
 * 1. When the popup mounts, the text input is automatically focused so the
 *    user can start typing immediately without clicking the input first.
 *
 * 2. The user types a folder name into the input field.
 *
 * 3. They can confirm creation in three ways:
 *      - Click the "Create" button.
 *      - Press the Enter key while the input is focused.
 *
 * 4. They can cancel in two ways:
 *      - Click the "Cancel" button.
 *      - Press the Escape key while the input is focused.
 *
 * 5. The "Create" button is disabled when the input is empty or contains
 *    only whitespace, preventing blank folder names.
 *
 * 6. On confirm, the name is trimmed of leading/trailing whitespace before
 *    being passed to the parent via onConfirm(). The local input is then
 *    reset to empty so the form is clean if reopened.
 *
 * ─── Design note ─────────────────────────────────────────────────────────────
 * This component holds only the input value as local state. It does NOT
 * create the folder itself — that responsibility belongs to the parent
 * (FolderSidebar → MediaPage) via the onConfirm callback.
 */

import { useState, useRef, useEffect } from 'react'
import { useTranslations } from 'next-intl'

// ─── Props ────────────────────────────────────────────────────────────────────

/**
 * @interface NewFolderPopupProps
 *
 * @prop {Function} onConfirm - Called with the trimmed folder name string when
 *                              the user confirms creation (button click or Enter).
 *                              The parent is responsible for the actual API call.
 * @prop {Function} onCancel  - Called with no arguments when the user cancels
 *                              (button click or Escape key). The parent should
 *                              hide this popup in response.
 */
interface NewFolderPopupProps {
  onConfirm: (name: string) => void
  onCancel:  () => void
}

// ─── Component ────────────────────────────────────────────────────────────────

/**
 * @component NewFolderPopup
 * @description
 * Renders a small card-style inline form with a text input and two action
 * buttons (Create / Cancel). Auto-focuses the input on mount.
 *
 * All user-facing strings are loaded from the "newFolderPopup" namespace in en.json.
 *
 * @param {NewFolderPopupProps} props - See interface above.
 * @returns {JSX.Element}
 */
export default function NewFolderPopup({ onConfirm, onCancel }: NewFolderPopupProps) {

  /**
   * t() is the translation function from next-intl.
   * All keys for this component live under the "newFolderPopup" namespace in en.json.
   */
  const t = useTranslations('newFolderPopup')

  // ─── State & Refs ───────────────────────────────────────────────────────────

  /**
   * `value` — the current text inside the folder name input field.
   * Starts empty and is reset to empty after a successful creation.
   */
  const [value, setValue] = useState('')

  /**
   * `inputRef` — a direct reference to the <input> DOM element.
   * Used by the useEffect below to programmatically focus the input on mount.
   */
  const inputRef = useRef<HTMLInputElement>(null)

  // ─── Auto-focus on mount ────────────────────────────────────────────────────

  /**
   * Automatically focuses the text input when the popup first appears.
   * The empty dependency array [] means this runs once after the first render.
   * The optional chaining (?.) guards against the rare case where the ref
   * is not yet attached when the effect runs.
   */
  useEffect(() => { inputRef.current?.focus() }, [])

  // ─── Handlers ───────────────────────────────────────────────────────────────

  /**
   * @function submit
   * Validates and submits the folder name.
   *
   * Steps:
   *   1. Trim whitespace from the current input value.
   *   2. If the result is empty, do nothing (the button is also disabled for this case).
   *   3. Call onConfirm() with the trimmed name so the parent can create the folder.
   *   4. Reset the local input value to empty for a clean state if reopened.
   */
  const submit = () => {
    const trimmed = value.trim()
    if (trimmed) { onConfirm(trimmed); setValue('') }
  }

  // ─── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="mx-3 mb-2 p-3 bg-gray-50 border border-gray-200 rounded-lg flex flex-col gap-2 shadow-sm">

      {/* Title label */}
      <p className="text-xs font-semibold text-gray-700">{t('title')}</p>

      {/* ── Folder name input ──
          - Enter key submits the form.
          - Escape key cancels and closes the popup.
          - The ref enables auto-focus on mount via useEffect above. */}
      <input
        ref={inputRef}
        type="text"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter')  submit()
          if (e.key === 'Escape') onCancel()
        }}
        placeholder={t('placeholder')}
        className="w-full px-2.5 py-1.5 text-sm border border-gray-200 rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-gray-300 transition"
      />

      {/* ── Action buttons ──
          Create is disabled when the input is blank or whitespace-only.
          Cancel always works regardless of input state. */}
      <div className="flex gap-2">
        <button
          onClick={submit}
          disabled={!value.trim()}
          className="flex-1 py-1.5 bg-gray-900 text-white text-xs font-medium rounded-md hover:bg-gray-700 disabled:opacity-40 disabled:cursor-not-allowed transition"
        >
          {t('buttons.create')}
        </button>
        <button
          onClick={onCancel}
          className="flex-1 py-1.5 bg-white border border-gray-200 text-gray-600 text-xs font-medium rounded-md hover:bg-gray-100 transition"
        >
          {t('buttons.cancel')}
        </button>
      </div>
    </div>
  )
}