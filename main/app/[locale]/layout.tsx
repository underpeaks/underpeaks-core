// File: app/[locale]/layout.tsx

/**
 * [locale] layout
 *
 * FIX: this used to render a second, nested <html>/<body> — Next.js only
 * supports one root document shell per request, and having two caused a
 * hydration mismatch on every page. The <html>/<body>, favicon logic,
 * NextIntlClientProvider, and AuthProvider have all been moved up into the
 * true root app/layout.tsx (now async and locale-aware). This file now only
 * handles static param generation for locale routes and passes children
 * straight through — no wrapping markup of its own.
 */

import { locales } from '@/i18n/request'

export function generateStaticParams() {
  return locales.map((locale) => ({ locale }))
}

export default function LocaleLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
}