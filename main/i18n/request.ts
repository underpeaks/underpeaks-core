/**
 * request.ts  (next-intl server configuration)
 *
 * The central configuration file for next-intl, the internationalisation
 * (i18n) library used to translate the application into multiple languages.
 *
 * What is i18n?
 *   Internationalisation (abbreviated i18n — 18 letters between 'i' and 'n')
 *   is the process of building an application so that its text, formatting,
 *   and behaviour can be adapted for different languages and regions without
 *   changing the underlying code. The actual translations live in separate
 *   JSON files (one per language), and this config file tells next-intl how
 *   to find and load them.
 *
 * What this file does:
 *   1. Declares the list of all supported locales.
 *   2. Exports lookup maps for human-readable language names and flag icons,
 *      used by the LocaleSwitcher component.
 *   3. Exports the default export expected by next-intl: a getRequestConfig()
 *      call that runs on the server for every request to determine which
 *      locale to use and load the matching translation file.
 *
 * How translation files are structured:
 *   Each supported locale has a matching JSON file in the /locales directory:
 *     /locales/en.json   ← English translations
 *     /locales/fr.json   ← French translations
 *     /locales/de.json   ← German translations
 *     ... and so on for every locale in the `locales` array.
 *
 *   Each file contains a nested object of translation keys and their
 *   translated string values. Components access these via the useTranslations()
 *   hook provided by next-intl.
 *
 * Exports:
 *   locales          — read-only array of all supported locale codes.
 *   Locale           — TypeScript type union of all valid locale codes.
 *   defaultLocale    — the fallback locale used when none is specified.
 *   localeNames      — maps each locale code to its display name.
 *   localeFlagCodes  — maps each locale code to its flag-icon country code.
 *   default          — the getRequestConfig() function consumed by next-intl.
 */

import { notFound }         from 'next/navigation'
import { getRequestConfig } from 'next-intl/server'

// ---------------------------------------------------------------------------
// Supported locales
// ---------------------------------------------------------------------------

/**
 * locales
 *
 * A read-only tuple of every locale code the application supports.
 * The `as const` assertion makes TypeScript treat this as a fixed tuple
 * of literal string types rather than a mutable string array. This is what
 * allows the `Locale` type below to be derived from it automatically.
 *
 * To add a new language:
 *   1. Add its locale code here (e.g. 'hi' for Hindi).
 *   2. Add its display name to localeNames below.
 *   3. Add its flag country code to localeFlagCodes below.
 *   4. Create the translation file at /locales/hi.json.
 */
export const locales = [
  'en',  // English
  'fr',  // French
  'af',  // Afrikaans
  'de',  // German
  'es',  // Spanish
  'pt',  // Portuguese
  'it',  // Italian
  'nl',  // Dutch
  'pl',  // Polish
  'ja',  // Japanese
  'zh',  // Chinese
  'ko',  // Korean
  'ar',  // Arabic
  'ru',  // Russian
  'tr',  // Turkish
  'sv',  // Swedish
  'da',  // Danish
] as const

// ---------------------------------------------------------------------------
// Locale type
// ---------------------------------------------------------------------------

/**
 * Locale
 *
 * A TypeScript union type automatically derived from the `locales` tuple.
 * Its value is exactly: 'en' | 'fr' | 'af' | 'de' | 'es' | ...
 *
 * Using this type (instead of plain `string`) throughout the codebase means
 * TypeScript will catch typos and unsupported locale codes at compile time
 * rather than at runtime.
 *
 * @example
 *   function setLocale(locale: Locale) { ... }
 *   setLocale('fr')   // ✅ valid
 *   setLocale('xx')   // ❌ TypeScript error — 'xx' is not a Locale
 */
export type Locale = (typeof locales)[number]

// ---------------------------------------------------------------------------
// Default locale
// ---------------------------------------------------------------------------

/**
 * defaultLocale
 *
 * The locale used as the fallback when no specific locale has been set by
 * the user or detected from the request. English is used as the default
 * because it is the base language in which all translation keys are written.
 */
export const defaultLocale: Locale = 'en'

// ---------------------------------------------------------------------------
// Display names
// ---------------------------------------------------------------------------

/**
 * localeNames
 *
 * Maps each locale code to the language's name written in that language
 * itself (the "endonym"). For example, German is 'Deutsch' not 'German',
 * because a German-speaking user would recognise their own language name
 * more easily than the English version.
 *
 * Used by: LocaleSwitcher component to label each option in the dropdown.
 *
 * Record<Locale, string> ensures every locale in the `locales` array has
 * a corresponding entry — TypeScript will error if one is missing.
 */
