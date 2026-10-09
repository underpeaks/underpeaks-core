//app/[locale]/console/ConsoleLayout.tsx
'use client'

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
import Loader              from './Loading'
import { useConsoleStore } from '../../store/consoleStore'

interface AuthContextType {
  user:           any | null
  checkingAuth:   boolean
  refreshSession: () => Promise<void>
}

const AuthContext = createContext<AuthContextType>({
  user:           null,
  checkingAuth:   true,
  refreshSession: async () => {},
})

export function useAuth() {
  return useContext(AuthContext)
}

interface ConsoleLayoutProps {
  children: ReactNode
}

// Firebase keeps its own session in the browser, separate from our authToken,
// so a real logout has to end that session too (no-op on other databases).
async function signOutFirebaseClient(): Promise<void> {
  if (process.env.NEXT_PUBLIC_DB_TYPE !== 'firebase') return
  try {
    const { getApps, initializeApp } = await import('firebase/app')
    const { getAuth }                = await import('firebase/auth')
    const { parseFirebaseWebConfig } = await import('@/app/lib/firebaseConfig')
    if (!getApps().length) {
      initializeApp(parseFirebaseWebConfig(process.env.NEXT_PUBLIC_FIREBASE_CONFIG))
    }
    await getAuth().signOut()
  } catch {
    console.error('ConsoleLayout: Firebase sign-out did not complete.')
  }
}

// Firebase ID tokens expire after one hour and the server cannot refresh them,
// so ask the Firebase client for a current one (it renews silently when needed).
// Returns null on other databases or if no Firebase session is available.
async function getFreshFirebaseToken(): Promise<string | null> {
  if (process.env.NEXT_PUBLIC_DB_TYPE !== 'firebase') return null
  try {
    const { getApps, initializeApp } = await import('firebase/app')
    const { getAuth, onAuthStateChanged } = await import('firebase/auth')
    const { parseFirebaseWebConfig } = await import('@/app/lib/firebaseConfig')

    if (!getApps().length) {
      initializeApp(parseFirebaseWebConfig(process.env.NEXT_PUBLIC_FIREBASE_CONFIG))
    }

    const auth = getAuth()
    // currentUser is null until Firebase has restored the session from the browser
    const fbUser = await new Promise<any>((resolve) => {
      const timer = setTimeout(() => resolve(null), 3000)
      const unsub = onAuthStateChanged(auth, (u) => {
        clearTimeout(timer)
        unsub()
        resolve(u)
      })
    })

    return fbUser ? await fbUser.getIdToken() : null
  } catch {
    return null
  }
}

