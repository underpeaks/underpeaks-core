/**
 * ConversationThread.tsx
 * -----------------------
 * Renders the right-hand panel of the Messages screen — the full message thread
 * for the currently selected conversation.
 *
 * What does this component show?
 * --------------------------------
 *  1. A header with the conversation subject, the sender (or "System message"),
 *     and a Delete button to remove the conversation
 *  2. A scrollable list of message bubbles for the thread
 *  3. A reply bar at the bottom for composing and sending new messages
 *     (disabled for system messages, which are read-only)
 *
 * What is a "system message"?
 * ----------------------------
 * Some conversations are created by the system itself (e.g. welcome messages,
 * notifications from Underpeaks). These are marked with is_system: true.
 * System conversations are read-only — the reply bar is shown but disabled.
 *
 * How does message loading work?
 * --------------------------------
 * When the component mounts (or when a different conversation is selected),
 * it fetches the full message thread from the API using the conversation ID.
 * While loading, a spinner is shown. If no messages exist, an empty state is shown.
 *
 * Auto-scroll behaviour:
 * -----------------------
 * Every time the messages list updates (new message sent or received),
 * the view automatically scrolls to the bottom so the latest message is visible.
 * This is done using a ref attached to an invisible div at the bottom of the list.
 *
 * ⚠️  Security rules for this component:
 *   - Never log the auth token read from localStorage
 *   - The token is only read inside async functions (never at render/module level)
 *     to avoid SSR errors (localStorage is not available on the server)
 */

'use client'

import { useState, useEffect, useRef } from 'react'
import { useTranslations }              from 'next-intl'
import { FiTrash2 }                     from 'react-icons/fi'
import MessageBubble                    from './MessageBubble'
import ReplyBar                         from './ReplyBar'
import EmptyState                       from './EmptyState'

// ─────────────────────────────────────────────────────────────────
// TYPE DEFINITIONS
// ─────────────────────────────────────────────────────────────────

/**
 * Conversation
 * -------------
 * Represents the conversation whose thread is being displayed.
 *
 * @prop id                   - Primary ID for the conversation (used as fallback)
 * @prop con_id               - Alternative conversation ID used by some DB adapters.
 *                              We use con_id when present, falling back to id.
 * @prop subject              - The subject/title of the conversation thread
 * @prop last_message_preview - A short preview of the most recent message (not used in this component)
 * @prop is_system            - True if this is a system-generated conversation (read-only)
 * @prop created_by           - The display name or ID of the person who started the conversation
 * @prop unread_count         - Number of unread messages (not used in this component directly)
 */
interface Conversation {
  id:                    string
  con_id?:               string
  subject:               string
  last_message_preview?: string
  is_system:             boolean
  created_by:            string
  unread_count:          number
}

/**
 * Message
 * --------
 * Represents a single message within the conversation thread.
 *
 * @prop mes_id    - Unique identifier for the message (used as React key)
 * @prop sender_id - The user ID of the person who sent the message.
 *                   Compared against currentUserId to determine bubble alignment
 *                   (right = current user, left = other person).
 * @prop content   - The text content of the message
 * @prop sent_at   - ISO timestamp string of when the message was sent
 * @prop is_read   - Whether the message has been read by the recipient
 */
interface Message {
  mes_id:    string
  sender_id: string
  content:   string
  sent_at:   string
  is_read:   boolean
}

/**
 * Props
 * ------
 * The inputs this component requires from its parent (MessagesPage).
 *
 * @prop conversation  - The conversation object to display the thread for
 * @prop currentUserId - The logged-in user's ID, used to align message bubbles
 * @prop onDelete      - Callback called when the user clicks Delete.
 *                       Receives the conversation ID so the parent can remove it from the list.
 */
interface Props {
  conversation:  Conversation
  currentUserId: string
  onDelete:      (id: string) => void
}

// ─────────────────────────────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────────────────────────────

/**
 * ConversationThread
 * -------------------
 * Displays the full message thread for a single conversation.
 *
 * @param conversation  - The conversation to display
 * @param currentUserId - The current user's ID (for bubble alignment)
 * @param onDelete      - Callback to handle conversation deletion in the parent
 */
