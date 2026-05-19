'use client'

/**
 * @file ConversationList.tsx
 * @description
 * Renders the scrollable list of conversations in the left-hand panel of the
 * Inbox. Each row represents one conversation thread and shows:
 *
 * ─── What does each conversation row show? ───────────────────────────────────
 *
 * 1. AVATAR        — A coloured circle with the sender's initials (or "SY" for
 *                    system messages). The colour is derived deterministically
 *                    from the sender's name so the same sender always gets the
 *                    same colour across sessions.
 *
 * 2. SUBJECT       — The conversation subject line. Bold when unread.
 *
 * 3. TIMESTAMP     — A relative time string ("just now", "5m ago", "2h ago",
 *                    "3d ago") derived from last_message_at.
 *
 * 4. PREVIEW       — A one-line truncated preview of the last message body,
 *                    shown only when last_message_preview is present.
 *
 * 5. UNREAD BADGE  — A small "N unread" pill shown beneath the preview when
 *                    unread_count > 0.
 *
 * 6. UNREAD DOT    — A small blue dot on the right edge, also shown when unread.
 *
 * ─── Empty state ─────────────────────────────────────────────────────────────
 * When the conversations array is empty the shared <EmptyState> component is
 * rendered instead. The message adapts based on the active filter:
 *   - filter === 'unread' → "All caught up!"
 *   - filter === 'all'    → "Your inbox is empty."
 *
 * ─── Design note ─────────────────────────────────────────────────────────────
 * This component is fully controlled — it holds no state of its own.
 * Filtering (all vs unread) is done by the parent before passing the
 * `conversations` prop, so this component just renders whatever it receives.
 */

import { useTranslations } from 'next-intl'
import EmptyState from './EmptyState'

// ─── Types ────────────────────────────────────────────────────────────────────

/**
 * @typedef Conversation
 * The shape of a single conversation thread as returned by the API.
 *
 * @property {string}  id                   - Primary identifier from the database.
 * @property {string}  [con_id]             - Optional alternative id. When present,
 *                                            this is preferred over `id` for selection
 *                                            tracking. Allows the API to change its
 *                                            id field without breaking the UI.
 * @property {string}  subject              - The conversation subject line shown as
 *                                            the primary text in each row.
 * @property {string}  [last_message_preview] - Optional short excerpt of the most
 *                                            recent message body. Shown beneath the
 *                                            subject when present.
 * @property {string}  [last_message_at]    - ISO date string of the most recent
 *                                            message. Converted to a relative time
 *                                            label by the timeAgo() helper.
 * @property {number}  unread_count         - How many messages in this thread the
 *                                            user has not yet read. 0 = fully read.
 * @property {boolean} is_system            - When true this is an automated system
 *                                            message. Gets a grey "SY" avatar instead
 *                                            of sender initials.
 * @property {string}  created_by           - The display name of the person who
 *                                            started the conversation. Used to derive
 *                                            the avatar initials and colour.
 */
interface Conversation {
  id:                    string
  con_id?:               string
  subject:               string
  last_message_preview?: string
  last_message_at?:      string
  unread_count:          number
  is_system:             boolean
  created_by:            string
}

/**
 * @interface Props
 *
 * @prop {Conversation[]}  conversations - The list of threads to render.
 *                                        Already filtered by the parent.
 * @prop {string|null}     activeId      - The id of the currently open conversation.
 *                                        Used to highlight the active row in blue.
 * @prop {'all'|'unread'}  filter        - Which filter tab is active. Used only to
 *                                        customise the empty-state sub-message.
 * @prop {Function}        onSelect      - Called with the full Conversation object
 *                                        when the user clicks a row.
 */
interface Props {
  conversations: Conversation[]
  activeId:      string | null
  filter:        'all' | 'unread'
  onSelect:      (conv: Conversation) => void
}

// ─── Utility Functions ────────────────────────────────────────────────────────

/**
 * @function timeAgo
 * Converts an ISO date string into a human-readable relative time label.
 *
 * Examples:
 *   - Less than 1 minute ago → "just now"
 *   - 5 minutes ago          → "5m ago"
 *   - 2 hours ago            → "2h ago"
 *   - 3 days ago             → "3d ago"
 *
 * Returns an empty string when no date is provided so the timestamp
 * area simply renders nothing rather than crashing.
 *
 * Note: these labels are translation keys — the actual displayed strings
 * come from the "conversationList.time" namespace in en.json.
 *
 * @param {string} [dateStr] - An ISO 8601 date string (e.g. "2026-05-12T10:30:00Z").
 * @returns {string} A short relative time label, or '' if dateStr is absent.
 */
function timeAgo(dateStr: string | undefined, t: (key: string, values?: Record<string, any>) => string): string {
  if (!dateStr) return ''
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1)  return t('time.justNow')
  if (mins < 60) return t('time.minutesAgo', { count: mins })
  const hrs = Math.floor(mins / 60)
  if (hrs < 24)  return t('time.hoursAgo', { count: hrs })
  return t('time.daysAgo', { count: Math.floor(hrs / 24) })
}

