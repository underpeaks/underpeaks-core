/**
 * TopNavbar.tsx
 * --------------
 * The top navigation bar rendered across the entire NXTFlutter console.
 * It is fixed to the top of the viewport and always visible while the user
 * is in the console, regardless of which page they are on.
 *
 * What does this component render?
 * ---------------------------------
 * From left to right:
 *  1. Logo + project name  — links back to the dashboard
 *  2. Locale switcher      — lets the user change their language
 *  3. Notifications bell   — shows unread notifications with mark-read actions
 *  4. Messages icon        — shows unread conversations with mark-read actions
 *  5. User dropdown        — shows user avatar/initials with account options
 *     OR Sign In / Register links if no user is logged in
 *
 * How does data loading work?
 * ----------------------------
 * On mount, the component fetches both notifications and messages in parallel
 * using Promise.all() (so both requests run at the same time, not one after the other).
 * It then polls every 60 seconds to check for new notifications/messages automatically,
 * without requiring the user to refresh the page.
 * The polling interval is cleaned up when the component unmounts to prevent memory leaks.
 *
 * What is the "mounted" pattern?
 * --------------------------------
 * Next.js renders components on the server first, then "hydrates" them on the client.
 * localStorage is only available in the browser (not on the server), so we use a
 * `mounted` state flag to delay any browser-only code until after the first client render.
 * Before mounting is confirmed, we render a plain empty div as a placeholder so the
 * layout doesn't shift when the navbar appears.
 *
 * ⚠️  Security rules for this component:
 *   - Never log the auth token read from localStorage — it is a security credential
 *   - Never log raw API error responses — they may contain header or session details
 */

'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { useTranslations } from 'next-intl'
import { FiLogIn, FiUserPlus } from 'react-icons/fi'
import { Separator } from '@/components/ui/separator'
import NotificationsDropdown from './NotificationsDropdown'
import MessagesDropdown from './MessagesDropdown'
import UserDropdown from './UserDropdown'
import { TopNavbarProps } from './types'
import { NXFUser } from '../../store/consoleStore'
import LocaleSwitcher from '@/core/LocaleSwitcher'

/**
 * TopNavbar
 * ----------
 * The main top navigation bar component for the console.
 *
 * @param user        - The currently logged-in user object, or undefined if not logged in.
 *                      When undefined, Sign In and Register links are shown instead of
 *                      the user dropdown.
 * @param logoUrl     - Optional URL of the project's custom logo image.
 *                      When not provided, the "NextFlutter" text logo is shown instead.
 * @param projectName - Optional name of the current project.
 *                      When provided, it is shown next to the logo separated by a divider.
 */