export default function ConversationThread({ conversation, currentUserId, onDelete }: Props) {
  // The list of messages in this thread, loaded from the API on mount
  const [messages, setMessages] = useState<Message[]>([])

  // Whether the initial message fetch is in progress (shows a spinner)
  const [loading, setLoading] = useState(true)

  // A ref to an invisible div at the bottom of the message list.
  // We call scrollIntoView() on it to auto-scroll to the latest message.
  const bottomRef = useRef<HTMLDivElement>(null)

  // Access translated strings for this component
  const t = useTranslations('conversationThread')

  // Resolve the conversation ID — some DB adapters use con_id, others use id.
  // We prefer con_id when available.
  const convId = conversation.con_id ?? conversation.id

  // ── Effect: Load messages when the conversation changes ──
  // Runs on mount and again whenever convId changes (i.e. the user selects
  // a different conversation from the list).
  useEffect(() => {
    const load = async () => {
      setLoading(true)
      try {
        // ⚠️ Token is read inside the async function — NOT at module/render level.
        // Reading localStorage at module level causes a ReferenceError during
        // server-side rendering because localStorage only exists in the browser.
        // Always read it inside useEffect or async functions.
        const token = localStorage.getItem('authToken') ?? ''

        const res  = await fetch(
          `/api/messages/thread?conversation_id=${convId}`,
          { headers: { 'Authorization': `Bearer ${token}` } }
        )
        const data = await res.json()

        // Use the messages array from the response, or an empty array if missing
        setMessages(data.messages ?? [])
      } finally {
        // Always stop the loading spinner, even if the fetch failed
        setLoading(false)
      }
    }
    load()
  }, [convId])

  // ── Effect: Auto-scroll to the latest message ──
  // Runs every time the messages array updates — both on initial load
  // and when a new message is sent or received.
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  /**
   * handleSend
   * -----------
   * Called by the ReplyBar when the user submits a new message.
   * Sends the message to the API and appends the returned message object
   * to the local messages list so it appears immediately without a full reload.
   *
   * @param content - The text content of the message to send
   *
   * ⚠️ Token is read here inside the async function for the same SSR reason as above.
   * ⚠️ The token value must never be logged.
   */
  const handleSend = async (content: string) => {
    const token = localStorage.getItem('authToken') ?? ''

    const res  = await fetch('/api/messages/send', {
      method:  'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type':  'application/json',
      },
      body: JSON.stringify({ conversation_id: convId, content }),
    })
    const data = await res.json()

    // If the server returned the new message object, append it to the thread.
    // This gives immediate feedback without waiting for a re-fetch.
    if (data.message) {
      setMessages((prev) => [...prev, data.message])
    }
  }

  // ─────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────
  return (
    <div className="flex-1 flex flex-col bg-white overflow-hidden">

      {/* ── Thread Header ── */}
      {/* Shows the conversation subject, sender info, and a delete button */}
      <div className="shrink-0 px-6 py-5 border-b border-gray-100">
        <div className="flex items-start justify-between gap-4">
          <div>
            {/* Conversation subject / title */}
            <h2 className="text-base font-semibold text-gray-900">
              {conversation.subject}
            </h2>

            {/* Sender label — shows "System message" for system conversations */}
            <p className="text-xs text-gray-400 mt-0.5">
              {conversation.is_system
                ? t('systemMessage')
                : t('from', { name: conversation.created_by })
              }
            </p>
          </div>

          {/* Delete button — removes this conversation via the parent callback */}
          <button
            onClick={() => onDelete(convId)}
            className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-red-600 bg-red-50 rounded-md hover:bg-red-100 transition shrink-0"
            aria-label={t('deleteAriaLabel', { subject: conversation.subject })}
          >
            <FiTrash2 size={13} aria-hidden="true" />
            {t('deleteButton')}
          </button>
        </div>
      </div>

      {/* ── Message List ── */}
      {/* Scrollable area containing all message bubbles for this thread */}
      <div
        className="flex-1 overflow-y-auto px-6 py-5 flex flex-col gap-3"
        aria-label={t('messagesAriaLabel')}
        aria-live="polite"
      >
        {loading ? (
          /* Loading spinner — shown while the initial fetch is in progress */
          <div className="flex items-center justify-center h-full">
            <span
              className="w-5 h-5 border-2 border-gray-300 border-t-gray-700 rounded-full animate-spin"
              role="status"
              aria-label={t('loading')}
            />
          </div>

        ) : messages.length === 0 ? (
          /* Empty state — shown when the thread has no messages yet */
          <EmptyState
            type="thread"
            message={t('emptyTitle')}
            sub={t('emptySub')}
          />

        ) : (
          /* Message bubbles — one per message in the thread */
          messages.map((m) => (
            <MessageBubble
              key={m.mes_id}
              message={m}
              currentUserId={currentUserId}
            />
          ))
        )}

        {/* Invisible anchor div at the bottom — scrolled into view on new messages */}
        <div ref={bottomRef} aria-hidden="true" />
      </div>

      {/* ── Reply Bar ── */}
      {/* Input area for composing and sending new messages.
          Disabled for system conversations (is_system: true) — those are read-only. */}
      <ReplyBar
        onSend={handleSend}
        disabled={conversation.is_system}
      />

    </div>
  )
}