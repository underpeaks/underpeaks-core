'use client'

import { useState, useEffect } from 'react'
import NotificationsHeader from './components/NotificationsHeader'
import NotificationsList   from './components/NotificationsList'
import Loader              from '../Loading'

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

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [filter,        setFilter]        = useState<'all' | 'unread'>('all')
  const [loading,       setLoading]       = useState(true)
  const [error,         setError]         = useState<string | null>(null)

  const token = typeof window !== 'undefined'
    ? localStorage.getItem('authToken') ?? ''
    : ''

  const headers = {
    'Authorization': `Bearer ${token}`,
    'Content-Type':  'application/json',
  }

  useEffect(() => {
    const load = async () => {
      try {
        const res  = await fetch('/api/notifications/list', { headers: { 'Authorization': `Bearer ${token}` } })
        const data = await res.json()
        setNotifications(data.notifications ?? [])
      } catch {
        setError('Failed to load notifications')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  const handleMarkRead = async (id: string) => {
    try {
      await fetch('/api/notifications/mark-read', {
        method: 'POST', headers,
        body:   JSON.stringify({ notification_id: id }),
      })
      setNotifications((prev) =>
        prev.map((n) => n.id === id ? { ...n, status: 'read' } : n)
      )
    } catch {
      setError('Failed to mark as read')
    }
  }

  const handleMarkAllRead = async () => {
    try {
      await fetch('/api/notifications/mark-all-read', { method: 'POST', headers })
      setNotifications((prev) => prev.map((n) => ({ ...n, status: 'read' })))
    } catch {
      setError('Failed to mark all as read')
    }
  }

  const handleDelete = async (id: string) => {
    try {
      await fetch('/api/notifications/mark-read', {
        method: 'POST', headers,
        body:   JSON.stringify({ notification_id: id }),
      })
      // Soft delete — set status to deleted
      setNotifications((prev) => prev.filter((n) => n.id !== id))
    } catch {
      setError('Failed to delete notification')
    }
  }

  const filtered = filter === 'unread'
    ? notifications.filter((n) => n.status === 'unread')
    : notifications

  const unreadCount = notifications.filter((n) => n.status === 'unread').length

  if (loading) return <Loader />

  return (
    <div className="absolute inset-0 flex flex-col bg-gray-100 overflow-hidden">
      <NotificationsHeader
        unreadCount={unreadCount}
        filter={filter}
        onFilter={setFilter}
        onMarkAll={handleMarkAllRead}
      />
      {error && (
        <div className="mx-6 mt-4 px-4 py-2 bg-red-50 border border-red-200 rounded-md text-xs text-red-600 flex items-center justify-between">
          {error}
          <button onClick={() => setError(null)} className="ml-3 text-red-400 hover:text-red-600">✕</button>
        </div>
      )}
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