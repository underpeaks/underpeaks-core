'use client'

import { FiSend, FiPaperclip, FiSmile, FiMoreVertical, FiArrowLeft } from 'react-icons/fi'
import type { ClientTemplateProps } from '../../types'
import PhoneFrame from '@/app/[locale]/preview/PhoneFrame'

const messages = [
  { from: 'them', text: 'Hey, are you free to chat about the project?',           time: '10:14' },
  { from: 'me',   text: 'Sure! Just wrapping up another call.',                  time: '10:15' },
  { from: 'them', text: 'No rush. Let me know when you are ready.',              time: '10:15' },
  { from: 'me',   text: 'Ready now. What did you want to discuss?',              time: '10:16' },
]

export default function ChatTemplate({ page }: ClientTemplateProps) {
  return (
    <PhoneFrame title={page.name ?? page.title ?? 'Chat'} subtitle="Chat interface" slug={page.slug}>
      <div className="w-full h-full flex flex-col bg-gray-50">

        {/* Header */}
        <div className="bg-white px-4 py-3 flex items-center gap-3 border-b border-gray-100">
          <FiArrowLeft size={16} className="text-gray-500" />
          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-purple-400 to-pink-400
                          flex items-center justify-center text-white text-xs font-bold">
            SM
          </div>
          <div className="flex-1">
            <p className="text-sm font-semibold text-gray-900">Sam Miller</p>
            <p className="text-[10px] text-emerald-500">Online</p>
          </div>
          <FiMoreVertical size={16} className="text-gray-400" />
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
          {messages.map((m, i) => (
            <div key={i} className={`flex ${m.from === 'me' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[75%] px-3 py-2 rounded-2xl ${
                m.from === 'me'
                  ? 'bg-[var(--color-primary)] text-white rounded-br-sm'
                  : 'bg-white text-gray-800 rounded-bl-sm border border-gray-100'
              }`}>
                <p className="text-xs">{m.text}</p>
                <p className={`text-[9px] mt-1 ${m.from === 'me' ? 'text-white/70' : 'text-gray-400'}`}>
                  {m.time}
                </p>
              </div>
            </div>
          ))}
        </div>

        {/* Input */}
        <div className="bg-white px-3 py-3 border-t border-gray-100 flex items-center gap-2">
          <button className="p-1.5 text-gray-400"><FiPaperclip size={16} /></button>
          <div className="flex-1 flex items-center gap-1 px-3 py-2 bg-gray-100 rounded-full">
            <input
              type="text"
              placeholder="Message…"
              disabled
              className="flex-1 text-xs bg-transparent outline-none"
            />
            <FiSmile size={14} className="text-gray-400" />
          </div>
          <button className="w-9 h-9 rounded-full bg-[var(--color-primary)] flex items-center justify-center">
            <FiSend size={14} className="text-white" />
          </button>
        </div>
      </div>
    </PhoneFrame>
  )
}