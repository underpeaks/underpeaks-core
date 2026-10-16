// File: app/api-public/v1/[project]/auth/forgot-password/route.ts

import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'
import { getConfiguredAdapter } from '@/app/lib/getConfiguredAdapter'
import { validateCoreApiKey } from '@/app/lib/coreApiAuth'
import { coreCors } from '@/app/lib/customerAuthCore'
import { clientIp, rateLimit } from '@/app/lib/rateLimit'

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: coreCors() })
}

// ---------------------------------------------------------------------------
// Email
// ---------------------------------------------------------------------------
// Uses the SMTP settings saved in the console (.env.local). Returns true only
// when a message was actually handed to the mail server.

async function sendResetEmail(to: string, token: string): Promise<boolean> {
  try {
    if (process.env.NEXT_PUBLIC_SMTP_ENABLED !== 'true' &&
        process.env.NEXT_PUBLIC_SMTP_FORGOT_PW !== 'true') return false

    const host = process.env.NEXT_PUBLIC_SMTP_HOST
    const user = process.env.NEXT_PUBLIC_SMTP_USER
    const pass = process.env.NEXT_SMTP_PASSWORD
    const from = process.env.NEXT_PUBLIC_SMTP_FROM || user
    if (!host || !from) return false

    const nodemailer: any = await import('nodemailer')
    const createTransport = nodemailer.createTransport ?? nodemailer.default?.createTransport
    const enc    = (process.env.NEXT_PUBLIC_SMTP_ENCRYPTION ?? 'TLS').toUpperCase()
    const port   = Number(process.env.NEXT_PUBLIC_SMTP_PORT ?? 587)
    const transp = createTransport({
      host,
      port,
      secure: enc === 'SSL',
      requireTLS: enc === 'TLS',
      auth: user && pass ? { user, pass } : undefined,
    })

    await transp.sendMail({
      from,
      to,
      subject: 'Reset your password',
      text:
        `Use this code to reset your password:\n\n${token}\n\n` +
        `It is valid for 1 hour. If you did not ask for this, ignore this email.`,
    })
    return true
  } catch (err: any) {
    console.error('[api-public] reset email failed:', err?.message)
    return false
  }
}

// ---------------------------------------------------------------------------
// Handler
// ---------------------------------------------------------------------------

export async function POST(req: NextRequest) {
  const apiKey = req.headers.get('x-api-key') ?? ''
  const auth = await validateCoreApiKey(apiKey)
  if (!auth.ok) {
    return NextResponse.json({ error: auth.message }, { status: auth.status, headers: coreCors() })
  }

  let body: any
  try { body = await req.json() } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400, headers: coreCors() })
  }

  const email = (typeof body.email === 'string' ? body.email : '').trim().toLowerCase()
  if (!email || email.length > 254) {
    return NextResponse.json({ error: 'Email is required' }, { status: 400, headers: coreCors() })
  }

  // 5 reset requests per hour for one email from one IP, 30 per IP.
  const ip   = clientIp(req)
  const rlIp = rateLimit(`forgot-ip:${ip}`, 30, 60 * 60 * 1000)
  const rlEm = rateLimit(`forgot:${ip}:${email}`, 5, 60 * 60 * 1000)
  if (!rlIp.ok || !rlEm.ok) {
    return NextResponse.json(
      { error: 'Too many requests. Try again later.' },
      { status: 429, headers: { ...coreCors(), 'Retry-After': String(Math.max(rlIp.retryAfter, rlEm.retryAfter)) } },
    )
  }

  const adapter  = getConfiguredAdapter()
  const dbConfig = adapter.config

  const user = await (adapter as any).findUserByEmail(dbConfig, email)

  // An anonymous account has no real email and no way to receive a reset
  // link, and shares the placeholder '-' with every other anonymous row -
  // reject it explicitly.
  if (user && user.user_type === 'customer' && !user.is_anonymous) {
    // The expiry is part of the token itself: <64 hex chars>.<expiry ms in base36>.
    // The token is looked up as one whole string, so the expiry cannot be
    // changed without invalidating the token. This avoids depending on how
    // each database stores times (a timestamp column without a time zone
    // made every token look expired on servers that are not running in UTC).
    const expiresAt = Date.now() + 60 * 60 * 1000
    const token     = crypto.randomBytes(32).toString('hex') + '.' + expiresAt.toString(36)
    const ttl       = new Date(expiresAt)

    // 'user_id' tells the adapter which column identifies the row
    // (the default is 'id', which nxf_users does not have).
    await (adapter as any).update(dbConfig, 'nxf_users', user.user_id, {
      token, token_ttl: ttl, updated_at: new Date(),
    }, 'user_id')

    const sent = await sendResetEmail(email, token)

    // The token is NEVER returned in production: anyone with the public API
    // key could otherwise reset any customer's password. In development
    // (npm run dev) it is still returned so you can test without SMTP.
    if (!sent && process.env.NODE_ENV !== 'production') {
      return NextResponse.json({ success: true, reset_token: token }, { headers: coreCors() })
    }
  }

  // Same answer whether or not the account exists.
  return NextResponse.json({ success: true }, { headers: coreCors() })
}