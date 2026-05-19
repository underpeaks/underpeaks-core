'use client';

/**
 * ThemingPage Component
 *
 * This is the top-level layout component for the entire Theming section of
 * the console. Think of it as a "shell" that provides:
 *   1. A fixed left-hand sidebar navigation with four theming categories.
 *   2. A scrollable right-hand content area that renders whichever sub-page
 *      the user has navigated to.
 *
 * It does NOT own any theming state itself — each sub-page (ColoursPage,
 * TypographyPage, etc.) manages its own state internally.
 *
 * How navigation works:
 *   - The active sub-page is determined by the `activeId` prop, which comes
 *     from the URL segment (e.g. `/console/themePage/typography` → 'typography').
 *   - Clicking a nav item calls `router.push(...)` to update the URL, which
 *     causes Next.js to re-render this component with a new `activeId`.
 *   - If `activeId` does not match any known page, it safely falls back to
 *     'colours' so the user always sees something valid.
 *
 * Sub-pages rendered in the content area:
 *   - colours       → <ColoursPage />
 *   - typography    → <TypographyPage />
 *   - spacing       → <SpacingPage />
 *   - feature-flags → <FeatureFlagsPage />
 *
 * Props:
 *   - activeId {string} — The id of the currently active nav item, derived
 *                         from the URL. Determines which sub-page is shown.
 */

import { useRouter }       from 'next/navigation';
import { useTranslations } from 'next-intl';
import {
  FiDroplet,
  FiType,
  FiSliders,
  FiToggleLeft,
} from 'react-icons/fi';

import ColoursPage      from './pages/ColoursPage';
import TypographyPage   from './pages/TypographyPage';
import SpacingPage      from './pages/SpacingPage';
import FeatureFlagsPage from './pages/FeatureFlagsPage';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/**
 * NavItem
 *
 * Describes a single entry in the left-hand sidebar navigation.
 *
 * Fields:
 *   - id    : unique string identifier matching the URL segment and the
 *             `pages` map key (e.g. 'typography').
 *   - label : translation key used to look up the human-readable nav label.
 *   - icon  : the React icon element rendered to the left of the label.
 */
type NavItem = {
  id:    string;
  label: string;
  icon:  React.ReactNode;
};

// ---------------------------------------------------------------------------
// Static data
// ---------------------------------------------------------------------------

/**
 * navItems
 *
 * The ordered list of sidebar navigation entries.
 * Each `label` field is a translation key resolved via t(item.label) in the
 * render — this keeps the data declaration clean while still supporting i18n.
 *
 * To add a new theming section:
 *   1. Add an entry here.
 *   2. Add the matching page component to the `pages` map below.
 *   3. Add the translation key to en.json under spacingPage.nav.
 */
const navItems: NavItem[] = [
  { id: 'colours',       label: 'nav.colours',      icon: <FiDroplet size={16} />    },
  { id: 'typography',    label: 'nav.typography',   icon: <FiType size={16} />       },
  { id: 'spacing',       label: 'nav.spacing',      icon: <FiSliders size={16} />    },
  { id: 'feature-flags', label: 'nav.featureFlags', icon: <FiToggleLeft size={16} /> },
];

/**
 * pages
 *
 * A lookup map from nav item id to the React element that should be rendered
 * in the content area when that nav item is active.
 *
 * Using a plain object (Record) here keeps the rendering logic simple:
 *   pages[active]  →  the correct sub-page component
 */
const pages: Record<string, React.ReactNode> = {
  'colours':       <ColoursPage />,
  'typography':    <TypographyPage />,
  'spacing':       <SpacingPage />,
  'feature-flags': <FeatureFlagsPage />,
};

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

/**
 * Props for ThemingPage.
 *
 * activeId {string} — The URL-derived identifier of the currently active
 *                     sub-page. Passed in by the Next.js page/route that
 *                     renders this component.
 */
type Props = {
  activeId: string;
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

/**
 * ThemingPage
 *
 * Renders the two-column theming layout:
 *   Left  — a fixed-width sidebar with navigation buttons.
 *   Right — a scrollable content panel showing the active sub-page.
 *
 * @param activeId — See Props above.
 */
export default function ThemingPage({ activeId }: Props) {
  /**
   * router — Next.js router used to navigate between theming sub-pages
   * by pushing a new URL when the user clicks a nav item.
   */
  const router = useRouter();

  /**
   * t — Translation function scoped to the 'themingPage' namespace.
   * Call t('some.key') to get the translated string for that key.
   */
  const t = useTranslations('themingPage');

  /**
   * active
   *
   * The validated active page id. If `activeId` from the URL does not
   * match any key in the `pages` map (e.g. the user typed a bad URL),
   * we fall back to 'colours' so the content area is never empty.
   */
  const active = pages[activeId] ? activeId : 'colours';

  // -------------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------------

  return (
    <div className="absolute inset-0 flex bg-gray-100 overflow-hidden">

      {/* ----------------------------------------------------------------
        * Left Sidebar Navigation
        * Fixed-width (224 px / w-56). Contains a section label at the top
        * and a list of nav buttons below it — one per theming sub-page.
        * ---------------------------------------------------------------- */}
      <aside className="w-56 shrink-0 bg-white border-r border-gray-200 flex flex-col overflow-y-auto">

        {/* Sidebar section label — "THEMING" in small caps */}
        <div className="px-4 py-4 border-b border-gray-100">
          <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">
            {t('sidebarLabel')}
          </p>
        </div>

        {/* Nav button list */}
        <nav className="flex-1 py-2">
          {navItems.map((item) => (
            /**
             * Each nav button:
             *   - Pushes the sub-page URL when clicked.
             *   - Applies an active style (darker background + bold text)
             *     when its id matches `active`.
             *   - The icon colour also changes based on the active state.
             */
            <button
              key={item.id}
              onClick={() => router.push(`/console/themePage/${item.id}`)}
              className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm transition-colors text-left ${
                active === item.id
                  ? 'bg-gray-100 text-gray-900 font-semibold'
                  : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
              }`}
            >
              {/* Icon — darker when active, muted when inactive */}
              <span className={active === item.id ? 'text-gray-900' : 'text-gray-400'}>
                {item.icon}
              </span>

              {/* Nav label — resolved from translation key */}
              {t(item.label)}
            </button>
          ))}
        </nav>
      </aside>

      {/* ----------------------------------------------------------------
        * Main Content Area
        * Takes up all remaining horizontal space. Scrollable vertically.
        * Constrains the inner content to a max width of 2xl (672 px) and
        * centres it, so the settings forms don't stretch too wide on large
        * screens.
        * ---------------------------------------------------------------- */}
      <main className="flex-1 overflow-y-auto p-6">
        <div className="max-w-2xl mx-auto">
          {/* Render the sub-page component that matches the active id */}
          {pages[active]}
        </div>
      </main>

    </div>
  );
}