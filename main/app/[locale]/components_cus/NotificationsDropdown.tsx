'use client'

/**
 * @file NotificationsDropdown.tsx
 * @description
 * A dropdown component rendered in the top navigation bar that shows the user
 * a quick preview of their most recent notifications.
 *
 * What does this component do?
 * -----------------------------
 * - Displays a bell icon button with a red unread count badge when there are
 *   unread notifications.
 * - When clicked, opens a dropdown showing the 5 most recent notifications.
 * - Each notification row shows: an unread dot indicator (if unread), the
 *   notification title, an optional message preview, and a "time ago" timestamp.
 * - Clicking a notification marks it as read (if unread) and navigates to its
 *   action URL, or falls back to the notifications page if no URL is set.
 * - A "Mark all read" button in the header clears all unread notifications at once.
 * - A "View all notifications" link at the bottom navigates to the full list.
 *
 * What data does it need?
 * ------------------------
 * The parent component is responsible for fetching notifications and passing
 * them in via props. This component is purely presentational + navigation —
 * it does not fetch any data itself.
 *
 * What is a notification's status?
 * ----------------------------------
 * Each notification has a `status` field. The two relevant values are:
 *   - 'unread' — the user has not seen this notification yet (shown with blue tint + dot)
 *   - 'read'   — the user has already seen it (shown with normal styling)
 */

import { FiBell, FiCheck } from 'react-icons/fi'
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
 * @interface Notification
 * @description
 * Represents a single notification as returned by the API.
 *
 * @property {string} id           - Unique identifier for the notification.
 * @property {string} title        - The short heading text of the notification.
 * @property {string} [message]    - Optional longer description shown below the title.
 * @property {string} type         - Category of notification (e.g. 'order', 'system', 'alert').
 * @property {string} status       - Read state: 'unread' or 'read'.
 * @property {string} priority     - Importance level (e.g. 'low', 'medium', 'high').
 * @property {string} [action_url] - Optional URL to navigate to when the notification is clicked.
 * @property {string} created_at   - ISO timestamp of when the notification was created.
 */
interface Notification {
  id:          string
  title:       string
  message?:    string
  type:        string
  status:      string
  priority:    string
  action_url?: string
  created_at:  string
}

/**
 * @interface Props
 * @description
 * The props accepted by the NotificationsDropdown component.
 *
 * @property {Notification[]} notifications
 *   The full list of notifications. Only the first 5 are shown in the dropdown.
 *
 * @property {(id: string) => void} onMarkRead
 *   Callback fired when a single unread notification is clicked.
 *   The parent should mark that notification as read in state and/or the database.
 *
 * @property {() => void} onMarkAllRead
 *   Callback fired when the user clicks "Mark all read".
 *   The parent should mark every notification as read in state and/or the database.
 */
interface Props {
  notifications: Notification[]
  onMarkRead:    (id: string) => void
  onMarkAllRead: () => void
}

// ─── Utility Functions ────────────────────────────────────────────────────────

/**
 * @function timeAgo
 * @description
 * Converts an ISO date string into a human-readable "time ago" string.
 * Used to show how long ago each notification was created.
 *
 * Examples:
 *   - Less than 1 minute ago → "just now"
 *   - 45 minutes ago         → "45m ago"
 *   - 3 hours ago            → "3h ago"
 *   - 2 days ago             → "2d ago"
 *
 * @param {string} dateStr - An ISO 8601 date string (e.g. "2024-01-15T10:30:00Z").
 * @returns {string} A short human-readable relative time string.
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

// ─── Component ────────────────────────────────────────────────────────────────

/**
 * @component NotificationsDropdown
 * @description
 * The bell icon button and notification preview dropdown for the top nav bar.
 * Shows unread count badge, lists recent notifications, and links to full list.
 *
 * @param {Props} props
 * @returns {JSX.Element}
 */
