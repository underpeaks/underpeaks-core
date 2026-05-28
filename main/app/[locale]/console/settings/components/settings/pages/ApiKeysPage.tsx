/**
 * ApiKeysPage Component
 *
 * This is the main page for the API Keys section of the Settings area.
 * It acts as the "brain" (also called a container component) that owns all
 * the state and logic, and passes the relevant pieces down to smaller
 * presentational components.
 *
 * What this page does:
 * - Fetches and displays all existing API keys when the page loads.
 * - Lets the user generate a new API key by entering a name and clicking
 *   "Generate Key". Shows a success modal after the key is created.
 * - Lets the user revoke (permanently delete) an existing key by confirming
 *   through a confirmation modal.
 * - Displays a dismissable error banner at the top if anything goes wrong
 *   (loading, generating, or revoking).
 *
 * Component hierarchy:
 *   ApiKeysPage          ← this file (owns all state + API calls)
 *   ├── ApiKeysList      ← displays the list of existing keys
 *   ├── GenerateKeyForm  ← form to create a new key
 *   ├── NewKeyModal      ← success modal shown after key creation
 *   └── RevokeModal      ← confirmation modal before revoking a key
 */

'use client'

import { useState, useEffect }  from 'react'
//import { useTranslations }      from 'next-intl'
import { FiAlertTriangle, FiX } from 'react-icons/fi'
import ApiKeysList               from './components/ApiKeysList'
import GenerateKeyForm           from './components/GenerateKeyForm'
import NewKeyModal               from './components/NewKeyModal'
import RevokeModal               from './components/RevokeModal'
import { ApiKey, NewKeyResult }  from './components/types'

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

/**
 * ApiKeysPage
 *
 * The top-level page component for managing API keys. Handles:
 * - Loading the user's existing keys from the server on mount.
 * - Generating new keys and updating the list optimistically.
 * - Revoking existing keys and removing them from the list on success.
 * - Showing and dismissing error messages when API calls fail.
 */
