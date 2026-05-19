'use client'

/**
 * ConsoleLayout Component
 *
 * This is the root layout shell for the entire console section of the app.
 * Every page inside the console (dashboards, settings, theming, etc.) is
 * wrapped by this component. Think of it as the "frame" around all console
 * content — it handles everything that needs to happen at the application
 * level, so individual pages don't have to worry about it.
 *
 * What this component is responsible for:
 * ────────────────────────────────────────
 * 1. Authentication
 *    - Calls the session endpoint on first load to check whether the user
 *      is logged in, and refreshes the session automatically every 5 minutes.
 *    - Redirects unauthenticated users to /signin.
 *    - Provides an AuthContext so any child component can read the current
 *      user or trigger a manual session refresh via the useAuth() hook.
 *
 * 2. Layout structure
 *    - Renders a fixed top navbar, a collapsible left sidebar, and a
 *      scrollable main content area where child pages are rendered.
 *
 * 3. Navigation loading indicator
 *    - Listens for internal link clicks and shows a loading spinner while
 *      the next page is loading, then hides it once the URL changes.
 *
 * 4. Idle session timeout
 *    - Tracks user activity (mouse, keyboard, touch, scroll).
 *    - After 10 minutes of inactivity, shows a modal with a 30-second
 *      countdown. If the user does nothing, they are logged out automatically.
 *    - The user can dismiss the modal with "Keep Alive" to reset the timer.
 *
 * 5. Logout
 *    - Calls the logout API, clears local tokens, resets the console store,
 *      and redirects to /signin.
 *
 * Component hierarchy:
 *   ConsoleLayout
 *   ├── AuthContext.Provider   ← makes user + refreshSession available globally
 *   ├── TopNavbar              ← fixed header bar
 *   ├── Sidebar                ← collapsible left navigation
 *   ├── {children}             ← the active console page
 *   └── IdleModal (Dialog)     ← shown after 10 min of inactivity
 */

import {
  useState,
  useEffect,
  createContext,
  useContext,
  ReactNode,
  useRef,
} from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { useTranslations }        from 'next-intl'
import { Sidebar, TopNavbar }     from '../components_cus'
import { Button }                 from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import Loader                  from './Loading'
import { useConsoleStore }     from '../../store/consoleStore'

// ---------------------------------------------------------------------------
// Auth Context
// ---------------------------------------------------------------------------

/**
 * AuthContextType
 *
 * The shape of the value exposed by AuthContext to any child component that
 * calls useAuth(). Kept intentionally minimal — child components only need
 * to read the user and optionally trigger a refresh.
 *
 * Fields:
 *   - user           : the currently authenticated user object, or null if
 *                      the user is not logged in.
 *   - checkingAuth   : true while the initial session check is in progress.
 *                      Use this to avoid rendering protected UI before we
 *                      know whether the user is authenticated.
 *   - refreshSession : call this to manually trigger a session refresh,
 *                      e.g. after a token-dependent action fails.
 */
interface AuthContextType {
  user:           any | null
  checkingAuth:   boolean
  refreshSession: () => Promise<void>
}

/**
 * AuthContext
 *
 * React context that holds auth state for the entire console subtree.
 * Default values are safe "not yet loaded" placeholders — checkingAuth
 * starts as true so children know to wait before rendering protected content.
 *
 * Use the useAuth() hook (below) to consume this context; never import
 * AuthContext directly in child components.
 */
const AuthContext = createContext<AuthContextType>({
  user:           null,
  checkingAuth:   true,
  refreshSession: async () => {},
})

/**
 * useAuth
 *
 * A convenience hook that any child component inside ConsoleLayout can call
 * to access the current user, the auth-checking flag, and the refreshSession
 * function.
 *
 * Example usage in a child component:
 *   const { user, checkingAuth } = useAuth()
 *   if (checkingAuth) return <Spinner />
 *   if (!user) return null
 *   return <p>Hello, {user.name}</p>
 */
