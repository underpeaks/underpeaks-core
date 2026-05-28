/**
 * NewKeyModal Component
 *
 * A modal dialog that appears immediately after a new API key has been
 * successfully generated. It confirms to the user that their key is ready,
 * shows the key name and a masked preview of the key prefix, and tells them
 * how to reveal and copy the full key from the list.
 *
 * How it works:
 * - Rendered on top of all other content using a fixed full-screen overlay.
 * - The overlay has a semi-transparent dark background with a blur effect
 *   to keep the user focused on the modal.
 * - The user can dismiss it by clicking the "Done" button or the X icon
 *   in the top-right corner — both call the `onClose` callback.
 *
 * This component is purely presentational — it receives the new key result
 * and a close handler from the parent. It does not manage any API calls.
 */

'use client'

//import { useTranslations } from 'next-intl'
import { FiKey, FiX, FiCheck } from 'react-icons/fi'
import { NewKeyResult } from './types'

// ---------------------------------------------------------------------------
// Props Type
// ---------------------------------------------------------------------------

/**
 * Props for the NewKeyModal component.
 *
 * @property result  - The newly created API key's details (name and key prefix).
 *                     Comes from the API response after successful key generation.
 * @property onClose - Callback fired when the user closes the modal,
 *                     either via the X button or the "Done" button.
 */
interface Props {
  result:  NewKeyResult
  onClose: () => void
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

/**
 * NewKeyModal
 *
 * Renders a success modal with:
 * 1. A header with a key icon, a title, and an X close button.
 * 2. A success section showing:
 *    - A green checkmark icon to visually confirm success.
 *    - The name of the newly created key.
 *    - Instructions telling the user how to reveal and copy the full key.
 *    - A masked preview of the key (prefix + bullet characters).
 * 3. A full-width "Done" button at the bottom to dismiss the modal.
 *
 * @param result  - The new key's data (name and prefix) to display.
 * @param onClose - Handler to close/dismiss the modal.
 */
export default function NewKeyModal({ result, onClose }: Props) {
  /**
   * t — Translation function scoped to the 'newKeyModal' namespace.
   * Use t('key') to retrieve the translated string for that key.
   */
 // const t = useTranslations('newKeyModal')

  return (
    /*
     * Full-screen overlay
     * Sits on top of everything (z-[9999]) with a dark blurred background
     * to draw the user's attention to the modal content.
     */
    <div className="fixed inset-0 z-[9999] bg-black/40 backdrop-blur-sm flex items-center justify-center">

      {/* Modal card — centred, max width 28rem, with padding and rounded corners */}
      <div className="bg-white rounded-xl shadow-2xl p-6 max-w-md w-full mx-4">

        {/* ----------------------------------------------------------------
          * Modal Header
          * Left side: key icon + title
          * Right side: X button to close the modal
          * ---------------------------------------------------------------- */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">

            {/* Small green key icon in a circle */}
            <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center">
              <FiKey size={15} className="text-green-600" />
            </div>

            {/* Modal title */}
            <h3 className="text-sm font-semibold text-gray-900">
              {('title')}
            </h3>
          </div>

          {/* X (close) button in the top-right corner */}
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <FiX size={16} />
          </button>
        </div>

        {/* ----------------------------------------------------------------
          * Success Body
          * Large green checkmark, key name, instructions, and masked key.
          * ---------------------------------------------------------------- */}
        <div className="flex flex-col items-center gap-3 py-4">

          {/* Large green checkmark — visually confirms the key was created */}
          <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center">
            <FiCheck size={22} className="text-green-600" />
          </div>

          {/* The name the user gave to this key (e.g. "Flutter App — Production") */}
          <p className="text-sm font-semibold text-gray-900">{result.name}</p>

          {/*
           * Instructions paragraph
           * Tells the user their key is ready and explains how to reveal/copy it
           * from the keys list using the eye icon.
           * `eyeIcon` is a separately translated string so it can be styled inline.
           */}
          <p className="text-xs text-gray-500 text-center">
            <span className="font-medium text-gray-700">
  Click the eye icon to reveal your API key.
</span>
          </p>

          {/* Masked key preview — shows the prefix followed by bullet placeholders */}
          <p className="text-xs font-mono text-gray-400">
            {result.prefix}••••••••••••••••••••
          </p>
        </div>

        {/* ----------------------------------------------------------------
          * Done Button
          * Full-width button at the bottom to dismiss the modal.
          * ---------------------------------------------------------------- */}
        <button
          onClick={onClose}
          className="w-full py-2 bg-gray-900 text-white text-xs font-medium rounded-lg hover:bg-gray-700 transition mt-2"
        >
          {('doneButton')}
        </button>

      </div>
    </div>
  )
}