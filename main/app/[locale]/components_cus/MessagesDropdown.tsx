'use client'

/**
 * @file MessagesDropdown.tsx
 * @description
 * A dropdown component rendered in the top navigation bar that shows the user
 * a quick preview of their most recent conversations/messages.
 *
 * What does this component do?
 * -----------------------------
 * - Displays a mail icon button with a red unread count badge when there are
 *   unread messages.
 * - When clicked, opens a dropdown showing the 5 most recent conversations.
 * - Each conversation row shows: sender initials avatar, subject, message preview,
 *   time ago, and an unread badge if applicable.
 * - Clicking a conversation marks it as read (if unread) and navigates to it.
 * - A "View all messages" link at the bottom navigates to the full messages page.
 *
 * What data does it need?
 * ------------------------
 * The parent component is responsible for fetching conversations and passing
 * them in via props. This component is purely presentational + navigation —
 * it does not fetch any data itself.
 *
 * What is a "system" conversation?
 * ----------------------------------
 * Some conversations are flagged with `is_system: true`. These are automated
 * messages from the platform itself (e.g. order confirmations, system alerts).
 * Instead of showing user initials, system conversations display "SY" as
 * their avatar initials to visually distinguish them.
 */

import { FiMail } from 'react-icons/fi'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'

/**
 * @interface Conversation
 * @description
 * Represents a single conversation thread as returned by the API.
 *
 * @property {string} id                      - Primary identifier for the conversation.
 * @property {string} [con_id]                - Optional alternative ID (used when present, falls back to `id`).
 * @property {string} subject                 - The subject/title of the conversation thread.
 * @property {string} [last_message_preview]  - A short text preview of the most recent message.
 * @property {string} [last_message_at]       - ISO timestamp of the most recent message, used for "time ago" display.
 * @property {number} unread_count            - How many unread messages exist in this conversation.
 * @property {boolean} is_system              - Whether this is an automated system message (not from a real user).
 * @property {string} created_by              - The name of the user who started the conversation.
 */
interface Conversation {
  id:                   string
  con_id?:              string
  subject:              string
  last_message_preview?: string
  last_message_at?:     string
  unread_count:         number
  is_system:            boolean
  created_by:           string
}

/**
 * @interface Props
 * @description
 * The props accepted by the MessagesDropdown component.
 *
 * @property {Conversation[]} conversations
 *   The full list of conversations to display. Only the first 5 are shown
 *   in the dropdown — the rest are accessible via the "View all messages" link.
 *
 * @property {(conversation_id: string) => void} onMarkRead
 *   Callback fired when the user clicks an unread conversation.
 *   The parent should use this to update the unread count in its state/database.
 */
interface Props {
  conversations: Conversation[]
  onMarkRead:    (conversation_id: string) => void
}

// ─── Utility Functions ────────────────────────────────────────────────────────

/**
 * @function timeAgo
 * @description
 * Converts an ISO date string into a human-readable "time ago" string.
 * Used to show how long ago the last message in a conversation was sent.
 *
 * Examples:
 *   - Less than 1 minute ago → "just now"
 *   - 45 minutes ago         → "45m ago"
 *   - 3 hours ago            → "3h ago"
 *   - 2 days ago             → "2d ago"
 *
 * Returns an empty string if no date is provided, so the UI
 * renders nothing rather than showing "undefined" or crashing.
 *
 * @param {string} [dateStr] - An ISO 8601 date string (e.g. "2024-01-15T10:30:00Z").
 * @returns {string} A short human-readable relative time string.
 */
function timeAgo(dateStr?: string): string {
  if (!dateStr) return ''
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1)  return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24)  return `${hrs}h ago`
  return `${Math.floor(hrs / 24)}d ago`
}

/**
 * @function getInitials
 * @description
 * Extracts up to 2 initials from a full name string.
 * Used to generate the avatar letters shown in each conversation row.
 *
 * Examples:
 *   - "John Doe"      → "JD"
 *   - "Alice"         → "AL" (wait, just first 2 of first word? No — "A")
 *   - "Mary Jane Watson" → "MJ"
 *
 * How it works:
 *   1. Trim whitespace from the name.
 *   2. Split by one or more spaces into individual words.
 *   3. Take the first character of each word.
 *   4. Join them and take the first 2 characters.
 *   5. Uppercase the result.
 *
 * @param {string} name - A full name string (e.g. "John Doe").
 * @returns {string} Up to 2 uppercase initials.
 */
function getInitials(name: string): string {
  return name.trim().split(/\s+/).map((p) => p[0]).join('').slice(0, 2).toUpperCase()
}

// ─── Component ────────────────────────────────────────────────────────────────

/**
 * @component MessagesDropdown
 * @description
 * The mail icon button and conversation preview dropdown for the top nav bar.
 * Shows unread count badge, lists recent conversations, and links to full inbox.
 *
 * @param {Props} props
 * @returns {JSX.Element}
 */
