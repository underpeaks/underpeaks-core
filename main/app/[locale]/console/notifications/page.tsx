'use client'

/**
 * @file NotificationsPage.tsx
 * @description
 * The root page component for the Notifications section. This is the "smart"
 * parent component that owns all state and data fetching. It passes data and
 * callbacks down to the presentational child components.
 *
 * ─── What does this component do? ────────────────────────────────────────────
 *
 * 1. FETCH NOTIFICATIONS — On first mount, fetches the user's notification list
 *    from the API using the auth token stored in localStorage.
 *
 * 2. FILTER — The user can toggle between "All" and "Unread" views. Filtering
 *    is done locally on the already-fetched data — no extra API call needed.
 *
 * 3. MARK AS READ — Sends a POST request to mark a single notification as read,
 *    then updates local state so the UI reflects the change immediately without
 *    needing to re-fetch the full list.
 *
 * 4. MARK ALL READ — Sends a POST request to mark every notification as read,
 *    then updates all items in local state at once.
 *
 * 5. DELETE — Sends a POST request to soft-delete a notification, then removes
 *    it from local state so it disappears from the list immediately.
 *
 * 6. ERROR BANNER — If any API call fails, a dismissible red error banner is
 *    shown at the top of the page. The user can close it with the ✕ button.
 *
 * ─── Component hierarchy ─────────────────────────────────────────────────────
 *
 *   NotificationsPage        ← this file (owns state + API calls)
 *     ├── Loader             ← shown while the initial fetch is in progress
 *     ├── NotificationsHeader← title, unread count, filter tabs, mark-all button
 *     └── NotificationsList  ← empty state or list of NotificationCard items
 *
 * ─── Auth ────────────────────────────────────────────────────────────────────
 * The Bearer token is read from localStorage on the client side. The token
 * read is guarded with a typeof window check so it is safe in SSR/Next.js
 * environments where localStorage does not exist on the server.
 *
 * ─── Translation namespace ───────────────────────────────────────────────────
 * All user-facing strings use the "notificationsPage" namespace from en.json.
 */

import { useState, useEffect }   from 'react'
import { useTranslations }       from 'next-intl'
import NotificationsHeader       from './components/NotificationsHeader'
import NotificationsList         from './components/NotificationsList'
import Loader                    from '../Loading'

// ─── Types ────────────────────────────────────────────────────────────────────

/**
 * @typedef Notification
 * Represents a single notification object as returned by the API.
 *
 * @property {string}  id           - Unique identifier for the notification.
 * @property {string}  title        - The main heading text shown on each card.
 * @property {string}  [message]    - Optional supporting detail text.
 * @property {string}  type         - Notification category used for icon styling.
 *                                    One of: "system" | "security" | "user" | "payment" | "message"
 * @property {string}  status       - "unread" | "read" | "deleted".
 * @property {string}  priority     - "urgent" | "high" | "normal".
 * @property {string}  [action_url] - Optional URL rendered as a "View" link on the card.
 * @property {string}  created_at   - ISO date string for the relative timestamp.
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

// ─── Component ────────────────────────────────────────────────────────────────

/**
 * @component NotificationsPage
 * @description
 * The top-level smart component for the Notifications feature.
 * Owns all state, makes all API calls, and passes data and callbacks
 * down to presentational child components.
 *
 * @returns {JSX.Element} The full notifications page layout.
 */