export default function ConsoleLayout({ children }: ConsoleLayoutProps) {
  const t = useTranslations('consoleLayout')

  const [collapsed,       setCollapsed]       = useState(false)
  const [navigating,      setNavigating]      = useState(false)
  const [showIdleModal,   setShowIdleModal]   = useState(false)
  const [countdown,       setCountdown]       = useState(30)
  const [showLicenseGate, setShowLicenseGate] = useState(false)
  const [licenseInput,    setLicenseInput]    = useState('')
  const [licenseError,    setLicenseError]    = useState<string | null>(null)
  const [licenseSaving,   setLicenseSaving]   = useState(false)
  const [licenseSuccess,  setLicenseSuccess]  = useState(false)

  const router       = useRouter()
  const pathname     = usePathname()
  const prevPathname = useRef(pathname)
  const idleTimerRef = useRef<NodeJS.Timeout | null>(null)
  // True once this mount's first session check has finished. Until then the
  // store can still hold the logged-out state left by the previous logout, and
  // the redirect effect must not act on it.
  const authCheckedRef = useRef(false)

  const {
    user,
    checkingAuth,
    logoUrl,
    projectName,
    config,
    setConsoleValue,
    loadConfig,
    resetConsole,
  } = useConsoleStore()

  const refreshSession = async () => {
    try {
      let token          = localStorage.getItem('authToken')
      const refreshToken = localStorage.getItem('refreshToken')

      if (!token) {
        setConsoleValue('user', null)
        setConsoleValue('checkingAuth', false)
        return
      }

      // Firebase: swap in a current ID token so the session outlives the 1h expiry
      const freshToken = await getFreshFirebaseToken()
      if (freshToken) {
        token = freshToken
        localStorage.setItem('authToken', freshToken)
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
        localStorage.removeItem('authToken')
        localStorage.removeItem('refreshToken')
        setConsoleValue('user', null)
      } else {
        setConsoleValue('user', data.user)

        if (data.accessToken)
          localStorage.setItem('authToken',   data.accessToken)
        if (data.refreshToken)
          localStorage.setItem('refreshToken', data.refreshToken)

        const userId = data.user.user_id
        if (userId) {
          const configRes  = await fetch(`/api/get-db-config?user_id=${userId}`)
          const configData = await configRes.json()
          if (configData?.config) loadConfig(configData.config)
        }
      }
    } catch {
      setConsoleValue('user', null)
    } finally {
      authCheckedRef.current = true
      setConsoleValue('checkingAuth', false)
    }
  }

  // FIX: the Zustand store is a module-level singleton — it is NOT reset on
  // client-side navigation, only on full page reload or explicit logout.
  // If the user was previously redirected away from /console while
  // unauthenticated (checkingAuth: false, user: null), that stale state is
  // still sitting in the store the instant this component mounts again
  // after a successful sign-in — BEFORE the fresh refreshSession() call
  // below has had a chance to resolve. The redirect effect further down
  // was firing on that one stale render and bouncing the user straight
  // back to /signin, even though a valid new token had just been stored.
  // Forcing checkingAuth back to true synchronously on every mount closes
  // that window — the redirect effect can never see a stale "logged out"
  // state again.
  useEffect(() => {
    authCheckedRef.current = false
    setConsoleValue('checkingAuth', true)
    refreshSession()
  }, [])

  useEffect(() => {
    const interval = setInterval(refreshSession, 5 * 60 * 1000)
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    if (checkingAuth || !user) return
    fetch('/api/license/status')
      .then((r) => r.json())
      .then((d) => setShowLicenseGate(!d.hasKey))
      .catch(() => setShowLicenseGate(false))
  }, [checkingAuth, user])

  const handleSaveLicenseKey = async () => {
    if (!licenseInput.trim()) return
    setLicenseSaving(true)
    setLicenseError(null)

    try {

      const studioUrl   = (process.env.NEXT_PUBLIC_STUDIO_URL ?? 'http://localhost:3000').replace(/\/$/, '')
      const validateRes = await fetch(`${studioUrl}/api/license/validate`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({
          license_key:  licenseInput.trim(),
          instance_url: process.env.NEXT_PUBLIC_APP_DOMAIN,
          db_type:      process.env.NEXT_PUBLIC_DB_TYPE,
          project_name: config?.project_name ?? '',
        }),
      })

      const validateData = await validateRes.json()

      if (!validateRes.ok || !validateData.valid) {
        setLicenseError(validateData.error ?? 'Invalid license key — please check and try again.')
        return
      }

      const saveRes = await fetch('/api/update-project-settings', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({
          user_id:      user?.user_id,
          project_name: config?.project_name ?? '',
          project_url:  config?.project_url  ?? process.env.NEXT_PUBLIC_APP_DOMAIN ?? '',
          nxf_api_key:  licenseInput.trim(),
        }),
      })

      if (!saveRes.ok) {
        setLicenseError('Failed to save license key. Please try again.')
        return
      }

      // Show a success message briefly, then close the gate
      setLicenseSuccess(true)
      setTimeout(() => {
        setShowLicenseGate(false)
        setLicenseSuccess(false)
        setLicenseInput('')
      }, 5000)

    } catch {
      setLicenseError('Could not reach Studio to validate your license key. Check your connection.')
    } finally {
      setLicenseSaving(false)
    }
  }

  useEffect(() => {
    if (!authCheckedRef.current) {
      return
    }
    if (!checkingAuth && !user) {
      router.replace(`/signin?redirectedFrom=${pathname}`)
    }
  }, [checkingAuth, user, router, pathname])

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

  useEffect(() => {
    if (pathname !== prevPathname.current) {
      prevPathname.current = pathname
      setNavigating(false)
    }
  }, [pathname])

  const startIdleCountdown = () => {
    setCountdown(30)
    setShowIdleModal(true)
  }

  const resetIdleTimer = () => {
    if (idleTimerRef.current) clearTimeout(idleTimerRef.current)
    idleTimerRef.current = setTimeout(startIdleCountdown, 10 * 60 * 1000)
  }

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

  useEffect(() => {
    if (!showIdleModal) return
    if (countdown <= 0) { handleLogout(); return }
    const interval = setInterval(() => setCountdown((p) => p - 1), 1000)
    return () => clearInterval(interval)
  }, [showIdleModal, countdown])

  const handleLogout = async () => {
    try {
      const token        = localStorage.getItem('authToken')
      const refreshToken = localStorage.getItem('refreshToken')
      await fetch('/api/logout', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ token, refreshToken, user_id: user?.user_id }),
      })
    } catch (err) {
      console.error(t('logs.logoutFailed'), err)
    } finally {
      await signOutFirebaseClient()
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current)
      localStorage.removeItem('authToken')
      localStorage.removeItem('refreshToken')
      setShowIdleModal(false)
      setCountdown(30)
      resetConsole()
      router.push('/signin')
    }
  }

  if (checkingAuth || user === undefined) {
    return <Loader fullScreen />
  }

  const sidebarWidth = collapsed ? 96 : 256

  return (
    <AuthContext.Provider value={{ user, checkingAuth, refreshSession }}>
      <div className="flex flex-col h-screen overflow-hidden">
        <header className="h-16 shrink-0 w-full border-b shadow z-50">
          <TopNavbar user={user} logoUrl={logoUrl} projectName={projectName} />
        </header>

        <div className="flex flex-1 overflow-hidden">
          <aside
            className="shrink-0 border-r overflow-hidden transition-all duration-300"
            style={{ width: sidebarWidth }}
          >
            <Sidebar collapsed={collapsed} setCollapsed={setCollapsed} />
          </aside>

          <main
            style={{ flexGrow: 1, minWidth: 0 }}
            className="relative overflow-hidden bg-gray-100"
          >
            {navigating && <Loader />}
            {children}
          </main>
        </div>
      </div>

      {/* ── License Gate Modal ─────────────────────────────────────────────── */}
      <Dialog open={showLicenseGate} onOpenChange={() => {}}>
        <DialogContent className="sm:max-w-[480px]">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold">
              Activate Your License
            </DialogTitle>
            <DialogDescription className="mt-2 text-sm text-gray-500">
              Enter your Underpeaks license key to activate this installation.
              You can find your key in your Underpeaks Studio account under
              Settings → License Keys.
            </DialogDescription>
          </DialogHeader>

          <div className="mt-4 flex flex-col gap-3">
            <input
              type="text"
              value={licenseInput}
              onChange={(e) => { setLicenseInput(e.target.value); setLicenseError(null) }}
              placeholder="nxf_live_xxxxxxxxxxxxxxxxxxxxxxxx"
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-300"
            />
            {licenseError && (
              <p className="text-xs text-red-500">{licenseError}</p>
            )}
            {licenseSuccess && (
              <p className="text-xs text-green-600">License activated successfully.</p>
            )}
          </div>

          <div className="mt-6 flex flex-col gap-2 w-full">
            <Button
              onClick={handleSaveLicenseKey}
              disabled={!licenseInput.trim() || licenseSaving || licenseSuccess}
              className="w-full"
            >
              {licenseSaving ? 'Validating…' : 'Activate'}
            </Button>
            <Button
              variant="outline"
              onClick={handleLogout}
              className="w-full"
            >
              Sign Out
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Idle Session Modal ─────────────────────────────────────────────── */}
      <Dialog open={showIdleModal} onOpenChange={() => {}}>
        <DialogContent className="sm:max-w-[400px] text-center flex flex-col items-center">
          <DialogHeader>
            <DialogTitle className="text-center" style={{ fontSize: 20 }}>
              {t('idleModal.title')}
            </DialogTitle>
            <DialogDescription className="mt-2 text-center" style={{ fontSize: 15 }}>
              {t('idleModal.description')}
            </DialogDescription>
          </DialogHeader>

          <div className="mt-4 font-bold text-center" style={{ fontSize: 54 }}>
            {countdown}
          </div>

          <DialogFooter className="flex flex-col gap-4 mt-6 w-full items-center">
            <Button
              variant="destructive"
              onClick={handleLogout}
              className="w-1/2 px-6 py-2 text-sm text-center"
            >
              {t('idleModal.logoutButton')}
            </Button>
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