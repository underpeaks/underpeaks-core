'use client'

/**
 * @file NotificationCard.tsx
 * @description
 * A single notification card component used to display an individual notification
 * in a list. Each card shows the notification's icon, title, message, timestamp,
 * priority badge, and action buttons.
 *
 * ─── What does this component do? ────────────────────────────────────────────
 *
 * 1. DISPLAYS NOTIFICATION INFO — Shows the notification title, optional message,
 *    type icon, time since it was created, and a priority badge if urgent or high.
 *
 * 2. MARK AS READ — If the notification is unread, a "Mark as read" button is
 *    shown. Clicking it calls the onMarkRead callback with the notification's id.
 *
 * 3. VIEW ACTION — If the notification has an action_url, a "View" link is shown
 *    that navigates the user to that URL.
 *
 * 4. DELETE — A "Delete" button is always shown. Clicking it calls the onDelete
 *    callback with the notification's id.
 *
 * ─── Props ───────────────────────────────────────────────────────────────────
 * @prop {Notification} notification - The notification data object to display.
 * @prop {Function}     onMarkRead   - Callback fired when the user marks the
 *                                    notification as read. Receives the notification id.
 * @prop {Function}     onDelete     - Callback fired when the user deletes the
 *                                    notification. Receives the notification id.
 *
 * ─── Translation namespace ───────────────────────────────────────────────────
 * All user-facing strings use the "notificationCard" namespace from en.json.
 */

import { useTranslations } from 'next-intl'
import { FiBell, FiCheck, FiTrash2, FiAlertCircle, FiUser, FiZap } from 'react-icons/fi'

// ─── Types ────────────────────────────────────────────────────────────────────

/**
 * @typedef Notification
 * Represents a single notification object as returned by the API.
 *
 * @property {string}  id         - Unique identifier for the notification.
 * @property {string}  title      - The main heading text shown on the card.
 * @property {string}  [message]  - Optional supporting detail shown below the title.
 * @property {string}  type       - Controls which icon is shown. One of:
 *                                  "system" | "security" | "user" | "payment" | "message"
 * @property {string}  status     - "unread" or "read". Unread cards get a blue
 *                                  left border and a dot indicator.
 * @property {string}  priority   - "urgent" | "high" | "normal". Urgent and high
 *                                  show a coloured badge next to the title.
 * @property {string}  [action_url] - Optional URL. When present, a "View" link
 *                                    is rendered on the card.
 * @property {string}  created_at - ISO date string used to calculate the
 *                                  relative time shown below the message.
 */
interface Notification {
  id:          string
  title:       string
  message?:    string
  type:        string
  status:      string
  priority:    string
 //action_url?: string
  created_at:  string
}

/**
 * @typedef Props
 * The props accepted by the NotificationCard component.
 *
 * @property {Notification} notification - The notification to render.
 * @property {Function}     onMarkRead   - Called with the notification id when
 *                                        the user clicks "Mark as read".
 * @property {Function}     onDelete     - Called with the notification id when
 *                                        the user clicks "Delete".
 */
interface Props {
  notification: Notification
  onMarkRead:   (id: string) => void
  onDelete:     (id: string) => void
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * @function timeAgo
 * Converts an ISO date string into a short human-readable relative time string.
 *
 * Examples:
 *   - Less than 1 minute ago  → "just now"
 *   - 45 minutes ago          → "45m ago"
 *   - 3 hours ago             → "3h ago"
 *   - 2 days ago              → "2d ago"
 *
 * @param {string} dateStr - An ISO 8601 date string (e.g. "2024-01-15T10:30:00Z").
 * @returns {string} A short relative time label.
 */
function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1)  return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24)  return `${hrs}h ago`
  return `${Math.floor(hrs / 24)}d ago`
}

// ─── Sub-components ───────────────────────────────────────────────────────────

/**
 * @component TypeIcon
 * Renders a small circular icon badge whose colour and icon reflect the
 * notification type. Falls back to the "system" style for unknown types.
 *
 * Supported types and their visual treatment:
 *   - system   → grey background,  bell icon
 *   - security → red background,   alert-circle icon
 *   - user     → blue background,  user icon
 *   - payment  → amber background, zap icon
 *   - message  → violet background, bell icon
 *
 * @param {{ type: string }} props - The notification type string.
 * @returns {JSX.Element} A styled icon badge.
 */