export default function MessagesDropdown({ conversations, onMarkRead }: Props) {
  /**
   * t() is the translation function from next-intl.
   * All keys for this component live under the "messagesDropdown" namespace in en.json.
   */
  const t = useTranslations('messagesDropdown')

  /** Router used to navigate to a specific conversation when a row is clicked. */
  const router = useRouter()

  /**
   * Calculate the total unread count across all conversations.
   * This is the number shown on the red badge over the mail icon.
   * We use `?? 0` as a safety fallback in case unread_count is undefined.
   */
  const unreadCount = conversations.reduce((acc, c) => acc + (c.unread_count ?? 0), 0)

  /**
   * Only show the 5 most recent conversations in the dropdown.
   * The full list is accessible via the "View all messages" link.
   */
  const recent = conversations.slice(0, 5)

  /**
   * @function handleClick
   * @description
   * Called when the user clicks on a conversation row in the dropdown.
   *
   * Steps:
   *   1. Resolve the conversation ID (prefer con_id if present, fall back to id).
   *   2. If the conversation has unread messages, fire onMarkRead so the parent
   *      can update the unread count in state and/or the database.
   *   3. Navigate to the conversation's detail page.
   *
   * @param {Conversation} conv - The conversation that was clicked.
   */
  const handleClick = (conv: Conversation) => {
    const id = conv.con_id ?? conv.id
    if (conv.unread_count > 0) onMarkRead(id)
    router.push(`/console/messages?open=${id}`)
  }

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <DropdownMenu>

      {/*
       * Trigger button — the mail icon in the nav bar.
       * Shows a red badge with the total unread count when there are unread messages.
       * The badge is hidden entirely when unreadCount is 0.
       */}
      <DropdownMenuTrigger className="relative flex items-center justify-center w-9 h-9 rounded-full bg-gray-100 hover:bg-gray-200 focus:outline-none">
        <FiMail size={18} className="text-gray-600" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] bg-red-500 rounded-full flex items-center justify-center px-1">
            <span className="text-[10px] font-bold text-white leading-none">{unreadCount}</span>
          </span>
        )}
      </DropdownMenuTrigger>

      {/* Dropdown panel */}
      <DropdownMenuContent
        side="bottom"
        align="end"
        className="w-80 rounded-lg border border-gray-200 bg-white shadow-lg p-0"
      >
        {/* ── Header ── */}
        <div className="px-4 py-3 flex items-center justify-between">
          <span className="text-sm font-semibold text-gray-800">
            {t('header.title')}
          </span>
          <span className="text-xs text-gray-400">
            {t('header.unreadCount', { count: unreadCount })}
          </span>
        </div>

        <DropdownMenuSeparator />

        {/* ── Conversation list or empty state ── */}
        {recent.length === 0 ? (
          /*
           * Empty state — shown when the user has no conversations yet.
           * Renders a centred message in place of the list.
           */
          <div className="px-4 py-6 text-center text-xs text-gray-400">
            {t('empty')}
          </div>
        ) : (
          recent.map((conv, i) => {
            /**
             * Resolve the conversation ID — prefer con_id if the API provides it,
             * otherwise fall back to the standard id field.
             */
            const id = conv.con_id ?? conv.id

            /**
             * Determine the avatar initials for this conversation.
             * System conversations always show "SY" (system).
             * User conversations show the initials of the person who created the thread.
             * We fall back to 'User' if created_by is missing.
             */
            const initials = conv.is_system
              ? t('systemInitials')
              : getInitials(conv.created_by ?? t('fallbackUser'))

            /** Whether this conversation has any unread messages. */
            const isUnread = conv.unread_count > 0

            return (
              <div key={id}>
                {/*
                 * Conversation row.
                 * Highlighted with a subtle blue tint when unread.
                 * Clicking navigates to the conversation and marks it read.
                 */}
                <div
                  onClick={() => handleClick(conv)}
                  className={`px-4 py-3 hover:bg-gray-50 cursor-pointer ${isUnread ? 'bg-blue-50/50' : ''}`}
                >
                  <div className="flex items-start gap-3">

                    {/* Avatar circle showing sender initials */}
                    <div className="w-8 h-8 rounded-full bg-gray-200 text-gray-600 flex items-center justify-center text-xs font-semibold shrink-0">
                      {initials}
                    </div>

                    <div className="flex-1 min-w-0">
                      {/* Subject line and time ago */}
                      <div className="flex items-center justify-between">
                        <p className={`text-sm ${isUnread ? 'font-semibold text-gray-800' : 'font-medium text-gray-600'}`}>
                          {conv.subject}
                        </p>
                        <span className="text-[10px] text-gray-400 whitespace-nowrap shrink-0">
                          {timeAgo(conv.last_message_at)}
                        </span>
                      </div>

                      {/* Message preview — only shown if available */}
                      {conv.last_message_preview && (
                        <p className="text-xs text-gray-400 truncate mt-0.5">
                          {conv.last_message_preview}
                        </p>
                      )}

                      {/* Unread badge — only shown when there are unread messages */}
                      {isUnread && (
                        <span className="inline-block mt-1 text-[10px] px-1.5 py-0.5 rounded-full bg-blue-100 text-blue-600 font-medium">
                          {t('unreadBadge', { count: conv.unread_count })}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Separator between rows — not rendered after the last item */}
                {i < recent.length - 1 && <DropdownMenuSeparator />}
              </div>
            )
          })
        )}

        {/* ── Footer: View all messages link ── */}
        <DropdownMenuSeparator />
        <Link href="/console/messages">
          <div className="px-4 py-2 text-center hover:bg-gray-50 cursor-pointer">
            <span className="text-xs text-blue-500 hover:underline">
              {t('viewAll')}
            </span>
          </div>
        </Link>

      </DropdownMenuContent>
    </DropdownMenu>
  )
}