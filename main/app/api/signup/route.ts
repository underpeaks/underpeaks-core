// app/api/signup/route.ts

import { NextRequest, NextResponse } from 'next/server'
import crypto                        from 'crypto'
import nodemailer                    from 'nodemailer'
import { getConfiguredAdapter } from '@/app/lib/getConfiguredAdapter'

// ---------------------------------------------------------------------------
// SMTP feature flags — read once at module load, don't change at runtime
// ---------------------------------------------------------------------------

const smtpEnabled        = (process.env.NEXT_PUBLIC_SMTP_ENABLED      ?? 'false') === 'true'
const verifyEmailEnabled = (process.env.NEXT_PUBLIC_SMTP_VERIFY_EMAIL  ?? 'false') === 'true'
const forgotPwEnabled    = (process.env.NEXT_PUBLIC_SMTP_FORGOT_PW     ?? 'false') === 'true'
const canSendEmail       = smtpEnabled && forgotPwEnabled

function buildTransporter() {
  return nodemailer.createTransport({
    host:   process.env.NEXT_PUBLIC_SMTP_HOST,
    port:   Number(process.env.NEXT_PUBLIC_SMTP_PORT),
    secure: process.env.NEXT_PUBLIC_SMTP_ENCRYPTION === 'SSL',
    auth: {
      user: process.env.NEXT_PUBLIC_SMTP_USER,
      pass: process.env.NEXT_SMTP_PASSWORD?.replace(/\\#/g, '#'),
    },
  })
}

// ---------------------------------------------------------------------------
// Route Handler
// ---------------------------------------------------------------------------

export async function POST(req: NextRequest) {
  console.log('[Signup API] Request received')

  try {
    // ── Validate body ───────────────────────────────────────────────────────

    const { full_name, email, password } = await req.json()

    if (!full_name || !email || !password) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // ── Resolve adapter — one call handles all 5 DB types ───────────────────

    const adapter  = getConfiguredAdapter()
    const dbConfig = adapter.config
    const dbType   = dbConfig.type

    // ── Firebase ────────────────────────────────────────────────────────────

    if (dbType === 'firebase') {
      if (!adapter.registerUser) {
        return NextResponse.json({ error: 'Adapter does not support signup' }, { status: 400 })
      }

      const result = await adapter.registerUser(dbConfig, { full_name, email, password })

      // Custom SMTP path — generate link via adapter (no firebase-admin import in route)
      if (smtpEnabled && verifyEmailEnabled) {
        if (!adapter.generateEmailVerificationLink) {
          throw new Error('Firebase adapter does not implement generateEmailVerificationLink')
        }

        const link = await adapter.generateEmailVerificationLink(
          dbConfig,
          email,
          `${process.env.NEXT_PUBLIC_APP_DOMAIN}/signin`
        )

        await buildTransporter().sendMail({
          from:    process.env.NEXT_PUBLIC_SMTP_FROM || 'no-reply@example.com',
          to:      email,
          subject: 'Verify your email',
          html:    `<p>Hi ${full_name},</p>
                    <p>Click below to verify your email:</p>
                    <a href="${link}">${link}</a>`,
        })
        console.log('[Signup API] Firebase verification email sent via custom SMTP')
      } else {
        console.log('[Signup API] Custom SMTP disabled — Firebase client SDK will handle verification')
      }

      return NextResponse.json({ success: true, userId: result.userId })
    }

    // ── Supabase ────────────────────────────────────────────────────────────

    if (dbType === 'supabase') {
      if (!adapter.registerSupabaseUser) {
        throw new Error('registerSupabaseUser not implemented in this adapter')
      }

      const existingUser = await adapter.findUserByEmail!(dbConfig, email)
      if (existingUser) {
        return NextResponse.json({ error: 'Email already exists' }, { status: 400 })
      }

      const result = await adapter.registerSupabaseUser(dbConfig, { full_name, email, password })
      console.log('[Signup API] Supabase user created successfully')

      // Supabase handles email verification natively — no SMTP action needed
      return NextResponse.json({ success: true, userId: result.id })
    }

    // ── MongoDB ─────────────────────────────────────────────────────────────

    if (dbType === 'mongodb') {
      if (!adapter.registerMongoUser) {
        return NextResponse.json({ error: 'Adapter does not support signup' }, { status: 400 })
      }

      const existingUser = await adapter.findUserByEmail!(dbConfig, email)
      if (existingUser) {
        return NextResponse.json({ error: 'Email already exists' }, { status: 400 })
      }

      const result = await adapter.registerMongoUser(dbConfig, {
        full_name,
        email,
        password,
        email_verified: false,
      })

      if (smtpEnabled && verifyEmailEnabled) {
        const verifyUrl =
          `${process.env.NEXT_PUBLIC_APP_DOMAIN}/verify-email` +
          `?token=${result.token}&email=${encodeURIComponent(email)}`

        await buildTransporter().sendMail({
          from:    process.env.NEXT_PUBLIC_SMTP_FROM || 'no-reply@example.com',
          to:      email,
          subject: 'Verify your email',
          html:    `<p>Hi ${full_name},</p>
                    <p>Click below to verify your email (expires in 24h):</p>
                    <a href="${verifyUrl}">${verifyUrl}</a>`,
        })
        console.log('[Signup API] Verification email sent (MongoDB)')
      } else {
        console.log('[Signup API] Email verification disabled — skipping verification email')
      }

      return NextResponse.json({ success: true, user_id: result.user_id })
    }

    // ── MySQL / PostgreSQL ──────────────────────────────────────────────────

    if (dbType === 'mysql' || dbType === 'postgres') {
      if (!adapter.registerUser) {
        return NextResponse.json({ error: 'Adapter does not support signup' }, { status: 400 })
      }

      const existingUser = await adapter.findUserByEmail!(dbConfig, email)
      if (existingUser) {
        return NextResponse.json({ error: 'Email already exists' }, { status: 400 })
      }

      // Generate token here — MySQL/Postgres adapters don't generate it internally
      const emailToken = crypto.randomBytes(32).toString('hex')
      const emailTTL   = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()

      const result = await adapter.registerUser(dbConfig, {
        full_name,
        email,
        password,
        token:     emailToken,
        token_ttl: emailTTL,
      })

      if (smtpEnabled && verifyEmailEnabled) {
        const verifyUrl =
          `${process.env.NEXT_PUBLIC_APP_DOMAIN}/verify-email` +
          `?token=${emailToken}&email=${encodeURIComponent(email)}`

        await buildTransporter().sendMail({
          from:    process.env.NEXT_PUBLIC_SMTP_FROM || 'no-reply@example.com',
          to:      email,
          subject: 'Verify your email',
          html:    `<p>Hi ${full_name},</p>
                    <p>Click below to verify your email (expires in 24h):</p>
                    <a href="${verifyUrl}">${verifyUrl}</a>`,
        })
        console.log(`[Signup API] Verification email sent (${dbType})`)
      } else {
        console.log('[Signup API] Email verification disabled — skipping verification email')
      }

      return NextResponse.json({ success: true, ...result })
    }

    throw new Error(`Unsupported DB type: ${dbType}`)

  } catch (err: any) {
    console.error('[Signup API] Unhandled error:', err)
    return NextResponse.json({ error: err.message || 'Signup failed' }, { status: 500 })
  }
}