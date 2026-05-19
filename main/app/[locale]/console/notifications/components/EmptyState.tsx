'use client'

/**
 * @file EmptyState.tsx
 * @description
 * A simple, reusable empty state component used across the Inbox when there
 * are no conversations to display. It shows a centred icon, a primary message,
 * and a secondary sub-message to help the user understand why the list is empty.
 *
 * ─── When is this used? ───────────────────────────────────────────────────────
 * Currently used by ConversationList when the conversations array is empty.
 * The parent controls both text strings so the same component can communicate
 * different empty states:
 *   - "No messages / Your inbox is empty."   (all-messages filter)
 *   - "No messages / All caught up!"         (unread-only filter)
 *
 * ─── Design note ─────────────────────────────────────────────────────────────
 * The component is intentionally generic — it receives pre-translated strings
 * from its parent rather than doing its own translation. This keeps it flexible
 * and reusable across different sections of the app without coupling it to a
 * specific translation namespace.
 */

import { FiBell } from 'react-icons/fi'

// ─── Props ────────────────────────────────────────────────────────────────────

/**
 * @interface Props
 *
 * @prop {string} message - The primary message displayed beneath the icon.
 *                          Should be short and descriptive (e.g. "No messages").
 *                          The parent is responsible for translating this string
 *                          before passing it in.
 * @prop {string} sub     - A secondary, softer message shown below the primary one.
 *                          Provides additional context or a friendly nudge
 *                          (e.g. "Your inbox is empty." or "All caught up!").
 *                          The parent is responsible for translating this string.
 */
interface Props {
  message: string
  sub:     string
}

// ─── Component ────────────────────────────────────────────────────────────────

/**
 * @component EmptyState
 * @description
 * Renders a vertically centred empty state with a bell icon, a primary message,
 * and a sub-message. All text content is passed in as props — this component
 * renders no hardcoded user-facing strings of its own.
 *
 * @param {Props} props - See interface above.
 * @returns {JSX.Element}
 */
export default function EmptyState({ message, sub }: Props) {
  return (
    <div className="flex flex-col items-center justify-center py-16">

      {/* ── Icon container ──
          A soft grey circle housing the bell icon. The circle provides
          a subtle visual anchor without being visually heavy. */}
      <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mb-3">
        <FiBell size={24} className="text-gray-400" />
      </div>

      {/* ── Primary message ── e.g. "No messages" */}
      <p className="text-sm font-medium text-gray-600">{message}</p>

      {/* ── Sub-message ── e.g. "All caught up!" or "Your inbox is empty." */}
      <p className="text-xs text-gray-400 mt-1">{sub}</p>

    </div>
  )
}