'use client'

/**
 * @file LocaleSwitcher.tsx
 * @description
 * A dropdown UI component that allows the user to switch the application's
 * display language (locale) from anywhere in the app.
 *
 * What is a locale?
 * ------------------
 * A locale is a code that represents a language and optionally a region.
 * Examples: 'en' (English), 'fr' (French), 'de' (German), 'af' (Afrikaans).
 * The app uses the locale to decide which language to display all text in.
 *
 * How does locale switching work in this app?
 * --------------------------------------------
 * This app uses next-intl for internationalisation (i18n). Locales are encoded
 * directly in the URL path:
 *   - English (default): /console/settings       (no locale prefix)
 *   - French:            /fr/console/settings
 *   - German:            /de/console/settings
 *
 * When the user picks a new language, this component:
 *   1. Reads the current URL path.
 *   2. Strips the existing locale prefix from it (if one is present).
 *   3. Builds a new path with the selected locale prefix.
 *   4. Navigates to the new path — next-intl then loads the correct translations.
 *
 * English is treated as the default locale and gets no prefix in the URL.
 * All other locales are prefixed (e.g. /fr/..., /de/...).
 *
 * How does the dropdown open and close?
 * ---------------------------------------
 * The dropdown opens when the user hovers over or clicks the trigger button.
 * It closes when the mouse leaves the component (onMouseLeave on the wrapper)
 * or when the user selects a locale.
 *
 * What are the flag icons?
 * -------------------------
 * Flag icons come from the `flag-icons` CSS library. Each locale maps to a
 * country flag code (e.g. 'gb' for English/UK, 'fr' for French) via the
 * `localeFlagCodes` lookup object imported from the i18n config.
 * The class `fi fi-{code}` renders the correct flag as a CSS background image.
 */

import { useState, useRef } from 'react'
import { useLocale } from 'next-intl'
import { useRouter, usePathname } from 'next/navigation'
import { locales, localeNames, localeFlagCodes, type Locale } from '@/i18n/request'

/**
 * @component LocaleSwitcher
 * @description
 * Renders a flag + locale code button that, when hovered or clicked, opens
 * a dropdown listing all available locales. Selecting a locale navigates
 * the user to the same page in the new language.
 *
 * No props required — all data comes from next-intl hooks and the i18n config.
 *
 * @returns {JSX.Element}
 */
