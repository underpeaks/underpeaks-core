/**
 * MessagesPage.tsx
 * -----------------
 * Main page for the messaging system.
 *
 * What does this page do?
 * ------------------------
 * This page is the central hub for all messaging functionality. It includes:
 *
 * 1. A header displaying:
 *    - Page title ("Messages")
 *    - Total unread message count
 *    - Filter controls (All / Unread)
 *    - "Mark all as read" action
 *
 * 2. A conversation list (left side):
 *    - Displays all conversations
 *    - Can be filtered (all or unread only)
 *
 * 3. A conversation thread (right side):
 *    - Displays messages for the selected conversation
 *
 * 4. Empty state:
 *    - Shown when no conversation is selected
 *
 * Data flow:
 * -----------
 * - Conversations are fetched on mount
 * - Selecting a conversation:
 *    → sets it as active
 *    → marks it as read (if needed)
 * - Deleting a conversation:
 *    → removes it from the list
 * - Mark all as read:
 *    → updates all conversations locally
 *
 * ⚠️ Translation rules:
 *   - ALL user-facing text must use next-intl
 *
 * ⚠️ Security rules:
 *   - Never expose or log auth tokens
 *   - Token must be read inside functions (avoid SSR issues)
 */

'use client'

import { useState, useEffect } from 'react'
import { useTranslations }     from 'next-intl'
import { FiMail, FiCheck }     from 'react-icons/fi'
import { useConsoleStore }     from '@/app/store/consoleStore'
import ConversationList        from './components/ConversationList'
import ConversationThread      from './components/ConversationThread'
import EmptyState              from './components/EmptyState'
import Loader                  from '../Loading'
  import { useSearchParams } from 'next/navigation'
// ─────────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────────

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

// ─────────────────────────────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────────────────────────────

