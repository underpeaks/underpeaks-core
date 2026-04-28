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
import { TopNavbar, Sidebar } from '../components_cus'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'

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

interface ConsoleLayoutProps {
  children: ReactNode
}

export default function ConsoleLayout({ children }: ConsoleLayoutProps) {
  const [collapsed, setCollapsed] = useState(false)
  const [user, setUser] = useState<any | undefined>(undefined)
  const [checkingAuth, setCheckingAuth] = useState(true)
  const [logoUrl, setLogoUrl] = useState<string>('/images/logo/NXT_Flutter_logo.png')
  const [projectName, setProjectName] = useState<string>('Default')

  const router = useRouter()
  const pathname = usePathname()

  const refreshSession = async () => {
    try {
      const token = localStorage.getItem('authToken')
      const refreshToken = localStorage.getItem('refreshToken')

      if (!token) {
        setUser(null)
        return
      }

      const res = await fetch('/api/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, refreshToken }),
      })

      if (!res.ok) {
        setUser(null)
        return
      }

      const data = await res.json()

      if (!data.user) {
        localStorage.removeItem('authToken')
        localStorage.removeItem('refreshToken')
        setUser(null)
      } else {
        setUser(data.user)

        if (data.accessToken)
          localStorage.setItem('authToken', data.accessToken)

        if (data.refreshToken)
          localStorage.setItem('refreshToken', data.refreshToken)

        const userId = data.user?.user?.user_id

        if (userId) {
          console.log('[PAGE REQUEST]- REQUESTING CONFIG')
          const configRes = await fetch(`/api/get-db-config?user_id=${userId}`)
          console.log('[PAGE REQUEST]- FETCH COMPLETE -  CONFIG')
          const configData = await configRes.json()
          const config = configData?.config

          console.log('BRANDING:', config?.branding)
          console.log('PROJECT NAME :', config?.project_name)

          if (config?.branding?.logo_url) setLogoUrl(config.branding.logo_url)
          if (config?.project_name) setProjectName(config.project_name)
        }
      }
    } catch {
      setUser(null)
    } finally {
      setCheckingAuth(false)
    }
  }

  useEffect(() => {
    refreshSession()
  }, [])

  useEffect(() => {
    const interval = setInterval(refreshSession, 5 * 60 * 1000)
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    if (!checkingAuth && !user) {
      router.replace(`/signin?redirectedFrom=${pathname}`)
    }
  }, [checkingAuth, user, router, pathname])

  const [showIdleModal, setShowIdleModal] = useState(false)
  const [countdown, setCountdown] = useState(30)
  const idleTimerRef = useRef<NodeJS.Timeout | null>(null)

  const startIdleCountdown = () => {
    setCountdown(30)
    setShowIdleModal(true)
  }

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
      router.push('/signin')
    }
  }

  useEffect(() => {
    if (!showIdleModal) return
    if (countdown <= 0) {
      handleLogout()
      return
    }
    const interval = setInterval(() => {
      setCountdown((prev) => prev - 1)
    }, 1000)
    return () => clearInterval(interval)
  }, [showIdleModal, countdown])

  const resetIdleTimer = () => {
    if (idleTimerRef.current) clearTimeout(idleTimerRef.current)
    idleTimerRef.current = setTimeout(startIdleCountdown, 10 * 60 * 1000)
  }

  useEffect(() => {
    const events = ['mousemove', 'mousedown', 'keydown', 'touchstart', 'scroll']
    const reset = () => {
      if (!showIdleModal) resetIdleTimer()
    }
    events.forEach((event) => window.addEventListener(event, reset))
    resetIdleTimer()
    return () => {
      events.forEach((event) => window.removeEventListener(event, reset))
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current)
    }
  }, [showIdleModal])

  if (checkingAuth || user === undefined) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p>Loading...</p>
      </div>
    )
  }

  const sidebarWidth = collapsed ? 96 : 256

  return (
    <AuthContext.Provider value={{ user, checkingAuth, refreshSession }}>
      {/* Full viewport, no scroll on the shell itself */}
      <div className="flex flex-col h-screen overflow-hidden">

        {/* ── Top navbar — fixed height ── */}
        <header className="h-16 shrink-0 w-full border-b shadow z-50">
          <TopNavbar
            user={user}
            logoUrl={logoUrl}
            projectName={projectName}
          />
        </header>

        {/* ── Body row — fills remaining height ── */}
        <div className="flex flex-1 overflow-hidden">

          {/* ── Sidebar — fixed pixel width, never shrinks ── */}
          <aside
            className="shrink-0 border-r overflow-hidden transition-all duration-300"
            style={{ width: sidebarWidth }}
          >
            <Sidebar collapsed={collapsed} setCollapsed={setCollapsed} />
          </aside>

          {/* ── Main content — fills remaining width, owns its own scroll ── */}
       <main style={{ flexGrow: 1, minWidth: 0 }} className="relative overflow-hidden bg-gray-100">
  {children}
</main>

        </div>
      </div>

      {/* ── Idle modal ── */}
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