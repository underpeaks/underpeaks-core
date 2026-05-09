'use client'

import NotificationCard from './NotificationCard'
import EmptyState       from './EmptyState'

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

interface Props {
  notifications: Notification[]
  filter:        'all' | 'unread'
  onMarkRead:    (id: string) => void
  onDelete:      (id: string) => void
}

export default function NotificationsList({ notifications, filter, onMarkRead, onDelete }: Props) {
  if (notifications.length === 0) {
    return (
      <EmptyState
        message="No notifications"
        sub={filter === 'unread' ? 'All caught up!' : 'You have no notifications yet.'}
      />
    )
  }

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