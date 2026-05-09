'use client'

import { useState, useEffect }  from 'react'
import { FiAlertTriangle, FiX } from 'react-icons/fi'
import ApiKeysList               from './components/ApiKeysList'
import GenerateKeyForm           from './components/GenerateKeyForm'
import NewKeyModal               from './components/NewKeyModal'
import RevokeModal               from './components/RevokeModal'
import { ApiKey, NewKeyResult }  from './components/types'

export default function ApiKeysPage() {
  const [keys,         setKeys]         = useState<ApiKey[]>([])
  const [loading,      setLoading]      = useState(true)
  const [keyName,      setKeyName]      = useState('')
  const [generating,   setGenerating]   = useState(false)
  const [newKey,       setNewKey]       = useState<NewKeyResult | null>(null)
  const [revokeTarget, setRevokeTarget] = useState<ApiKey | null>(null)
  const [revoking,     setRevoking]     = useState(false)
  const [error,        setError]        = useState<string | null>(null)

  const token   = typeof window !== 'undefined' ? localStorage.getItem('authToken') ?? '' : ''
  const headers = { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' }

  useEffect(() => {
    const load = async () => {
      try {
        const res  = await fetch('/api/settings/api-keys/list', {
          headers: { 'Authorization': `Bearer ${token}` },
        })
        const data = await res.json()
        setKeys(data.keys ?? [])
      } catch {
        setError('Failed to load API keys')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  const handleGenerate = async () => {
    if (!keyName.trim()) return
    setGenerating(true)
    setError(null)
    try {
      const res  = await fetch('/api/settings/api-keys/generate', {
        method: 'POST', headers,
        body:   JSON.stringify({ name: keyName.trim() }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Failed to generate key')

      const newApiKey: ApiKey = {
        api_id:       data.api_id,
        name:         data.name,
        key_prefix:   data.prefix,
        status:       'active',
        last_used_at: null,
        created_at:   new Date().toISOString(),
      }

      setKeys((prev) => [newApiKey, ...prev])
      setNewKey({ api_id: data.api_id, prefix: data.prefix, name: data.name })
      setKeyName('')
    } catch (err: any) {
      setError(err.message)
    } finally {
      setGenerating(false)
    }
  }

  const handleRevoke = async () => {
    if (!revokeTarget) return
    setRevoking(true)
    try {
      const res = await fetch('/api/settings/api-keys/revoke', {
        method: 'POST', headers,
        body:   JSON.stringify({ api_id: revokeTarget.api_id }),
      })
      if (!res.ok) throw new Error('Failed to revoke key')
      setKeys((prev) => prev.filter((k) => k.api_id !== revokeTarget.api_id))
      setRevokeTarget(null)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setRevoking(false)
    }
  }

  return (
    <div className="flex flex-col gap-5">

      <div>
        <h2 className="text-lg font-bold text-gray-900">API Keys</h2>
        <p className="text-sm text-gray-500 mt-0.5">
          Manage keys used to authenticate API requests from your apps.
        </p>
      </div>

      {error && (
        <div className="flex items-center gap-2 px-4 py-3 bg-red-50 border border-red-200 rounded-lg">
          <FiAlertTriangle size={14} className="text-red-500 shrink-0" />
          <p className="text-xs text-red-600 flex-1">{error}</p>
          <button onClick={() => setError(null)} className="text-red-400 hover:text-red-600">
            <FiX size={13} />
          </button>
        </div>
      )}

      <ApiKeysList
        keys={keys}
        loading={loading}
        onRevoke={setRevokeTarget}
      />

      <GenerateKeyForm
        keyName={keyName}
        generating={generating}
        onChange={setKeyName}
        onGenerate={handleGenerate}
      />

      {newKey && (
        <NewKeyModal result={newKey} onClose={() => setNewKey(null)} />
      )}

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