function TypeIcon({ type }: { type: string }) {
  const map: Record<string, { icon: React.ReactNode; bg: string; color: string }> = {
    system:   { icon: <FiBell size={16} />,        bg: 'bg-gray-100',   color: 'text-gray-600'   },
    security: { icon: <FiAlertCircle size={16} />, bg: 'bg-red-100',    color: 'text-red-600'    },
    user:     { icon: <FiUser size={16} />,        bg: 'bg-blue-100',   color: 'text-blue-600'   },
    payment:  { icon: <FiZap size={16} />,         bg: 'bg-amber-100',  color: 'text-amber-600'  },
    message:  { icon: <FiBell size={16} />,        bg: 'bg-violet-100', color: 'text-violet-600' },
  }
  const cfg = map[type] ?? map.system
  return (
    <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${cfg.bg} ${cfg.color}`}>
      {cfg.icon}
    </div>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────

/**
 * @component NotificationCard
 * @description
 * Renders a single notification as a styled card with action buttons.
 * Unread notifications get a blue left border and a blue dot next to the title.
 * Urgent and high-priority notifications show a coloured badge next to the title.
 *
 * @param {Props} props - See the Props typedef above.
 * @returns {JSX.Element} A notification card element.
 */
export default function NotificationCard({ notification, onMarkRead, onDelete }: Props) {

  /**
   * t() is the translation function from next-intl.
   * All keys for this component live under the "notificationCard" namespace in en.json.
   */
  const t = useTranslations('notificationCard')

  /**
   * `isUnread` — true when this notification has not yet been read.
   * Drives the blue left border, the dot indicator, and the visibility
   * of the "Mark as read" button.
   */
  const isUnread = notification.status === 'unread'

  return (
    <div className={`bg-white border border-gray-200 rounded-lg p-4 hover:shadow-sm transition-shadow ${isUnread ? 'border-l-4 border-l-blue-500' : ''}`}>
      <div className="flex items-start gap-4">

        {/* ── Type Icon ──
            Circular icon badge reflecting the notification type. */}
        <TypeIcon type={notification.type} />

        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1">

              {/* ── Title Row ──
                  Blue dot (unread only), title text, and priority badge. */}
              <div className="flex items-center gap-2">
                {isUnread && (
                  <span className="w-2 h-2 bg-blue-500 rounded-full shrink-0" />
                )}
                <p className={`text-sm ${isUnread ? 'font-semibold text-gray-900' : 'font-medium text-gray-700'}`}>
                  {notification.title}
                </p>

                {/* Urgent priority badge */}
                {notification.priority === 'urgent' && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-red-100 text-red-600 font-medium">
                    {t('priority.urgent')}
                  </span>
                )}

                {/* High priority badge */}
                {notification.priority === 'high' && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-600 font-medium">
                    {t('priority.high')}
                  </span>
                )}
              </div>

              {/* ── Message ──
                  Optional supporting text shown below the title. */}
              {notification.message && (
                <p className="text-xs text-gray-500 mt-1">{notification.message}</p>
              )}

              {/* ── Timestamp ──
                  Relative time since the notification was created. */}
              <p className="text-[10px] text-gray-400 mt-2">
                {timeAgo(notification.created_at)}
              </p>
            </div>
          </div>

          {/* ── Action Buttons ──
              Mark as read (unread only), View (if action_url present), Delete (always). */}
          <div className="flex items-center gap-2 mt-3">

            {/* Mark as read button — only visible on unread notifications */}
            {isUnread && (
              <button
                onClick={() => onMarkRead(notification.id)}
                className="flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-medium text-gray-600 bg-gray-50 rounded-md hover:bg-gray-100 transition"
              >
                <FiCheck size={12} /> {t('actions.markRead')}
              </button>
            )}

            {/* View link — only visible when the notification has an action URL
            {notification.action_url && (
              <a
                href={notification.action_url}
                className="flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-medium text-blue-600 bg-blue-50 rounded-md hover:bg-blue-100 transition"
              >
                {t('actions.view')}
              </a>
            )} */}

            {/* Delete button — always visible */}
            <button
              onClick={() => onDelete(notification.id)}
              className="flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-medium text-red-600 bg-red-50 rounded-md hover:bg-red-100 transition"
            >
              <FiTrash2 size={12} /> {t('actions.delete')}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}