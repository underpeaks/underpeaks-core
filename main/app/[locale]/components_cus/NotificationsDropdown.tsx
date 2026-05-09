'use client'

import { FiBell, FiCheck } from 'react-icons/fi'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

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
  onMarkRead:    (id: string) => void
  onMarkAllRead: () => void
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

export default function NotificationsDropdown({ notifications, onMarkRead, onMarkAllRead }: Props) {
  const router      = useRouter()
  const unreadCount = notifications.filter((n) => n.status === 'unread').length
  const recent      = notifications.slice(0, 5)

  const handleClick = (n: Notification) => {
    if (n.status === 'unread') onMarkRead(n.id)
    if (n.action_url) router.push(n.action_url)
    else router.push('/console/notifications')
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="relative flex items-center justify-center w-9 h-9 rounded-full bg-gray-100 hover:bg-gray-200 focus:outline-none">
        <FiBell size={18} className="text-gray-600" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] bg-red-500 rounded-full flex items-center justify-center px-1">
            <span className="text-[10px] font-bold text-white leading-none">{unreadCount}</span>
          </span>
        )}
      </DropdownMenuTrigger>

      <DropdownMenuContent side="bottom" align="end" className="w-80 rounded-lg border border-gray-200 bg-white shadow-lg p-0">

        {/* Header */}
        <div className="px-4 py-3 flex items-center justify-between">
          <span className="text-sm font-semibold text-gray-800">Notifications</span>
          <div className="flex items-center gap-3">
            <span className="text-xs text-gray-400">{unreadCount} unread</span>
            {unreadCount > 0 && (
              <button
                onClick={onMarkAllRead}
                className="text-xs text-blue-500 hover:underline flex items-center gap-1"
              >
                <FiCheck size={11} /> Mark all read
              </button>
            )}
          </div>
        </div>

        <DropdownMenuSeparator />

        {/* List */}
        {recent.length === 0 ? (
          <div className="px-4 py-6 text-center text-xs text-gray-400">
            No notifications yet
          </div>
        ) : (
          recent.map((n, i) => (
            <div key={n.id}>
              <div
                onClick={() => handleClick(n)}
                className={`px-4 py-3 hover:bg-gray-50 cursor-pointer ${n.status === 'unread' ? 'bg-blue-50/50' : ''}`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1">
                    <div className="flex items-center gap-1.5">
                      {n.status === 'unread' && (
                        <span className="w-1.5 h-1.5 rounded-full bg-blue-500 shrink-0" />
                      )}
                      <p className={`text-sm ${n.status === 'unread' ? 'font-semibold text-gray-800' : 'font-medium text-gray-600'}`}>
                        {n.title}
                      </p>
                    </div>
                    {n.message && (
                      <p className="text-xs text-gray-400 mt-0.5 truncate">{n.message}</p>
                    )}
                  </div>
                  <span className="text-[10px] text-gray-400 whitespace-nowrap shrink-0">
                    {timeAgo(n.created_at)}
                  </span>
                </div>
              </div>
              {i < recent.length - 1 && <DropdownMenuSeparator />}
            </div>
          ))
        )}

        <DropdownMenuSeparator />
        <Link href="/console/notifications">
          <div className="px-4 py-2 text-center hover:bg-gray-50 cursor-pointer">
            <span className="text-xs text-blue-500 hover:underline">View all notifications</span>
          </div>
        </Link>

      </DropdownMenuContent>
    </DropdownMenu>
  )
}