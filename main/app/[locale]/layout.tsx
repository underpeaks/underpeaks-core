import { getMessages, setRequestLocale } from 'next-intl/server'
import { NextIntlClientProvider } from 'next-intl'
import { locales } from '@/i18n/request'

import '../globals.css'
import 'flag-icons/css/flag-icons.min.css'
import { AuthProvider } from '../providers/AuthProvider'

export function generateStaticParams() {
  return locales.map((locale) => ({ locale }))
}

export default async function RootLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  setRequestLocale(locale)
  const messages = await getMessages()

  const res = await fetch(`${process.env.NEXT_PUBLIC_APP_DOMAIN}/api/get-system-config`, {
    cache: 'no-store'
  })

  const config = res.ok ? await res.json() : {}

  return (
    <html lang={locale}>
      <head>
        <link rel="icon" href={config?.faviconUrl || '/images/favicon/NXT_Flutter_favicon.png'} />
      </head>
      <body>
        <NextIntlClientProvider messages={messages}>
          <AuthProvider>{children}</AuthProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  )
}