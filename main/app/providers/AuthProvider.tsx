'use client'

/**
 * AuthContext.tsx
 *
 * Provides a global authentication context for the entire application.
 *
 * What is a React Context?
 *   Normally, to share data between components you have to pass it down
 *   through props at every level ("prop drilling"). A Context is a way to
 *   make data available to ANY component in the tree without passing it
 *   manually through every intermediate component.
 *
 *   This file creates an "auth context" that holds the current user's data
 *   and exposes helper functions. Any component anywhere in the app can
 *   read the logged-in user or trigger a logout by calling the `useAuth`
 *   hook — no props needed.
 *
 * What this file provides:
 *   AuthProvider  — A wrapper component placed near the top of the component
 *                   tree (usually in layout.tsx). It owns the auth state and
 *                   makes it available to all child components.
 *
 *   useAuth       — A custom hook that any component calls to access the
 *                   auth context:
 *                     const { user, loading, logout } = useAuth()
 *
 * What the context exposes:
 *   user           — The currently logged-in user object, or null if no one
 *                    is logged in.
 *   loading        — True while the session is being checked on first load.
 *                    Use this to show a spinner instead of a flash of the
 *                    logged-out state.
 *   refreshSession — Manually re-check the session (e.g. after a token
 *                    refresh or after a background tab becomes active).
 *   logout         — Clears all stored tokens, resets user to null, and
 *                    redirects to the sign-in page.
 *
 * Session flow on page load:
 *   1. AuthProvider mounts and immediately calls refreshSession().
 *   2. refreshSession() reads the stored token from localStorage.
 *   3. If the token looks valid, it sends it to POST /api/session.
 *   4. The server verifies the token and returns the user object (or an error).
 *   5. On success, `user` is set. On failure, stored tokens are cleared.
 *   6. `loading` is set to false so the UI can render the correct state.
 */

import { createContext, useContext, useEffect, useState } from 'react'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/**
 * User
 *
 * Represents a logged-in user's data as returned by the session endpoint.
 * All fields except user_id are optional because not every system stores
 * all of them.
 *
 * null means no user is currently logged in.
 */
type User = {
  /** The unique identifier for the user in the database. */
  user_id: string
  /** The user's display name, if available. */
  full_name?: string
  /** The user's email address, if available. */
  email?: string
  /** The user's role (e.g. 'admin', 'user'), if available. */
  role?: string
} | null

/**
 * AuthContextType
 *
 * Describes the shape of the value that AuthContext provides to consumers.
 * Any component that calls useAuth() receives an object matching this type.
 */
type AuthContextType = {
  /** The currently authenticated user, or null if not logged in. */
  user: User
  /**
   * True while the initial session check is in progress.
   * Components should check this before deciding to show protected content
   * or redirect to sign-in, to avoid a flickering "logged out" state on
   * page load before the check completes.
   */
  loading: boolean
  /**
   * Re-validates the stored token against the server.
   * Call this if you need to force a fresh session check, for example after
   * a token has been refreshed in the background.
   */
  refreshSession: () => Promise<void>
  /**
   * Logs the user out by clearing stored tokens, resetting state to null,
   * and redirecting to /signin.
   */
  logout: () => void
}

// ---------------------------------------------------------------------------
// Context creation
// ---------------------------------------------------------------------------

/**
 * AuthContext
 *
 * The React context object itself. The default value passed to createContext
 * is only used if a component calls useAuth() outside of an AuthProvider —
 * in normal usage the AuthProvider always supplies the real value.
 *
 * Default values:
 *   user    → null       (no one logged in)
 *   loading → true       (assume loading until proven otherwise)
 *   refreshSession → no-op async function
 *   logout         → no-op function
 */
const AuthContext = createContext<AuthContextType>({
  user:            null,
  loading:         true,
  refreshSession:  async () => {},
  logout:          () => {},
})

// ---------------------------------------------------------------------------
// AuthProvider
// ---------------------------------------------------------------------------

/**
 * AuthProvider
 *
 * A React component that wraps the application (or part of it) and makes
 * authentication state available to all descendant components via the
 * AuthContext.
 *
 * Where to place it:
 *   Typically in app/layout.tsx, wrapping {children}, so that every page
 *   and component in the app can access auth state:
 *
 *     export default function RootLayout({ children }) {
 *       return (
 *         <html>
 *           <body>
 *             <AuthProvider>{children}</AuthProvider>
 *           </body>
 *         </html>
 *       )
 *     }
 *
 * @param {{ children: React.ReactNode }} props
 *   children — The rest of the component tree that should have access to
 *              auth state. In practice this is the entire application.
 */