export default function ApiKeysPage() {
  /**
   * t — Translation function scoped to the 'apiKeysPage' namespace.
   * Use t('key') to retrieve the translated string for that key.
   */
  //const t = useTranslations('apiKeysPage')

  // -------------------------------------------------------------------------
  // State
  // -------------------------------------------------------------------------

  /** The list of API keys fetched from the server. */
  const [keys, setKeys] = useState<ApiKey[]>([])

  /** Whether the initial keys fetch is still in progress. */
  const [loading, setLoading] = useState(true)

  /** The value typed into the "Key Name" input in GenerateKeyForm. */
  const [keyName, setKeyName] = useState('')

  /** Whether a key generation request is currently in progress. */
  const [generating, setGenerating] = useState(false)

  /**
   * The newly created key result, set after a successful generate call.
   * When non-null, the NewKeyModal is shown. Cleared when the modal is closed.
   */
  const [newKey, setNewKey] = useState<NewKeyResult | null>(null)

  /**
   * The API key the user has chosen to revoke.
   * When non-null, the RevokeModal is shown. Cleared after revoke or cancel.
   */
  const [revokeTarget, setRevokeTarget] = useState<ApiKey | null>(null)

  /** Whether a revoke request is currently in progress. */
  const [revoking, setRevoking] = useState(false)

  /**
   * The current error message to display in the error banner.
   * Null means no error is shown.
   */
  const [error, setError] = useState<string | null>(null)

  // -------------------------------------------------------------------------
  // Auth headers
  // -------------------------------------------------------------------------

  /**
   * Retrieve the auth token from localStorage (only in the browser).
   * We guard with `typeof window !== 'undefined'` because this component
   * can also run on the server during Next.js pre-rendering, where
   * localStorage does not exist.
   */
  const token = typeof window !== 'undefined'
    ? localStorage.getItem('authToken') ?? ''
    : ''

  /**
   * Reusable headers object for all authenticated API requests.
   * Includes the Bearer token for authorization and sets the content type
   * to JSON since all our request bodies are JSON.
   */
  const headers = {
    'Authorization': `Bearer ${token}`,
    'Content-Type':  'application/json',
  }

  // -------------------------------------------------------------------------
  // Load keys on mount
  // -------------------------------------------------------------------------

  /**
   * useEffect — Fetch the user's API keys when the page first loads.
   *
   * This runs once (empty dependency array []) immediately after the
   * component mounts. It calls the list endpoint and stores the result
   * in the `keys` state. If the request fails, an error message is shown.
   */
  useEffect(() => {
    const load = async () => {
      console.log(('logs.loadingKeys'))
      try {
        const res  = await fetch('/api/settings/api-keys/list', {
          headers: { 'Authorization': `Bearer ${token}` },
        })
        const data = await res.json()

        // Use the returned keys array, or fall back to empty if missing
        setKeys(data.keys ?? [])
        console.log(('logs.keysLoaded'))
      } catch {
        setError(('errors.loadFailed'))
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  // -------------------------------------------------------------------------
  // Generate a new key
  // -------------------------------------------------------------------------

  /**
   * handleGenerate
   *
   * Called when the user clicks "Generate Key" in the GenerateKeyForm.
   *
   * Steps:
   * 1. Guards against empty key names (trims whitespace).
   * 2. Sends a POST request to the generate endpoint with the key name.
   * 3. On success:
   *    - Builds a new ApiKey object and prepends it to the keys list
   *      so the user sees it immediately without a page refresh.
   *    - Sets `newKey` to trigger the NewKeyModal success dialog.
   *    - Clears the key name input.
   * 4. On failure, sets the error banner message.
   */
  const handleGenerate = async () => {
    if (!keyName.trim()) return

    setGenerating(true)
    setError(null)
    console.log(('logs.generatingKey'))

    try {
      const res  = await fetch('/api/settings/api-keys/generate', {
        method: 'POST',
        headers,
        body:   JSON.stringify({ name: keyName.trim() }),
      })
      const data = await res.json()

      if (!res.ok) throw new Error(data.error ?? ('errors.generateFailed'))

      /**
       * Build a local ApiKey object from the server response so we can
       * immediately add it to the list without re-fetching all keys.
       * We set `created_at` to now since the server just created it.
       */
      const newApiKey: ApiKey = {
        api_id:       data.api_id,
        name:         data.name,
        key_prefix:   data.prefix,
        status:       'active',
        last_used_at: null,
        created_at:   new Date().toISOString(),
      }

      // Prepend the new key so it appears at the top of the list
      setKeys((prev) => [newApiKey, ...prev])

      // Trigger the success modal with the new key's details
      setNewKey({ api_id: data.api_id, prefix: data.prefix, name: data.name })

      // Reset the name input ready for the next key
      setKeyName('')
      console.log(('logs.keyGenerated'))
    } catch (err: any) {
      setError(err.message)
    } finally {
      setGenerating(false)
    }
  }

  // -------------------------------------------------------------------------
  // Revoke a key
  // -------------------------------------------------------------------------

  /**
   * handleRevoke
   *
   * Called when the user confirms the revoke action in the RevokeModal.
   *
   * Steps:
   * 1. Guards against no target being set.
   * 2. Sends a POST request to the revoke endpoint with the key's api_id.
   * 3. On success:
   *    - Removes the revoked key from the local `keys` list immediately
   *      so the UI updates without a full refresh.
   *    - Clears `revokeTarget` to close the modal.
   * 4. On failure, sets the error banner message.
   */
  const handleRevoke = async () => {
    if (!revokeTarget) return

    setRevoking(true)
    console.log(('logs.revokingKey'))

    try {
      const res = await fetch('/api/settings/api-keys/revoke', {
        method: 'POST',
        headers,
        body:   JSON.stringify({ api_id: revokeTarget.api_id }),
      })

      if (!res.ok) throw new Error(('errors.revokeFailed'))

      // Remove the revoked key from the list by filtering it out
      setKeys((prev) => prev.filter((k) => k.api_id !== revokeTarget.api_id))

      // Close the revoke modal
      setRevokeTarget(null)
      console.log(('logs.keyRevoked'))
    } catch (err: any) {
      setError(err.message)
    } finally {
      setRevoking(false)
    }
  }

  // -------------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------------

  return (
    <div className="flex flex-col gap-5">

      {/* ------------------------------------------------------------------
        * Page heading and description
        * ------------------------------------------------------------------ */}
      <div>
        <h2 className="text-lg font-bold text-gray-900">
          {('heading')}
        </h2>
        <p className="text-sm text-gray-500 mt-0.5">
          {('subheading')}
        </p>
      </div>

      {/* ------------------------------------------------------------------
        * Error Banner
        * Only rendered when `error` is non-null.
        * Shows the error message with a warning icon and an X to dismiss it.
        * ------------------------------------------------------------------ */}
      {error && (
        <div className="flex items-center gap-2 px-4 py-3 bg-red-50 border border-red-200 rounded-lg">
          <FiAlertTriangle size={14} className="text-red-500 shrink-0" />
          <p className="text-xs text-red-600 flex-1">{error}</p>
          {/* Dismiss button — clears the error state to hide this banner */}
          <button onClick={() => setError(null)} className="text-red-400 hover:text-red-600">
            <FiX size={13} />
          </button>
        </div>
      )}

      {/* ------------------------------------------------------------------
        * API Keys List
        * Passes the keys array, loading state, and the revoke trigger down.
        * When the user clicks "Revoke" on a key, setRevokeTarget is called,
        * which sets the target and opens the RevokeModal below.
        * ------------------------------------------------------------------ */}
      <ApiKeysList
        keys={keys}
        loading={loading}
        onRevoke={setRevokeTarget}
      />

      {/* ------------------------------------------------------------------
        * Generate Key Form
        * Passes the current key name input value and its change/submit handlers.
        * ------------------------------------------------------------------ */}
      <GenerateKeyForm
        keyName={keyName}
        generating={generating}
        onChange={setKeyName}
        onGenerate={handleGenerate}
      />

      {/* ------------------------------------------------------------------
        * New Key Success Modal
        * Only rendered when `newKey` is non-null (i.e. after a key is created).
        * Cleared (set to null) when the user clicks "Done".
        * ------------------------------------------------------------------ */}
      {newKey && (
        <NewKeyModal result={newKey} onClose={() => setNewKey(null)} />
      )}

      {/* ------------------------------------------------------------------
        * Revoke Confirmation Modal
        * Only rendered when `revokeTarget` is non-null (i.e. the user clicked
        * "Revoke" on a key). Cleared when cancelled or after successful revoke.
        * ------------------------------------------------------------------ */}
      {revokeTarget && (
        <RevokeModal
          keyName={revokeTarget.name}
          onConfirm={handleRevoke}
          onCancel={() => setRevokeTarget(null)}
          revoking={revoking}
        />
      )}

    </div>
  )
}