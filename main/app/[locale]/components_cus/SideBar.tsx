/**
 * Sidebar.tsx
 * ------------
 * The main navigation sidebar for the NXTFlutter console.
 *
 * What does this component do?
 * -----------------------------
 * It renders a vertical navigation panel on the left side of the console layout.
 * It contains:
 *
 *  1. A header with a collapse/expand toggle button
 *  2. A scrollable navigation menu with collapsible sections and their links
 *  3. A footer with a Settings link and a Logout button
 *  4. A full-screen blocking overlay shown while logout is in progress
 *
 * What is "collapsed" mode?
 * --------------------------
 * The sidebar has two display modes:
 *  - Expanded (w-64): Shows section titles, chevrons, and full link labels
 *  - Collapsed (w-25): Hides all text, shows only icons centred in the sidebar
 * The collapsed state is controlled by the parent (ConsoleLayout) so the
 * main content area can adjust its own width accordingly.
 *
 * How are menu sections structured?
 * -----------------------------------
 * Menu items are imported from MenuItems.ts as an array of sections.
 * Each section has a title and a list of navigation items (label, path, icon).
 * Sections can be individually expanded or collapsed by clicking their header button.
 *
 * What is the logout flow?
 * -------------------------
 * 1. Sends a POST request to /api/logout to invalidate the session on the server
 * 2. Removes the auth tokens from localStorage
 * 3. If the project uses Firebase, also calls Firebase's signOut()
 * 4. Redirects the user to /signin
 * A blocking overlay is shown during this process to prevent any other actions.
 *
 * ⚠️  Security rules for this component:
 *   - Never log auth tokens retrieved from localStorage
 *   - Never log raw server error responses (may contain internal details)
 *   - Never log raw Firebase error objects (may contain config details)
 */

'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { menuSections } from './MenuItems'
import {
  FiChevronLeft,
  FiChevronRight,
  FiLogOut,
  FiSettings,
  FiChevronDown,
  FiChevronRight as FiChevronRightSmall,
} from 'react-icons/fi'
import { SidebarProps } from './types'

/**
 * Sidebar
 * --------
 * The console navigation sidebar component.
 *
 * @param collapsed    - Whether the sidebar is in collapsed (icon-only) mode.
 *                       Passed down from the parent layout component.
 * @param setCollapsed - Callback to toggle the collapsed state in the parent.
 *                       Called when the user clicks the collapse/expand button.
 */
