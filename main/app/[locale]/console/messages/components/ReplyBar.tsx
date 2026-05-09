'use client'

import { useState } from 'react'
import { FiSend } from 'react-icons/fi'

interface Props {
  onSend:   (content: string) => Promise<void>
  disabled?: boolean
}

export default function ReplyBar({ onSend, disabled }: Props) {
  const [content,  setContent]  = useState('')
  const [sending,  setSending]  = useState(false)

  const handleSend = async () => {
    if (!content.trim() || sending) return
    setSending(true)
    try {
      await onSend(content.trim())
      setContent('')
    } finally {
      setSending(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  return (
    <div className="shrink-0 px-6 py-4 border-t border-gray-100 bg-gray-50">
      <div className="flex items-center gap-3">
        <input
          type="text"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={disabled || sending}
          placeholder="Write a reply… (Enter to send)"
          className="flex-1 px-4 py-2 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-gray-300 transition disabled:opacity-50"
        />
        <button
          onClick={handleSend}
          disabled={!content.trim() || sending || disabled}
          className="p-2.5 bg-gray-900 text-white rounded-lg hover:bg-gray-700 disabled:opacity-40 disabled:cursor-not-allowed transition"
        >
          <FiSend size={15} />
        </button>
      </div>
    </div>
  )
}