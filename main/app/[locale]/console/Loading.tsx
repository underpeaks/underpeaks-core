// components/Loader.tsx

/**
 * Loader Component
 *
 * A general-purpose loading overlay used throughout the console whenever the
 * app is waiting for something — an auth check, a page transition, a data
 * fetch, etc.
 *
 * It can operate in two display modes, controlled by the `fullScreen` prop:
 *
 *   fullScreen = true  (default: false)
 *     Covers the entire viewport using `fixed` positioning and a very high
 *     z-index (9999). Used by ConsoleLayout during the initial auth check so
 *     no protected UI is visible before we know whether the user is logged in.
 *
 *   fullScreen = false (the default)
 *     Covers only the nearest `position: relative` ancestor using `absolute`
 *     positioning. Used by ConsoleLayout over the main content area during
 *     page-to-page navigation so the navbar and sidebar remain visible.
 *
 * Visual output:
 *   - A spinning HashLoader (from react-spinners) in dark gray.
 *   - A small "Loading…" text label beneath the spinner.
 *
 * Props:
 *   - fullScreen {boolean} — When true, the overlay covers the full viewport.
 *                            Defaults to false (covers nearest relative parent).
 *
 * Example usage:
 *   // Full-screen splash during auth check:
 *   if (checkingAuth) return <Loader fullScreen />
 *
 *   // Inline overlay during page navigation:
 *   {navigating && <Loader />}
 */

import { useTranslations } from 'next-intl'
import HashLoader          from 'react-spinners/HashLoader'

/**
 * Loader
 *
 * Renders a centered spinner overlay in either full-screen or
 * ancestor-relative mode. See the file-level JSDoc above for full details.
 *
 * @param fullScreen — When true, fixes the overlay to the entire viewport.
 *                     Defaults to false.
 */
export default function Loader({ fullScreen = false }: { fullScreen?: boolean }) {
  /**
   * t — Translation function scoped to the 'loader' namespace.
   * Call t('some.key') to get the translated string for that key.
   */
  const t = useTranslations('loader')

  return (
    <div
      className={`flex flex-col items-center justify-center gap-4 bg-gray-100 ${
        fullScreen
          ? 'fixed inset-0 z-[9999] min-h-screen w-full' // Covers full viewport
          : 'absolute inset-0 z-50'                       // Covers nearest relative parent
      }`}
    >
      {/*
       * HashLoader — animated spinner from the react-spinners library.
       *   color          : dark gray to match the console's neutral colour palette.
       *   speedMultiplier: slightly slowed (0.8×) so the animation feels calm
       *                    rather than frantic.
       */}
      <HashLoader color="#111827" speedMultiplier={0.8} />

      {/* Small label beneath the spinner so the user knows something is happening */}
      <p className="text-xs text-gray-400 tracking-wide">
        {t('label')}
      </p>
    </div>
  )
}