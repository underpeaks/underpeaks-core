/**
 * SettingsRoutePage
 *
 * This is a Next.js dynamic route page for the Settings section.
 * It lives at a URL like: /settings/[id]
 *
 * What it does:
 * - Next.js passes the dynamic URL segment (e.g. "profile" or "security")
 *   as `params.id` to this component.
 * - Since Next.js 15+ route params are Promises, we `await` them to get the actual value.
 * - It then passes that `id` down to the <SettingsPage> component as `activeId`,
 *   which uses it to know which settings tab/section to display.
 *
 * This component itself has no UI — it is purely a route handler that
 * reads the URL and delegates rendering to <SettingsPage>.
 */

import SettingsPage from "../components/settings/SettingsPage";

/**
 * Props type for this page.
 *
 * @property params - A Promise that resolves to an object containing:
 *   - id: the dynamic URL segment (e.g. "profile", "security", "notifications")
 *
 * It is a Promise because Next.js 15+ makes route params async.
 */
type Props = {
  params: Promise<{ id: string }>;
};

/**
 * SettingsRoutePage Component
 *
 * An async server component that:
 * 1. Awaits the route params to extract the `id` (the active settings section).
 * 2. Renders the <SettingsPage> component with that `id` as the `activeId` prop.
 *
 * @param params - The dynamic route params (see Props type above).
 * @returns The SettingsPage UI for the selected settings section.
 */
export default async function SettingsRoutePage({ params }: Props) {
  // Await the params Promise to get the actual route segment value.
  // `id` will be something like "profile", "security", or "notifications"
  // depending on what the user navigated to.
  const { id } = await params;

  // Render the SettingsPage, telling it which section to show via `activeId`
  return <SettingsPage activeId={id} />;
}