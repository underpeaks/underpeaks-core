'use client'

import { FiMail } from 'react-icons/fi'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

interface Conversation {
  id:                   string
  con_id?:              string
  subject:              string
  last_message_preview?: string
  last_message_at?:     string
  unread_count:         number
  is_system:            boolean
  created_by:           string
}

interface Props {
  conversations: Conversation[]
  onMarkRead:    (conversation_id: string) => void
}

function timeAgo(dateStr?: string): string {
  if (!dateStr) return ''
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1)  return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24)  return `${hrs}h ago`
  return `${Math.floor(hrs / 24)}d ago`
}

function getInitials(name: string): string {
  return name.trim().split(/\s+/).map((p) => p[0]).join('').slice(0, 2).toUpperCase()
}

export default function MessagesDropdown({ conversations, onMarkRead }: Props) {
  const router      = useRouter()
  const unreadCount = conversations.reduce((acc, c) => acc + (c.unread_count ?? 0), 0)
  const recent      = conversations.slice(0, 5)

  const handleClick = (conv: Conversation) => {
    const id = conv.con_id ?? conv.id
    if (conv.unread_count > 0) onMarkRead(id)
    router.push(`/console/messages/${id}`)
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="relative flex items-center justify-center w-9 h-9 rounded-full bg-gray-100 hover:bg-gray-200 focus:outline-none">
        <FiMail size={18} className="text-gray-600" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] bg-red-500 rounded-full flex items-center justify-center px-1">
            <span className="text-[10px] font-bold text-white leading-none">{unreadCount}</span>
          </span>
        )}
      </DropdownMenuTrigger>

      <DropdownMenuContent side="bottom" align="end" className="w-80 rounded-lg border border-gray-200 bg-white shadow-lg p-0">

        {/* Header */}
        <div className="px-4 py-3 flex items-center justify-between">
          <span className="text-sm font-semibold text-gray-800">Messages</span>
          <span className="text-xs text-gray-400">{unreadCount} unread</span>
        </div>

        <DropdownMenuSeparator />

        {/* List */}
        {recent.length === 0 ? (
          <div className="px-4 py-6 text-center text-xs text-gray-400">
            No messages yet
          </div>
        ) : (
          recent.map((conv, i) => {
            const id       = conv.con_id ?? conv.id
            const initials = conv.is_system ? 'SY' : getInitials(conv.created_by ?? 'User')
            const isUnread = conv.unread_count > 0

            return (
              <div key={id}>
                <div
                  onClick={() => handleClick(conv)}
                  className={`px-4 py-3 hover:bg-gray-50 cursor-pointer ${isUnread ? 'bg-blue-50/50' : ''}`}
                >
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-full bg-gray-200 text-gray-600 flex items-center justify-center text-xs font-semibold shrink-0">
                      {initials}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <p className={`text-sm ${isUnread ? 'font-semibold text-gray-800' : 'font-medium text-gray-600'}`}>
                          {conv.subject}
                        </p>
                        <span className="text-[10px] text-gray-400 whitespace-nowrap shrink-0">
                          {timeAgo(conv.last_message_at)}
                        </span>
                      </div>
                      {conv.last_message_preview && (
                        <p className="text-xs text-gray-400 truncate mt-0.5">
                          {conv.last_message_preview}
                        </p>
                      )}
                      {isUnread && (
                        <span className="inline-block mt-1 text-[10px] px-1.5 py-0.5 rounded-full bg-blue-100 text-blue-600 font-medium">
                          {conv.unread_count} unread
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                {i < recent.length - 1 && <DropdownMenuSeparator />}
              </div>
            )
          })
        )}

        <DropdownMenuSeparator />
        <Link href="/console/messages">
          <div className="px-4 py-2 text-center hover:bg-gray-50 cursor-pointer">
            <span className="text-xs text-blue-500 hover:underline">View all messages</span>
          </div>
        </Link>

      </DropdownMenuContent>
    </DropdownMenu>
  )
}