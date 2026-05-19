/**
 * PageLoader Component
 *
 * A simple full-page loading indicator used while settings pages are
 * being loaded inside the <Suspense> boundary in SettingsPage.tsx.
 *
 * What it renders:
 * - A slim animated bar loader (from the `react-spinners` library)
 *   centred on the page, styled in dark gray to match the CMS aesthetic.
 * - A small "Loading settings…" label underneath the bar for context.
 *
 * When is it shown?
 * - It is used as the `fallback` prop on the <Suspense> wrapper in
 *   SettingsPage.tsx. React shows it automatically while the active
 *   settings page component is loading/suspended.
 *
 * Translation note:
 * - The loading message is translated via useTranslations so it respects
 *   the user's selected language like every other string in the CMS.
 */

'use client'

import { useTranslations } from 'next-intl'
import BarLoader           from 'react-spinners/BarLoader'

/**
 * PageLoader
 *
 * Renders a centred bar loader spinner with a loading label below it.
 * No props required — this component is fully self-contained.
 */
export function PageLoader() {
  /**
   * t — Translation function scoped to the 'pageLoader' namespace.
   * Use t('key') to get the translated string for that key.
   */
  const t = useTranslations('pageLoader')

  return (
    /*
     * Outer wrapper
     * Centres the spinner and label vertically and horizontally,
     * with generous top/bottom padding so it doesn't feel cramped.
     */
    <div className="flex flex-col items-center justify-center gap-4 py-24">

      {/*
       * BarLoader — animated horizontal loading bar from react-spinners.
       * - color: matches the CMS dark gray (Tailwind gray-900 = #111827)
       * - width: 180px — wide enough to be visible, narrow enough to be subtle
       * - height: 3px  — slim and unobtrusive
       * - speedMultiplier: slightly slowed down (0.8) for a calmer feel
       */}
      <BarLoader
        color="#111827"
        width={180}
        height={3}
        speedMultiplier={0.8}
      />

      {/* Loading label — small and muted, sits below the bar */}
      <p className="text-xs text-gray-400 tracking-wide">
        {t('loadingMessage')}
      </p>

    </div>
  )
}