import { NextRequest, NextResponse } from 'next/server'
import { getAdapter } from '@/app/db-adapter'
import nodemailer from 'nodemailer'
import { DBType } from '@/app/db-adapter/types'

const smtpEnabled     = process.env.NEXT_PUBLIC_SMTP_ENABLED   === 'true'
const forgotPwEnabled = process.env.NEXT_PUBLIC_SMTP_FORGOT_PW === 'true'
const canSendEmail    = smtpEnabled && forgotPwEnabled

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

export async function POST(req: NextRequest) {
  console.log('🔐 [FORGOT PASSWORD API] Request received')

  try {
    const { email } = await req.json()
    if (!email)
      return NextResponse.json({ error: 'Email is required' }, { status: 400 })

    const dbType = process.env.NEXT_PUBLIC_DB_TYPE as DBType
    if (!dbType) throw new Error('NEXT_PUBLIC_DB_TYPE not set')

    console.log('🗄 DB Type:', dbType)

    // ── FIREBASE ─────────────────────────────────────────────────────────
    if (dbType === 'firebase') {
      // Handled client-side via sendPasswordResetEmail — should not reach here
      return NextResponse.json(
        { error: 'Firebase password reset is handled client-side' },
        { status: 400 }
      )
    }

    // ── SUPABASE ──────────────────────────────────────────────────────────
    if (dbType === 'supabase') {
      const adapter = getAdapter(dbType, {
        type:       'supabase',
        supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL!,
        anonKey:     process.env.NEXT_PUBLIC_SUPABASE_SERVICE_KEY!,
      })

      if (!adapter.sendResetEmail)
        throw new Error('Supabase adapter missing sendResetEmail method')

      const redirectUrl = `${process.env.NEXT_PUBLIC_APP_DOMAIN}/reset-password`
      await adapter.sendResetEmail(adapter.config, email, redirectUrl)

      console.log('✅ Supabase reset email sent')
      return NextResponse.json({ success: true })
    }

    // ── MONGODB ───────────────────────────────────────────────────────────
    let dbConfig: any

    if (dbType === 'mongodb') {
      dbConfig = {
        type:             'mongodb',
        connectionString: process.env.NEXT_DB_MONGO_URI!,
        database:         process.env.NEXT_DB_MONGO_DB_NAME!,
      }
    }

    // ── MYSQL ─────────────────────────────────────────────────────────────
    else if (dbType === 'mysql') {
      dbConfig = {
        type:     'mysql',
        host:     process.env.NEXT_DB_MYSQL_HOST!,
        port:     Number(process.env.NEXT_DB_MYSQL_PORT || 3306),
        user:     process.env.NEXT_DB_MYSQL_USER!,
        password: process.env.NEXT_DB_MYSQL_PASSWORD?.replace(/["]/g, '')!,
        database: process.env.NEXT_DB_MYSQL_DATABASE!,
      }
    }

    // ── POSTGRES ──────────────────────────────────────────────────────────
    else if (dbType === 'postgres') {
      dbConfig = {
        type:     'postgres',
        host:     process.env.NEXT_DB_POSTGRES_HOST!,
        port:     Number(process.env.NEXT_DB_POSTGRES_PORT || 5432),
        user:     process.env.NEXT_DB_POSTGRES_USER!,
        password: process.env.NEXT_DB_POSTGRES_PASSWORD!,
        database: process.env.NEXT_DB_POSTGRES_DATABASE!,
      }
    } else {
      throw new Error(`Unsupported DB type: ${dbType}`)
    }

    const adapter = getAdapter(dbType, dbConfig)

    if (!adapter.findUserByEmail || !adapter.createPasswordResetToken)
      throw new Error(`${dbType} adapter missing required methods`)

    const user = await adapter.findUserByEmail(adapter.config, email)
    if (!user)
      return NextResponse.json({ error: 'User not found' }, { status: 404 })

    const token     = await adapter.createPasswordResetToken(email)
    const resetLink = `${process.env.NEXT_PUBLIC_APP_DOMAIN}/reset-password?token=${token}`

    console.log('🔗 Reset link:', resetLink)

    if (canSendEmail) {
      await buildTransporter().sendMail({
        from:    process.env.NEXT_PUBLIC_SMTP_FROM || 'no-reply@example.com',
        to:      email,
        subject: 'Password Reset Request',
        html:    `<p>Hello ${user.full_name || ''},</p>
                  <p>Click the link below to reset your password:</p>
                  <a href="${resetLink}">${resetLink}</a>
                  <p>If you didn't request this, ignore this email.</p>`,
      })
      console.log('✅ Reset email sent')
    } else {
      console.log('⚠️ SMTP/forgot-password disabled — email skipped')
      // Return the link in dev so it can still be used without email
      return NextResponse.json({
        success: true,
        notice:  'Email sending is disabled. Ask your administrator to reset your password.',
      })
    }

    return NextResponse.json({ success: true })

  } catch (err: any) {
    console.error('🔥 Forgot password error:', err)
    return NextResponse.json(
      { error: err.message || 'Failed to send reset link' },
      { status: 500 }
    )
  }
}