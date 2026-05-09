'use client'

import { FiBell, FiCheck, FiTrash2, FiAlertCircle, FiUser, FiZap } from 'react-icons/fi'

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
  notification: Notification
  onMarkRead:   (id: string) => void
  onDelete:     (id: string) => void
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1)  return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24)  return `${hrs}h ago`
  return `${Math.floor(hrs / 24)}d ago`
}

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

export default function NotificationCard({ notification, onMarkRead, onDelete }: Props) {
  const isUnread = notification.status === 'unread'

  return (
    <div className={`bg-white border border-gray-200 rounded-lg p-4 hover:shadow-sm transition-shadow ${isUnread ? 'border-l-4 border-l-blue-500' : ''}`}>
      <div className="flex items-start gap-4">
        <TypeIcon type={notification.type} />

        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1">
              <div className="flex items-center gap-2">
                {isUnread && <span className="w-2 h-2 bg-blue-500 rounded-full shrink-0" />}
                <p className={`text-sm ${isUnread ? 'font-semibold text-gray-900' : 'font-medium text-gray-700'}`}>
                  {notification.title}
                </p>
                {notification.priority === 'urgent' && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-red-100 text-red-600 font-medium">
                    Urgent
                  </span>
                )}
                {notification.priority === 'high' && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-600 font-medium">
                    High
                  </span>
                )}
              </div>
              {notification.message && (
                <p className="text-xs text-gray-500 mt-1">{notification.message}</p>
              )}
              <p className="text-[10px] text-gray-400 mt-2">{timeAgo(notification.created_at)}</p>
            </div>
          </div>

          <div className="flex items-center gap-2 mt-3">
            {isUnread && (
              <button
                onClick={() => onMarkRead(notification.id)}
                className="flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-medium text-gray-600 bg-gray-50 rounded-md hover:bg-gray-100 transition"
              >
                <FiCheck size={12} /> Mark as read
              </button>
            )}
            {notification.action_url && (
              <a
                href={notification.action_url}
                className="flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-medium text-blue-600 bg-blue-50 rounded-md hover:bg-blue-100 transition"
              >
                View
              </a>
            )}
            <button
              onClick={() => onDelete(notification.id)}
              className="flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-medium text-red-600 bg-red-50 rounded-md hover:bg-red-100 transition"
            >
              <FiTrash2 size={12} /> Delete
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}