export function useAuth() {
  return useContext(AuthContext)
}

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

/**
 * ConsoleLayoutProps
 *
 * Props accepted by the ConsoleLayout component.
 *
 * Fields:
 *   - children {ReactNode} — the active console page rendered inside the
 *                            main content area. Next.js passes this in
 *                            automatically as the current route's page.
 */
interface ConsoleLayoutProps {
  children: ReactNode
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

/**
 * ConsoleLayout
 *
 * The root layout shell for all console pages. See the file-level JSDoc above
 * for a full description of what this component handles.
 *
 * @param children — The active console page, provided by Next.js routing.
 */
export default function ConsoleLayout({ children }: ConsoleLayoutProps) {
  /**
   * t — Translation function scoped to the 'consoleLayout' namespace.
   * Call t('some.key') to get the translated string for that key.
   */
  const t = useTranslations('consoleLayout')

  // -------------------------------------------------------------------------
  // State
  // -------------------------------------------------------------------------

  /**
   * collapsed
   * Whether the left sidebar is in its collapsed (icon-only, 96 px wide) or
   * expanded (full-width, 256 px) state. Toggled by a button inside Sidebar.
   */
  const [collapsed,     setCollapsed]     = useState(false)

  /**
   * navigating
   * True while the app is transitioning between pages after an internal link
   * click. Used to show the full-page loading spinner over the content area.
   */
  const [navigating,    setNavigating]    = useState(false)

  /**
   * showIdleModal
   * True when the idle timeout has fired and the "Inactive Session" warning
   * dialog should be visible.
   */
  const [showIdleModal, setShowIdleModal] = useState(false)

  /**
   * countdown
   * The number of seconds remaining before automatic logout when the idle
   * modal is open. Counts down from 30 once per second.
   */
  const [countdown,     setCountdown]     = useState(30)

  // -------------------------------------------------------------------------
  // Routing
  // -------------------------------------------------------------------------

  /** Next.js router — used for programmatic navigation (redirect to /signin). */
  const router   = useRouter()

  /** The current URL pathname — used to detect page changes. */
  const pathname = usePathname()

  /**
   * prevPathname
   * A ref (persists across renders without causing re-renders) that holds
   * the previous pathname. Compared against the current pathname to detect
   * when a navigation has completed so we can hide the loading spinner.
   */
  const prevPathname = useRef(pathname)

  // -------------------------------------------------------------------------
  // Console store
  // -------------------------------------------------------------------------

  /**
   * Values and actions pulled from the global Zustand console store.
   *
   *   user          — the authenticated user object (or null).
   *   checkingAuth  — true while the session is being verified.
   *   logoUrl       — custom logo URL for the top navbar.
   *   projectName   — the project/brand name shown in the navbar.
   *   setConsoleValue — sets a single key in the store.
   *   loadConfig    — populates the store from a fetched config object.
   *   resetConsole  — clears all store state (called on logout).
   */
  const {
    user,
    checkingAuth,
    logoUrl,
    projectName,
    setConsoleValue,
    loadConfig,
    resetConsole,
  } = useConsoleStore()

  // -------------------------------------------------------------------------
  // Session refresh
  // -------------------------------------------------------------------------

  /**
   * refreshSession
   *
   * Verifies the user's auth token with the server and updates the store.
   *
   * Steps:
   * 1. Reads the auth token and refresh token from localStorage.
   * 2. If there is no token, marks the user as null and stops checking.
   * 3. POSTs both tokens to /api/session. The server validates them and
   *    optionally returns new (rotated) tokens.
   * 4. If the server returns no user, clears local tokens and sets user null.
   * 5. If the server returns a valid user:
   *    a. Stores the user in the console store.
   *    b. Persists any rotated tokens back to localStorage.
   *    c. Fetches the system config for this user and loads it into the store.
   * 6. Always sets checkingAuth to false when done (success or failure).
   *
   * Called once on mount, and then automatically every 5 minutes to keep
   * the session alive for active users.
   */
  const refreshSession = async () => {
    try {
      const token        = localStorage.getItem('authToken')
      const refreshToken = localStorage.getItem('refreshToken')

      if (!token) {
        setConsoleValue('user', null)
        setConsoleValue('checkingAuth', false)
        return
      }

      const res = await fetch('/api/session', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ token, refreshToken }),
      })

