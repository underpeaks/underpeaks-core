/**
 * RootLayout Component
 *
 * This is the root layout for the entire localised section of the application.
 * In Next.js, every page under /[locale]/* is automatically wrapped by this
 * layout — you do not need to add it manually to each page.
 *
 * What this layout does:
 * 1. Reads the current locale from the URL (e.g. "en", "fr", "de") and tells
 *    next-intl to use it for all translations on the server side.
 * 2. Loads the translation messages for that locale so they can be passed down
 *    to every client component via NextIntlClientProvider.
 * 3. Fetches the system configuration from the API (e.g. custom favicon URL)
 *    so branding can be applied at the document level on every page.
 * 4. Renders the full HTML shell (<html>, <head>, <body>) with:
 *    - The correct `lang` attribute for accessibility and SEO.
 *    - A dynamic favicon that uses the system config value, falling back to
 *      the default NXT_Flutter favicon if the config is unavailable.
 * 5. Wraps all children in:
 *    - NextIntlClientProvider  — makes translations available to client components.
 *    - AuthProvider            — makes authentication state available app-wide.
 *
 * Why this file is async:
 *   Next.js allows server-side layouts to be async functions. This lets us
 *   use `await` to fetch data (translations, system config) before rendering,
 *   so the HTML sent to the browser is already fully populated.
 *
 * Component hierarchy:
 *   RootLayout                  ← this file (server component, runs on the server)
 *   └── NextIntlClientProvider  ← injects translations into the React tree
 *       └── AuthProvider        ← injects auth state into the React tree
 *           └── {children}      ← the actual page being visited
 */

import { getMessages, setRequestLocale } from 'next-intl/server'
import { NextIntlClientProvider }        from 'next-intl'
import { locales }                       from '@/i18n/request'

import '../globals.css'
import 'flag-icons/css/flag-icons.min.css'
import { AuthProvider } from '../providers/AuthProvider'

// ---------------------------------------------------------------------------
// Static params generation
// ---------------------------------------------------------------------------

/**
 * generateStaticParams
 *
 * Tells Next.js which locale values exist so it can pre-render a version of
 * the layout for each supported language at build time.
 *
 * For example, if `locales` is ['en', 'fr', 'de'], Next.js will pre-render
 * routes for /en/*, /fr/*, and /de/* automatically.
 *
 * This is required when using dynamic route segments (like /[locale]) with
 * static site generation or incremental static regeneration.
 *
 * @returns An array of objects, each containing one locale string.
 *          e.g. [{ locale: 'en' }, { locale: 'fr' }, { locale: 'de' }]
 */
export function generateStaticParams() {
  return locales.map((locale) => ({ locale }))
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

/**
 * RootLayout
 *
 * The top-level server layout that wraps every page in the localised app.
 * Handles locale setup, translation loading, system config fetching,
 * and provider injection before rendering the page content.
 *
 * @param children - The page component rendered by Next.js for the current route.
 * @param params   - A Promise that resolves to the dynamic route params object.
 *                   We await it to extract the `locale` string from the URL.
 */
export default async function RootLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: Promise<{ locale: string }>
}) {
  /**
   * Extract the locale from the URL params.
   * `params` is a Promise in Next.js 15+ so we must await it.
   * Example: visiting /fr/dashboard gives us locale = 'fr'.
   */
  const { locale } = await params

  /**
   * setRequestLocale — Registers the current locale with next-intl on the
   * server side so that any server component in this render tree that calls
   * useTranslations() or getTranslations() knows which language to use.
   * This must be called before getMessages().
   */
  setRequestLocale(locale)

  /**
   * getMessages — Loads the full translation message map for the current locale
   * from the i18n message files (e.g. messages/en.json).
   * These messages are then passed to NextIntlClientProvider below so that
   * client components can also access translations via useTranslations().
   */
  const messages = await getMessages()

  // -------------------------------------------------------------------------
  // Fetch system configuration
  // -------------------------------------------------------------------------

  /**
   * Fetch the system-wide configuration from the API.
   *
   * `cache: 'no-store'` means Next.js will never cache this request —
   * it will always fetch fresh data on every page load. This is important
   * because system config (like the favicon URL) can change at any time
   * through the admin panel and should always reflect the latest value.
   *
   * If the fetch fails (network error, server down, etc.), `config` falls
   * back to an empty object {} so the rest of the layout still renders
   * correctly using default values.
   */
  const res = await fetch(
    `${process.env.NEXT_PUBLIC_APP_DOMAIN}/api/get-system-config`,
    { cache: 'no-store' }
  )

  /**
   * Parse the response JSON if the request succeeded (res.ok = HTTP 2xx).
   * If the request failed (any non-2xx status), use an empty object as the
   * fallback so downstream code can safely use optional chaining (config?.x).
   */
  const config = res.ok ? await res.json() : {}

  // -------------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------------

  return (
    <html lang={locale}>
      <head>
        {/*
         * Dynamic Favicon
         * Uses the favicon URL from the system config if one has been set
         * by the admin. Falls back to the default NXT_Flutter favicon if the
         * config is empty or the field is missing.
         */}
        <link
          rel="icon"
          href={config?.faviconUrl || '/images/favicon/NXT_Flutter_favicon.png'}
        />
      </head>
      <body>
        {/*
         * NextIntlClientProvider
         * Passes the pre-loaded translation messages into the React tree so
         * that any client component (marked 'use client') can call
         * useTranslations() and receive the correct strings for the current locale.
         */}
        <NextIntlClientProvider messages={messages}>
          {/*
           * AuthProvider
           * Wraps the entire app in authentication context so any component
           * in the tree can access the current user's auth state (logged in,
           * user object, token, etc.) without prop drilling.
           */}
          <AuthProvider>
            {children}
          </AuthProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  )
}