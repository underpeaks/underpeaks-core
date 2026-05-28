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

// ---------------------------------------------------------------------------
// Props Types
// ---------------------------------------------------------------------------

/**
 * Props for the ApiKeysList component.
 *
 * @property keys     - Array of API key objects to display.
 * @property loading  - Whether the keys are still being fetched from the server.
 * @property onRevoke - Callback function called when the user clicks "Revoke" on a key.
 */
interface Props {
  keys:     ApiKey[]
  loading:  boolean
  onRevoke: (key: ApiKey) => void
}

// ---------------------------------------------------------------------------
// KeyRow — Single API key row
// ---------------------------------------------------------------------------

/**
 * KeyRow Component
 *
 * Displays a single API key with:
 * - The key name and a masked version of the key (e.g. "sk-abc••••••••••••")
 * - Created date and last-used date (or "Never used" if unused)
 * - A reveal/hide button to fetch and display the full key
 * - A copy button (only visible once the key has been revealed)
 * - A revoke button to delete/invalidate the key
 *
 * @param apiKey   - The API key data object to display.
 * @param onRevoke - Callback fired when the user clicks "Revoke".
 */
function KeyRow({
  apiKey,
  onRevoke,
}: {
  apiKey:    ApiKey
  onRevoke:  (key: ApiKey) => void
}) {
  //const { t } = useTranslation()

  // Whether the full key is currently visible on screen
  const [revealed,  setRevealed]  = useState(false)

  // The full, unmasked key value — null until the user reveals it for the first time
  const [fullKey,   setFullKey]   = useState<string | null>(apiKey.revealedKey ?? null)

  // Whether the reveal API call is in progress
  const [loading,   setLoading]   = useState(false)

  // Whether the key was just copied (used to briefly show a checkmark)
  const [copied,    setCopied]    = useState(false)

  // Retrieve the auth token from localStorage to authenticate the reveal request
  const token = localStorage.getItem('authToken') ?? ''

  /**
   * handleReveal
   *
   * Handles the reveal/hide toggle button.
   *
   * - If the full key is already loaded (from a previous reveal), it simply
   *   toggles the `revealed` state to show or hide it — no network call needed.
   *
   * - If the full key has never been loaded, it calls the `/api/settings/api-keys/reveal`
   *   endpoint to fetch it, then stores it in `fullKey` state and shows it.
   */
  const handleReveal = async () => {
    // If we already have the full key, just toggle visibility — no API call needed
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
        // Store the revealed key and mark it as visible
        setFullKey(data.key)
        setRevealed(true)
      }
    } finally {
      setLoading(false)
    }
  }

  /**
   * handleCopy
   *
   * Copies the full API key to the user's clipboard.
   * Only callable when `fullKey` is available (i.e. the key has been revealed).
   * Shows a brief checkmark icon for 2 seconds to confirm the copy action.
   */
  const handleCopy = () => {
    if (!fullKey) return
    navigator.clipboard.writeText(fullKey)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  /**
   * displayKey
   *
   * What is shown in the key preview area:
   * - If revealed and fullKey is available → show the full key
   * - Otherwise                            → show the prefix + bullet mask
   */
  const displayKey = revealed && fullKey
    ? fullKey
    : `${apiKey.key_prefix}••••••••••••••••••••`

  return (
    <div className="flex items-center justify-between p-3 bg-gray-50 border border-gray-200 rounded-md">

      {/* Left side: key icon, name, masked key, and dates */}
      <div className="flex items-center gap-3 flex-1 min-w-0">

        {/* Key icon avatar */}
        <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center shrink-0">
          <FiKey size={14} className="text-gray-500" />
        </div>

        {/* Key details */}
        <div className="flex-1 min-w-0">

          {/* Key name (e.g. "Production Key") */}
          <p className="text-sm font-semibold text-gray-800">{apiKey.name}</p>

          {/* Masked or revealed key value */}
          <p className="text-xs text-gray-400 font-mono mt-0.5 truncate">
            {displayKey}
          </p>

          {/* Created date and last-used date */}
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
                {('apiKeys.neverUsed')}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Right side: action buttons (reveal, copy, revoke) */}
      <div className="flex items-center gap-2 shrink-0 ml-3">

        {/* Reveal / Hide button */}
        <button
          onClick={handleReveal}
          disabled={loading}
          className="p-1.5 rounded-md hover:bg-gray-200 text-gray-400 hover:text-gray-700 transition disabled:opacity-50"
          title={revealed ? ('apiKeys.hideKey') : ('apiKeys.revealKey')}
        >
          {loading
            ? <span className="w-3.5 h-3.5 border-2 border-gray-300 border-t-gray-600 rounded-full animate-spin block" />
            : revealed
              ? <FiEyeOff size={14} />
              : <FiEye    size={14} />
          }
        </button>

        {/* Copy button — only rendered once the full key has been revealed */}
        {fullKey && (
          <button
            onClick={handleCopy}
            className="p-1.5 rounded-md hover:bg-gray-200 text-gray-400 hover:text-gray-700 transition"
            title={('apiKeys.copyKey')}
          >
            {copied
              ? <FiCheck size={14} className="text-green-500" />
              : <FiCopy  size={14} />
            }
          </button>
        )}

        {/* Vertical divider between copy and revoke */}
        <div className="w-px h-4 bg-gray-200" />

        {/* Revoke button */}
        <button
          onClick={() => onRevoke(apiKey)}
          className="text-xs text-red-500 hover:text-red-700 font-medium transition"
        >
          {('apiKeys.revoke')}
        </button>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// ApiKeysList — Full list with loading + empty states
// ---------------------------------------------------------------------------

/**
 * ApiKeysList Component
 *
 * The main exported component. Wraps all key rows inside a `SectionCard`.
 *
 * Handles three display states:
 * 1. **Loading**   — Shows a spinner while keys are being fetched.
 * 2. **Empty**     — Shows a friendly empty state with a message if there are no keys.
 * 3. **Populated** — Renders one `KeyRow` per API key.
 *
 * @param keys     - The list of API key objects to render.
 * @param loading  - If true, a loading spinner is shown instead of the list.
 * @param onRevoke - Passed down to each `KeyRow` to handle revoke actions.
 */
export default function ApiKeysList({ keys, loading, onRevoke }: Props) {
  //const { t } = useTranslation()

  return (
    <SectionCard title={('apiKeys.sectionTitle')}>

      {loading ? (
        // Loading state: centered spinner
        <div className="flex items-center justify-center py-6">
          <span className="w-5 h-5 border-2 border-gray-300 border-t-gray-700 rounded-full animate-spin" />
        </div>

      ) : keys.length === 0 ? (
        // Empty state: icon + helpful message
        <div className="flex flex-col items-center justify-center py-8 text-center">
          <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center mb-2">
            <FiKey size={18} className="text-gray-400" />
          </div>
          <p className="text-sm font-medium text-gray-600">
            {('apiKeys.emptyTitle')}
          </p>
          <p className="text-xs text-gray-400 mt-0.5">
            {('apiKeys.emptySubtitle')}
          </p>
        </div>

      ) : (
        // Populated state: render a KeyRow for each key
        <div className="flex flex-col gap-3">
          {keys.map((k) => (
            <KeyRow key={k.api_id} apiKey={k} onRevoke={onRevoke} />
          ))}
        </div>
      )}

    </SectionCard>
  )
}

function useTranslation(): { t: any } {
  throw new Error('Function not implemented.')
}
