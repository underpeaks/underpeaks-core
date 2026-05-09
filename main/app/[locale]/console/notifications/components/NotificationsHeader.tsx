'use client'

import { FiBell, FiCheck } from 'react-icons/fi'

interface Props {
  unreadCount: number
  filter:      'all' | 'unread'
  onFilter:    (f: 'all' | 'unread') => void
  onMarkAll:   () => void
}

export default function NotificationsHeader({ unreadCount, filter, onFilter, onMarkAll }: Props) {
  return (
    <div className="shrink-0 bg-white border-b border-gray-200 px-6 py-5">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
              <FiBell size={18} className="text-blue-600" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900">Notifications</h1>
              <p className="text-xs text-gray-500 mt-0.5">
                {unreadCount} unread notification{unreadCount !== 1 ? 's' : ''}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1 p-1 bg-gray-100 rounded-lg">
              {(['all', 'unread'] as const).map((f) => (
                <button
                  key={f}
                  onClick={() => onFilter(f)}
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
                onClick={onMarkAll}
                className="flex items-center gap-2 px-3 py-2 text-xs font-medium text-gray-700 bg-white border border-gray-200 rounded-md hover:bg-gray-50 transition"
              >
                <FiCheck size={14} /> Mark all read
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}