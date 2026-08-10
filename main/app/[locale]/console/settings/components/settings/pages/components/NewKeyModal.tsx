/**
 * NewKeyModal Component
 */

'use client'

import { FiKey, FiX, FiCheck } from 'react-icons/fi'
import { NewKeyResult } from './types'
import { useTranslations } from 'next-intl'

interface Props {
  result:  NewKeyResult
  onClose: () => void
}

export default function NewKeyModal({ result, onClose }: Props) {
  const t = useTranslations('newKeyModal')

  return (
    <div className="fixed inset-0 z-[9999] bg-black/40 backdrop-blur-sm flex items-center justify-center">

      <div className="bg-white rounded-xl shadow-2xl p-6 max-w-md w-full mx-4">

        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">

            <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center">
              <FiKey size={15} className="text-green-600" />
            </div>

            <h3 className="text-sm font-semibold text-gray-900">
              {t('title')}
            </h3>
          </div>

          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <FiX size={16} />
          </button>
        </div>

        <div className="flex flex-col items-center gap-3 py-4">

          <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center">
            <FiCheck size={22} className="text-green-600" />
          </div>

          <p className="text-sm font-semibold text-gray-900">{result.name}</p>

          <p className="text-xs text-gray-500 text-center">
            <span className="font-medium text-gray-700">
              Click the eye icon to reveal your API key.
            </span>
          </p>

          <p className="text-xs font-mono text-gray-400">
            {result.prefix}••••••••••••••••••••
          </p>
        </div>

        <button
          onClick={onClose}
          className="w-full py-2 bg-gray-900 text-white text-xs font-medium rounded-lg hover:bg-gray-700 transition mt-2"
        >
          {t('doneButton')}
        </button>

      </div>
    </div>
  )
}