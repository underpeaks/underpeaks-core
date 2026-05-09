'use client'

import { useState, useEffect }   from 'react'
import { FiMail, FiCheck }       from 'react-icons/fi'
import { useConsoleStore }        from '@/app/store/consoleStore'
import ConversationList           from './components/ConversationList'
import ConversationThread         from './components/ConversationThread'
import EmptyState                 from './components/EmptyState'
import Loader                     from '../Loading'

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

export default function MessagesPage() {
  const { user }                                    = useConsoleStore()
  const [conversations,  setConversations]          = useState<Conversation[]>([])
  const [activeConv,     setActiveConv]             = useState<Conversation | null>(null)
  const [filter,         setFilter]                 = useState<'all' | 'unread'>('all')
  const [loading,        setLoading]                = useState(true)
  const [error,          setError]                  = useState<string | null>(null)

  const token   = typeof window !== 'undefined' ? localStorage.getItem('authToken') ?? '' : ''
  const headers = { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' }

  useEffect(() => {
    const load = async () => {
      try {
        const res  = await fetch('/api/messages/list', { headers: { 'Authorization': `Bearer ${token}` } })
        const data = await res.json()
        setConversations(data.conversations ?? [])
      } catch {
        setError('Failed to load messages')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  const handleSelect = async (conv: Conversation) => {
    setActiveConv(conv)
    if (conv.unread_count > 0) {
      const convId = conv.con_id ?? conv.id
      await fetch('/api/messages/mark-read', {
        method: 'POST', headers,
        body:   JSON.stringify({ conversation_id: convId }),
      })
      setConversations((prev) =>
        prev.map((c) => (c.con_id ?? c.id) === convId ? { ...c, unread_count: 0 } : c)
      )
    }
  }

  const handleDelete = async (convId: string) => {
    try {
      await fetch('/api/messages/delete', {
        method: 'DELETE', headers,
        body:   JSON.stringify({ conversation_id: convId }),
      })
      setConversations((prev) => prev.filter((c) => (c.con_id ?? c.id) !== convId))
      if ((activeConv?.con_id ?? activeConv?.id) === convId) setActiveConv(null)
    } catch {
      setError('Failed to delete conversation')
    }
  }

  const handleMarkAllRead = async () => {
    try {
      await fetch('/api/messages/mark-all-read', { method: 'POST', headers })
      setConversations((prev) => prev.map((c) => ({ ...c, unread_count: 0 })))
    } catch {
      setError('Failed to mark all as read')
    }
  }

  const filtered      = filter === 'unread'
    ? conversations.filter((c) => c.unread_count > 0)
    : conversations
  const unreadCount   = conversations.reduce((acc, c) => acc + (c.unread_count ?? 0), 0)
  const currentUserId = user?.user_id ?? ''

  if (loading) return <Loader />

  return (
    <div className="absolute inset-0 flex flex-col bg-gray-100 overflow-hidden">

      {/* Header */}
      <div className="shrink-0 bg-white border-b border-gray-200 px-6 py-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
              <FiMail size={18} className="text-blue-600" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900">Messages</h1>
              <p className="text-xs text-gray-500 mt-0.5">
                {unreadCount} unread message{unreadCount !== 1 ? 's' : ''}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1 p-1 bg-gray-100 rounded-lg">
              {(['all', 'unread'] as const).map((f) => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={`px-3 py-1.5 text-xs font-medium rounded-md transition ${
                    filter === f
                      ? 'bg-white text-gray-900 shadow-sm'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  {f.charAt(0).toUpperCase() + f.slice(1)}
                </button>
              ))}
            </div>
            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllRead}
                className="flex items-center gap-2 px-3 py-2 text-xs font-medium text-gray-700 bg-white border border-gray-200 rounded-md hover:bg-gray-50 transition"
              >
                <FiCheck size={14} /> Mark all read
              </button>
            )}
          </div>
        </div>
      </div>

      {error && (
        <div className="mx-6 mt-4 px-4 py-2 bg-red-50 border border-red-200 rounded-md text-xs text-red-600 flex items-center justify-between">
          {error}
          <button onClick={() => setError(null)} className="ml-3 text-red-400 hover:text-red-600">✕</button>
        </div>
      )}

      {/* Body */}
      <div className="flex-1 flex overflow-hidden">

        {/* Conversation list */}
        <div className={`flex flex-col overflow-y-auto border-r border-gray-200 bg-white transition-all ${activeConv ? 'w-80 shrink-0' : 'flex-1'}`}>
          <ConversationList
            conversations={filtered}
            activeId={activeConv?.con_id ?? activeConv?.id ?? null}
            filter={filter}
            onSelect={handleSelect}
          />
        </div>

        {/* Thread or empty state */}
        {activeConv ? (
          <ConversationThread
            conversation={activeConv}
            currentUserId={currentUserId}
            onDelete={handleDelete}
          />
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center bg-white">
            <EmptyState
              type="thread"
              message="Select a conversation"
              sub="Choose a conversation from the list to read it here."
            />
          </div>
        )}
      </div>
    </div>
  )
}