export function AuthProvider({ children }: { children: React.ReactNode }) {

  // -------------------------------------------------------------------------
  // State
  // -------------------------------------------------------------------------

  /**
   * user — The currently authenticated user object.
   * Starts as null (not logged in) and is updated after the session check.
   */
  const [user, setUser] = useState<User>(null)

  /**
   * loading — Whether the initial session check is still in progress.
   * Starts as true so that components can show a loading state before the
   * first refreshSession() call completes.
   */
  const [loading, setLoading] = useState(true)

  // -------------------------------------------------------------------------
  // refreshSession
  // -------------------------------------------------------------------------

  /**
   * refreshSession
   *
   * Checks whether the user currently has a valid session by reading the
   * stored tokens from localStorage and sending them to the server for
   * verification.
   *
   * Steps:
   *  1. Read both tokens from localStorage.
   *  2. Guard against invalid token values (undefined/null strings can end
   *     up stored as the literal text "undefined" or "null" — we treat those
   *     as missing too).
   *  3. POST the tokens to /api/session for server-side verification.
   *  4a. If the server returns a valid user → store it in state.
   *  4b. If the server returns an error → clear the invalid tokens and set
   *      user to null so the app treats the session as expired.
   *  5. In all cases, set loading to false when done.
   *
   * Error handling:
   *   A network or server error is caught and logged. The user is set to null
   *   because we cannot confirm they are authenticated without a server response.
   */
  const refreshSession = async () => {
    const token        = localStorage.getItem('authToken')
    const refreshToken = localStorage.getItem('refreshToken')

    // Guard: treat missing, "undefined", or "null" string values as no token.
    // These invalid strings can appear if code elsewhere accidentally calls
    // localStorage.setItem('authToken', undefined) — without this check they
    // would be sent to the server and cause a confusing error.
    if (!token || token === 'undefined' || token === 'null') {
      console.warn('No valid auth token found, skipping session check')
      setUser(null)
      setLoading(false)
      return
    }

    try {
      const res = await fetch('/api/session', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ token, refreshToken }),
      })

      const data = await res.json()

      if (!res.ok || !data.user) {
        // The server rejected the token (expired, tampered with, or revoked).
        // Remove the invalid tokens so the next page load starts clean.
        console.warn('Session check returned invalid or expired session')
        localStorage.removeItem('authToken')
        localStorage.removeItem('refreshToken')
        setUser(null)
      } else {
        // Server confirmed the session is valid and returned the user object.
        console.log('Session validated successfully')
        setUser(data.user)
      }
    } catch (err) {
      // Network failure or unexpected server error — cannot confirm auth.
      console.error('Session check failed with an unexpected error:', err)
      setUser(null)
    }

    setLoading(false)
  }

  // -------------------------------------------------------------------------
  // logout
  // -------------------------------------------------------------------------

  /**
   * logout
   *
   * Clears all authentication data and returns the user to the sign-in page.
   *
   * Steps:
   *  1. Remove both tokens from localStorage so future page loads start
   *     unauthenticated.
   *  2. Set the user state to null immediately so any currently rendered
   *     components that depend on auth state update right away.
   *  3. Redirect to /signin.
   *     The typeof window check prevents this from running during server-side
   *     rendering (where window does not exist), which would cause an error.
   */
  const logout = () => {
    localStorage.removeItem('authToken')
    localStorage.removeItem('refreshToken')
    setUser(null)

    // Redirect to the sign-in page.
    // Guard with typeof window to ensure this only runs in the browser,
    // not during Next.js server-side rendering where window is undefined.
    if (typeof window !== 'undefined') {
      window.location.href = '/signin'
    }
  }

  // -------------------------------------------------------------------------
  // Initial session check on mount
  // -------------------------------------------------------------------------

  /**
   * useEffect — Run refreshSession once when AuthProvider first mounts.
   *
   * The empty dependency array [] means this effect runs exactly once,
   * immediately after the component is added to the DOM. This is what
   * triggers the initial "am I logged in?" check on every page load.
   */
  useEffect(() => {
    refreshSession()
  }, [])

  // -------------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------------

  /**
   * AuthContext.Provider wraps the children and injects the current auth
   * state and helper functions. Any component inside the tree can access
   * these values by calling useAuth().
   */
  return (
    <AuthContext.Provider value={{ user, loading, refreshSession, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

// ---------------------------------------------------------------------------
// useAuth hook
// ---------------------------------------------------------------------------

/**
 * useAuth
 *
 * A custom React hook that provides access to the authentication context.
 * Call this inside any functional component to get the current auth state.
 *
 * Returns the AuthContextType object:
 *   { user, loading, refreshSession, logout }
 *
 * Must be called inside a component that is a descendant of AuthProvider.
 * If called outside of AuthProvider it will return the default context
 * values (user: null, loading: true, no-op functions).
 *
 * @returns {AuthContextType}
 *
 * @example
 *   function ProfileButton() {
 *     const { user, logout } = useAuth()
 *     if (!user) return <a href="/signin">Sign in</a>
 *     return <button onClick={logout}>{user.full_name}</button>
 *   }
 */
export const useAuth = () => useContext(AuthContext)