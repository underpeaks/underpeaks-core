// app/components/ClientAuthFetch.tsx
'use client'

/**
 * ClientAuthFetch
 *
 * Mount once in the root layout. Importing this module installs a small
 * wrapper around window.fetch that adds
 *   Authorization: Bearer <authToken from localStorage>
 * to every same-origin /api/ request that does not already set its own
 * Authorization header. It does nothing when there is no token (signed out,
 * installer) and never touches other origins or /api-public/.
 *
 * The wrapper is installed when the module loads (not in an effect) so that
 * the first fetches of child components are covered too.
 *
 * The server never trusts a user_id from the browser; it works out who is
 * calling from this token (see app/lib/getSessionUser.ts).
 */

import { getAuthToken } from '@/app/lib/clientAuth'

declare global {
  interface Window { __nxfAuthFetch?: boolean }
}

function isSameOriginApi(input: RequestInfo | URL): boolean {
  try {
    const raw = typeof input === 'string'
      ? input
      : input instanceof URL
        ? input.href
        : input.url
    const url = new URL(raw, window.location.origin)
    return url.origin === window.location.origin && url.pathname.startsWith('/api/')
  } catch {
    return false
  }
}

if (typeof window !== 'undefined' && !window.__nxfAuthFetch) {
  window.__nxfAuthFetch = true
  const originalFetch = window.fetch.bind(window)

  window.fetch = (input: RequestInfo | URL, init?: RequestInit) => {
    try {
      const token = getAuthToken()
      if (token && isSameOriginApi(input)) {
        const headers = new Headers(
          init?.headers ?? (input instanceof Request ? input.headers : undefined)
        )
        if (!headers.has('Authorization')) {
          headers.set('Authorization', `Bearer ${token}`)
          return originalFetch(input, { ...init, headers })
        }
      }
    } catch {
      // fall through to the plain request
    }
    return originalFetch(input, init)
  }
}

export function ClientAuthFetch() {
  return null
}