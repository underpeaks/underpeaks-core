/**
 * MessageBubble.tsx
 * ------------------
 * Renders a single message inside a conversation thread.
 *
 * What does this component do?
 * -----------------------------
 * This component displays:
 *  1. The message content (text)
 *  2. A timestamp (e.g. "5m ago", "2h ago")
 *  3. Different styling depending on who sent the message
 *
 * Message alignment:
 * -------------------
 * - Messages sent by the current user appear on the RIGHT
 * - Messages from other users appear on the LEFT
 *
 * This is determined by comparing:
 *   message.sender_id === currentUserId
 *
 * Visual differences:
 * --------------------
 * Current user's message:
 *   - Dark background
 *   - White text
 *   - Right aligned
 *
 * Other user's message:
 *   - White background
 *   - Gray border
 *   - Left aligned
 *
 * Time formatting:
 * -----------------
 * The "timeAgo" function converts a timestamp into a human-readable format:
 *   - "just now"
 *   - "5m ago"
 *   - "2h ago"
 *   - "3d ago"
 *
 * ⚠️ Translation rules:
 *   - All time-related strings MUST be translated using next-intl
 *   - Avoid hardcoded English text like "just now", "ago", etc.
 *
 * ⚠️ Security:
 *   - This component does NOT log any data
 *   - No sensitive information is exposed
 */

'use client'

import { useTranslations } from 'next-intl'

// ─────────────────────────────────────────────────────────────────
// TYPE DEFINITIONS
// ─────────────────────────────────────────────────────────────────

/**
 * Message
 * --------
 * Represents a single message in a conversation.
 */
interface Message {
  mes_id:     string  // Unique message ID
  sender_id:  string  // ID of the sender
  content:    string  // Message text content
  sent_at:    string  // ISO timestamp string
  is_read:    boolean // Whether the message has been read
}

/**
 * Props
 * ------
 * Inputs required by the MessageBubble component.
 */
interface Props {
  message:       Message
  currentUserId: string
}

// ─────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────

/**
 * timeAgo
 * --------
 * Converts a timestamp into a human-readable relative time string.
 *
 * @param dateStr - ISO date string
 * @param t       - Translation function from next-intl
 *
 * Examples:
 *   "just now"
 *   "5m ago"
 *   "2h ago"
 *   "3d ago"
 */
function timeAgo(dateStr: string, t: (key: string, values?: any) => string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)

  if (mins < 1) {
    return t('justNow')
  }

  if (mins < 60) {
    return t('minutesAgo', { count: mins })
  }

  const hrs = Math.floor(mins / 60)

  if (hrs < 24) {
    return t('hoursAgo', { count: hrs })
  }

  const days = Math.floor(hrs / 24)
  return t('daysAgo', { count: days })
}

// ─────────────────────────────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────────────────────────────

/**
 * MessageBubble
 * --------------
 * Displays a single message bubble in the conversation thread.
 *
 * @param message       - The message object to display
 * @param currentUserId - Used to determine alignment (left/right)
 */
export default function MessageBubble({ message, currentUserId }: Props) {
  // Translation hook scoped to this component
  const t = useTranslations('messageBubble')

  // Determine if the message belongs to the current user
  const isMine = message.sender_id === currentUserId

  return (
    <div className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}>

      {/* ── Message Bubble ── */}
      <div
        className={`max-w-[70%] rounded-2xl px-4 py-2.5 ${
          isMine
            ? 'bg-gray-900 text-white rounded-br-sm'
            : 'bg-white border border-gray-200 text-gray-800 rounded-bl-sm'
        }`}
      >
        {/* Message content */}
        <p className="text-sm leading-relaxed">
          {message.content}
        </p>

        {/* Timestamp */}
        <p className="text-[10px] mt-1 text-gray-400">
          {timeAgo(message.sent_at, t)}
        </p>
      </div>

    </div>
  )
}