'use client'

import EmptyState from './EmptyState'

interface Conversation {
  id:                    string
  con_id?:               string
  subject:               string
  last_message_preview?: string
  last_message_at?:      string
  unread_count:          number
  is_system:             boolean
  created_by:            string
}

interface Props {
  conversations:  Conversation[]
  activeId:       string | null
  filter:         'all' | 'unread'
  onSelect:       (conv: Conversation) => void
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

function getInitials(str: string): string {
  return str.trim().split(/\s+/).map((p) => p[0]).join('').slice(0, 2).toUpperCase()
}

const avatarColors = [
  'bg-violet-500', 'bg-blue-500', 'bg-emerald-500',
  'bg-rose-500',   'bg-amber-500', 'bg-gray-400',
]

function getColor(str: string): string {
  const i = str.charCodeAt(0) % avatarColors.length
  return avatarColors[i]
}

export default function ConversationList({ conversations, activeId, filter, onSelect }: Props) {
  if (conversations.length === 0) {
    return (
      <EmptyState
        type="inbox"
        message="No messages"
        sub={filter === 'unread' ? 'All caught up!' : 'Your inbox is empty.'}
      />
    )
  }

  return (
    <>
      {conversations.map((conv) => {
        const id       = conv.con_id ?? conv.id
        const isUnread = conv.unread_count > 0
        const isActive = activeId === id
        const initials = conv.is_system ? 'SY' : getInitials(conv.created_by ?? 'U')
        const color    = conv.is_system ? 'bg-gray-400' : getColor(conv.created_by ?? 'U')

        return (
          <div
            key={id}
            onClick={() => onSelect(conv)}
            className={`flex items-start gap-3 px-4 py-4 border-b border-gray-100 cursor-pointer transition-colors ${
              isActive  ? 'bg-blue-50' :
              isUnread  ? 'bg-blue-50/40 hover:bg-blue-50/70' :
                          'hover:bg-gray-50'
            }`}
          >
            <div className={`w-9 h-9 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0 ${color}`}>
              {initials}
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2">
                <p className={`text-sm truncate ${isUnread ? 'font-semibold text-gray-900' : 'font-medium text-gray-600'}`}>
                  {conv.subject}
                </p>
                <span className="text-[10px] text-gray-400 whitespace-nowrap">
                  {timeAgo(conv.last_message_at)}
                </span>
              </div>
              {conv.last_message_preview && (
                <p className="text-xs text-gray-400 truncate mt-0.5">{conv.last_message_preview}</p>
              )}
              {isUnread && (
                <span className="inline-block mt-1 text-[10px] px-1.5 py-0.5 rounded-full bg-blue-100 text-blue-600 font-medium">
                  {conv.unread_count} unread
                </span>
              )}
            </div>

            {isUnread && (
              <span className="w-2 h-2 bg-blue-500 rounded-full shrink-0 mt-1.5" />
            )}
          </div>
        )
      })}
    </>
  )
}