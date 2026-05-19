'use client'

/**
 * @file NotificationsList.tsx
 * @description
 * Renders the main content area of the Notifications page. It either shows
 * an empty state illustration (when there are no notifications to display)
 * or a scrollable vertical list of NotificationCard components.
 *
 * ─── What does this component do? ────────────────────────────────────────────
 *
 * 1. EMPTY STATE — When the notifications array is empty, it renders the
 *    EmptyState component with a context-aware subtitle:
 *      - If the "unread" filter is active → "All caught up!"
 *        (meaning the user has read everything, not that no notifications exist)
 *      - If the "all" filter is active → "You have no notifications yet."
 *        (meaning no notifications have been created at all)
 *
 * 2. NOTIFICATIONS LIST — When there are notifications, it maps over the array
 *    and renders a NotificationCard for each one, passing down the onMarkRead
 *    and onDelete callbacks so each card can trigger those actions.
 *
 * ─── Props ───────────────────────────────────────────────────────────────────
 * @prop {Notification[]}   notifications - The list of notifications to render.
 *                                          Already filtered by the parent before
 *                                          being passed in here.
 * @prop {'all'|'unread'}   filter        - The currently active filter. Used only
 *                                          to decide which empty state subtitle
 *                                          to show.
 * @prop {Function}         onMarkRead    - Callback fired when the user marks a
 *                                          single notification as read.
 *                                          Receives the notification id.
 * @prop {Function}         onDelete      - Callback fired when the user deletes a
 *                                          single notification.
 *                                          Receives the notification id.
 *
 * ─── Translation namespace ───────────────────────────────────────────────────
 * All user-facing strings use the "notificationsList" namespace from en.json.
 */

import { useTranslations } from 'next-intl'
import NotificationCard   from './NotificationCard'
import EmptyState         from './EmptyState'

// ─── Types ────────────────────────────────────────────────────────────────────

/**
 * @typedef Notification
 * Represents a single notification object passed in from the parent.
 * This mirrors the shape used in NotificationCard — kept local here
 * so this component is self-contained and does not depend on a shared types file.
 *
 * @property {string}  id          - Unique identifier for the notification.
 * @property {string}  title       - The main heading text shown on each card.
 * @property {string}  [message]   - Optional supporting detail text.
 * @property {string}  type        - Notification category used for icon styling.
 *                                   One of: "system" | "security" | "user" | "payment" | "message"
 * @property {string}  status      - "unread" or "read".
 * @property {string}  priority    - "urgent" | "high" | "normal".
 * @property {string}  [action_url]- Optional URL rendered as a "View" link on the card.
 * @property {string}  created_at  - ISO date string for the relative timestamp.
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
 * @typedef Props
 * The props accepted by the NotificationsList component.
 *
 * @property {Notification[]}   notifications - Pre-filtered list of notifications to render.
 * @property {'all'|'unread'}   filter        - Active filter tab. Determines empty state message.
 * @property {Function}         onMarkRead    - Passed to each NotificationCard.
 *                                             Called with the notification id when marked read.
 * @property {Function}         onDelete      - Passed to each NotificationCard.
 *                                             Called with the notification id when deleted.
 */
interface Props {
  notifications: Notification[]
  filter:        'all' | 'unread'
  onMarkRead:    (id: string) => void
  onDelete:      (id: string) => void
}

// ─── Component ────────────────────────────────────────────────────────────────

/**
 * @component NotificationsList
 * @description
 * Conditionally renders either an EmptyState or a list of NotificationCard
 * components depending on whether the notifications array has any items.
 *
 * This component is purely presentational — it holds no state of its own.
 * The parent is responsible for filtering and passing the correct notifications array.
 *
 * @param {Props} props - See the Props typedef above.
 * @returns {JSX.Element} Either an EmptyState or a vertical list of cards.
 */
export default function NotificationsList({ notifications, filter, onMarkRead, onDelete }: Props) {

  /**
   * t() is the translation function from next-intl.
   * All keys for this component live under the "notificationsList" namespace in en.json.
   */
  const t = useTranslations('notificationsList')

  // ─── Empty State ─────────────────────────────────────────────────────────────

  /**
   * When there are no notifications to show, render the EmptyState component.
   *
   * The subtitle changes based on the active filter:
   *   - "unread" filter → user has read everything → show an encouraging message.
   *   - "all" filter    → no notifications exist at all → show a neutral message.
   */
  if (notifications.length === 0) {
    return (
      <EmptyState
        message={t('empty.message')}
        sub={filter === 'unread' ? t('empty.subUnread') : t('empty.subAll')}
      />
    )
  }

  // ─── Notifications List ───────────────────────────────────────────────────────

  /**
   * When notifications exist, render each one as a NotificationCard.
   * The `space-y-2` class adds a small vertical gap between each card.
   * The `key` prop uses the notification id to help React efficiently
   * update the list when items are added, removed, or reordered.
   */
  return (
    <div className="max-w-4xl mx-auto space-y-2">
      {notifications.map((n) => (
        <NotificationCard
          key={n.id}
          notification={n}
          onMarkRead={onMarkRead}
          onDelete={onDelete}
        />
      ))}
    </div>
  )
}