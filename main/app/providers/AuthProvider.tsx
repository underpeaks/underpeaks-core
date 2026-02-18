'use client'

import { createContext, useContext, useEffect, useState } from 'react'

type User = {
  user_id: string
  full_name?: string
  email?: string
  role?: string
} | null

type AuthContextType = {
  user: User
  loading: boolean
  refreshSession: () => Promise<void>
  logout: () => void
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  refreshSession: async () => {},
  logout: () => {},
})

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User>(null)
  const [loading, setLoading] = useState(true)

  const refreshSession = async () => {
    const token = localStorage.getItem('authToken')
    const refreshToken = localStorage.getItem('refreshToken')

    // 🚨 CRITICAL FIX — skip if token is invalid
    if (!token || token === 'undefined' || token === 'null') {
      console.warn('⛔ No valid token, skipping session check')
      setUser(null)
      setLoading(false)
      return
    }

    console.log('🔄 Checking session with token:', token)

    try {
      const res = await fetch('/api/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, refreshToken }),
      })

      const data = await res.json()

      if (!res.ok || !data.user) {
        console.warn('❌ Session invalid')
        localStorage.removeItem('authToken')
        localStorage.removeItem('refreshToken')
        setUser(null)
      } else {
        console.log('✅ Session valid:', data.user)
        setUser(data.user)
      }
    } catch (err) {
      console.error('🔥 Session check failed:', err)
      setUser(null)
    }

    setLoading(false)
  }

  const logout = () => {
    localStorage.removeItem('authToken')
    localStorage.removeItem('refreshToken')
    setUser(null)
    // Optional: redirect safely
    if (typeof window !== 'undefined') {
      window.location.href = '/signin'
    }
  }

  useEffect(() => {
    refreshSession()
  }, [])

  return (
    <AuthContext.Provider value={{ user, loading, refreshSession, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
