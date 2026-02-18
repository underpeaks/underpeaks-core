'use client'

import { useState, useEffect, createContext, useContext, ReactNode, useRef } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { TopNavbar, Sidebar } from '../components_cus'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'

// ---------------------------
// Auth Context
// ---------------------------
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

// ---------------------------
// Console Layout Props
// ---------------------------
interface ConsoleLayoutProps {
  children: ReactNode
}

export default function ConsoleLayout({ children }: ConsoleLayoutProps) {
  const [collapsed, setCollapsed] = useState(false)
  const [user, setUser] = useState<any | undefined>(undefined)
  const [checkingAuth, setCheckingAuth] = useState(true)
  const router = useRouter()
  const pathname = usePathname()

  // ---------------------------
  // Session check / refresh
  // ---------------------------
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
        if (data.accessToken) localStorage.setItem('authToken', data.accessToken)
        if (data.refreshToken) localStorage.setItem('refreshToken', data.refreshToken)
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

  // ---------------------------
  // Idle Logout Modal
  // ---------------------------
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

  // Countdown effect
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
    idleTimerRef.current = setTimeout(startIdleCountdown, 10 * 60 * 1000) // 10 minutes
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

  const sidebarWidth = collapsed ? 80 : 256

  return (
    <AuthContext.Provider value={{ user, checkingAuth, refreshSession }}>
      <div className="flex flex-col min-h-screen relative">
        <header className="w-full h-16 border-b shadow">
          <TopNavbar user={user} />
        </header>
        <div className="flex flex-1">
          <aside
            style={{ width: sidebarWidth, transition: 'width 0.3s' }}
            className="border-r h-[calc(100vh-4rem)] overflow-auto"
          >
            <Sidebar collapsed={collapsed} setCollapsed={setCollapsed} />
          </aside>
          <main style={{ flexGrow: 1 }} className="p-6 overflow-auto">
            {children}
          </main>
        </div>

        {/* Idle Logout Modal using ShadCN Dialog */}
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

            {/* Countdown number */}
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
      </div>
    </AuthContext.Provider>
  )
}