export default function TopNavbar({ user: propUser, logoUrl, projectName }: TopNavbarProps) {
  // Tracks whether the component has mounted on the client side.
  // We use this to avoid accessing localStorage during server-side rendering,
  // which would cause a "localStorage is not defined" error.
  const [mounted, setMounted] = useState(false)

  // The list of notifications for the current user.
  // TODO: Replace `any[]` with a proper Notification type once the API response shape is finalised.
  const [notifications, setNotifications] = useState<any[]>([])

  // The list of message conversations for the current user.
  // TODO: Replace `any[]` with a proper Conversation type once the API response shape is finalised.
  const [conversations, setConversations] = useState<any[]>([])

  // Normalise the user prop — treat undefined as null so the rest of the
  // component only has to handle null (not undefined) for the "no user" case
  const user: NXFUser | null = propUser ?? null

  // Access translated strings for this component
  const t = useTranslations('topNavbar')

  /**
   * fetchData
   * ----------
   * Fetches the current user's notifications and messages from the API in parallel.
   * Both requests are sent at the same time using Promise.all() for efficiency.
   *
   * This function is wrapped in useCallback so it has a stable reference across
   * renders — important because it is used as a dependency in the useEffect below.
   * Without useCallback, a new function reference would be created on every render,
   * causing the useEffect to re-run and the polling interval to reset endlessly.
   *
   * ⚠️  The auth token is read from localStorage here.
   *     It is used only as a Bearer header for authentication.
   *     It must never be logged or stored anywhere other than the Authorization header.
   */
  const fetchData = useCallback(async () => {
    // Read the auth token from localStorage.
    // If no token is present, the user is not logged in — skip the fetch.
    // ⚠️ Never log this token value.
    const token = localStorage.getItem('authToken')
    if (!token) return

    // Build the auth header — this is the only place the token is used
    const headers = {
      'Authorization': `Bearer ${token}`,
    }

    try {
      // Fetch notifications and messages simultaneously.
      // Promise.all() runs both requests in parallel and waits for both to complete.
      // This is faster than awaiting them one at a time.
      const [notifRes, msgRes] = await Promise.all([
        fetch('/api/notifications/list', { headers }),
        fetch('/api/messages/list',      { headers }),
      ])

      const notifData = await notifRes.json()
      const msgData   = await msgRes.json()

      // Only update state if the expected data shape is present in the response
      if (notifData.notifications) setNotifications(notifData.notifications)
      if (msgData.conversations)   setConversations(msgData.conversations)

    } catch {
      // Log that the fetch failed without exposing the raw error (which may contain
      // request headers or partial response data with sensitive details)
      console.error('[TopNavbar] Failed to fetch notifications or messages. Check API connectivity.')
    }
  }, [])

  // ── Effect: Mount detection + initial data fetch + polling ──
  // Runs once on mount. Sets up the initial data load and starts the 60-second
  // polling interval to keep notifications and messages up to date.
  // The cleanup function (return () => clearInterval) stops the polling when the
  // component is removed from the page, preventing memory leaks.
  useEffect(() => {
    setMounted(true)
    fetchData()

    // Poll every 60 seconds for new notifications and messages.
    // This keeps the counts up to date without requiring a page refresh.
    const interval = setInterval(fetchData, 60 * 1000)

    // Cleanup: stop polling when the component unmounts
    return () => clearInterval(interval)
  }, [fetchData])

  /**
   * handleMarkNotificationRead
   * ---------------------------
   * Marks a single notification as read, both on the server and in local state.
   * We update local state immediately (optimistic update) so the UI responds
   * instantly without waiting for the server to confirm.
   *
   * @param notification_id - The ID of the notification to mark as read
   */
  const handleMarkNotificationRead = async (notification_id: string) => {
    // ⚠️ Token is never logged
    const token = localStorage.getItem('authToken') ?? ''
    await fetch('/api/notifications/mark-read', {
      method:  'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({ notification_id }),
    })

    // Update local state: find the notification by ID and set its status to 'read'
    setNotifications((prev) =>
      prev.map((n) => n.id === notification_id ? { ...n, status: 'read' } : n)
    )
  }

  /**
   * handleMarkAllNotificationsRead
   * --------------------------------
   * Marks every notification as read for the current user, both on the server
   * and in local state.
   */
  const handleMarkAllNotificationsRead = async () => {
    // ⚠️ Token is never logged
    const token = localStorage.getItem('authToken') ?? ''
    await fetch('/api/notifications/mark-all-read', {
      method:  'POST',
      headers: { 'Authorization': `Bearer ${token}` },
    })

    // Update local state: set all notifications to 'read'
    setNotifications((prev) => prev.map((n) => ({ ...n, status: 'read' })))
  }

  /**
   * handleMarkConversationRead
   * ---------------------------
   * Marks a conversation as read by resetting its unread message count to zero,
   * both on the server and in local state.
   *
   * Why check both con_id and id?
   * --------------------------------
   * Different database adapters may return the conversation ID under different
   * field names (con_id for some, id for others). We check both to ensure
   * compatibility across all supported database types.
   *
   * @param conversation_id - The ID of the conversation to mark as read
   */
  const handleMarkConversationRead = async (conversation_id: string) => {
    // ⚠️ Token is never logged
    const token = localStorage.getItem('authToken') ?? ''
    await fetch('/api/messages/mark-read', {
      method:  'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({ conversation_id }),
    })

    // Update local state: find the conversation by ID and reset its unread count
    setConversations((prev) =>
      prev.map((c) =>
        (c.con_id ?? c.id) === conversation_id
          ? { ...c, unread_count: 0 }
          : c
      )
    )
  }

  // ─────────────────────────────────────────────
  // RENDER: Pre-mount placeholder
  // ─────────────────────────────────────────────
  // During server-side rendering and before client hydration, we render an empty
  // div the same height as the navbar. This prevents layout shift when the
  // real navbar appears and keeps the page structure stable.
  if (!mounted) return <div className="h-16 bg-white" aria-hidden="true" />

  // ─────────────────────────────────────────────
  // RENDER: Full navbar
  // ─────────────────────────────────────────────
  return (
    <nav
      className="fixed top-0 left-0 right-0 h-16 bg-white shadow-md border-b border-gray-200 z-50"
      aria-label={t('aria.navbar')}
    >
      <div className="container mx-auto flex items-center justify-between px-6 h-full">

        {/* ── Left: Logo + Project Name ── */}
        {/* Clicking either element navigates back to the dashboard */}
        <Link
          href="/console/dashboard"
          className="flex items-center gap-3"
          aria-label={t('aria.goToDashboard')}
        >
          {/* Show custom logo image if provided, otherwise fall back to text logo */}
          {logoUrl ? (
            <img
              src={logoUrl}
              alt={t('logoAlt')}
              className="h-8 w-auto object-contain"
            />
          ) : (
            <span className="text-black text-xl font-semibold">NextFlutter</span>
          )}

          {/* Project name badge — only shown when a project name is provided */}
          {projectName && (
            <>
              <Separator orientation="vertical" className="h-5 bg-gray-300" aria-hidden="true" />
              <div className="flex items-center gap-2 px-3 py-1 rounded-md border border-gray-300 bg-gray-50 shadow-inner">
                <span className="text-xs font-normal text-gray-400">{t('projectLabel')}</span>
                <span className="text-base font-semibold text-gray-700">{projectName}</span>
              </div>
            </>
          )}
        </Link>

        {/* ── Right: Actions + User ── */}
        <div className="flex items-center gap-2">

          {/* Language / locale switcher */}
          <LocaleSwitcher />

          <Separator orientation="vertical" className="h-6 bg-gray-200 mx-1" aria-hidden="true" />

          {/* Notifications bell dropdown */}
          <NotificationsDropdown
            notifications={notifications}
            onMarkRead={handleMarkNotificationRead}
            onMarkAllRead={handleMarkAllNotificationsRead}
          />

          {/* Messages dropdown */}
          <MessagesDropdown
            conversations={conversations}
            onMarkRead={handleMarkConversationRead}
          />

          <Separator orientation="vertical" className="h-6 bg-gray-200 mx-1" aria-hidden="true" />

          {/* User dropdown (logged in) or Sign In / Register links (logged out) */}
          {user ? (
            <UserDropdown user={user} />
          ) : (
            <div className="flex space-x-3 items-center">
              <Link
                href="/signin"
                className="flex items-center gap-2 border border-gray-900 px-4 py-2 rounded-full text-sm font-medium text-gray-900 hover:bg-gray-100 transition"
              >
                <FiLogIn size={16} aria-hidden="true" />
                {t('signIn')}
              </Link>
              <Link
                href="/signup"
                className="flex items-center gap-2 border border-gray-900 px-4 py-2 rounded-full text-sm font-medium text-gray-900 hover:bg-gray-100 transition"
              >
                <FiUserPlus size={16} aria-hidden="true" />
                {t('register')}
              </Link>
            </div>
          )}

        </div>
      </div>
    </nav>
  )
}