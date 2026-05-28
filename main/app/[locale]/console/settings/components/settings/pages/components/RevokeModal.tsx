/**
 * RevokeModal Component
 *
 * A confirmation dialog that appears when the user clicks "Revoke" on an API key.
 * Its purpose is to prevent accidental deletion by asking the user to explicitly
 * confirm their intention before the key is permanently invalidated.
 *
 * What it does:
 * - Displays a warning icon and title to signal this is a destructive action.
 * - Shows the name of the key being revoked so the user can double-check
 *   they are revoking the correct key.
 * - Warns the user that any apps currently using this key will immediately
 *   lose access once it is revoked.
 * - Provides two buttons:
 *     • "Cancel"     — dismisses the modal without doing anything.
 *     • "Revoke Key" — confirms the action and triggers the revoke API call.
 * - While the revoke request is in progress, both buttons are disabled and
 *   the confirm button shows a spinner with a "Revoking…" label.
 *
 * This component is purely presentational — all logic and state live in the parent.
 */

'use client'

//import { useTranslations } from 'next-intl'
import { FiAlertTriangle } from 'react-icons/fi'

// ---------------------------------------------------------------------------
// Props Type
// ---------------------------------------------------------------------------

/**
 * Props for the RevokeModal component.
 *
 * @property keyName   - The display name of the API key being revoked.
 *                       Shown inside the confirmation message so the user
 *                       knows exactly which key will be deleted.
 * @property onConfirm - Callback fired when the user clicks "Revoke Key".
 *                       The parent is responsible for making the API call.
 * @property onCancel  - Callback fired when the user clicks "Cancel" or
 *                       otherwise dismisses the modal without confirming.
 * @property revoking  - Whether the revoke API request is currently in progress.
 *                       When true, both buttons are disabled and the confirm
 *                       button shows a spinner.
 */
interface Props {
  keyName:   string
  onConfirm: () => void
  onCancel:  () => void
  revoking:  boolean
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

/**
 * RevokeModal
 *
 * Renders a destructive-action confirmation modal with:
 * 1. A header with a red warning icon and a "Revoke API Key" title.
 * 2. A confirmation message that includes the key name and a warning
 *    about immediate access loss for any apps using the key.
 * 3. Two action buttons side by side:
 *    - "Cancel"     → calls onCancel, disabled while revoking.
 *    - "Revoke Key" → calls onConfirm, shows spinner while revoking.
 *
 * @param keyName   - Name of the key to be revoked, shown in the message.
 * @param onConfirm - Handler for the confirm/revoke button.
 * @param onCancel  - Handler for the cancel button.
 * @param revoking  - Whether the revoke request is currently in progress.
 */
export default function RevokeModal({ keyName, onConfirm, onCancel, revoking }: Props) {
  /**
   * t — Translation function scoped to the 'revokeModal' namespace.
   * Use t('key') to retrieve the translated string for that key.
   */
  //const t = useTranslations('revokeModal')

  return (
    /*
     * Full-screen overlay
     * Covers the entire viewport with a dark blurred background so the
     * user is focused on the confirmation modal.
     */
    <div className="fixed inset-0 z-[9999] bg-black/40 backdrop-blur-sm flex items-center justify-center">

      {/* Modal card — centred, max width 24rem */}
      <div className="bg-white rounded-xl shadow-2xl p-6 max-w-sm w-full mx-4">

        {/* --------------------------------------------------------------
          * Modal Header
          * Red warning icon on the left, title on the right.
          * The red colour scheme signals this is a destructive action.
          * -------------------------------------------------------------- */}
        <div className="flex items-center gap-3 mb-4">

          {/* Red warning triangle icon in a circle */}
          <div className="w-8 h-8 rounded-full bg-red-100 flex items-center justify-center shrink-0">
            <FiAlertTriangle size={15} className="text-red-600" />
          </div>

          {/* Modal title */}
          <h3 className="text-sm font-semibold text-gray-900">
            {('title')}
          </h3>
        </div>

        {/* --------------------------------------------------------------
          * Confirmation Message
          * Tells the user which key will be revoked and warns them about
          * the consequences. The key name is bolded for easy identification.
          * `keyName` is passed as a rich-text variable so it can be styled.
          * -------------------------------------------------------------- */}
        <p className="text-sm text-gray-500 mb-5">
          <>
  API key{' '}
  <span className="font-medium text-gray-800">
    {keyName}
  </span>{' '}
  was created successfully.
</>
        </p>

        {/* --------------------------------------------------------------
          * Action Buttons
          * Side by side: Cancel (left) and Revoke Key (right).
          * Both are disabled while the revoke request is in progress.
          * -------------------------------------------------------------- */}
        <div className="flex gap-3">

          {/* Cancel button — neutral style, dismisses without action */}
          <button
            onClick={onCancel}
            disabled={revoking}
            className="flex-1 py-2 border border-gray-200 text-xs font-medium rounded-lg hover:bg-gray-50 disabled:opacity-50 transition"
          >
            {('cancelButton')}
          </button>

          {/* Confirm/Revoke button — red style, triggers the revoke action */}
          <button
            onClick={onConfirm}
            disabled={revoking}
            className="flex-1 flex items-center justify-center gap-2 py-2 bg-red-600 text-white text-xs font-medium rounded-lg hover:bg-red-700 disabled:opacity-50 transition"
          >
            {/* Spinner — only shown while the revoke request is in progress */}
            {revoking && (
              <span className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            )}

            {/* Label — switches between idle and in-progress states */}
            {revoking ? ('revokeButtonRevoking') : ('revokeButtonIdle')}
          </button>
        </div>

      </div>
    </div>
  )
}