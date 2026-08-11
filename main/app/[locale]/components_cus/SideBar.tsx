'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { menuSections } from './MenuItems'
import {
  FiChevronLeft, FiChevronRight, FiLogOut, FiSettings,
  FiChevronDown, FiChevronRight as FiChevronRightSmall, FiLock,
  FiHome, FiGrid, FiPackage, FiUsers, FiSettings as FiSettingsIcon,
  FiFileText, FiShoppingCart, FiMail, FiStar, FiInfo, FiLink,
} from 'react-icons/fi'
import { SidebarProps } from './types'
import HostedUpgradeDialog from './hostedUpgradeDialog'
import { useAuth } from '../console/layout'
import { getIcon } from './getIcon'


// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface DynamicMenuItem {
  menu_id:   string
  label:     string
  page_id:   string | null
  icon:      string
  target:    '_self' | '_blank'
  visible:   boolean
  parent_id: string | null
  order:     number
  slug?:     string
}

// ---------------------------------------------------------------------------
// Icon resolver — matches what MenuPage uses
// ---------------------------------------------------------------------------



// ---------------------------------------------------------------------------
// Sidebar
// ---------------------------------------------------------------------------

export default function Sidebar({ collapsed, setCollapsed }: SidebarProps) {
  const pathname = usePathname()
  const router   = useRouter()
  const t        = useTranslations('sidebar')
  const { user } = useAuth()

  const [showUpgradeDialog, setShowUpgradeDialog] = useState(false)
  const [isLoggingOut,      setIsLoggingOut]      = useState(false)
  const [dynamicItems,      setDynamicItems]      = useState<DynamicMenuItem[]>([])
  const [dynamicExpanded,   setDynamicExpanded]   = useState(true)

  // Pull out system items and visible sections separately
  const systemSection   = menuSections.find((s) => s.hidden && s.title === 'system')
  const visibleSections = menuSections.filter((s) => !s.hidden)

  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>(
    () => visibleSections.reduce((acc, section) => {
      acc[section.title] = false
      return acc
    }, {} as Record<string, boolean>)
  )

  // ── Fetch dynamic menu items from nxf_menu ────────────────────────────────

  useEffect(() => {
  if (!user) return
  const userId = user.user_id || user.id
  fetchDynamicMenu(userId)

  // Re-fetch whenever the menu is updated from any page
  const handleMenuUpdate = () => fetchDynamicMenu(userId)
  window.addEventListener('nxf:menu:updated', handleMenuUpdate)
  return () => window.removeEventListener('nxf:menu:updated', handleMenuUpdate)
}, [user])

 async function fetchDynamicMenu(userId: string) {
    try {
      const res  = await fetch(`/api/menu?user_id=${userId}`)
      const text = await res.text()
      if (!text) return
      const data = JSON.parse(text)

      console.log('[DEBUG] /api/menu response:', data)

      if (data.success) {
        const pagesRes  = await fetch(`/api/menu/pages?user_id=${userId}`)
        const pagesText = await pagesRes.text()
        const pagesData = pagesText ? JSON.parse(pagesText) : { pages: [] }
        const pages     = pagesData.pages ?? []

        console.log('[DEBUG] /api/menu/pages response:', pages)

        const itemsWithSlugs = (data.items ?? []).map((item: DynamicMenuItem) => {
          const page = pages.find((p: any) => p.page_id === item.page_id)
          console.log('[DEBUG] menu item page_id:', item.page_id, '-> matched page:', page)
          const rawSlug = page?.slug?.replace(/^\//, '') ?? null
          const href    = rawSlug ? `/console/${rawSlug}` : '#'
          return { ...item, slug: href }
        })

        setDynamicItems(itemsWithSlugs)
      }
    } catch (err) {
      console.error('[DEBUG] fetchDynamicMenu error:', err)
    }
  }

  // ── Helpers ───────────────────────────────────────────────────────────────

  const toggleSection = (title: string) => {
    setExpandedSections((prev) => ({ ...prev, [title]: !prev[title] }))
  }

  const handleMenuClick = (e: React.MouseEvent<HTMLAnchorElement>, item: any) => {
    if (item.post_icon?.type === FiLock) {
      e.preventDefault()
      setShowUpgradeDialog(true)
    }
  }

  // ── Logout ────────────────────────────────────────────────────────────────

  const handleLogout = async () => {
    if (isLoggingOut) return
    setIsLoggingOut(true)
    try {
      const token        = localStorage.getItem('authToken')
      const refreshToken = localStorage.getItem('refreshToken')
      const res          = await fetch('/api/logout', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ token, refreshToken }),
      })
      const data = await res.json()
      if (!res.ok || !data.success) {
        console.warn('Sidebar: Server-side logout did not complete successfully.')
      }
      localStorage.removeItem('authToken')
      localStorage.removeItem('refreshToken')

      if (process.env.NEXT_PUBLIC_DB_TYPE === 'firebase') {
        try {
          const { getApps, initializeApp } = await import('firebase/app')
          const { getAuth, signOut }        = await import('firebase/auth')
          const firebaseConfig = JSON.parse(process.env.NEXT_PUBLIC_FIREBASE_CONFIG!)
          const app  = getApps().length ? getApps()[0] : initializeApp(firebaseConfig)
          const auth = getAuth(app)
          await signOut(auth)
        } catch {
          console.warn('Sidebar: Firebase sign-out did not complete.')
        }
      }

      await new Promise((r) => setTimeout(r, 400))
      router.push('/signin')
    } catch {
      console.error('Sidebar: An unexpected error occurred during logout.')
      setIsLoggingOut(false)
    }
  }

  // ── Renderers ─────────────────────────────────────────────────────────────

  // Renders a static hardcoded menu item (from MenuItems.tsx)
  const renderStaticItem = (item: any, key: string) => {
    const isActive = pathname === item.path
    return (
      <Link
        key={key}
        href={item.path}
        onClick={(e) => handleMenuClick(e, item)}
        className={`flex items-center gap-3 px-4 py-2 rounded transition-colors hover:bg-gray-100 text-xs ${
          isActive ? 'bg-gray-200 font-semibold text-gray-900' : 'text-gray-700'
        } ${collapsed ? 'justify-center' : ''}`}
        title={collapsed ? item.label : undefined}
        aria-current={isActive ? 'page' : undefined}
      >
        <span aria-hidden="true">{item.icon}</span>
        {!collapsed && <span>{item.label}</span>}
        {!collapsed && item.post_icon && (
          <span className="ml-auto" aria-hidden="true">{item.post_icon}</span>
        )}
      </Link>
    )
  }

  // Renders a dynamic menu item fetched from nxf_menu
  const renderDynamicItem = (item: DynamicMenuItem) => {
    const href     = item.slug && item.slug !== '#' ? item.slug : '#'
    const isActive = pathname === href
    return (
      <Link
        key={item.menu_id}
        href={href}
        target={item.target}
        className={`flex items-center gap-3 px-4 py-2 rounded transition-colors hover:bg-gray-100 text-xs ${
          isActive ? 'bg-gray-200 font-semibold text-gray-900' : 'text-gray-700'
        } ${collapsed ? 'justify-center' : ''}`}
        title={collapsed ? item.label : undefined}
        aria-current={isActive ? 'page' : undefined}
      >
        <span aria-hidden="true">{getIcon(item.icon)}</span>
        {!collapsed && <span>{item.label}</span>}
      </Link>
    )
  }

  // ── Derived dynamic data ──────────────────────────────────────────────────

  const topLevelDynamic = dynamicItems
    .filter((i) => !i.parent_id && i.visible)
    .sort((a, b) => a.order - b.order)

  const childrenOf = (parentId: string) =>
    dynamicItems
      .filter((i) => i.parent_id === parentId && i.visible)
      .sort((a, b) => a.order - b.order)

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <aside
      className={`fixed top-16 left-0 z-30 flex flex-col bg-white border-r border-gray-200 transition-width duration-300 ${
        collapsed ? 'w-25' : 'w-64'
      }`}
      style={{ height: 'calc(100vh - 64px)' }}
      aria-label={t('aria.sidebar')}
    >

      {/* Header — collapse toggle */}
      <div className="shrink-0 bg-white border-b border-gray-200 flex items-center justify-between p-6 min-h-[60px]">
        <button
          onClick={() => setCollapsed(!collapsed)}
          aria-label={collapsed ? t('aria.expandSidebar') : t('aria.collapseSidebar')}
          className="flex items-center justify-center w-9 h-9 rounded-full bg-gray-100 hover:bg-gray-200 transition-colors"
        >
          {collapsed ? <FiChevronRight size={18} /> : <FiChevronLeft size={18} />}
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto mt-2" aria-label={t('aria.navigation')}>

        {/* ── System items: Dashboard + Users — always pinned, no collapse ── */}
        {systemSection && (
          <div className="mb-2 pb-2 border-b border-gray-100">
            {systemSection.items.map((item) => renderStaticItem(item, item.label))}
          </div>
        )}

        {/* ── Dynamic items from nxf_menu (user-managed) ── */}
        {topLevelDynamic.length > 0 && (
          <div className="mb-4">
            {!collapsed && (
              <button
                onClick={() => setDynamicExpanded((v) => !v)}
                className="flex items-center justify-between w-full px-4 py-2 text-[10px] font-semibold text-gray-500 uppercase hover:bg-gray-100"
                aria-expanded={dynamicExpanded}
              >
                <span>{t('footer.business')}</span>
                {dynamicExpanded
                  ? <FiChevronDown size={14} aria-hidden="true" />
                  : <FiChevronRightSmall size={14} aria-hidden="true" />
                }
              </button>
            )}

            <div className={`flex flex-col ${collapsed ? 'block' : dynamicExpanded ? 'block' : 'hidden'}`}>
              {topLevelDynamic.map((item) => (
                <div key={item.menu_id}>
                  {renderDynamicItem(item)}
                  {/* Render children indented beneath their parent */}
                  {childrenOf(item.menu_id).map((child) => (
                    <div key={child.menu_id} className="pl-4">
                      {renderDynamicItem(child)}
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── Static sections from MenuItems.tsx (console nav) ── */}
        {visibleSections.map((section) => {
          const isExpanded = expandedSections[section.title]
          return (
            <div key={section.title} className="mb-4">
              {!collapsed && (
                <button
                  onClick={() => toggleSection(section.title)}
                  className="flex items-center justify-between w-full px-4 py-2 text-[10px] font-semibold text-gray-500 uppercase hover:bg-gray-100"
                  aria-expanded={isExpanded}
                >
                  <span>{section.title}</span>
                  {isExpanded
                    ? <FiChevronDown size={14} aria-hidden="true" />
                    : <FiChevronRightSmall size={14} aria-hidden="true" />
                  }
                </button>
              )}
              <div className={`flex flex-col ${collapsed ? 'block' : isExpanded ? 'block' : 'hidden'}`}>
                {section.items.map((item) => renderStaticItem(item, item.label))}
              </div>
            </div>
          )
        })}
      </nav>

      {/* Footer */}
      <div className="shrink-0 bg-white border-t border-gray-200 p-4 flex justify-between px-3 items-center">
        <Link
          href="/console/settings"
          title={t('footer.settings')}
          className="flex items-center justify-center w-9 h-9 rounded-full bg-gray-100 hover:bg-gray-200 transition-colors text-gray-600"
        >
          <FiSettings size={16} aria-hidden="true" />
        </Link>
        <button
          onClick={handleLogout}
          disabled={isLoggingOut}
          title={t('footer.logout')}
          className="flex items-center justify-center w-9 h-9 rounded-full bg-gray-100 hover:bg-red-100 hover:text-red-500 transition-colors text-gray-600 disabled:opacity-50"
        >
          <FiLogOut size={16} aria-hidden="true" />
        </button>
      </div>

      {/* Logout overlay */}
      {isLoggingOut && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-xl px-8 py-6 flex flex-col items-center gap-3">
            <div className="h-6 w-6 border-2 border-gray-300 border-t-gray-800 rounded-full animate-spin" />
            <div className="text-sm font-medium text-gray-800">{t('loggingOut')}</div>
          </div>
        </div>
      )}

      <HostedUpgradeDialog open={showUpgradeDialog} onOpenChange={setShowUpgradeDialog} />
    </aside>
  )
}