export default function NotificationsDropdown({ notifications, onMarkRead, onMarkAllRead }: Props) {
  /**
   * t() is the translation function from next-intl.
   * All keys for this component live under the "notificationsDropdown" namespace in en.json.
   */
  const t = useTranslations('notificationsDropdown')

  /** Router used to navigate when a notification row is clicked. */
  const router = useRouter()

  /**
   * Count how many notifications have a status of 'unread'.
   * This number is shown on the red badge and in the dropdown header.
   */
  const unreadCount = notifications.filter((n) => n.status === 'unread').length

  /**
   * Only show the 5 most recent notifications in the dropdown preview.
   * The full list is accessible via the "View all notifications" link.
   */
  const recent = notifications.slice(0, 5)

  /**
   * @function handleClick
   * @description
   * Called when the user clicks on a notification row.
   *
   * Steps:
   *   1. If the notification is unread, fire onMarkRead so the parent can
   *      update its state and mark it as read in the database.
   *   2. If the notification has an action_url, navigate to it.
   *      Otherwise fall back to the general notifications page.
   *
   * @param {Notification} n - The notification that was clicked.
   */
  const handleClick = (n: Notification) => {
    if (n.status === 'unread') onMarkRead(n.id)
    if (n.action_url) router.push(n.action_url)
    else router.push('/console/notifications')
  }

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <DropdownMenu>

      {/*
       * Trigger button — the bell icon in the nav bar.
       * Shows a red badge with the unread count when there are unread notifications.
       * The badge is hidden entirely when unreadCount is 0.
       */}
      <DropdownMenuTrigger className="relative flex items-center justify-center w-9 h-9 rounded-full bg-gray-100 hover:bg-gray-200 focus:outline-none">
        <FiBell size={18} className="text-gray-600" />
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
          <div className="flex items-center gap-3">
            <span className="text-xs text-gray-400">
              {t('header.unreadCount', { count: unreadCount })}
            </span>
            {/*
             * "Mark all read" button — only shown when there are unread notifications.
             * Fires the onMarkAllRead callback so the parent can update state/database.
             */}
            {unreadCount > 0 && (
              <button
                onClick={onMarkAllRead}
                className="text-xs text-blue-500 hover:underline flex items-center gap-1"
              >
                <FiCheck size={11} />
                {t('header.markAllRead')}
              </button>
            )}
          </div>
        </div>

        <DropdownMenuSeparator />

        {/* ── Notification list or empty state ── */}
        {recent.length === 0 ? (
          /*
           * Empty state — shown when the user has no notifications yet.
           */
          <div className="px-4 py-6 text-center text-xs text-gray-400">
            {t('empty')}
          </div>
        ) : (
          recent.map((n, i) => (
            <div key={n.id}>
              {/*
               * Notification row.
               * Highlighted with a subtle blue tint when unread.
               * Clicking marks it read and navigates to its action URL.
               */}
              <div
                onClick={() => handleClick(n)}
                className={`px-4 py-3 hover:bg-gray-50 cursor-pointer ${n.status === 'unread' ? 'bg-blue-50/50' : ''}`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1">
                    <div className="flex items-center gap-1.5">
                      {/*
                       * Blue dot indicator — only shown for unread notifications.
                       * Gives a quick visual signal that this notification is new.
                       */}
                      {n.status === 'unread' && (
                        <span className="w-1.5 h-1.5 rounded-full bg-blue-500 shrink-0" />
                      )}
                      {/* Notification title — bold when unread, normal weight when read */}
                      <p className={`text-sm ${n.status === 'unread' ? 'font-semibold text-gray-800' : 'font-medium text-gray-600'}`}>
                        {n.title}
                      </p>
                    </div>
                    {/* Optional message preview — truncated to one line */}
                    {n.message && (
                      <p className="text-xs text-gray-400 mt-0.5 truncate">{n.message}</p>
                    )}
                  </div>
                  {/* Time ago timestamp — right-aligned, never wraps */}
                  <span className="text-[10px] text-gray-400 whitespace-nowrap shrink-0">
                    {timeAgo(n.created_at)}
                  </span>
                </div>
              </div>
              {/* Separator between rows — not rendered after the last item */}
              {i < recent.length - 1 && <DropdownMenuSeparator />}
            </div>
          ))
        )}

        {/* ── Footer: View all notifications link ── */}
        <DropdownMenuSeparator />
        <Link href="/console/notifications">
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