/**
 * Next.js Middleware — Internationalisation (i18n) Routing
 *
 * This file is the Next.js middleware entry point. Middleware runs on the
 * server for EVERY incoming request, before the page or API route is
 * processed. Think of it as a checkpoint that every request passes through.
 *
 * What this middleware does:
 * - Intercepts incoming page requests and ensures the correct locale (language)
 *   is applied to the URL and the app's translation context.
 * - Uses the `next-intl` library to handle all the locale routing logic
 *   automatically, so we don't have to write it ourselves.
 *
 * Key behaviours configured here:
 *
 * 1. `locales`         — The full list of supported languages (e.g. ['en', 'fr']).
 *                        Imported from the central i18n config so there is only
 *                        one place to add/remove a language.
 *
 * 2. `defaultLocale`   — The fallback language used when no locale can be
 *                        determined from the URL (e.g. 'en').
 *
 * 3. `localePrefix: 'as-needed'`
 *                      — The default locale does NOT get a prefix in the URL.
 *                        For example, English pages are served at `/dashboard`
 *                        instead of `/en/dashboard`. Non-default locales DO
 *                        get a prefix, e.g. `/fr/dashboard` for French.
 *
 * 4. `localeDetection: false`
 *                      — next-intl will NOT try to auto-detect the user's
 *                        preferred language from the browser's Accept-Language
 *                        header. The locale is determined solely by the URL.
 *                        This gives the app full control over language switching.
 *
 * The `config.matcher` at the bottom tells Next.js WHICH requests this
 * middleware should run on. It intentionally excludes:
 *   - `/api/*`              — API routes (handle their own logic)
 *   - `/_next/static/*`     — Static JS/CSS build assets
 *   - `/_next/image/*`      — Next.js optimised images
 *   - `favicon.ico`         — The browser tab icon
 *   - Any path with a `.`   — Other static files (e.g. robots.txt, sitemap.xml)
 *
 * This means the middleware ONLY runs on real page navigations, keeping it
 * as lightweight and fast as possible.
 */

import createMiddleware      from 'next-intl/middleware'
import { locales, defaultLocale } from './i18n/request'

// ---------------------------------------------------------------------------
// Middleware
// ---------------------------------------------------------------------------

/**
 * The default export is the middleware function that Next.js will call for
 * every matched request. `createMiddleware` from next-intl builds this
 * function for us based on the configuration object we pass in.
 *
 * We don't need to write any custom logic here — next-intl handles:
 * - Reading the locale from the URL.
 * - Redirecting to the correct locale-prefixed URL when needed.
 * - Setting the locale cookie/header so the rest of the app knows which
 *   language to use when loading translation strings.
 */
export default createMiddleware({
  /** All languages the app supports. Sourced from the central i18n config. */
  locales,

  /** The language used when no locale is specified in the URL. */
  defaultLocale,

  /**
   * 'as-needed' means only non-default locales appear in the URL path.
   * English (default): /dashboard
   * French:            /fr/dashboard
   */
  localePrefix: 'as-needed',

  /**
   * Disable automatic browser language detection.
   * The app relies on the URL alone to determine the active locale,
   * giving developers and users explicit control over language selection.
   */
  localeDetection: false,
})

// ---------------------------------------------------------------------------
// Route Matcher
// ---------------------------------------------------------------------------

/**
 * config.matcher
 *
 * This tells Next.js which URL paths should trigger this middleware.
 * The regular expression below uses a negative lookahead to EXCLUDE paths
 * that start with `api`, `_next/static`, `_next/image`, or `favicon.ico`,
 * and also excludes any path that contains a file extension (e.g. `.png`,
 * `.svg`, `.txt`).
 *
 * In plain English: "Run this middleware on every request EXCEPT for API
 * routes, Next.js internals, and static files."
 *
 * Pattern breakdown:
 *   /                          — match from the root
 *   (                          — start of group
 *     (?!                      — negative lookahead: do NOT match if followed by…
 *       api|                   — the word "api"
 *       _next/static|          — Next.js static asset folder
 *       _next/image|           — Next.js image optimisation folder
 *       favicon.ico|           — the favicon file
 *       .*\\..*                — any path that contains a dot (file extension)
 *     )
 *     .*                       — match everything else
 *   )                          — end of group
 */
export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico|.*\\..*).*)'],
}