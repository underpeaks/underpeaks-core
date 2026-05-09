'use client'

interface Message {
  mes_id:     string
  sender_id:  string
  content:    string
  sent_at:    string
  is_read:    boolean
}

interface Props {
  message:       Message
  currentUserId: string
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

export default function MessageBubble({ message, currentUserId }: Props) {
  const isMine = message.sender_id === currentUserId

  return (
    <div className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}>
      <div className={`max-w-[70%] rounded-2xl px-4 py-2.5 ${
        isMine
          ? 'bg-gray-900 text-white rounded-br-sm'
          : 'bg-white border border-gray-200 text-gray-800 rounded-bl-sm'
      }`}>
        <p className="text-sm leading-relaxed">{message.content}</p>
        <p className={`text-[10px] mt-1 ${isMine ? 'text-gray-400' : 'text-gray-400'}`}>
          {timeAgo(message.sent_at)}
        </p>
      </div>
    </div>
  )
}