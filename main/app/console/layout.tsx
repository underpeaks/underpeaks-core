'use client'

import { useState, useEffect } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { TopNavbar, Sidebar } from '../components_cus'

interface ConsoleLayoutProps {
  children: React.ReactNode
}

export default function ConsoleLayout({ children }: ConsoleLayoutProps) {
  const [collapsed, setCollapsed] = useState(false)
  const [user, setUser] = useState<any>(undefined) // undefined = loading
  const [checkingAuth, setCheckingAuth] = useState(true)
  const router = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    async function checkSession() {
      try {
        const token = localStorage.getItem('authToken')
        if (!token) {
          console.log('🚫 No token found — redirecting to signin')
          setUser(null)
          setCheckingAuth(false)
          return
        }

        const res = await fetch('/api/session', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token }),
        })

        if (!res.ok) {
          console.error('Session API returned error:', res.status)
          setUser(null)
          return
        }

        const data = await res.json()
        setUser(data.user ?? null)
      } catch (err) {
        console.error('🚫 Session check failed:', err)
        setUser(null)
      } finally {
        setCheckingAuth(false)
      }
    }

    checkSession()
  }, [])

  useEffect(() => {
    if (!checkingAuth && !user) {
      router.replace(`/signin?redirectedFrom=${pathname}`)
    }
  }, [checkingAuth, user, router, pathname])

  if (checkingAuth || user === undefined) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p>Loading...</p>
      </div>
    )
  }

  const sidebarWidth = collapsed ? 80 : 256

  return (
    <div className="flex flex-col min-h-screen">
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
    </div>
  )
}
