/**
 * TopNavbar.tsx
 * --------------
 * The top navigation bar rendered across the entire Underpeaks console.
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

export default function TopNavbar({ user: propUser, logoUrl, projectName }: TopNavbarProps) {
  const [mounted, setMounted] = useState(false)
  const [notifications, setNotifications] = useState<any[]>([])
  const [conversations, setConversations] = useState<any[]>([])

  const user: NXFUser | null = propUser ?? null

  const t = useTranslations('topNavbar')

  const fetchData = useCallback(async () => {
    const token = localStorage.getItem('authToken')

    if (!token) return

    const headers = {
      'Authorization': `Bearer ${token}`,
    }

    try {
      const [notifRes, ] = await Promise.all([
        fetch('/api/notifications/list', { headers }),
      ])

      const notifData = await notifRes.json()

      console.log(notifData);

      if (notifData.notifications) setNotifications(notifData.notifications)

    } catch {
      console.error('[TopNavbar] Failed to fetch notifications or messages. Check API connectivity.')
    }
  }, [])

  useEffect(() => {
    setMounted(true)
    fetchData()

    const interval = setInterval(fetchData, 60 * 1000)

    return () => clearInterval(interval)
  }, [fetchData])

  const handleMarkNotificationRead = async (notification_id: string) => {
    const token = localStorage.getItem('authToken') ?? ''
    await fetch('/api/notifications/mark-read', {
      method:  'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({ notification_id }),
    })

    setNotifications((prev) =>
      prev.map((n) => n.id === notification_id ? { ...n, status: 'read' } : n)
    )
  }

  const handleMarkAllNotificationsRead = async () => {
    const token = localStorage.getItem('authToken') ?? ''
    await fetch('/api/notifications/mark-all-read', {
      method:  'POST',
      headers: { 'Authorization': `Bearer ${token}` },
    })

    setNotifications((prev) => prev.map((n) => ({ ...n, status: 'read' })))
  }

  const handleMarkConversationRead = async (conversation_id: string) => {
    const token = localStorage.getItem('authToken') ?? ''
    await fetch('/api/messages/mark-read', {
      method:  'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({ conversation_id }),
    })

    setConversations((prev) =>
      prev.map((c) =>
        (c.con_id ?? c.id) === conversation_id
          ? { ...c, unread_count: 0 }
          : c
      )
    )
  }

  if (!mounted) return <div className="h-16 bg-white" aria-hidden="true" />

  return (
    <nav
      className="fixed top-0 left-0 right-0 h-16 bg-white shadow-md border-b border-gray-200 z-50"
      aria-label={t('aria.navbar')}
    >
      <div className="flex items-center justify-between px-4 h-full w-full">

        {/* ── Left: Logo + Project Name ── */}
        <Link
          href="/console/dashboard"
          className="flex items-center gap-3"
          aria-label={t('aria.goToDashboard')}
        >
          {logoUrl ? (
            <img
              src={logoUrl}
              alt={t('logoAlt')}
              className="h-8 w-auto object-contain"
            />
          ) : (
            <span className="text-black text-xl font-semibold">NextFlutter</span>
          )}

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

          <LocaleSwitcher />

          <Separator orientation="vertical" className="h-6 bg-gray-200 mx-1" aria-hidden="true" />

          <NotificationsDropdown
            notifications={notifications}
            onMarkRead={handleMarkNotificationRead}
            onMarkAllRead={handleMarkAllNotificationsRead}
          />

          <Separator orientation="vertical" className="h-6 bg-gray-200 mx-1" aria-hidden="true" />

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