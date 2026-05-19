'use client'

/**
 * @file NotificationsHeader.tsx
 * @description
 * The sticky header bar displayed at the top of the Notifications page.
 * It shows the page title, how many unread notifications exist, filter
 * toggle buttons, and a "Mark all read" button.
 *
 * ─── What does this component do? ────────────────────────────────────────────
 *
 * 1. TITLE & UNREAD COUNT — Shows a bell icon, the page heading "Notifications",
 *    and a subtitle telling the user how many unread notifications they have.
 *    The word "notification" is correctly pluralised based on the count.
 *
 * 2. FILTER TOGGLE — Two buttons ("All" and "Unread") let the user switch between
 *    seeing every notification or only the ones they have not read yet.
 *    The active filter is highlighted with a white pill and a subtle shadow.
 *
 * 3. MARK ALL READ — When there is at least one unread notification, a
 *    "Mark all read" button appears. Clicking it calls the onMarkAll callback
 *    so the parent can update state.
 *
 * ─── Props ───────────────────────────────────────────────────────────────────
 * @prop {number}           unreadCount - Total number of unread notifications.
 *                                        Used for the subtitle and to decide
 *                                        whether to show the "Mark all read" button.
 * @prop {'all'|'unread'}   filter      - The currently active filter tab.
 * @prop {Function}         onFilter    - Callback fired when the user clicks a
 *                                        filter button. Receives the new filter value.
 * @prop {Function}         onMarkAll   - Callback fired when the user clicks
 *                                        "Mark all read".
 *
 * ─── Translation namespace ───────────────────────────────────────────────────
 * All user-facing strings use the "notificationsHeader" namespace from en.json.
 */

import { useTranslations } from 'next-intl'
import { FiBell, FiCheck } from 'react-icons/fi'

// ─── Types ────────────────────────────────────────────────────────────────────

/**
 * @typedef Props
 * The props accepted by the NotificationsHeader component.
 *
 * @property {number}         unreadCount - Number of unread notifications.
 * @property {'all'|'unread'} filter      - Which filter tab is currently active.
 * @property {Function}       onFilter    - Called with the new filter value when
 *                                         the user switches tabs.
 * @property {Function}       onMarkAll   - Called when the user clicks "Mark all read".
 */
interface Props {
  unreadCount: number
  filter:      'all' | 'unread'
  onFilter:    (f: 'all' | 'unread') => void
  onMarkAll:   () => void
}

// ─── Component ────────────────────────────────────────────────────────────────

/**
 * @component NotificationsHeader
 * @description
 * Renders the top header bar for the Notifications page. Includes the page
 * title, unread count subtitle, filter tabs, and the "Mark all read" button.
 *
 * This is a purely presentational component — it holds no state of its own.
 * All behaviour is driven by the props passed in from the parent.
 *
 * @param {Props} props - See the Props typedef above.
 * @returns {JSX.Element} The header bar element.
 */
export default function NotificationsHeader({ unreadCount, filter, onFilter, onMarkAll }: Props) {

  /**
   * t() is the translation function from next-intl.
   * All keys for this component live under the "notificationsHeader" namespace in en.json.
   */
  const t = useTranslations('notificationsHeader')

  return (
    <div className="shrink-0 bg-white border-b border-gray-200 px-6 py-5">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between">

          {/* ── Left side: Bell icon + title + unread count ── */}
          <div className="flex items-center gap-3">

            {/* Bell icon badge */}
            <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
              <FiBell size={18} className="text-blue-600" />
            </div>

            <div>
              {/* Page title */}
              <h1 className="text-xl font-bold text-gray-900">
                {t('title')}
              </h1>

              {/* Unread count subtitle.
                  Uses next-intl's built-in pluralisation via the "count" variable.
                  The en.json entry handles singular vs plural automatically. */}
              <p className="text-xs text-gray-500 mt-0.5">
                {t('unreadCount', { count: unreadCount })}
              </p>
            </div>
          </div>

          {/* ── Right side: Filter tabs + Mark all read button ── */}
          <div className="flex items-center gap-2">

            {/* ── Filter Toggle ──
                Renders an "All" and "Unread" button inside a pill container.
                The active tab gets a white background and shadow to stand out. */}
            <div className="flex items-center gap-1 p-1 bg-gray-100 rounded-lg">
              {(['all', 'unread'] as const).map((f) => (
                <button
                  key={f}
                  onClick={() => onFilter(f)}
                  className={`px-3 py-1.5 text-xs font-medium rounded-md transition ${
                    filter === f
                      ? 'bg-white text-gray-900 shadow-sm'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  {/*
                   * t('filters.all') → "All"
                   * t('filters.unread') → "Unread"
                   * Using the filter value as the key to pick the right label.
                   */}
                  {t(`filters.${f}`)}
                </button>
              ))}
            </div>

            {/* ── Mark All Read Button ──
                Only rendered when there is at least one unread notification.
                Clicking fires the onMarkAll callback passed in from the parent. */}
            {unreadCount > 0 && (
              <button
                onClick={onMarkAll}
                className="flex items-center gap-2 px-3 py-2 text-xs font-medium text-gray-700 bg-white border border-gray-200 rounded-md hover:bg-gray-50 transition"
              >
                <FiCheck size={14} /> {t('markAllRead')}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}