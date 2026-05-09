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
import { Sidebar, TopNavbar } from '../components_cus'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import Loader from './Loading'
import { useConsoleStore } from '../../store/consoleStore'


// ─── Auth Context (kept for backwards compat with any child that uses useAuth) ─

interface AuthContextType {
  user: any | null
  checkingAuth: boolean
  refreshSession: () => Promise<void>
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  checkingAuth: true,
  refreshSession: async () => {},
})

export function useAuth() {
  return useContext(AuthContext)
}

// ─── Layout ───────────────────────────────────────────────────────────────────

interface ConsoleLayoutProps {
  children: ReactNode
}

export default function ConsoleLayout({ children }: ConsoleLayoutProps) {
  const [collapsed, setCollapsed] = useState(false)
  const [navigating, setNavigating] = useState(false)
  const [showIdleModal, setShowIdleModal] = useState(false)
  const [countdown, setCountdown] = useState(30)

  const router = useRouter()
  const pathname = usePathname()
  const prevPathname = useRef(pathname)
  const idleTimerRef = useRef<NodeJS.Timeout | null>(null)

  const {
    user,
    checkingAuth,
    logoUrl,
    projectName,
    setConsoleValue,
    loadConfig,
    resetConsole,
  } = useConsoleStore()

  // ── Session refresh ──────────────────────────────────────────────────────

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
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token, refreshToken }),
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
      // data.user is now a clean NXFUser — no nesting, no guessing
      setConsoleValue('user', data.user)

      if (data.accessToken)
        localStorage.setItem('authToken', data.accessToken)
      if (data.refreshToken)
        localStorage.setItem('refreshToken', data.refreshToken)

      // Load system config using the clean user_id
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
    setConsoleValue('checkingAuth', false)
  }
}

  useEffect(() => { refreshSession() }, [])

  useEffect(() => {
    const interval = setInterval(refreshSession, 5 * 60 * 1000)
    return () => clearInterval(interval)
  }, [])

  // ── Redirect if unauthenticated ──────────────────────────────────────────

  useEffect(() => {
    if (!checkingAuth && !user) {
      router.replace(`/signin?redirectedFrom=${pathname}`)
    }
  }, [checkingAuth, user, router, pathname])

  // ── Navigation loader ────────────────────────────────────────────────────

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

  // ── Idle timer ───────────────────────────────────────────────────────────

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
    const reset = () => { if (!showIdleModal) resetIdleTimer() }
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

  // ── Logout ───────────────────────────────────────────────────────────────

  const handleLogout = async () => {
    try {
      const token = localStorage.getItem('authToken')
      const refreshToken = localStorage.getItem('refreshToken')
      await fetch('/api/logout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, refreshToken }),
      })
    } catch (err) {
      console.error('Logout failed:', err)
    } finally {
      localStorage.removeItem('authToken')
      localStorage.removeItem('refreshToken')
      setShowIdleModal(false)
      resetConsole()
      router.push('/signin')
    }
  }

  // ── Auth splash ──────────────────────────────────────────────────────────

  if (checkingAuth || user === undefined) {
    return <Loader fullScreen />
  }

  const sidebarWidth = collapsed ? 96 : 256

  return (
    <AuthContext.Provider value={{ user, checkingAuth, refreshSession }}>
      <div className="flex flex-col h-screen overflow-hidden">

        {/* Top navbar */}
        <header className="h-16 shrink-0 w-full border-b shadow z-50">
          <TopNavbar user={user} logoUrl={logoUrl} projectName={projectName} />
        </header>

        {/* Body row */}
        <div className="flex flex-1 overflow-hidden">

          {/* Sidebar */}
          <aside
            className="shrink-0 border-r overflow-hidden transition-all duration-300"
            style={{ width: sidebarWidth }}
          >
            <Sidebar collapsed={collapsed} setCollapsed={setCollapsed} />
          </aside>

          {/* Main content */}
          <main
            style={{ flexGrow: 1, minWidth: 0 }}
            className="relative overflow-hidden bg-gray-100"
          >
            {navigating && <Loader />}
            {children}
          </main>

        </div>
      </div>

      {/* Idle modal */}
      <Dialog open={showIdleModal} onOpenChange={() => {}}>
        <DialogContent className="sm:max-w-[400px] text-center flex flex-col items-center">
          <DialogHeader>
            <DialogTitle className="text-center" style={{ fontSize: 20 }}>
              Inactive Session
            </DialogTitle>
            <DialogDescription className="mt-2 text-center" style={{ fontSize: 15 }}>
              You have been inactive. Logging out in:
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
              Logout
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
              Keep Alive
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AuthContext.Provider>
  )
}