export default function MessagesPage() {
  const { user } = useConsoleStore()

  const [conversations, setConversations] = useState<Conversation[]>([])
  const [activeConv,    setActiveConv]    = useState<Conversation | null>(null)
  const [filter,        setFilter]        = useState<'all' | 'unread'>('all')
  const [loading,       setLoading]       = useState(true)
  const [error,         setError]         = useState<string | null>(null)


// INSIDE the component, after the existing state declarations, ADD:
const searchParams = useSearchParams()
const openId       = searchParams.get('open')

  const t = useTranslations('messagesPage')

  /**
   * getAuthHeaders
   * ----------------
   * Safely retrieves the auth token and builds request headers.
   *
   * ⚠️ Token is read inside a function to avoid SSR issues
   */
  const getAuthHeaders = () => {
    const token = localStorage.getItem('authToken') ?? ''
    return {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    }
  }

  // ── Load conversations on mount ──
  useEffect(() => {
  const load = async () => {
    try {
      const headers = getAuthHeaders()
      const res     = await fetch('/api/messages/list', { headers })
      const data    = await res.json()
      const convs: Conversation[] = data.conversations ?? []
      setConversations(convs)

      // Auto-select if arriving from the dropdown (?open=<con_id>)
      if (openId) {
        const match = convs.find((c) => (c.con_id ?? c.id) === openId)
        if (match && match.unread_count > 0) {
          const convId = match.con_id ?? match.id
          await fetch('/api/messages/mark-read', {
            method:  'POST',
            headers,
            body:    JSON.stringify({ conversation_id: convId }),
          })
          setConversations((prev) =>
            prev.map((c) => (c.con_id ?? c.id) === convId ? { ...c, unread_count: 0 } : c)
          )
          setActiveConv({ ...match, unread_count: 0 })
        } else if (match) {
          setActiveConv(match)
        }
      }
    } catch {
      setError(t('errors.load'))
    } finally {
      setLoading(false)
    }
  }
  load()
// eslint-disable-next-line react-hooks/exhaustive-deps
}, [])

  // ── Handle selecting a conversation ──
  const handleSelect = async (conv: Conversation) => {
    setActiveConv(conv)

    if (conv.unread_count > 0) {
      const convId = conv.con_id ?? conv.id

      await fetch('/api/messages/mark-read', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ conversation_id: convId }),
      })

      // Update UI immediately
      setConversations((prev) =>
        prev.map((c) =>
          (c.con_id ?? c.id) === convId
            ? { ...c, unread_count: 0 }
            : c
        )
      )
    }
  }

  // ── Handle deleting a conversation ──
  const handleDelete = async (convId: string) => {
    try {
      await fetch('/api/messages/delete', {
        method: 'DELETE',
        headers: getAuthHeaders(),
        body: JSON.stringify({ conversation_id: convId }),
      })

      setConversations((prev) =>
        prev.filter((c) => (c.con_id ?? c.id) !== convId)
      )

      if ((activeConv?.con_id ?? activeConv?.id) === convId) {
        setActiveConv(null)
      }

    } catch {
      setError(t('errors.delete'))
    }
  }

  // ── Handle mark all as read ──
  const handleMarkAllRead = async () => {
    try {
      await fetch('/api/messages/mark-all-read', {
        method: 'POST',
        headers: getAuthHeaders(),
      })

      setConversations((prev) =>
        prev.map((c) => ({ ...c, unread_count: 0 }))
      )

    } catch {
      setError(t('errors.markAll'))
    }
  }

  // ── Derived values ──
  const filtered = filter === 'unread'
    ? conversations.filter((c) => c.unread_count > 0)
    : conversations

  const unreadCount = conversations.reduce(
    (acc, c) => acc + (c.unread_count ?? 0),
    0
  )

  const currentUserId = user?.user_id ?? ''

  if (loading) return <Loader />

  return (
    <div className="absolute inset-0 flex flex-col bg-gray-100 overflow-hidden">

      {/* ── Header ── */}
      <div className="shrink-0 bg-white border-b border-gray-200 px-6 py-5">
        <div className="flex items-center justify-between">

          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
              <FiMail size={18} className="text-blue-600" />
            </div>

            <div>
              <h1 className="text-xl font-bold text-gray-900">
                {t('title')}
              </h1>

              <p className="text-xs text-gray-500 mt-0.5">
                {t('unreadCount', { count: unreadCount })}
              </p>
            </div>
          </div>

          {/* ── Filters + Actions ── */}
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
                  {t(`filters.${f}`)}
                </button>
              ))}
            </div>

            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllRead}
                className="flex items-center gap-2 px-3 py-2 text-xs font-medium text-gray-700 bg-white border border-gray-200 rounded-md hover:bg-gray-50 transition"
              >
                <FiCheck size={14} />
                {t('markAllRead')}
              </button>
            )}

          </div>
        </div>
      </div>

      {/* ── Error Banner ── */}
      {error && (
        <div className="mx-6 mt-4 px-4 py-2 bg-red-50 border border-red-200 rounded-md text-xs text-red-600 flex items-center justify-between">
          {error}
          <button
            onClick={() => setError(null)}
            className="ml-3 text-red-400 hover:text-red-600"
            aria-label={t('closeError')}
          >
            ✕
          </button>
        </div>
      )}

      {/* ── Body ── */}
      <div className="flex-1 flex overflow-hidden">

        {/* Conversation list */}
        <div className={`flex flex-col overflow-y-auto border-r border-gray-200 bg-white transition-all ${
          activeConv ? 'w-80 shrink-0' : 'flex-1'
        }`}>
          <ConversationList
            conversations={filtered}
            activeId={activeConv?.con_id ?? activeConv?.id ?? null}
            filter={filter}
            onSelect={handleSelect}
          />
        </div>

        {/* Thread / Empty state */}
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
              message={t('empty.title')}
              sub={t('empty.sub')}
            />
          </div>
        )}

      </div>
    </div>
  )
}