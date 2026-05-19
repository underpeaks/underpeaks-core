'use client'

/**
 * LocaleSwitcher.tsx
 *
 * A dropdown UI component that lets the user switch the application's
 * display language (locale) from anywhere in the interface.
 *
 * What is a locale?
 *   A locale is a code that identifies a language (and optionally a region),
 *   such as 'en' for English, 'fr' for French, or 'de' for Germany German.
 *   The application uses these codes to decide which translated strings to
 *   display throughout the UI.
 *
 * What this component renders:
 *   A button showing the current locale's flag and code (e.g. 🇬🇧 EN).
 *   When hovered or clicked, a dropdown appears listing all available
 *   locales, each with its flag and full language name (e.g. 🇫🇷 French).
 *   Clicking a locale in the dropdown switches the app to that language.
 *
 * How locale switching works (step by step):
 *   1. The user clicks a locale in the dropdown.
 *   2. handleChange() strips the current locale prefix from the URL path
 *      (e.g. '/fr/dashboard' → '/dashboard').
 *   3. It builds the new URL by prepending the new locale prefix
 *      (e.g. '/de/dashboard'), with a special case for English which uses
 *      no prefix (e.g. '/dashboard').
 *   4. It writes a NEXT_LOCALE cookie so that next-intl remembers the
 *      user's choice on subsequent page loads.
 *   5. It performs a hard navigation (window.location.href) to the new URL
 *      so the entire page re-loads with the new locale applied.
 *
 * Why a hard navigation instead of Next.js router.push()?
 *   next-intl's locale routing is applied at the middleware level before
 *   React renders. A soft client-side navigation would not re-run the
 *   middleware, so the locale would not change. A full page reload ensures
 *   the middleware runs again and serves the correct locale from the start.
 *
 * Dropdown open/close behaviour:
 *   - Opens on mouse hover (onMouseEnter on the trigger button).
 *   - Toggles open/closed on click (for touch/keyboard users).
 *   - Closes when the mouse leaves the entire component (onMouseLeave on
 *     the wrapper div), so the dropdown dismisses naturally.
 *
 * Data sources (from @/i18n/request):
 *   locales         — array of all supported locale codes, e.g. ['en','fr','de'].
 *   localeNames     — maps code → full name, e.g. { en: 'English', fr: 'French' }.
 *   localeFlagCodes — maps code → flag-icon country code, e.g. { en: 'gb', fr: 'fr' }.
 *
 * Flag icons:
 *   Flags are rendered using the 'flag-icons' CSS library. The className
 *   pattern `fi fi-<countryCode>` displays the correct country flag.
 *   Note: language codes and country codes differ (e.g. English → 'gb' not 'en').
 *   The localeFlagCodes map handles this translation.
 */

import { useState, useRef }                                           from 'react'
import { useLocale }                                                  from 'next-intl'
import { usePathname }                                                from 'next/navigation'
import { locales, localeNames, localeFlagCodes, type Locale }        from '@/i18n/request'

/**
 * LocaleSwitcher
 *
 * Renders the locale switcher trigger button and its dropdown list.
 * No props are required — all data is sourced from next-intl hooks and
 * the i18n config.
 *
 * @returns {JSX.Element} A positioned wrapper div containing the trigger
 *                        button and (conditionally) the dropdown list.
 */
