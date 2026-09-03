// File: app/layout.tsx

import { getMessages, setRequestLocale } from 'next-intl/server'
import { NextIntlClientProvider }        from 'next-intl'

import './globals.css'
import 'flag-icons/css/flag-icons.min.css'
import { AuthProvider } from './providers/AuthProvider'

// FIX: app/layout.tsx and app/[locale]/layout.tsx were BOTH rendering their
// own <html>/<body> — Next.js only supports one root document shell, so the
// nested pair caused a hydration mismatch on every single page (not just
// /installer, which is just where it got reported). This file is now the
// ONLY layout that renders <html>/<body>. It absorbs everything
// [locale]/layout.tsx used to own: the locale-aware `lang` attribute, the
// dynamic system-config favicon (falling back to the static default),
// NextIntlClientProvider, and AuthProvider. Both bodies' styling is merged
// below (margin:0 plus the flex/overflow classes) rather than picking one
// over the other, since neither was flagged as safe to drop.

export default async function RootLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: Promise<{ locale?: string }>
}) {
  const { locale = 'en' } = await params

  setRequestLocale(locale)
  const messages = await getMessages()

  let systemConfig: Record<string, any> = {}
  try {
    const res = await fetch(
      `${process.env.NEXT_PUBLIC_APP_DOMAIN}/api/get-system-config`,
      { cache: 'no-store' }
    )
    if (res.ok) {
      systemConfig = await res.json()
    }
  } catch {
    console.log('[RootLayout] No system config found — first install, heading to installer')
  }

  const config = systemConfig

  return (
    <html lang={locale}>
      <head>
        <link
          rel="icon"
          href={config?.faviconUrl || '/images/favicon/underpeaks_favi.png'}
          type="image/png"
        />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Inter+Tight:wght@400;500;600;700&family=Inter:wght@400;500&family=JetBrains+Mono:wght@400;500&display=swap"
        />
      </head>
      <body style={{ margin: 0 }} className="flex-1 overflow-y-auto">
        <NextIntlClientProvider messages={messages}>
          <AuthProvider>
            {children}
          </AuthProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  )
}