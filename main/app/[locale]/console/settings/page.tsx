/**
 * SettingsIndex Page
 *
 * This is the index/root page for the Settings section, located at:
 *   /console/settings
 *
 * What it does:
 * - Immediately redirects the user to the default settings section,
 *   which is the Overview page at /console/settings/overview.
 * - This means if anyone navigates to /console/settings (without a
 *   specific section in the URL), they are automatically sent to
 *   /console/settings/overview instead of seeing a blank page.
 *
 * Why redirect instead of rendering content?
 * - The Settings area always requires an active section to be selected
 *   (the sidebar navigation in SettingsPage.tsx expects an `activeId`).
 * - Rather than duplicating the Overview page here or showing nothing,
 *   we simply redirect to the canonical Overview URL so the sidebar
 *   highlights the correct item and the URL stays consistent.
 *
 * How it works:
 * - `redirect()` is a Next.js server-side utility that performs an
 *   HTTP redirect before any HTML is sent to the browser. It is
 *   imported from 'next/navigation' and works in Server Components.
 * - No client-side JavaScript is needed — the redirect happens on
 *   the server instantly.
 *
 * Note:
 * - There is no UI to translate here — this component renders nothing.
 * - There are no console.logs — the component does one thing and exits.
 */

import { redirect } from 'next/navigation'

/**
 * SettingsIndex
 *
 * A server component that immediately redirects to the Overview settings page.
 * Nothing is rendered — the redirect fires before any output is produced.
 */
export default function SettingsIndex() {
  redirect('/console/settings/overview')
}