'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { FiLogIn, FiUserPlus } from 'react-icons/fi'
import { Separator } from '@/components/ui/separator'
import NotificationsDropdown from './NotificationsDropdown'
import MessagesDropdown from './MessagesDropdown'
import UserDropdown from './UserDropdown'
import { TopNavbarProps } from './types'
import { NXFUser } from '../../store/consoleStore'
import LocaleSwitcher from '@/core/LocaleSwitcher'


export default function TopNavbar({ user: propUser, logoUrl, projectName }: TopNavbarProps) {
  const [mounted,       setMounted]       = useState(false)
  const [notifications, setNotifications] = useState<any[]>([])
  const [conversations, setConversations] = useState<any[]>([])

  const user: NXFUser | null = propUser ?? null

  const fetchData = useCallback(async () => {
    const token = localStorage.getItem('authToken')
    if (!token) return

    const headers = {
      'Authorization': `Bearer ${token}`,
    }

    try {
      const [notifRes, msgRes] = await Promise.all([
        fetch('/api/notifications/list', { headers }),
        fetch('/api/messages/list',      { headers }),
      ])

      const notifData = await notifRes.json()
      const msgData   = await msgRes.json()

      if (notifData.notifications) setNotifications(notifData.notifications)
      if (msgData.conversations)   setConversations(msgData.conversations)
    } catch (err) {
      console.error('[TopNavbar] Failed to fetch notifications/messages:', err)
    }
  }, [])

  useEffect(() => {
    setMounted(true)
    fetchData()

    // Poll every 60 seconds for new notifications/messages
    const interval = setInterval(fetchData, 60 * 1000)
    return () => clearInterval(interval)
  }, [fetchData])

  const handleMarkNotificationRead = async (notification_id: string) => {
    const token = localStorage.getItem('authToken') ?? ''
    await fetch('/api/notifications/mark-read', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body:    JSON.stringify({ notification_id }),
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
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body:    JSON.stringify({ conversation_id }),
    })
    setConversations((prev) =>
      prev.map((c) =>
        (c.con_id ?? c.id) === conversation_id ? { ...c, unread_count: 0 } : c
      )
    )
  }

  if (!mounted) return <div className="h-16 bg-white" />

  return (
    <nav className="fixed top-0 left-0 right-0 h-16 bg-white shadow-md border-b border-gray-200 z-50">
      <div className="container mx-auto flex items-center justify-between px-6 h-full">

        {/* ── Logo + project name ── */}
        <Link href="/console/dashboard" className="flex items-center gap-3">
          {logoUrl ? (
            <img src={logoUrl} alt="Logo" className="h-8 w-auto object-contain" />
          ) : (
            <span className="text-black text-xl font-semibold">NextFlutter</span>
          )}
          {projectName && (
            <>
              <Separator orientation="vertical" className="h-5 bg-gray-300" />
              <div className="flex items-center gap-2 px-3 py-1 rounded-md border border-gray-300 bg-gray-50 shadow-inner">
                <span className="text-xs font-normal text-gray-400">Project:</span>
                <span className="text-base font-semibold text-gray-700">{projectName}</span>
              </div>
            </>
          )}
        </Link>

        {/* ── Right area ── */}
        <div className="flex items-center gap-2">
         <LocaleSwitcher />
          <Separator orientation="vertical" className="h-6 bg-gray-200 mx-1" />
          <NotificationsDropdown
            notifications={notifications}
            onMarkRead={handleMarkNotificationRead}
            onMarkAllRead={handleMarkAllNotificationsRead}
          />
          <MessagesDropdown
            conversations={conversations}
            onMarkRead={handleMarkConversationRead}
          />
          <Separator orientation="vertical" className="h-6 bg-gray-200 mx-1" />

          {user ? (
            <UserDropdown user={user} />
          ) : (
            <div className="flex space-x-3 items-center">
              <Link href="/signin" className="flex items-center gap-2 border border-gray-900 px-4 py-2 rounded-full text-sm font-medium text-gray-900 hover:bg-gray-100 transition">
                <FiLogIn size={16} /> Sign In
              </Link>
              <Link href="/signup" className="flex items-center gap-2 border border-gray-900 px-4 py-2 rounded-full text-sm font-medium text-gray-900 hover:bg-gray-100 transition">
                <FiUserPlus size={16} /> Register
              </Link>
            </div>
          )}
        </div>
      </div>
    </nav>
  )
}