// middleware.ts (Core root)
import createMiddleware               from 'next-intl/middleware'
import { NextRequest, NextResponse }  from 'next/server'
import { locales, defaultLocale }     from './i18n/request'

const intlMiddleware = createMiddleware({
  locales,
  defaultLocale,
  localePrefix:    'as-needed',
  localeDetection: false,
})

const PUBLIC_PATHS = [
  '/signin',
  '/signup',
  '/forgot-password',
  '/reset-password',
  '/install',
  '/api',
  '/license-revoked',
  '/license-expired',
]

function isPublicPath(pathname: string): boolean {
  return PUBLIC_PATHS.some((p) => pathname.includes(p))
}

export default async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl

  if (isPublicPath(pathname)) {
    return intlMiddleware(req)
  }

  if (pathname.includes('/console')) {

    // ── Revocation check ───────────────────────────────────────────────────
    if (process.env.NXF_LICENSE_REVOKED === 'true') {
      const url      = req.nextUrl.clone()
      url.pathname   = '/license-revoked'
      return NextResponse.redirect(url)
    }

    // ── Grace period expiry check ──────────────────────────────────────────
    const graceUntil = process.env.NXF_LICENSE_GRACE_UNTIL
    if (graceUntil) {
      const graceDate = new Date(graceUntil)
      if (graceDate < new Date()) {
        const url    = req.nextUrl.clone()
        url.pathname = '/license-expired'
        return NextResponse.redirect(url)
      }
    }
  }

  return intlMiddleware(req)
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico|.*\\..*).*)'],
}