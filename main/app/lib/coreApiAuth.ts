// File: D:\NXTFLUTTER_CORE\underpeaks-core\main\app\lib\coreApiAuth.ts

import { getConfiguredAdapter } from '@/app/lib/getConfiguredAdapter'
import { decryptApiKey } from '@/app/lib/apiKeyEncryption'

export type CoreAuthResult =
  | { ok: true; tenantId: string; projectId: string }
  | { ok: false; status: 401 | 403; message: string }

/**
 * Validate an incoming API key against nxf_system_apis.
 * Core issues its own keys (encrypted with this install's NXF_API_KEY_SECRET),
 * so we look up by prefix then decrypt-compare. Single-project install.
 *
 * FIX: was calling adapter.readAllAdmin(), a hosted-only method (used to
 * bypass Supabase RLS). Core's adapters (Postgres/MySQL/Mongo/Firebase)
 * never implement readAllAdmin at all — Core has no RLS concept, it's a
 * single-tenant local DB — so this threw "readAllAdmin is not a function"
 * on every call, unconditionally. Every anonymous/customer auth request
 * to Core 500'd here before even reaching the actual route logic. Swapped
 * to the plain readAll() every Core adapter actually implements.
 */
export async function validateCoreApiKey(apiKey: string): Promise<CoreAuthResult> {
  if (!apiKey) {
    return { ok: false, status: 401, message: 'Missing API key. Provide x-api-key header.' }
  }

  const adapter  = getConfiguredAdapter()
  const dbConfig = adapter.config

  const prefix = apiKey.slice(0, 16)

  const allKeys: any[] = await (adapter as any).readAll(dbConfig, 'nxf_system_apis')
  const candidates = (allKeys ?? []).filter(
    (k: any) => k.key_prefix === prefix && k.status === 'active',
  )

  let matched: any = null
  for (const row of candidates) {
    try {
      if (decryptApiKey(row.key_encrypted) === apiKey) {
        matched = row
        break
      }
    } catch { /* skip undecryptable */ }
  }

  if (!matched) {
    return { ok: false, status: 401, message: 'Invalid or inactive API key.' }
  }

  return { ok: true, tenantId: matched.tenant_id, projectId: matched.project_id }
}