export const localeNames: Record<Locale, string> = {
  en: 'English',
  fr: 'Français',
  af: 'Afrikaans',
  de: 'Deutsch',
  es: 'Español',
  pt: 'Português',
  it: 'Italiano',
  nl: 'Nederlands',
  pl: 'Polski',
  ja: '日本語',
  zh: '中文',
  ko: '한국어',
  ar: 'العربية',
  ru: 'Русский',
  tr: 'Türkçe',
  sv: 'Svenska',
  da: 'Dansk',
}

// ---------------------------------------------------------------------------
// Flag icon codes
// ---------------------------------------------------------------------------

/**
 * localeFlagCodes
 *
 * Maps each locale code to the country code used by the 'flag-icons' CSS
 * library to display the correct flag image.
 *
 * Why locale codes and flag codes differ:
 *   Locale codes identify languages, not countries. Some languages are
 *   spoken in multiple countries, so a representative country is chosen:
 *     'en' (English)  → 'gb' (Great Britain flag, not 'en' which doesn't exist)
 *     'af' (Afrikaans)→ 'za' (South Africa flag)
 *     'ja' (Japanese) → 'jp' (Japan flag)
 *     'zh' (Chinese)  → 'cn' (China flag)
 *     'ko' (Korean)   → 'kr' (South Korea flag)
 *     'ar' (Arabic)   → 'sa' (Saudi Arabia flag)
 *     'sv' (Swedish)  → 'se' (Sweden flag)
 *     'da' (Danish)   → 'dk' (Denmark flag)
 *   For the others the locale code happens to match the country code.
 *
 * Used by: LocaleSwitcher component — className={`fi fi-${localeFlagCodes[l]}`}
 */
export const localeFlagCodes: Record<Locale, string> = {
  en: 'us',
  fr: 'fr',
  af: 'za',
  de: 'de',
  es: 'es',
  pt: 'pt',
  it: 'it',
  nl: 'nl',
  pl: 'pl',
  ja: 'jp',
  zh: 'cn',
  ko: 'kr',
  ar: 'sa',
  ru: 'ru',
  tr: 'tr',
  sv: 'se',
  da: 'dk',
}

// ---------------------------------------------------------------------------
// next-intl server configuration
// ---------------------------------------------------------------------------

/**
 * getRequestConfig  (default export)
 *
 * The async configuration function required by next-intl. It is called on
 * the server for every incoming request and is responsible for:
 *   1. Determining which locale to use for this request.
 *   2. Loading the matching translation file.
 *   3. Returning the locale and messages to next-intl so that
 *      useTranslations() works correctly in all Server and Client Components.
 *
 * How the locale is determined:
 *   next-intl's middleware (configured in middleware.ts) extracts the locale
 *   from the URL path, the NEXT_LOCALE cookie, or the Accept-Language header
 *   and passes it in as `requestLocale`. This function simply awaits and
 *   validates that value.
 *
 * Validation:
 *   If the resolved locale is missing or is not in the supported `locales`
 *   array (e.g. someone manually visits '/xx/dashboard' where 'xx' is not
 *   supported), Next.js's notFound() is called. This renders the nearest
 *   not-found.tsx page and returns a 404 response, rather than silently
 *   falling back to a wrong language.
 *
 * Dynamic import for translation files:
 *   `await import(`../locales/${locale}.json`)` loads only the translation
 *   file for the requested locale — not all of them at once. This keeps the
 *   server response payload small: a French user only downloads French
 *   translations, not English, German, Japanese, etc.
 *
 * @param {{ requestLocale: Promise<string> }} params
 *   requestLocale — a Promise (provided by next-intl internals) that resolves
 *                   to the locale string detected for this request.
 *
 * @returns {{ locale: string, messages: object }}
 *   locale   — the validated locale string to use for this request.
 *   messages — the full translation object loaded from the locale's JSON file.
 */
export default getRequestConfig(async ({ requestLocale }) => {
  // Await the locale value provided by next-intl's middleware pipeline.
  const locale = await requestLocale

  // Validate: if the locale is missing or unrecognised, render a 404 page.
  // This prevents the app from attempting to load a non-existent JSON file.
  if (!locale || !locales.includes(locale as Locale)) notFound()

  return {
    locale,
    // Dynamically import only the translation file for this locale.
    // .default accesses the default export of the JSON module, which is
    // the plain translation object.
    messages: (await import(`../locales/${locale}.json`)).default,
  }
})