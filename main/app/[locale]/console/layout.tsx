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

  const router       = useRouter()
  const pathname     = usePathname()
  const prevPathname = useRef(pathname)
  const idleTimerRef = useRef<NodeJS.Timeout | null>(null)

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
      setConsoleValue('checkingAuth', false)
    }
  }

  useEffect(() => { refreshSession() }, [])
  useEffect(() => {
    const interval = setInterval(refreshSession, 5 * 60 * 1000)
    return () => clearInterval(interval)
  }, [])

  // TODO: RE-ENABLE BEFORE LAUNCH — temporarily disabled so testers can bypass license gate
  // useEffect(() => {
  //   if (!checkingAuth && user && config !== null && config !== undefined) {
  //     const hasKey = !!(config?.nxf_api_key)
  //     setShowLicenseGate(!hasKey)
  //   }
  // }, [checkingAuth, user, config])

  const handleSaveLicenseKey = async () => {
    if (!licenseInput.trim()) return
    setLicenseSaving(true)
    setLicenseError(null)

    try {

      ///TODO PUT BACK BFOR LAUNCH
      // const studioUrl   = process.env.NEXT_PUBLIC_STUDIO_URL ?? 'http://localhost:3000'
      // const validateRes = await fetch(`${studioUrl}/api/license/validate`, {
      //   method:  'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body:    JSON.stringify({
      //     license_key:  licenseInput.trim(),
      //     instance_url: process.env.NEXT_PUBLIC_APP_DOMAIN,
      //     db_type:      process.env.NEXT_PUBLIC_DB_TYPE,
      //     project_name: config?.project_name ?? '',
      //   }),
      // })

      // const validateData = await validateRes.json()

      // if (!validateRes.ok || !validateData.valid) {
      //   setLicenseError(validateData.error ?? 'Invalid license key — please check and try again.')
      //   return
      // }

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

      loadConfig({ ...(config ?? {}), nxf_api_key: licenseInput.trim() })
      setShowLicenseGate(false)

    } catch {
      setLicenseError('Could not reach Studio to validate your license key. Check your connection.')
    } finally {
      setLicenseSaving(false)
    }
  }

  useEffect(() => {
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
          </div>

          {/* Plain div instead of DialogFooter to keep buttons inside the modal */}
          <div className="mt-6 flex flex-col gap-2 w-full">
            <Button
              onClick={handleSaveLicenseKey}
              disabled={!licenseInput.trim() || licenseSaving}
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