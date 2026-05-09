'use client'

import { useState, useEffect, useRef } from 'react'
import { FiCheck, FiTrash2 }           from 'react-icons/fi'
import MessageBubble                    from './MessageBubble'
import ReplyBar                         from './ReplyBar'
import EmptyState                       from './EmptyState'

interface Conversation {
  id:                    string
  con_id?:               string
  subject:               string
  last_message_preview?: string
  is_system:             boolean
  created_by:            string
  unread_count:          number
}

interface Message {
  mes_id:     string
  sender_id:  string
  content:    string
  sent_at:    string
  is_read:    boolean
}

interface Props {
  conversation:  Conversation
  currentUserId: string
  onDelete:      (id: string) => void
}

export default function ConversationThread({ conversation, currentUserId, onDelete }: Props) {
  const [messages, setMessages] = useState<Message[]>([])
  const [loading,  setLoading]  = useState(true)
  const bottomRef              = useRef<HTMLDivElement>(null)
  const convId                 = conversation.con_id ?? conversation.id
  const token                  = localStorage.getItem('authToken') ?? ''

  const headers = {
    'Authorization': `Bearer ${token}`,
    'Content-Type':  'application/json',
  }

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      try {
        const res  = await fetch(`/api/messages/thread?conversation_id=${convId}`, { headers: { 'Authorization': `Bearer ${token}` } })
        const data = await res.json()
        setMessages(data.messages ?? [])
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [convId])

  // Auto scroll to bottom on new messages
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handleSend = async (content: string) => {
    const res  = await fetch('/api/messages/send', {
      method: 'POST', headers,
      body:   JSON.stringify({ conversation_id: convId, content }),
    })
    const data = await res.json()
    if (data.message) {
      setMessages((prev) => [...prev, data.message])
    }
  }

  return (
    <div className="flex-1 flex flex-col bg-white overflow-hidden">

      {/* Thread header */}
      <div className="shrink-0 px-6 py-5 border-b border-gray-100">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-base font-semibold text-gray-900">{conversation.subject}</h2>
            <p className="text-xs text-gray-400 mt-0.5">
              {conversation.is_system ? 'System message' : `From: ${conversation.created_by}`}
            </p>
          </div>
          <button
            onClick={() => onDelete(convId)}
            className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-red-600 bg-red-50 rounded-md hover:bg-red-100 transition shrink-0"
          >
            <FiTrash2 size={13} /> Delete
          </button>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-6 py-5 flex flex-col gap-3">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <span className="w-5 h-5 border-2 border-gray-300 border-t-gray-700 rounded-full animate-spin" />
          </div>
        ) : messages.length === 0 ? (
          <EmptyState type="thread" message="No messages yet" sub="Send the first message below." />
        ) : (
          messages.map((m) => (
            <MessageBubble key={m.mes_id} message={m} currentUserId={currentUserId} />
          ))
        )}
        <div ref={bottomRef} />
      </div>

      {/* Reply bar — disabled for system messages */}
      <ReplyBar onSend={handleSend} disabled={conversation.is_system} />
    </div>
  )
}