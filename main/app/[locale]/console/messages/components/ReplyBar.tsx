/**
 * ReplyBar.tsx
 * -------------
 * Displays the input field and send button used to compose and send messages
 * within a conversation thread.
 *
 * What does this component do?
 * -----------------------------
 * 1. Allows the user to type a message
 * 2. Sends the message when:
 *    - The send button is clicked
 *    - OR the user presses Enter (without Shift)
 * 3. Disables input when:
 *    - A message is currently being sent
 *    - OR the parent marks the conversation as disabled (e.g. system messages)
 *
 * UX behaviour:
 * --------------
 * - Pressing Enter sends the message
 * - Pressing Shift + Enter allows multiline input (prevents send)
 * - Input is cleared after a successful send
 * - Button is disabled when input is empty or sending is in progress
 *
 * Why track "sending" state?
 * ---------------------------
 * Prevents duplicate messages if the user clicks send multiple times quickly.
 *
 * ⚠️ Translation rules:
 *   - All user-facing text (e.g. placeholders, aria labels) must use next-intl
 *
 * ⚠️ Security:
 *   - No sensitive data is logged
 *   - No console.log statements are used
 */

'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { FiSend } from 'react-icons/fi'

// ─────────────────────────────────────────────────────────────────
// TYPE DEFINITIONS
// ─────────────────────────────────────────────────────────────────

/**
 * Props
 * ------
 * Inputs required by the ReplyBar component.
 */
interface Props {
  onSend:   (content: string) => Promise<void> // Function to send message
  disabled?: boolean                           // Disables input (e.g. system messages)
}

// ─────────────────────────────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────────────────────────────

/**
 * ReplyBar
 * ----------
 * Provides an input field and send button for composing messages.
 *
 * @param onSend   - Function triggered when sending a message
 * @param disabled - Whether the input should be disabled
 */
export default function ReplyBar({ onSend, disabled }: Props) {
  // Current message content typed by the user
  const [content, setContent] = useState('')

  // Whether a message is currently being sent
  const [sending, setSending] = useState(false)

  // Translation hook scoped to this component
  const t = useTranslations('replyBar')

  /**
   * handleSend
   * -----------
   * Sends the message if:
   *  - Content is not empty
   *  - A send operation is not already in progress
   */
  const handleSend = async () => {
    if (!content.trim() || sending) return

    setSending(true)

    try {
      await onSend(content.trim())

      // Clear input after successful send
      setContent('')
    } finally {
      // Always reset sending state (even if API fails)
      setSending(false)
    }
  }

  /**
   * handleKeyDown
   * ---------------
   * Handles keyboard input:
   *  - Enter (without Shift) → send message
   *  - Shift + Enter → allow newline
   */
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  return (
    <div className="shrink-0 px-6 py-4 border-t border-gray-100 bg-gray-50">

      <div className="flex items-center gap-3">

        {/* ── Message Input ── */}
        <input
          type="text"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={disabled || sending}
          placeholder={t('placeholder')}
          className="flex-1 px-4 py-2 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-gray-300 transition disabled:opacity-50"
        />

        {/* ── Send Button ── */}
        <button
          onClick={handleSend}
          disabled={!content.trim() || sending || disabled}
          aria-label={t('sendAriaLabel')}
          className="p-2.5 bg-gray-900 text-white rounded-lg hover:bg-gray-700 disabled:opacity-40 disabled:cursor-not-allowed transition"
        >
          <FiSend size={15} />
        </button>

      </div>
    </div>
  )
}