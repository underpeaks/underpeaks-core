/**
 * SaveButton Component
 *
 * A reusable save button used at the bottom of settings forms throughout
 * the CMS. It handles three visual states in one place so every settings
 * page has a consistent save experience without duplicating code.
 *
 * The three states:
 * 1. IDLE    — Shows "Save Changes". The button is clickable.
 * 2. SAVING  — Shows a spinner + "Saving…". The button is disabled to
 *              prevent the user from submitting the form twice.
 * 3. SAVED   — Shows a green "✓ Saved successfully" confirmation message
 *              to the left of the button. The parent typically resets this
 *              back to false after a few seconds using setTimeout.
 *
 * Translation note:
 * - All strings are translated via useTranslations inside this component,
 *   so no translation work is needed in the parent when using SaveButton.
 *
 * Usage example:
 * ```tsx
 * <SaveButton
 *   onClick={handleSave}
 *   saving={saving}
 *   saved={saved}
 * />
 * ```
 */

'use client'

import { useTranslations } from 'next-intl'

/**
 * Props for the SaveButton component.
 *
 * @property onClick - Optional callback fired when the button is clicked.
 *                     The parent is responsible for making the API call.
 * @property saving  - When true, the button shows a spinner and is disabled
 *                     to prevent duplicate submissions.
 * @property saved   - When true, a green success confirmation message is
 *                     shown to the left of the button.
 */
export function SaveButton({
  onClick,
  saving,
  saved,
}: {
  onClick?: () => void
  saving?:  boolean
  saved?:   boolean
}) {
  /**
   * t — Translation function scoped to the 'saveButton' namespace.
   * Use t('key') to get the translated string for that key.
   */
  const t = useTranslations('saveButton')

  return (
    /*
     * Outer wrapper
     * Right-aligns the success message and button side by side.
     * Small top padding separates it from the form fields above.
     */
    <div className="flex items-center justify-end gap-3 pt-2">

      {/*
       * Success confirmation message
       * Only rendered when `saved` is true.
       * The parent typically sets this back to false after ~3 seconds
       * using setTimeout so the message disappears automatically.
       */}
      {saved && (
        <p className="text-xs text-green-600 flex items-center gap-1.5">
          ✓ {t('savedMessage')}
        </p>
      )}

      {/*
       * Save button
       * Disabled while `saving` is true to prevent duplicate submissions.
       * Shows a spinner to the left of the label while saving.
       */}
      <button
        onClick={onClick}
        disabled={saving}
        className="flex items-center gap-2 px-5 py-2 bg-gray-900 text-white text-sm font-medium rounded-md hover:bg-gray-700 disabled:opacity-50 transition"
      >
        {/* Spinner — only shown while the save request is in progress */}
        {saving && (
          <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
        )}

        {/* Label — switches between idle and saving states */}
        {saving ? t('buttonSaving') : t('buttonIdle')}
      </button>

    </div>
  )
}