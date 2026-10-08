// app/lib/resolveUserFromToken.ts
import 'server-only'

/**
 * resolveUserIdFromToken
 *
 * Turns a Bearer token into a user_id for every adapter:
 *   Firebase / Supabase   → adapter.validateBuiltInSession (provider token)
 *   Postgres/MySQL/Mongo  → nxf_system_tokens lookup (not revoked, not expired)
 *
 * Returns null when the token is missing, unknown, revoked or expired.
 */
export async function resolveUserIdFromToken(
  adapter: any,
  token:   string | null | undefined
): Promise<string | null> {
  if (!token) return null

  try {
    const dbType  = adapter?.config?.type
    const builtIn = adapter?.supportsBuiltInAuth || dbType === 'firebase' || dbType === 'supabase'

    if (builtIn && adapter.validateBuiltInSession) {
      const decoded = await adapter.validateBuiltInSession(adapter.config, token)
      return decoded?.uid ?? decoded?.user_id ?? decoded?.id ?? null
    }

    if (adapter.findTokenByAccessToken) {
      const stored = await adapter.findTokenByAccessToken(token)
      if (!stored || stored.revoked) return null
      if (new Date(stored.expires_at).getTime() < Date.now()) return null
      return stored.user_id ?? null
    }
  } catch (err: any) {
    console.error('[resolveUserIdFromToken] failed:', err?.message)
  }

  return null
}