      if (!res.ok) {
        setConsoleValue('user', null)
        setConsoleValue('checkingAuth', false)
        return
      }

      const data = await res.json()

      if (!data.user) {
        // Server explicitly returned no user — tokens are invalid or expired
        localStorage.removeItem('authToken')
        localStorage.removeItem('refreshToken')
        setConsoleValue('user', null)
      } else {
        // Valid session — store user and persist any rotated tokens
        setConsoleValue('user', data.user)

        if (data.accessToken)
          localStorage.setItem('authToken',  data.accessToken)
        if (data.refreshToken)
          localStorage.setItem('refreshToken', data.refreshToken)

        // Fetch and apply the system config for this user
        const userId = data.user.user_id
        if (userId) {
          const configRes  = await fetch(`/api/get-db-config?user_id=${userId}`)
          const configData = await configRes.json()
          if (configData?.config) loadConfig(configData.config)
        }
      }
    } catch {
      // Network or parse error — treat as unauthenticated
      setConsoleValue('user', null)
    } finally {
      setConsoleValue('checkingAuth', false)
    }
  }

  /**
   * Run refreshSession once immediately when the layout mounts so we know
   * whether the user is authenticated before rendering any protected content.
   */
  useEffect(() => { refreshSession() }, [])

  /**
   * Refresh the session automatically every 5 minutes while the layout is
   * mounted. This prevents long-lived tabs from silently expiring.
   * The interval is cleaned up when the layout unmounts.
   */
  useEffect(() => {
    const interval = setInterval(refreshSession, 5 * 60 * 1000)
    return () => clearInterval(interval)
  }, [])

  // -------------------------------------------------------------------------
  // Redirect unauthenticated users
  // -------------------------------------------------------------------------

  /**
   * Once the initial auth check is complete (checkingAuth = false), redirect
   * to /signin if there is no logged-in user. The current pathname is passed
   * as a query param so the sign-in page can send the user back after login.
   */
  useEffect(() => {
    if (!checkingAuth && !user) {
      router.replace(`/signin?redirectedFrom=${pathname}`)
    }
  }, [checkingAuth, user, router, pathname])

  // -------------------------------------------------------------------------
  // Navigation loading indicator
  // -------------------------------------------------------------------------

  /**
   * Listen for clicks on internal anchor tags and set `navigating` to true
   * so the loading spinner appears while the next page loads.
   *
   * We ignore:
   *   - Clicks that don't land on (or inside) an <a> element.
   *   - External links (starting with 'http').
   *   - Hash links (starting with '#') — these don't cause a page change.
   *   - Clicks on the current page's own link (href === pathname).
   */
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      const target = (e.target as HTMLElement).closest('a')
      if (!target) return
      const href = target.getAttribute('href')
      if (!href || href.startsWith('http') || href.startsWith('#')) return
      if (href !== pathname) setNavigating(true)
    }
    document.addEventListener('click', handleClick)
    return () => document.removeEventListener('click', handleClick)
  }, [pathname])

  /**
   * When the pathname changes, it means navigation has completed.
   * Hide the loading spinner and update the stored previous pathname.
   */
  useEffect(() => {
    if (pathname !== prevPathname.current) {
      prevPathname.current = pathname
      setNavigating(false)
    }
  }, [pathname])

  // -------------------------------------------------------------------------
  // Idle timeout
  // -------------------------------------------------------------------------

  /**
   * startIdleCountdown
   *
   * Called when the idle timer fires (10 minutes of no activity).
   * Resets the countdown to 30 seconds and opens the idle warning modal.
   */
  const startIdleCountdown = () => {
    setCountdown(30)
    setShowIdleModal(true)
  }

  /**
   * resetIdleTimer
   *
   * Clears any existing idle timeout and starts a fresh 10-minute countdown.
   * Called on every detected user activity event so the timer only fires
   * when the user has genuinely been idle for 10 full minutes.
   */
  const resetIdleTimer = () => {
    if (idleTimerRef.current) clearTimeout(idleTimerRef.current)
    idleTimerRef.current = setTimeout(startIdleCountdown, 10 * 60 * 1000)
  }

  /**
   * Ref holding the current idle timeout handle.
   * Using a ref (not state) means updating it never triggers a re-render.
   */
  const idleTimerRef = useRef<NodeJS.Timeout | null>(null)

  /**
   * Attach activity listeners to the window and start the initial idle timer.
   *
   * Tracked events: mousemove, mousedown, keydown, touchstart, scroll.
   * On any of these events the timer is reset — but only if the idle modal
   * is not already open (we don't want activity to dismiss the modal silently).
   *
   * Cleans up all listeners and the timeout when the component unmounts.
   */
  useEffect(() => {
    const events = ['mousemove', 'mousedown', 'keydown', 'touchstart', 'scroll']
    const reset  = () => { if (!showIdleModal) resetIdleTimer() }
    events.forEach((e) => window.addEventListener(e, reset))
    resetIdleTimer()
    return () => {
      events.forEach((e) => window.removeEventListener(e, reset))
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current)
    }
  }, [showIdleModal])

  /**
   * Countdown tick — runs once per second while the idle modal is open.
   * When countdown reaches 0, triggers automatic logout.
   * Cleans up the interval when the modal closes or the component unmounts.
   */
  useEffect(() => {
    if (!showIdleModal) return
    if (countdown <= 0) { handleLogout(); return }
    const interval = setInterval(() => setCountdown((p) => p - 1), 1000)
    return () => clearInterval(interval)
  }, [showIdleModal, countdown])

  // -------------------------------------------------------------------------
  // Logout
  // -------------------------------------------------------------------------

  /**
   * handleLogout
   *
   * Logs the user out, cleans up local state, and redirects to /signin.
   *
   * Steps:
   * 1. POSTs the current tokens to /api/logout so the server can invalidate
   *    them (e.g. remove refresh token from the database).
   * 2. Removes both tokens from localStorage regardless of whether the API
   *    call succeeded — we always want to clear local credentials.
   * 3. Closes the idle modal, resets the console store, and navigates to
   *    /signin.
   *
   * The try/catch ensures that even if the logout API call fails (e.g. no
   * network), the user is still logged out locally.
   */
  const handleLogout = async () => {
    try {
      const token        = localStorage.getItem('authToken')
      const refreshToken = localStorage.getItem('refreshToken')
      await fetch('/api/logout', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ token, refreshToken }),
      })
    } catch (err) {
      console.error(t('logs.logoutFailed'), err)
    } finally {
      localStorage.removeItem('authToken')
      localStorage.removeItem('refreshToken')
      setShowIdleModal(false)
      resetConsole()
      router.push('/signin')
    }
  }

  // -------------------------------------------------------------------------
  // Auth loading splash
  // -------------------------------------------------------------------------

  /**
   * While we are still checking auth (or user is undefined — the store's
   * uninitialised state before refreshSession runs), show a full-screen
   * loader so the user never sees a flash of unauthenticated UI.
   */
  if (checkingAuth || user === undefined) {
    return <Loader fullScreen />
  }

  // -------------------------------------------------------------------------
  // Derived values
  // -------------------------------------------------------------------------

  /**
   * sidebarWidth
   * The pixel width of the sidebar, derived from the `collapsed` state.
   * Applied as an inline style so the CSS transition animates smoothly.
   */
  const sidebarWidth = collapsed ? 96 : 256

  // -------------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------------

  return (
    <AuthContext.Provider value={{ user, checkingAuth, refreshSession }}>
      <div className="flex flex-col h-screen overflow-hidden">

        {/* ----------------------------------------------------------------
          * Top Navbar
          * Fixed-height header (64 px) that spans the full width.
          * Sits above the sidebar + content row and has a higher z-index
          * so it is never obscured by content scrolling beneath it.
          * ---------------------------------------------------------------- */}
        <header className="h-16 shrink-0 w-full border-b shadow z-50">
          <TopNavbar user={user} logoUrl={logoUrl} projectName={projectName} />
        </header>

        {/* ----------------------------------------------------------------
          * Body Row — sidebar + main content side by side
          * ---------------------------------------------------------------- */}
        <div className="flex flex-1 overflow-hidden">

          {/* --------------------------------------------------------------
            * Sidebar
            * Animates its width between 96 px (collapsed) and 256 px
            * (expanded) using a CSS transition. The Sidebar component
            * controls the toggle button internally; it calls setCollapsed
            * to update the width here in the layout.
            * -------------------------------------------------------------- */}
          <aside
            className="shrink-0 border-r overflow-hidden transition-all duration-300"
            style={{ width: sidebarWidth }}
          >
            <Sidebar collapsed={collapsed} setCollapsed={setCollapsed} />
          </aside>

          {/* --------------------------------------------------------------
            * Main Content Area
            * Fills all remaining horizontal space. The `navigating` overlay
            * (Loader without fullScreen) covers this area while a page
            * transition is in progress. `children` is the active page.
            * -------------------------------------------------------------- */}
          <main
            style={{ flexGrow: 1, minWidth: 0 }}
            className="relative overflow-hidden bg-gray-100"
          >
            {navigating && <Loader />}
            {children}
          </main>

        </div>
      </div>

      {/* ------------------------------------------------------------------
        * Idle Session Modal
        * Shown after 10 minutes of inactivity. Counts down 30 seconds
        * and then logs the user out automatically if they do not respond.
        *
        * onOpenChange is intentionally a no-op (() => {}) to prevent the
        * dialog from closing when the user clicks the backdrop — the user
        * must explicitly choose "Logout" or "Keep Alive".
        * ------------------------------------------------------------------ */}
      <Dialog open={showIdleModal} onOpenChange={() => {}}>
        <DialogContent className="sm:max-w-[400px] text-center flex flex-col items-center">

          <DialogHeader>
            {/* Modal title */}
            <DialogTitle className="text-center" style={{ fontSize: 20 }}>
              {t('idleModal.title')}
            </DialogTitle>
            {/* Explanatory subtitle */}
            <DialogDescription className="mt-2 text-center" style={{ fontSize: 15 }}>
              {t('idleModal.description')}
            </DialogDescription>
          </DialogHeader>

          {/* Large countdown number — updates every second */}
          <div className="mt-4 font-bold text-center" style={{ fontSize: 54 }}>
            {countdown}
          </div>

          <DialogFooter className="flex flex-col gap-4 mt-6 w-full items-center">

            {/* Logout immediately */}
            <Button
              variant="destructive"
              onClick={handleLogout}
              className="w-1/2 px-6 py-2 text-sm text-center"
            >
              {t('idleModal.logoutButton')}
            </Button>

            {/* Dismiss modal and reset the idle timer */}
            <Button
              variant="outline"
              onClick={() => {
                setShowIdleModal(false)
                setCountdown(30)
                resetIdleTimer()
              }}
              className="w-1/2 px-6 py-2 text-sm text-center"
            >
              {t('idleModal.keepAliveButton')}
            </Button>

          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AuthContext.Provider>
  )
}