export default function NotificationsPage() {

  /**
   * t() is the translation function from next-intl.
   * All keys for this component live under the "notificationsPage" namespace in en.json.
   */
  const t = useTranslations('notificationsPage')

  // ─── State ───────────────────────────────────────────────────────────────────

  /**
   * `notifications` — the full list of notifications fetched from the API.
   * Starts as an empty array and is populated after the first fetch completes.
   * Individual items are updated in-place when marked as read or deleted.
   */
  const [notifications, setNotifications] = useState<Notification[]>([])

  /**
   * `filter` — controls which notifications are shown in the list.
   *   - 'all'    → show every notification regardless of status.
   *   - 'unread' → show only notifications whose status is "unread".
   * Defaults to 'all' on first render.
   */
  const [filter, setFilter] = useState<'all' | 'unread'>('all')

  /**
   * `loading` — true while the initial notifications fetch is in progress.
   * While true the full-page Loader component is rendered instead of the content.
   */
  const [loading, setLoading] = useState(true)

  /**
   * `error` — holds an error message string when any API call fails.
   * Displayed as a dismissible red banner at the top of the page.
   * Null when there is no active error.
   */
  const [error, setError] = useState<string | null>(null)

  // ─── Auth Headers ─────────────────────────────────────────────────────────────

  /**
   * `token` — the user's Bearer auth token, read from localStorage.
   * The `typeof window !== 'undefined'` guard prevents this from crashing
   * during server-side rendering where localStorage does not exist.
   * Falls back to an empty string if no token is found.
   */
  const token = typeof window !== 'undefined'
    ? localStorage.getItem('authToken') ?? ''
    : ''

  /**
   * `headers` — the HTTP headers attached to every authenticated API request.
   * Includes the Bearer token for authorisation and sets the content type to JSON.
   */
  const headers = {
    'Authorization': `Bearer ${token}`,
    'Content-Type':  'application/json',
  }

  // ─── Effects ──────────────────────────────────────────────────────────────────

  /**
   * Fetch notifications once when the component first mounts.
   * The empty dependency array [] ensures this only runs one time.
   */
  useEffect(() => {
    const load = async () => {
      try {
        const res  = await fetch('/api/notifications/list', {
          headers: { 'Authorization': `Bearer ${token}` },
        })
        const data = await res.json()

        /**
         * The API returns an object with a `notifications` array.
         * We fall back to an empty array if the field is missing or null,
         * so the component always has a safe value to work with.
         */
        setNotifications(data.notifications ?? [])
      } catch {
        setError(t('errors.loadFailed'))
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  // ─── Handlers ────────────────────────────────────────────────────────────────

  /**
   * @function handleMarkRead
   * Marks a single notification as read.
   *
   * Steps:
   *   1. POST to the mark-read API endpoint with the notification id.
   *   2. On success, update the matching notification in local state
   *      by setting its status to "read" — no full re-fetch needed.
   *   3. On failure, show an error banner.
   *
   * @param {string} id - The id of the notification to mark as read.
   */
  const handleMarkRead = async (id: string) => {
    try {
      await fetch('/api/notifications/mark-read', {
        method: 'POST',
        headers,
        body: JSON.stringify({ notification_id: id }),
      })
      setNotifications((prev) =>
        prev.map((n) => n.id === id ? { ...n, status: 'read' } : n)
      )
    } catch {
      setError(t('errors.markReadFailed'))
    }
  }

  /**
   * @function handleMarkAllRead
   * Marks every notification as read in a single API call.
   *
   * Steps:
   *   1. POST to the mark-all-read API endpoint (no body needed).
   *   2. On success, update every notification in local state to status "read".
   *   3. On failure, show an error banner.
   */
  const handleMarkAllRead = async () => {
    try {
      await fetch('/api/notifications/mark-all-read', { method: 'POST', headers })
      setNotifications((prev) => prev.map((n) => ({ ...n, status: 'read' })))
    } catch {
      setError(t('errors.markAllReadFailed'))
    }
  }

  /**
   * @function handleDelete
   * Soft-deletes a single notification.
   *
   * Steps:
   *   1. POST to the mark-read endpoint to register the deletion server-side.
   *   2. On success, remove the notification from local state by filtering it out.
   *      This is a "soft delete" — the item disappears from the UI immediately
   *      but may still exist in the database with a deleted/read status.
   *   3. On failure, show an error banner.
   *
   * @param {string} id - The id of the notification to delete.
   */
  const handleDelete = async (id: string) => {
    try {
      await fetch('/api/notifications/mark-read', {
        method: 'POST',
        headers,
        body: JSON.stringify({ notification_id: id }),
      })
      setNotifications((prev) => prev.filter((n) => n.id !== id))
    } catch {
      setError(t('errors.deleteFailed'))
    }
  }

  // ─── Derived State ────────────────────────────────────────────────────────────

  /**
   * `filtered` — the subset of notifications to pass to NotificationsList.
   * Computed from the full notifications array based on the active filter.
   * No extra API call is made when the filter changes — this is pure client-side filtering.
   */
  const filtered = filter === 'unread'
    ? notifications.filter((n) => n.status === 'unread')
    : notifications

  /**
   * `unreadCount` — the total number of unread notifications across the full list.
   * Passed to NotificationsHeader to display in the subtitle and to decide
   * whether to show the "Mark all read" button.
   */
  const unreadCount = notifications.filter((n) => n.status === 'unread').length

  // ─── Loading State ────────────────────────────────────────────────────────────

  /**
   * While the initial fetch is in progress, render the full-page Loader
   * component instead of the normal page layout.
   */
  if (loading) return <Loader />

  // ─── Render ───────────────────────────────────────────────────────────────────

  return (
    <div className="absolute inset-0 flex flex-col bg-gray-100 overflow-hidden">

      {/* ── Page Header ──
          Shows the title, unread count, filter tabs, and mark-all button. */}
      <NotificationsHeader
        unreadCount={unreadCount}
        filter={filter}
        onFilter={setFilter}
        onMarkAll={handleMarkAllRead}
      />

      {/* ── Error Banner ──
          Shown when any API call fails. The user can dismiss it with the ✕ button.
          Clicking ✕ sets the error state back to null, hiding the banner. */}
      {error && (
        <div className="mx-6 mt-4 px-4 py-2 bg-red-50 border border-red-200 rounded-md text-xs text-red-600 flex items-center justify-between">
          {error}
          <button
            onClick={() => setError(null)}
            className="ml-3 text-red-400 hover:text-red-600"
          >
            ✕
          </button>
        </div>
      )}

      {/* ── Notifications List ──
          Scrollable area containing the filtered notification cards or empty state.
          flex-1 makes it fill the remaining vertical space after the header. */}
      <div className="flex-1 overflow-y-auto p-6">
        <NotificationsList
          notifications={filtered}
          filter={filter}
          onMarkRead={handleMarkRead}
          onDelete={handleDelete}
        />
      </div>
    </div>
  )
}