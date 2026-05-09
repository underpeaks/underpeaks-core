import { NextRequest, NextResponse } from 'next/server'
import { getAdapter } from '@/app/db-adapter'
import type { DBType, DBConfig } from '@/app/db-adapter/types'
import crypto from 'crypto'
import nodemailer from 'nodemailer'
import admin from 'firebase-admin'

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

export async function POST(req: NextRequest) {
  console.log('🆕 [SIGNUP API] Request received')

  try {
    const { full_name, email, password } = await req.json()
    if (!full_name || !email || !password)
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })

    const dbType = process.env.NEXT_PUBLIC_DB_TYPE as DBType
    if (!dbType) throw new Error('NEXT_PUBLIC_DB_TYPE not set')

    let dbConfig: DBConfig

    // ── FIREBASE ──────────────────────────────────────────────────────────
    if (dbType === 'firebase') {
      const serviceAccount = JSON.parse(process.env.NEXT_DB_FIREBASE_SERVICE_ACCOUNT!)
      dbConfig = {
        type: 'firebase',
        firebaseConfigJson: JSON.stringify(serviceAccount),
        storageBucket: 'gs://' + serviceAccount.storageBucket,
      }

      const adapter = getAdapter(dbType, dbConfig)
      if (!adapter.registerUser)
        return NextResponse.json({ error: 'Adapter does not support signup' }, { status: 400 })

      const result = await adapter.registerUser(dbConfig, { full_name, email, password })

      // Firebase: use custom SMTP if enabled, otherwise Firebase client SDK
      // handles verification on the frontend via sendEmailVerification
      if (smtpEnabled && verifyEmailEnabled) {
        const link = await admin.auth().generateEmailVerificationLink(email, {
          url: `${process.env.NEXT_PUBLIC_APP_DOMAIN}/signin`,
        })
        await buildTransporter().sendMail({
          from:    process.env.NEXT_PUBLIC_SMTP_FROM || 'no-reply@example.com',
          to:      email,
          subject: 'Verify your email',
          html:    `<p>Hi ${full_name},</p>
                    <p>Click below to verify your email:</p>
                    <a href="${link}">${link}</a>`,
        })
        console.log('✅ Firebase verification email sent via custom SMTP to:', email)
      } else {
        console.log('⚠️ Custom SMTP disabled — Firebase client SDK will handle verification')
      }

      return NextResponse.json({ success: true, userId: result.userId })
    }

    // ── SUPABASE ──────────────────────────────────────────────────────────
    if (dbType === 'supabase') {
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
      const anonKey     = process.env.NEXT_PUBLIC_SUPABASE_SERVICE_KEY

      if (!supabaseUrl || !anonKey)
        throw new Error('Supabase env vars missing')

      dbConfig = { type: 'supabase', supabaseUrl, anonKey }

      const adapter = getAdapter(dbType, dbConfig)

      if (!adapter.registerSupabaseUser)
        throw new Error('registerSupabaseUser not implemented in this adapter')

      const existingUser = await adapter.findUserByEmail!(dbConfig, email)
      if (existingUser)
        return NextResponse.json({ error: 'Email already exists' }, { status: 400 })

      const result = await adapter.registerSupabaseUser(dbConfig, { full_name, email, password })
      console.log('✅ Supabase user created:', result)

      // Supabase handles verification natively — no SMTP needed
      return NextResponse.json({ success: true, userId: result.id })
    }

    // ── MONGODB ───────────────────────────────────────────────────────────
    if (dbType === 'mongodb') {
      dbConfig = {
        type: 'mongodb',
        connectionString: process.env.NEXT_DB_MONGO_URI!,
        database:         process.env.NEXT_DB_MONGO_DB_NAME!,
      }

      const adapter = getAdapter(dbType, dbConfig)

      if (!adapter.registerMongoUser)
        return NextResponse.json({ error: 'Adapter does not support signup' }, { status: 400 })

      const existingUser = await adapter.findUserByEmail!(dbConfig, email)
      if (existingUser)
        return NextResponse.json({ error: 'Email already exists' }, { status: 400 })

      const result = await adapter.registerMongoUser(dbConfig, {
        full_name,
        email,
        password,
        email_verified: false,
      })

      if (smtpEnabled && verifyEmailEnabled) {
        const verifyUrl = `${process.env.NEXT_PUBLIC_APP_DOMAIN}/verify-email?token=${result.token}&email=${encodeURIComponent(email)}`
        await buildTransporter().sendMail({
          from:    process.env.NEXT_PUBLIC_SMTP_FROM || 'no-reply@example.com',
          to:      email,
          subject: 'Verify your email',
          html:    `<p>Hi ${full_name},</p>
                    <p>Click below to verify your email (expires in 24h):</p>
                    <a href="${verifyUrl}">${verifyUrl}</a>`,
        })
        console.log('📧 Verification email sent to:', email)
      } else {
        console.log('⚠️ Email verification disabled — skipping email')
      }

      return NextResponse.json({ success: true, user_id: result.user_id })
    }

    // ── MYSQL / POSTGRES ──────────────────────────────────────────────────
    if (dbType === 'mysql' || dbType === 'postgres') {
      dbConfig = dbType === 'mysql'
        ? {
            type:     'mysql',
            host:     process.env.NEXT_DB_MYSQL_HOST!,
            user:     process.env.NEXT_DB_MYSQL_USER!,
            password: process.env.NEXT_DB_MYSQL_PASSWORD!,
            database: process.env.NEXT_DB_MYSQL_DATABASE!,
            port:     process.env.NEXT_DB_MYSQL_PORT ? Number(process.env.NEXT_DB_MYSQL_PORT) : 3306,
          }
        : {
            type:     'postgres',
            host:     process.env.NEXT_DB_POSTGRES_HOST!,
            user:     process.env.NEXT_DB_POSTGRES_USER!,
            password: process.env.NEXT_DB_POSTGRES_PASSWORD!,
            database: process.env.NEXT_DB_POSTGRES_DATABASE!,
            port:     process.env.NEXT_DB_POSTGRES_PORT ? Number(process.env.NEXT_DB_POSTGRES_PORT) : 5432,
          }

      const adapter = getAdapter(dbType, dbConfig)

      if (!adapter.registerUser)
        return NextResponse.json({ error: 'Adapter does not support signup' }, { status: 400 })

      const existingUser = await adapter.findUserByEmail!(dbConfig, email)
      if (existingUser)
        return NextResponse.json({ error: 'Email already exists' }, { status: 400 })

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
        const verifyUrl = `${process.env.NEXT_PUBLIC_APP_DOMAIN}/verify-email?token=${emailToken}&email=${encodeURIComponent(email)}`
        await buildTransporter().sendMail({
          from:    process.env.NEXT_PUBLIC_SMTP_FROM || 'no-reply@example.com',
          to:      email,
          subject: 'Verify your email',
          html:    `<p>Hi ${full_name},</p>
                    <p>Click below to verify your email (expires in 24h):</p>
                    <a href="${verifyUrl}">${verifyUrl}</a>`,
        })
        console.log('📧 Verification email sent to:', email)
      } else {
        console.log('⚠️ Email verification disabled — skipping email')
      }

      return NextResponse.json({ success: true, ...result })
    }

    throw new Error(`Unsupported DB type: ${dbType}`)

  } catch (err: any) {
    console.error('🔥 SIGNUP ERROR:', err)
    return NextResponse.json({ error: err.message || 'Signup failed' }, { status: 500 })
  }
}