// app/lib/clientAuth.ts
/**
 * clientAuth.ts
 * Location: app/lib/clientAuth.ts
 *
 * Centralised client-side auth helpers. The access token is stored in
 * localStorage under 'authToken'. All client components that need to
 * call protected API routes should read it from here, never directly.
 *
 * Firebase issues a JWT ID token, so the user id is decoded from it.
 * Postgres / MySQL / MongoDB / Supabase issue opaque tokens (not JWTs),
 * so the sign-in page also stores the user id under 'userId' and
 * getUserId() falls back to that.
 *
 * This keeps the storage keys in one place — if they change later, we only
 * update them here.
 */

const AUTH_TOKEN_KEY = 'authToken'
const USER_ID_KEY    = 'userId'

/**
 * Returns the current access token from localStorage,
 * or empty string if not signed in / SSR.
 */
export function getAuthToken(): string {
  if (typeof window === 'undefined') return ''
  return localStorage.getItem(AUTH_TOKEN_KEY) ?? ''
}

/**
 * Returns an Authorization header object for fetch() calls,
 * or empty object if no token (so spread doesn't break).
 *
 * Usage:
 *   fetch(url, { headers: { ...authHeader(), 'Content-Type': 'application/json' } })
 */
export function authHeader(): Record<string, string> {
  const token = getAuthToken()
  return token ? { Authorization: `Bearer ${token}` } : {}
}

/**
 * Returns the current user_id.
 *  1. Firebase: decoded from the JWT payload.
 *  2. Other adapters (opaque token): the user id stored at sign-in.
 * Returns empty string if not signed in. The stored id is only used while an
 * access token exists, so a stale value cannot outlive a sign-out.
 */
export function getUserId(): string {
  const token = getAuthToken()
  if (!token) return ''

  try {
    const payload = JSON.parse(atob(token.split('.')[1]))
    const id = payload.user_id ?? payload.uid ?? payload.sub ?? ''
    if (id) return id
  } catch {
    // not a JWT — fall through to the stored id
  }

  try {
    return localStorage.getItem(USER_ID_KEY) ?? ''
  } catch {
    return ''
  }
}