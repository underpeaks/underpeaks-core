'use client'

import { FiMail, FiInbox } from 'react-icons/fi'

interface Props {
  type:    'inbox' | 'thread'
  message: string
  sub:     string
}

export default function EmptyState({ type, message, sub }: Props) {
  return (
    <div className="flex flex-col items-center justify-center h-full py-16">
      <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mb-3">
        {type === 'inbox'
          ? <FiInbox size={24} className="text-gray-400" />
          : <FiMail  size={24} className="text-gray-400" />
        }
      </div>
      <p className="text-sm font-medium text-gray-600">{message}</p>
      <p className="text-xs text-gray-400 mt-1">{sub}</p>
    </div>
  )
}