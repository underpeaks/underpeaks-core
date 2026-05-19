// installer/layout.tsx

/**
 * InstallerLayout Component
 *
 * This is the root layout for the entire installer section of the application.
 * In Next.js, a layout file wraps all pages inside the same folder and its
 * sub-folders. This means every page under /installer/* will be wrapped by
 * this layout automatically — you do NOT need to add it manually to each page.
 *
 * What this layout does:
 * - Imports the global CSS file so base styles are available throughout
 *   the installer flow.
 * - Renders a minimal HTML shell (<html> + <body>) that simply passes
 *   the child page content through unchanged.
 * - Intentionally keeps no shared UI (no header, footer, sidebar, etc.)
 *   because the installer is a standalone, full-screen experience that
 *   manages its own layout per step.
 *
 * How children work in layouts:
 *   When Next.js renders a page like /installer/admin, it places that
 *   page's output into the `children` prop here, so it appears wherever
 *   {children} is written in the JSX below.
 *
 * Component hierarchy:
 *   InstallerLayout        ← this file (wraps all /installer/* pages)
 *   └── {children}         ← the specific installer step page being visited
 */

import '../../globals.css'

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

/**
 * InstallerLayout
 *
 * A minimal root layout for the installer wizard. Provides the HTML document
 * shell and global styles, then renders whatever installer step page is active.
 *
 * @param children - The installer step page rendered by Next.js for the
 *                   current route (e.g. ProjectInfoPage, AdminSetupPage, etc.)
 */
export default function InstallerLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>
        {/*
         * Render the active installer step page.
         * Next.js injects the correct page component here based on the URL.
         * For example, visiting /installer/admin renders the AdminSetupPage
         * inside this body tag.
         */}
        {children}
      </body>
    </html>
  )
}