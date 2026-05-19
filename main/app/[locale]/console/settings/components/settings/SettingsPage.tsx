/**
 * SettingsPage Component
 *
 * This is the main layout component for the entire Settings section of the CMS.
 * It renders a two-panel layout:
 *
 * LEFT PANEL — A collapsible sidebar navigation that lists all settings sections.
 * RIGHT PANEL — The content area that renders whichever settings page is active.
 *
 * How navigation works:
 * - The active section is determined by the `activeId` prop, which comes from
 *   the URL (e.g. /console/settings/smtp → activeId = "smtp").
 * - When the user clicks a nav item, Next.js router.push() changes the URL,
 *   which causes the parent route page to pass a new `activeId` down.
 * - If the `activeId` doesn't match any known page, it falls back to "overview".
 *
 * Sidebar collapse behaviour:
 * - The sidebar can be collapsed to icon-only mode (width: 64px) by clicking
 *   the chevron toggle button in the sidebar header.
 * - In collapsed mode, nav item labels are hidden but the icons remain,
 *   and a tooltip (title attribute) shows the label on hover.
 *
 * The content area wraps the active page in a React <Suspense> boundary
 * so that lazy-loaded or async pages show a loading spinner while they load.
 */

'use client'

import { Suspense, useState }  from 'react'
import { useTranslations }     from 'next-intl'
import { useRouter }           from 'next/navigation'
import {
  FiGrid, FiKey, FiMail, FiImage,
  FiChevronLeft, FiChevronRight,
} from 'react-icons/fi'

import OverviewPage from './pages/overViewPage'
import SmtpPage     from './pages/SMTPpage'
import ApiKeysPage  from './pages/ApiKeysPage'
import BrandingPage from './pages/BrandingPage'
import Loader       from '@/app/[locale]/console/Loading'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/**
 * NavItem
 *
 * Represents a single entry in the settings sidebar navigation.
 *
 * @property id    - The unique identifier for this section. Must match the
 *                   URL segment and the key in the `pages` map below.
 * @property label - The human-readable name shown next to the icon in the nav.
 * @property icon  - The React icon element rendered in the nav button.
 */
type NavItem = {
  id:    string
  label: string
  icon:  React.ReactNode
}

// ---------------------------------------------------------------------------
// Static data
// ---------------------------------------------------------------------------

/**
 * navItems
 *
 * The ordered list of navigation items shown in the settings sidebar.
 * Each item maps to a settings section/page.
 *
 * IMPORTANT: The `label` strings here are set from translations inside the
 * component (see `buildNavItems` below) — we define the structure here and
 * attach translated labels at render time.
 */
const navItemIds = [
  { id: 'overview', icon: <FiGrid  size={16} /> },
  { id: 'api-keys', icon: <FiKey   size={16} /> },
  { id: 'smtp',     icon: <FiMail  size={16} /> },
  { id: 'branding', icon: <FiImage size={16} /> },
]

/**
 * pages
 *
 * A map from section ID to the React component that should be rendered
 * in the content area when that section is active.
 *
 * Keys must match the `id` values in `navItemIds` above and the URL segments
 * used in the router (e.g. /console/settings/smtp).
 */
const pages: Record<string, React.ReactNode> = {
  'overview': <OverviewPage />,
  'api-keys': <ApiKeysPage />,
  'smtp':     <SmtpPage />,
  'branding': <BrandingPage />,
}

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

/**
 * Props for the SettingsPage component.
 *
 * @property activeId - The ID of the currently active settings section,
 *                      derived from the URL segment by the parent route page.
 *                      Example: "smtp", "api-keys", "branding", "overview".
 */
type Props = { activeId: string }

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

/**
 * SettingsPage
 *
 * Renders the full settings layout with a collapsible sidebar and a content area.
 *
 * @param activeId - The settings section to display (from the URL).
 */