export default function LocaleSwitcher() {

  /**
   * locale — the currently active locale code (e.g. 'en', 'fr').
   * Provided by next-intl's useLocale() hook, which reads the locale
   * from the current request context.
   * Cast to the Locale type so TypeScript knows it is a valid locale code.
   */
  const locale   = useLocale() as Locale

  /**
   * pathname — the current URL path without the origin or query string
   * (e.g. '/fr/dashboard/users').
   * Used by handleChange() to strip the old locale prefix before building
   * the new URL.
   */
  const pathname = usePathname()

  /**
   * open — controls whether the locale dropdown is visible.
   * true = dropdown is showing; false = dropdown is hidden.
   */
  const [open, setOpen] = useState(false)

  /**
   * ref — a reference to the outermost wrapper <div>.
   * Attached so that future enhancements (e.g. click-outside detection)
   * can reference the DOM node directly without querying the DOM.
   */
  const ref = useRef<HTMLDivElement>(null)

  // -------------------------------------------------------------------------
  // handleChange
  // -------------------------------------------------------------------------

  /**
   * handleChange
   *
   * Switches the application to the given locale by navigating to the
   * equivalent URL in the new language.
   *
   * Steps:
   *  1. Split the current pathname into segments.
   *     e.g. '/fr/dashboard/users' → ['', 'fr', 'dashboard', 'users']
   *
   *  2. Check whether the first real segment is a known locale code.
   *     e.g. segments[1] === 'fr' → yes, it is a locale prefix.
   *
   *  3. Strip the locale prefix from the path to get the "bare" path.
   *     e.g. '/fr/dashboard/users' → '/dashboard/users'
   *     If no locale prefix is present, the pathname is already bare.
   *
   *  4. Build the new path:
   *     - English ('en') uses no prefix:   '/dashboard/users'
   *     - All other locales use a prefix:  '/de/dashboard/users'
   *     - If the bare path is empty (root), fall back to '/'.
   *
   *  5. Persist the choice in a cookie named NEXT_LOCALE.
   *     - path=/        → the cookie applies to the whole site.
   *     - max-age=31536000 → the cookie lasts 1 year (365 days × 86400 seconds).
   *     next-intl's middleware reads this cookie on every request to determine
   *     the user's preferred locale without requiring it in the URL.
   *
   *  6. Close the dropdown and navigate to the new URL with a full page reload.
   *
   * @param {Locale} newLocale - The locale code the user selected.
   */
  function handleChange(newLocale: Locale) {
    // Step 1 — split the pathname into URL segments
    const segments = pathname.split('/')

    // Step 2 — check if the first segment is a known locale code
    const isLocaleSegment = locales.includes(segments[1] as Locale)

    // Step 3 — remove the locale prefix to get the bare path
    const pathWithoutLocale = isLocaleSegment
      ? '/' + segments.slice(2).join('/')
      : pathname

    // Step 4 — build the target URL for the new locale
    const newPath =
      newLocale === 'en'
        ? pathWithoutLocale || '/'           // English: no prefix
        : `/${newLocale}${pathWithoutLocale}` // Others: prepend locale code

    // Step 5 — save the user's choice in a long-lived cookie
    document.cookie = `NEXT_LOCALE=${newLocale};path=/;max-age=31536000`

    // Step 6 — close the dropdown and perform a full page reload to the new URL
    setOpen(false)
    window.location.href = newPath
  }

  // -------------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------------

  return (
    /**
     * Wrapper div
     * - position: relative — so the dropdown can be positioned absolutely
     *   relative to this element rather than the page.
     * - onMouseLeave — closes the dropdown when the mouse moves away from
     *   the entire component (both the button and the dropdown).
     */
    <div ref={ref} className="relative" onMouseLeave={() => setOpen(false)}>

      {/* ----------------------------------------------------------------
        * Trigger button
        * Shows the current locale's flag icon and locale code (e.g. 🇬🇧 EN).
        * Opens the dropdown on hover and toggles it on click.
        * ---------------------------------------------------------------- */}
      <button
        onMouseEnter={() => setOpen(true)}
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-2 px-2 py-1 rounded hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
      >
        {/* Flag icon for the current locale using the flag-icons CSS library */}
        <span className={`fi fi-${localeFlagCodes[locale]} rounded-sm`} />

        {/* Current locale code displayed in uppercase (e.g. 'EN', 'FR') */}
        <span className="text-sm font-medium uppercase text-gray-600 dark:text-gray-300">
          {locale}
        </span>
      </button>

      {/* ----------------------------------------------------------------
        * Dropdown list
        * Only rendered when `open` is true.
        * Lists every available locale with its flag and full language name.
        * The currently active locale is highlighted in blue.
        * ---------------------------------------------------------------- */}
      {open && (
        <div className="absolute right-0 top-full w-48 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg z-50">
          {locales.map((l) => (
            <button
              key={l}
              onClick={() => handleChange(l)}
              className={`w-full flex items-center gap-3 px-3 py-2 text-sm hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors first:rounded-t-lg last:rounded-b-lg ${
                l === locale
                  ? 'text-blue-600 dark:text-blue-400 font-medium' // Active locale
                  : 'text-gray-700 dark:text-gray-300'              // Inactive locale
              }`}
            >
              {/* Flag icon for this locale option */}
              <span className={`fi fi-${localeFlagCodes[l]} rounded-sm`} />

              {/* Full language name from the localeNames map (e.g. 'French') */}
              {localeNames[l]}
            </button>
          ))}
        </div>
      )}

    </div>
  )
}