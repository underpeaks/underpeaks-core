/**
 * ThemeSubRoutePage
 *
 * This is a Next.js dynamic route page for the Theming section of the CMS.
 * It lives at a URL like: /console/theming/[id]
 *
 * What it does:
 * - Next.js passes the dynamic URL segment (e.g. "colours" or "typography")
 *   as `params.id` to this component.
 * - Since Next.js 15+ route params are Promises, we `await` them to get
 *   the actual value.
 * - It then passes that `id` down to the <ThemingPage> component as
 *   `activeId`, which uses it to know which theming section to display.
 *
 * This component itself has no UI — it is purely a route handler that
 * reads the URL and delegates all rendering to <ThemingPage>.
 *
 * This follows the exact same pattern as SettingsRoutePage — if you
 * understand that file, this one works identically.
 */

import ThemingPage from "../components/theming/ThemingPage"

/**
 * Props type for this page.
 *
 * @property params - A Promise that resolves to an object containing:
 *   - id: the dynamic URL segment (e.g. "colours", "typography", "fonts")
 *
 * It is a Promise because Next.js 15+ makes route params async.
 */
type Props = {
  params: Promise<{ id: string }>
}

/**
 * ThemeSubRoutePage Component
 *
 * An async server component that:
 * 1. Awaits the route params to extract the `id` (the active theming section).
 * 2. Renders the <ThemingPage> component with that `id` as the `activeId` prop.
 *
 * @param params - The dynamic route params (see Props type above).
 * @returns The ThemingPage UI for the selected theming section.
 */
export default async function ThemeSubRoutePage({ params }: Props) {
  // Await the params Promise to get the actual route segment value.
  // `id` will be something like "colours", "typography", or "fonts"
  // depending on what the user navigated to.
  const { id } = await params

  // Render the ThemingPage, telling it which section to show via `activeId`
  return <ThemingPage activeId={id} />
}