export default function SettingsPage({ activeId }: Props) {
  /**
   * t — Translation function scoped to the 'settingsPage' namespace.
   * Use t('key') to get the translated string for that key.
   */
  const t = useTranslations('settingsPage')

  /**
   * router — Next.js router used to navigate between settings sections.
   * When a nav item is clicked, we push the new URL to change the active page.
   */
  const router = useRouter()

  /**
   * active — The resolved active section ID.
   * If the incoming `activeId` doesn't match any known page, we fall back
   * to 'overview' so the user always sees something valid.
   */
  const active = pages[activeId] ? activeId : 'overview'

  /**
   * collapsed — Whether the sidebar is in collapsed (icon-only) mode.
   * Toggled by the chevron button in the sidebar header.
   */
  const [collapsed, setCollapsed] = useState(false)

  /**
   * navItems — Navigation items with translated labels attached.
   * Built at render time so labels are always in the current language.
   */
  const navItems: NavItem[] = navItemIds.map((item) => ({
    ...item,
    label: t(`nav.${item.id}`),
  }))

  // -------------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------------

  return (
    <div className="absolute inset-0 flex bg-gray-100 overflow-hidden">

      {/* ====================================================================
        * LEFT PANEL — Collapsible settings sidebar navigation
        * Collapses to icon-only (w-16) or expands to full width (w-56).
        * ==================================================================== */}
      <aside
        className={`shrink-0 bg-white border-r border-gray-200 flex flex-col overflow-y-auto transition-all duration-300 ${
          collapsed ? 'w-16' : 'w-56'
        }`}
      >
        {/* ------------------------------------------------------------------
          * Sidebar Header
          * Shows the "Settings" label when expanded.
          * Always shows the collapse/expand toggle chevron button.
          * ------------------------------------------------------------------ */}
        <div className="shrink-0 border-b border-gray-100 flex items-center justify-between px-3 py-4 min-h-[52px]">

          {/* "Settings" label — hidden when collapsed */}
          {!collapsed && (
            <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">
              {t('sidebarTitle')}
            </p>
          )}

          {/* Collapse / expand toggle button */}
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="flex items-center justify-center w-7 h-7 rounded-full bg-gray-100 hover:bg-gray-200 transition-colors ml-auto"
            aria-label={t('toggleAriaLabel')}
          >
            {collapsed
              ? <FiChevronRight size={14} />
              : <FiChevronLeft  size={14} />
            }
          </button>
        </div>

        {/* ------------------------------------------------------------------
          * Sidebar Navigation Items
          * Renders one button per settings section.
          *
          * When collapsed:
          *   - Labels are hidden, only icons are shown.
          *   - `title` is set so the label appears as a native browser tooltip.
          *
          * Active item:
          *   - Gets a filled background, bold text, and a darker icon colour.
          *
          * Inactive items:
          *   - Lighter text with a subtle hover highlight.
          * ------------------------------------------------------------------ */}
        <nav className="flex-1 py-2">
          {navItems.map((item) => {
            const isActive = active === item.id
            return (
              <button
                key={item.id}
                onClick={() => router.push(`/console/settings/${item.id}`)}
                title={collapsed ? item.label : undefined}
                className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm transition-colors text-left ${
                  collapsed ? 'justify-center' : ''
                } ${
                  isActive
                    ? 'bg-gray-100 text-gray-900 font-semibold'
                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                }`}
              >
                {/* Nav icon — darker when active, lighter when inactive */}
                <span className={isActive ? 'text-gray-900' : 'text-gray-400'}>
                  {item.icon}
                </span>

                {/* Nav label — hidden when sidebar is collapsed */}
                {!collapsed && item.label}
              </button>
            )
          })}
        </nav>
      </aside>

      {/* ====================================================================
        * RIGHT PANEL — Settings content area
        * Renders the active settings page inside a Suspense boundary.
        * The Suspense fallback shows a <Loader /> spinner while the page loads.
        * Max width of 2xl keeps content readable on wide screens.
        * ==================================================================== */}
      <main className="flex-1 overflow-y-auto p-6">
        <div className="max-w-2xl mx-auto">
          <Suspense fallback={<Loader />}>
            {pages[active]}
          </Suspense>
        </div>
      </main>

    </div>
  )
}