/**
 * @function getInitials
 * Derives up to two uppercase initials from a display name string.
 *
 * How it works:
 *   1. Trim leading/trailing whitespace.
 *   2. Split by one or more whitespace characters into words.
 *   3. Take the first character of each word.
 *   4. Join them and take only the first two characters.
 *   5. Uppercase the result.
 *
 * Examples:
 *   "Alice"        → "A"
 *   "John Smith"   → "JS"
 *   "Mary Jane W." → "MJ"
 *
 * @param {string} str - The sender's display name.
 * @returns {string} 1–2 uppercase initials.
 */
function getInitials(str: string): string {
  return str.trim().split(/\s+/).map((p) => p[0]).join('').slice(0, 2).toUpperCase()
}

// ─── Avatar Colours ───────────────────────────────────────────────────────────

/**
 * A fixed palette of Tailwind background colour classes used for avatars.
 * The colour assigned to a sender is determined by getColor() below and
 * is stable — the same sender always receives the same colour.
 */
const avatarColors = [
  'bg-violet-500', 'bg-blue-500', 'bg-emerald-500',
  'bg-rose-500',   'bg-amber-500', 'bg-gray-400',
]

/**
 * @function getColor
 * Deterministically picks an avatar background colour for a given string.
 *
 * Uses the char code of the first character modulo the palette length.
 * This means the same sender name always maps to the same colour without
 * needing to store any colour preference.
 *
 * @param {string} str - Typically the sender's display name.
 * @returns {string} A Tailwind bg-* class from the avatarColors palette.
 */
function getColor(str: string): string {
  const i = str.charCodeAt(0) % avatarColors.length
  return avatarColors[i]
}

// ─── Component ────────────────────────────────────────────────────────────────

/**
 * @component ConversationList
 * @description
 * Renders all conversation rows or an empty state when the list is empty.
 * All user-facing strings are loaded from the "conversationList" namespace in en.json.
 *
 * @param {Props} props - See interface above.
 * @returns {JSX.Element}
 */
export default function ConversationList({ conversations, activeId, filter, onSelect }: Props) {

  /**
   * t() is the translation function from next-intl.
   * All keys for this component live under the "conversationList" namespace in en.json.
   */
  const t = useTranslations('conversationList')

  // ── Empty state ───────────────────────────────────────────────────────────────
  if (conversations.length === 0) {
    return (
      <EmptyState
        type="inbox"
        message={t('empty.message')}
        sub={filter === 'unread' ? t('empty.subUnread') : t('empty.subAll')}
      />
    )
  }

  // ── Conversation rows ─────────────────────────────────────────────────────────
  return (
    <>
      {conversations.map((conv) => {

        /**
         * Prefer con_id over id when available. This lets the parent track
         * which conversation is active using whichever id the API provides.
         */
        const id = conv.con_id ?? conv.id

        /** True when this thread has at least one unread message. */
        const isUnread = conv.unread_count > 0

        /** True when this thread is currently open in the message panel. */
        const isActive = activeId === id

        /**
         * Avatar initials: "SY" for system messages, otherwise the sender's
         * initials derived from their display name. Falls back to "U" (Unknown)
         * if created_by is somehow absent.
         */
        const initials = conv.is_system ? t('avatar.system') : getInitials(conv.created_by ?? 'U')

        /**
         * Avatar background colour: always grey for system messages,
         * otherwise deterministically chosen from the palette by getColor().
         */
        const color = conv.is_system ? 'bg-gray-400' : getColor(conv.created_by ?? 'U')

        return (
          <div
            key={id}
            onClick={() => onSelect(conv)}
            className={`flex items-start gap-3 px-4 py-4 border-b border-gray-100 cursor-pointer transition-colors ${
              isActive  ? 'bg-blue-50' :
              isUnread  ? 'bg-blue-50/40 hover:bg-blue-50/70' :
                          'hover:bg-gray-50'
            }`}
          >
            {/* ── Avatar ──
                Coloured circle with initials. Shrinks to a fixed 36×36px size
                so long subject lines cannot push it out of shape. */}
            <div className={`w-9 h-9 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0 ${color}`}>
              {initials}
            </div>

            {/* ── Content column ── Subject, timestamp, preview, unread badge */}
            <div className="flex-1 min-w-0">

              {/* Subject + relative timestamp on one line */}
              <div className="flex items-center justify-between gap-2">
                <p className={`text-sm truncate ${isUnread ? 'font-semibold text-gray-900' : 'font-medium text-gray-600'}`}>
                  {conv.subject}
                </p>
                <span className="text-[10px] text-gray-400 whitespace-nowrap">
                  {timeAgo(conv.last_message_at, t)}
                </span>
              </div>

              {/* Last message preview — only shown when available */}
              {conv.last_message_preview && (
                <p className="text-xs text-gray-400 truncate mt-0.5">
                  {conv.last_message_preview}
                </p>
              )}

              {/* Unread count pill — only shown when unread_count > 0 */}
              {isUnread && (
                <span className="inline-block mt-1 text-[10px] px-1.5 py-0.5 rounded-full bg-blue-100 text-blue-600 font-medium">
                  {t('unread.badge', { count: conv.unread_count })}
                </span>
              )}
            </div>

            {/* ── Unread dot ──
                Small blue circle on the right edge, visible only when unread.
                Provides a quick at-a-glance indicator alongside the badge. */}
            {isUnread && (
              <span className="w-2 h-2 bg-blue-500 rounded-full shrink-0 mt-1.5" />
            )}
          </div>
        )
      })}
    </>
  )
}