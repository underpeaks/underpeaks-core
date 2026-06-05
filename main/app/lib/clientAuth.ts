/**
 * clientAuth.ts
 * Location: app/lib/clientAuth.ts
 *
 * Centralised client-side auth helpers. The Firebase ID token is stored
 * in localStorage under 'authToken'. All client components that need to
 * call protected API routes should read it from here, never directly.
 *
 * This keeps the storage key in one place — if it changes later, we only
 * update it here.
 */

const AUTH_TOKEN_KEY = 'authToken'

/**
 * Returns the current Firebase ID token from localStorage,
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
 * Returns the current user_id by decoding the JWT payload.
 * Returns empty string if no token or invalid token.
 */
export function getUserId(): string {
  const token = getAuthToken()
  if (!token) return ''
  try {
    const payload = JSON.parse(atob(token.split('.')[1]))
    return payload.user_id ?? payload.uid ?? payload.sub ?? ''
  } catch {
    return ''
  }
}