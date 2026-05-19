/**
 * ThemeRoutePage
 *
 * This is the Next.js **route entry point** for the Theming section of the
 * console. Its sole responsibility is to render the shared `ThemingPage`
 * layout shell with the correct starting sub-page pre-selected.
 *
 * Why does this file exist?
 * ─────────────────────────
 * Next.js uses the file system to determine routes. Each `page.tsx` (or
 * `page.js`) file in the `app/` directory maps to a URL. This file maps to
 * the root theming URL (e.g. `/console/themePage`) and tells the shell which
 * nav item should be shown as active on first load — in this case 'colours'.
 *
 * How sub-page routing works:
 * ───────────────────────────
 * Each theming sub-page has its own route file that renders `ThemingPage`
 * with a different `activeId`. For example:
 *   /console/themePage             → activeId="colours"   (this file)
 *   /console/themePage/typography  → activeId="typography"
 *   /console/themePage/spacing     → activeId="spacing"
 *   /console/themePage/feature-flags → activeId="feature-flags"
 *
 * ThemingPage reads `activeId` and renders the matching sub-page component
 * in its content area. If `activeId` does not match a known page, ThemingPage
 * safely falls back to 'colours'.
 *
 * No state, no logic, no translations needed here — this is intentionally
 * a "thin" entry point that delegates everything to ThemingPage.
 */

import ThemingPage from './components/theming/ThemingPage';

/**
 * ThemeRoutePage
 *
 * The default export required by Next.js to register this file as a page.
 * Renders the full theming layout with 'colours' as the initially active
 * sub-page — matching the default/root URL for the theming section.
 */
export default function ThemeRoutePage() {
  return <ThemingPage activeId="colours" />;
}