/**
 * ApiKeysList Component
 *
 * This file contains two components:
 *
 * 1. `KeyRow`       — Renders a single API key as a row, with options to reveal/hide
 *                     the full key, copy it to clipboard, and revoke it.
 *
 * 2. `ApiKeysList`  — Renders the full list of API keys inside a styled card.
 *                     Handles loading state and the empty state (no keys yet).
 *
 * This component is used in the API Keys section of the Settings page.
 */

'use client'

import { useState } from 'react'

import { FiKey, FiEye, FiEyeOff, FiCopy, FiCheck } from 'react-icons/fi'
import { SectionCard } from '../../../ui'
import { ApiKey, formatDate } from './types'
import { useTranslations } from 'next-intl'

interface Props {
  keys:     ApiKey[]
  loading:  boolean
  onRevoke: (key: ApiKey) => void
}

function KeyRow({
  apiKey,
  onRevoke,
  t,
}: {
  apiKey:    ApiKey
  onRevoke:  (key: ApiKey) => void
  t:         ReturnType<typeof useTranslations>
}) {
  const [revealed,  setRevealed]  = useState(false)
  const [fullKey,   setFullKey]   = useState<string | null>(apiKey.revealedKey ?? null)
  const [loading,   setLoading]   = useState(false)
  const [copied,    setCopied]    = useState(false)

  const token = localStorage.getItem('authToken') ?? ''

  const handleReveal = async () => {
    if (fullKey) {
      setRevealed((v) => !v)
      return
    }

    setLoading(true)
    try {
      const res = await fetch('/api/settings/api-keys/reveal', {
        method:  'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type':  'application/json',
        },
        body: JSON.stringify({ api_id: apiKey.api_id }),
      })

      const data = await res.json()

      if (res.ok) {
        setFullKey(data.key)
        setRevealed(true)
      }
    } finally {
      setLoading(false)
    }
  }

  const handleCopy = () => {
    if (!fullKey) return
    navigator.clipboard.writeText(fullKey)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const displayKey = revealed && fullKey
    ? fullKey
    : `${apiKey.key_prefix}••••••••••••••••••••`

  return (
    <div className="flex items-center justify-between p-3 bg-gray-50 border border-gray-200 rounded-md">

      <div className="flex items-center gap-3 flex-1 min-w-0">

        <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center shrink-0">
          <FiKey size={14} className="text-gray-500" />
        </div>

        <div className="flex-1 min-w-0">

          <p className="text-sm font-semibold text-gray-800">{apiKey.name}</p>

          <p className="text-xs text-gray-400 font-mono mt-0.5 truncate">
            {displayKey}
          </p>

          <div className="flex items-center gap-3 mt-0.5">
            <p className="text-[11px] text-gray-400">
              Created: {formatDate(apiKey.created_at)}
            </p>
            {apiKey.last_used_at ? (
              <p className="text-[11px] text-gray-400">
                Last used: {formatDate(apiKey.last_used_at)}
              </p>
            ) : (
              <p className="text-[11px] text-gray-400 italic">
                {t('neverUsed')}
              </p>
            )}
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2 shrink-0 ml-3">

        <button
          onClick={handleReveal}
          disabled={loading}
          className="p-1.5 rounded-md hover:bg-gray-200 text-gray-400 hover:text-gray-700 transition disabled:opacity-50"
          title={revealed ? t('hideKey') : t('revealKey')}
        >
          {loading
            ? <span className="w-3.5 h-3.5 border-2 border-gray-300 border-t-gray-600 rounded-full animate-spin block" />
            : revealed
              ? <FiEyeOff size={14} />
              : <FiEye    size={14} />
          }
        </button>

        {fullKey && (
          <button
            onClick={handleCopy}
            className="p-1.5 rounded-md hover:bg-gray-200 text-gray-400 hover:text-gray-700 transition"
            title={t('copyKey')}
          >
            {copied
              ? <FiCheck size={14} className="text-green-500" />
              : <FiCopy  size={14} />
            }
          </button>
        )}

        <div className="w-px h-4 bg-gray-200" />

        <button
          onClick={() => onRevoke(apiKey)}
          className="text-xs text-red-500 hover:text-red-700 font-medium transition"
        >
          {t('revoke')}
        </button>
      </div>
    </div>
  )
}

export default function ApiKeysList({ keys, loading, onRevoke }: Props) {
  const t = useTranslations('apiKeys')

  return (
    <SectionCard title={t('sectionTitle')}>

      {loading ? (
        <div className="flex items-center justify-center py-6">
          <span className="w-5 h-5 border-2 border-gray-300 border-t-gray-700 rounded-full animate-spin" />
        </div>

      ) : keys.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-8 text-center">
          <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center mb-2">
            <FiKey size={18} className="text-gray-400" />
          </div>
          <p className="text-sm font-medium text-gray-600">
            {t('emptyTitle')}
          </p>
          <p className="text-xs text-gray-400 mt-0.5">
            {t('emptySubtitle')}
          </p>
        </div>

      ) : (
        <div className="flex flex-col gap-3">
          {keys.map((k) => (
            <KeyRow key={k.api_id} apiKey={k} onRevoke={onRevoke} t={t} />
          ))}
        </div>
      )}

    </SectionCard>
  )
}