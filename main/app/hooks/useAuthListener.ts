/**
 * useAuthListener.ts
 *
 * A custom React hook that listens for Supabase authentication state changes
 * and automatically refreshes the current page when the user signs in or out.
 *
 * ─── Why this hook exists ─────────────────────────────────────────────────
 *
 * In a Next.js App Router application, the server and client have separate
 * views of the user's session. When a user signs in or out through Supabase,
 * the client-side auth state updates immediately — but the server-rendered
 * parts of the page (layouts, server components) are unaware of the change
 * until the page is refreshed.
 *
 * This hook bridges that gap: it subscribes to Supabase's auth event stream
 * and calls `router.refresh()` whenever a sign-in or sign-out occurs. This
 * triggers Next.js to re-fetch all server components on the current route
 * without doing a full browser page reload, keeping the UI in sync with the
 * session state.
 *
 * ─── How to use it ────────────────────────────────────────────────────────
 *
 * Call this hook once in a high-level client component that stays mounted
 * for the lifetime of the app — typically a layout or a global providers
 * wrapper component:
 *
 *   // app/layout-client.tsx
 *   'use client'
 *   import useAuthListener from '@/hooks/useAuthListener'
 *
 *   export default function LayoutClient() {
 *     useAuthListener()
 *     return null
 *   }
 *
 * The hook renders nothing and returns nothing — it only sets up and tears
 * down the Supabase subscription as a side effect.
 *
 * ─── Cleanup ──────────────────────────────────────────────────────────────
 *
 * The hook returns a cleanup function from `useEffect` that calls
 * `subscription.unsubscribe()` when the component unmounts. This prevents
 * memory leaks and duplicate event handlers if the component is ever
 * unmounted and remounted.
 */

'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createPagesBrowserClient } from '@supabase/auth-helpers-nextjs'

/**
 * useAuthListener
 *
 * Subscribes to Supabase auth state change events for the duration of the
 * component's lifetime and refreshes the Next.js router when the user's
 * session changes.
 *
 * ─── Events handled ───────────────────────────────────────────────────────
 *
 * - SIGNED_IN  → Fired when a user successfully authenticates. The router
 *                is refreshed so server components can read the new session
 *                and render authenticated content.
 *
 * - SIGNED_OUT → Fired when a user's session ends (manual logout or expiry).
 *                The router is refreshed so protected content is hidden and
 *                the user is shown the unauthenticated state.
 *
 * All other Supabase auth events (e.g. TOKEN_REFRESHED, USER_UPDATED) are
 * intentionally ignored — they do not require a server-side re-render.
 *
 * ─── Dependencies ─────────────────────────────────────────────────────────
 *
 * `router` is included in the `useEffect` dependency array. In practice the
 * Next.js router reference is stable across renders, so the effect runs only
 * once on mount. Including it satisfies the exhaustive-deps lint rule and
 * ensures correctness if the router instance ever changes.
 *
 * @returns void — This hook has no return value.
 */
export default function useAuthListener() {
  const router = useRouter()

  useEffect(() => {
    // -------------------------------------------------------------------------
    // Step 1: Create the Supabase browser client
    // -------------------------------------------------------------------------

    /**
     * `createPagesBrowserClient` creates a Supabase client configured for use
     * in the browser. It automatically reads the Supabase URL and anon key
     * from environment variables (NEXT_PUBLIC_SUPABASE_URL and
     * NEXT_PUBLIC_SUPABASE_ANON_KEY), so no manual configuration is needed here.
     *
     * A new client instance is created inside the effect (rather than at the
     * module level) to ensure it is always initialised after the browser
     * environment is available.
     */
    const supabase = createPagesBrowserClient()

    // -------------------------------------------------------------------------
    // Step 2: Subscribe to auth state changes
    // -------------------------------------------------------------------------

    /**
     * `onAuthStateChange` registers a callback that Supabase calls every time
     * the user's authentication state changes. The callback receives an `event`
     * string identifying what happened.
     *
     * The destructured `subscription` object is stored so we can unsubscribe
     * from it when the component unmounts (see Step 3).
     */
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {

      /**
       * Only act on sign-in and sign-out events.
       * `router.refresh()` re-runs all server components on the current route,
       * allowing them to read the updated session cookie and render accordingly.
       */
      if (event === 'SIGNED_IN' || event === 'SIGNED_OUT') {
        router.refresh()
      }
    })

    // -------------------------------------------------------------------------
    // Step 3: Cleanup — unsubscribe on unmount
    // -------------------------------------------------------------------------

    /**
     * Return a cleanup function from useEffect.
     * React calls this automatically when the component unmounts.
     *
     * Calling `unsubscribe()` tells Supabase to stop sending auth events to
     * our callback, preventing memory leaks and stale event handlers.
     * The optional chaining (`?.`) guards against the unlikely case where
     * `subscription` is undefined.
     */
    return () => {
      subscription?.unsubscribe()
    }

  }, [router])
}