export default function LocaleSwitcher() {
  /**
   * useLocale() returns the currently active locale string (e.g. 'en', 'fr').
   * We cast it to our Locale type so TypeScript knows it matches the defined
   * locale values and can be used as a key in localeFlagCodes / localeNames.
   */
  const locale = useLocale() as Locale

  /** Router used to navigate to the new locale path when a language is selected. */
  const router = useRouter()

  /**
   * pathname gives us the current URL path (e.g. '/fr/console/settings').
   * We use this to rebuild the path with the new locale prefix.
   */
  const pathname = usePathname()

  /**
   * Controls whether the language dropdown is currently visible.
   * true = open, false = closed.
   */
  const [open, setOpen] = useState(false)

  /**
   * A ref attached to the outer wrapper div.
   * Available for future use (e.g. click-outside detection).
   * Currently the dropdown closes via onMouseLeave on the same wrapper.
   */
  const ref = useRef<HTMLDivElement>(null)

  // ─── Locale Switch Handler ─────────────────────────────────────────────────

  /**
   * @function handleChange
   * @description
   * Called when the user clicks a locale option in the dropdown.
   * Builds the correct URL for the selected locale and navigates to it.
   *
   * How the new path is built:
   * ---------------------------
   * Current path:  /fr/console/settings
   * Selected:      'de'
   *
   * Step 1 — Split path into segments: ['', 'fr', 'console', 'settings']
   * Step 2 — Check if segments[1] ('fr') is a known locale: yes
   * Step 3 — Strip it: pathWithoutLocale = '/console/settings'
   * Step 4 — Prepend new locale: '/de/console/settings'
   *
   * Special case — English (default locale):
   *   English has no prefix, so we just use pathWithoutLocale as-is.
   *   If that's empty (the user is at the root '/'), we use '/' instead.
   *
   * @param {Locale} newLocale - The locale code the user selected (e.g. 'de').
   */
  function handleChange(newLocale: Locale) {
    /**
     * Split the current path into segments by '/'.
     * Example: '/fr/console/settings' → ['', 'fr', 'console', 'settings']
     * The first element is always an empty string because paths start with '/'.
     */
    const segments = pathname.split('/')

    /**
     * Check whether the second segment (index 1) is a known locale code.
     * This tells us if the current URL already has a locale prefix we need to strip.
     */
    const isLocaleSegment = locales.includes(segments[1] as Locale)

    /**
     * Build the path without any locale prefix.
     * If there is a locale prefix, skip segments[1] and rejoin the rest.
     * If there is no locale prefix, use the pathname as-is.
     *
     * Example with prefix:    ['', 'fr', 'console', 'settings'] → '/console/settings'
     * Example without prefix: ['', 'console', 'settings']       → '/console/settings'
     */
    const pathWithoutLocale = isLocaleSegment
      ? '/' + segments.slice(2).join('/')
      : pathname

    /**
     * Build the final path for the new locale.
     * English ('en') is the default locale and uses no prefix.
     * All other locales are prefixed with their code.
     *
     * Example: newLocale='de', pathWithoutLocale='/console/settings'
     * Result: '/de/console/settings'
     *
     * Example: newLocale='en', pathWithoutLocale='/console/settings'
     * Result: '/console/settings'
     */
    const newPath =
      newLocale === 'en'
        ? pathWithoutLocale || '/'
        : `/${newLocale}${pathWithoutLocale}`

    /** Close the dropdown before navigating. */
    setOpen(false)

    /** Navigate to the new locale path. next-intl will load the correct translations. */
    router.push(newPath)
  }

  // ─── Render ─────────────────────────────────────────────────────────────────

  return (
    /**
     * Outer wrapper div with a ref for potential future use.
     * onMouseLeave closes the dropdown when the cursor leaves the entire component,
     * including both the trigger button and the dropdown list.
     */
    <div ref={ref} className="relative" onMouseLeave={() => setOpen(false)}>

      {/*
       * Trigger button — shows the current locale's flag and code.
       * Opens the dropdown on hover (onMouseEnter) or click (onClick toggle).
       * Having both allows keyboard/touch users to click and mouse users to hover.
       */}
      <button
        onMouseEnter={() => setOpen(true)}
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-2 px-2 py-1 rounded hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
      >
        {/*
         * Flag icon for the current locale.
         * Uses the `flag-icons` CSS library: `fi fi-{countryCode}` renders the flag.
         * localeFlagCodes maps locale codes to country codes (e.g. 'en' → 'gb').
         */}
        <span className={`fi fi-${localeFlagCodes[locale]} rounded-sm`} />

        {/* Current locale code displayed in uppercase (e.g. "EN", "FR") */}
        <span className="text-sm font-medium uppercase text-gray-600 dark:text-gray-300">
          {locale}
        </span>
      </button>

      {/*
       * Dropdown menu — only rendered when `open` is true.
       * Positioned absolutely below and to the right of the trigger button.
       * z-50 ensures it appears above other page content.
       */}
      {open && (
        <div className="absolute right-0 top-full w-48 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg z-50">
          {/*
           * Render one button per available locale.
           * locales is the full list of supported locale codes from the i18n config.
           */}
          {locales.map((l) => (
            <button
              key={l}
              onClick={() => handleChange(l)}
              className={`w-full flex items-center gap-3 px-3 py-2 text-sm hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors first:rounded-t-lg last:rounded-b-lg ${
                l === locale
                  ? 'text-blue-600 dark:text-blue-400 font-medium'  // Highlight the currently active locale
                  : 'text-gray-700 dark:text-gray-300'
              }`}
            >
              {/* Flag icon for this locale option */}
              <span className={`fi fi-${localeFlagCodes[l]} rounded-sm`} />

              {/*
               * Full display name of the locale in its own language.
               * localeNames maps locale codes to human-readable names
               * (e.g. 'fr' → 'Français', 'de' → 'Deutsch').
               * These names come from the i18n config and are not translated —
               * they are always shown in the language they represent.
               */}
              {localeNames[l]}
            </button>
          ))}
        </div>
      )}

    </div>
  )
}