export default function Sidebar({ collapsed, setCollapsed }: SidebarProps) {
  const pathname = usePathname()
  const router = useRouter()
  const t = useTranslations('sidebar')

  // ── Expanded/collapsed state for each menu section ──
  // We initialise all sections as collapsed (false) using the section titles as keys.
  // Example: { 'Content': false, 'Settings': false, 'Developer': false }
  // When the user clicks a section header, its value is toggled to true/false.
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>(
    () =>
      menuSections.reduce((acc, section) => {
        acc[section.title] = false
        return acc
      }, {} as Record<string, boolean>)
  )

  // Whether a logout request is currently in progress.
  // Used to disable the logout button and show the blocking overlay.
  const [isLoggingOut, setIsLoggingOut] = useState(false)

  /**
   * toggleSection
   * --------------
   * Expands or collapses a menu section when the user clicks its header.
   * Uses the section title as the key in the expandedSections state object.
   *
   * @param title - The title of the section to toggle (e.g. 'Content', 'Settings')
   */
  const toggleSection = (title: string) => {
    setExpandedSections((prev) => ({
      ...prev,
      [title]: !prev[title],
    }))
  }

  /**
   * handleLogout
   * -------------
   * Handles the full logout flow for the current user.
   *
   * Steps:
   *  1. Guards against double-clicks by checking isLoggingOut
   *  2. Reads auth tokens from localStorage
   *  3. Sends a POST to /api/logout to invalidate the session on the server
   *  4. Removes auth tokens from localStorage regardless of server response
   *     (we always clear local tokens so the user is logged out locally
   *     even if the server request fails)
   *  5. If using Firebase, calls Firebase's signOut() to clear Firebase's session
   *  6. Waits 400ms to allow any animations to finish before navigating
   *  7. Redirects to /signin
   *
   * Error handling:
   *  - Server logout failure: logged as a warning, local tokens are still cleared
   *  - Firebase logout failure: logged as a warning, navigation still proceeds
   *  - Unexpected errors: logged, isLoggingOut reset so user can try again
   *
   * ⚠️  Never log the token or refreshToken values — they are security credentials.
   */
  const handleLogout = async () => {
    // Prevent double-clicks or triggering logout while one is already in progress
    if (isLoggingOut) return

    setIsLoggingOut(true)

    try {
      // Read the current auth tokens from localStorage.
      // ⚠️ These are never logged — they are security credentials.
      const token = localStorage.getItem('authToken')
      const refreshToken = localStorage.getItem('refreshToken')

      // Tell the server to invalidate this session.
      // Even if this request fails, we still clear local tokens below.
      const res = await fetch('/api/logout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, refreshToken }),
      })

      const data = await res.json()

      if (!res.ok || !data.success) {
        // Server-side logout failed — log a warning without exposing the error detail
        console.warn('Sidebar: Server-side logout did not complete successfully. Local tokens will still be cleared.')
      } else {
        // Logout confirmed by the server
        console.log('✅ Sidebar: Logout completed successfully.')
      }

      // Always remove tokens from localStorage, even if the server request failed.
      // This ensures the user is always logged out on the current device.
      localStorage.removeItem('authToken')
      localStorage.removeItem('refreshToken')

      // ── Firebase logout ──
      // If this project uses Firebase, we also need to sign out of Firebase's
      // own auth session — otherwise Firebase may keep the user signed in
      // independently of our session system.
      if (process.env.NEXT_PUBLIC_DB_TYPE === 'firebase') {
        try {
          // Dynamically import Firebase to avoid including it in non-Firebase project bundles
          const { getApps, initializeApp } = await import('firebase/app')
          const { getAuth, signOut } = await import('firebase/auth')

          // Parse the Firebase config — never log this value
          const firebaseConfig = JSON.parse(process.env.NEXT_PUBLIC_FIREBASE_CONFIG!)

          // Reuse existing Firebase app instance if already initialised
          const app = getApps().length ? getApps()[0] : initializeApp(firebaseConfig)
          const auth = getAuth(app)

          await signOut(auth)
        } catch {
          // Firebase logout failed — log a safe warning without the raw error object
          // Navigation will still proceed so the user can reach the sign-in page
          console.warn('Sidebar: Firebase sign-out did not complete. The user will still be redirected to sign-in.')
        }
      }

      // Brief delay to allow any exit animations or state updates to settle
      // before navigating away from the console
      await new Promise((r) => setTimeout(r, 400))

      router.push('/signin')

    } catch {
      // An unexpected error occurred during the logout process.
      // We reset isLoggingOut so the user can try again.
      // We do not log the raw error as it may contain sensitive session details.
      console.error('Sidebar: An unexpected error occurred during logout. The user may need to try again.')
      setIsLoggingOut(false)
    }
  }

  // ─────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────
  return (
    <aside
      className={`fixed top-16 left-0 z-30 flex flex-col bg-white border-r border-gray-200 transition-width duration-300 ${
        collapsed ? 'w-25' : 'w-64'
      }`}
      style={{ height: 'calc(100vh - 64px)' }}
      aria-label={t('aria.sidebar')}
    >

      {/* ── Header: Collapse/Expand Toggle ── */}
      <div className="shrink-0 bg-white border-b border-gray-200 flex items-center justify-between p-6 min-h-[60px]">
        <button
          onClick={() => setCollapsed(!collapsed)}
          aria-label={collapsed ? t('aria.expandSidebar') : t('aria.collapseSidebar')}
          className="flex items-center justify-center w-9 h-9 rounded-full bg-gray-100 hover:bg-gray-200 transition-colors"
          title={collapsed ? t('aria.expandSidebar') : t('aria.collapseSidebar')}
        >
          {collapsed ? <FiChevronRight size={18} /> : <FiChevronLeft size={18} />}
        </button>
      </div>

      {/* ── Navigation Menu ── */}
      {/* Scrollable area containing all menu sections and their items */}
      <nav className="flex-1 overflow-y-auto mt-2" aria-label={t('aria.navigation')}>
        {menuSections.map((section) => {
          const isExpanded = expandedSections[section.title]

          return (
            <div key={section.title} className="mb-4">

              {/* Section header button — only shown in expanded sidebar mode */}
              {/* Clicking it toggles the section's items open or closed */}
              {!collapsed && (
                <button
                  onClick={() => toggleSection(section.title)}
                  className="flex items-center justify-between w-full px-4 py-2 text-[10px] font-semibold text-gray-500 uppercase hover:bg-gray-100"
                  aria-expanded={isExpanded}
                  aria-controls={`section-${section.title}`}
                >
                  <span>{section.title}</span>
                  {/* Chevron icon indicates expanded/collapsed state */}
                  {isExpanded ? (
                    <FiChevronDown size={14} aria-hidden="true" />
                  ) : (
                    <FiChevronRightSmall size={14} aria-hidden="true" />
                  )}
                </button>
              )}

              {/* Section items — visible when sidebar is collapsed (icon-only mode)
                  OR when the section is expanded in full sidebar mode */}
              <div
                id={`section-${section.title}`}
                className={`flex flex-col ${
                  collapsed ? 'block' : isExpanded ? 'block' : 'hidden'
                }`}
              >
                {section.items.map((item) => {
                  // Check if this link matches the current URL path
                  const isActive = pathname === item.path

                  return (
                    <Link
                      key={item.label}
                      href={item.path}
                      className={`flex items-center gap-3 px-4 py-2 rounded transition-colors hover:bg-gray-100 text-xs ${
                        isActive
                          ? 'bg-gray-200 font-semibold text-gray-900'
                          : 'text-gray-700'
                      } ${collapsed ? 'justify-center' : ''}`}
                      // In collapsed mode, show the label as a tooltip on hover
                      title={collapsed ? item.label : undefined}
                      aria-current={isActive ? 'page' : undefined}
                    >
                      {/* Navigation icon — always shown */}
                      <span aria-hidden="true">{item.icon}</span>

                      {/* Navigation label — hidden in collapsed mode */}
                      {!collapsed && <span>{item.label}</span>}
                    </Link>
                  )
                })}
              </div>

            </div>
          )
        })}
      </nav>

      {/* ── Footer: Settings and Logout ── */}
      <div className="shrink-0 bg-white border-t border-gray-200 p-4 flex justify-between px-3 items-center">

        {/* Settings link — navigates to the console settings page */}
        <Link
          href="/console/settings"
          title={t('footer.settings')}
          aria-label={t('footer.settings')}
          className="flex items-center justify-center w-9 h-9 rounded-full bg-gray-100 hover:bg-gray-200 transition-colors text-gray-600"
        >
          <FiSettings size={16} aria-hidden="true" />
        </Link>

        {/* Logout button — triggers the full logout flow */}
        <button
          onClick={handleLogout}
          disabled={isLoggingOut}
          title={t('footer.logout')}
          aria-label={t('footer.logout')}
          className="flex items-center justify-center w-9 h-9 rounded-full bg-gray-100 hover:bg-red-100 hover:text-red-500 transition-colors text-gray-600 disabled:opacity-50"
        >
          <FiLogOut size={16} aria-hidden="true" />
        </button>

      </div>

      {/* ── Logout Blocking Overlay ── */}
      {/* Covers the entire screen while logout is in progress.
          This prevents the user from clicking anything else during the logout flow.
          The backdrop-blur gives a visual indication that the UI is temporarily locked. */}
      {isLoggingOut && (
        <div
          className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/40 backdrop-blur-sm"
          role="status"
          aria-live="polite"
          aria-label={t('loggingOut')}
        >
          <div className="bg-white rounded-xl shadow-xl px-8 py-6 flex flex-col items-center gap-3">
            {/* Spinning loading indicator */}
            <div
              className="h-6 w-6 border-2 border-gray-300 border-t-gray-800 rounded-full animate-spin"
              aria-hidden="true"
            />
            <div className="text-sm font-medium text-gray-800">
              {t('loggingOut')}
            </div>
          </div>
        </div>
      )}

    </aside>
  )
}