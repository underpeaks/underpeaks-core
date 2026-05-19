/**
 * EmptyState.tsx
 * ----------------
 * A reusable UI component used to display an "empty state" message.
 *
 * What is an "empty state"?
 * --------------------------
 * An empty state is shown when there is no data to display.
 * For example:
 *  - No messages in an inbox
 *  - No messages in a conversation thread
 *
 * This component provides a consistent visual layout for those cases,
 * including:
 *  1. An icon (changes depending on the context)
 *  2. A main message (e.g. "No messages yet")
 *  3. A smaller sub-message (e.g. "Send your first message")
 *
 * Why is this component useful?
 * ------------------------------
 * Instead of repeating the same layout across multiple pages,
 * we centralize it here so it can be reused anywhere in the app.
 *
 * Props explained:
 * -----------------
 * @prop type    - Determines which icon to show:
 *                 - 'inbox'  → shows an inbox icon
 *                 - 'thread' → shows a mail/message icon
 *
 * @prop message - The main message displayed to the user
 *
 * @prop sub     - A smaller secondary message shown below the main message
 *
 * ⚠️ Translation rules:
 *   - This component does NOT contain hardcoded text
 *   - All text is passed in via props and should already be translated
 *     by the parent component using next-intl
 *
 * ⚠️ Security:
 *   - No sensitive data is handled or logged in this component
 *   - No console.log statements are needed here
 */

'use client'

import { FiMail, FiInbox } from 'react-icons/fi'

// ─────────────────────────────────────────────────────────────────
// TYPE DEFINITIONS
// ─────────────────────────────────────────────────────────────────

/**
 * Props
 * ------
 * Defines the inputs required by the EmptyState component.
 */
interface Props {
  type:    'inbox' | 'thread' // Determines which icon is displayed
  message: string             // Main message (already translated)
  sub:     string             // Sub message (already translated)
}

// ─────────────────────────────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────────────────────────────

/**
 * EmptyState
 * -----------
 * Displays a centered empty state with an icon and messages.
 *
 * @param type    - Controls which icon is shown
 * @param message - Main message text
 * @param sub     - Secondary message text
 */
export default function EmptyState({ type, message, sub }: Props) {
  return (
    <div className="flex flex-col items-center justify-center h-full py-16">

      {/* ── Icon Container ── */}
      {/* Displays a rounded background with the selected icon */}
      <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mb-3">
        {type === 'inbox'
          ? (
            // Inbox icon (used for empty inbox views)
            <FiInbox size={24} className="text-gray-400" />
          ) : (
            // Mail icon (used for empty conversation threads)
            <FiMail size={24} className="text-gray-400" />
          )
        }
      </div>

      {/* ── Main Message ── */}
      <p className="text-sm font-medium text-gray-600">
        {message}
      </p>

      {/* ── Sub Message ── */}
      <p className="text-xs text-gray-400 mt-1">
        {sub}
      </p>

    </div>
  )
}