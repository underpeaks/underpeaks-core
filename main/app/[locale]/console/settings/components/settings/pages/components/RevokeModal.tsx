/**
 * RevokeModal Component
 */

'use client'

import { useTranslations } from 'next-intl'
import { FiAlertTriangle } from 'react-icons/fi'

interface Props {
  keyName:   string
  onConfirm: () => void
  onCancel:  () => void
  revoking:  boolean
}

export default function RevokeModal({ keyName, onConfirm, onCancel, revoking }: Props) {
  const t = useTranslations('revokeModal')

  return (
    <div className="fixed inset-0 z-[9999] bg-black/40 backdrop-blur-sm flex items-center justify-center">

      <div className="bg-white rounded-xl shadow-2xl p-6 max-w-sm w-full mx-4">

        <div className="flex items-center gap-3 mb-4">

          <div className="w-8 h-8 rounded-full bg-red-100 flex items-center justify-center shrink-0">
            <FiAlertTriangle size={15} className="text-red-600" />
          </div>

          <h3 className="text-sm font-semibold text-gray-900">
            {t('title')}
          </h3>
        </div>

        <p className="text-sm text-gray-500 mb-5">
          {t('message')}{' '}
          <span className="font-medium text-gray-800">
            {keyName}
          </span>
        </p>

        <div className="flex gap-3">

          <button
            onClick={onCancel}
            disabled={revoking}
            className="flex-1 py-2 border border-gray-200 text-xs font-medium rounded-lg hover:bg-gray-50 disabled:opacity-50 transition"
          >
            {t('cancelButton')}
          </button>

          <button
            onClick={onConfirm}
            disabled={revoking}
            className="flex-1 flex items-center justify-center gap-2 py-2 bg-red-600 text-white text-xs font-medium rounded-lg hover:bg-red-700 disabled:opacity-50 transition"
          >
            {revoking && (
              <span className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            )}

            {revoking ? t('revokeButtonRevoking') : t('revokeButtonIdle')}
          </button>
        </div>

      </div>
    </div>
  )
}