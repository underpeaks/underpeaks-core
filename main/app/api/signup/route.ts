import { NextRequest, NextResponse } from 'next/server'
import { getAdapter } from '@/app/db-adapter'
import type { DBType, DBConfig } from '@/app/db-adapter/types'
import crypto from 'crypto'
import nodemailer from 'nodemailer'

export async function POST(req: NextRequest) {
  console.log('🆕 [SIGNUP API] Request received')

  try {
    const { full_name, email, password } = await req.json()
    if (!full_name || !email || !password)
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })

    const dbType = process.env.NEXT_DB_TYPE as DBType
    if (!dbType) throw new Error('NEXT_DB_TYPE not set')

    let dbConfig: DBConfig

    // --------------------------- FIREBASE ---------------------------
    if (dbType === 'firebase') {
      const serviceAccount = JSON.parse(process.env.NEXT_DB_FIREBASE_SERVICE_ACCOUNT!)
      dbConfig = {
        type: 'firebase',
        firebaseConfigJson: JSON.stringify(serviceAccount),
        storageBucket: 'gs://' + serviceAccount.storageBucket,
      }
      console.log('🟠 Using Firebase adapter')
    }

    // --------------------------- SUPABASE ---------------------------
    else if (dbType === 'supabase') {
      dbConfig = {
        type: 'supabase',
        url: process.env.NEXT_PUBLIC_SUPABASE_URL!,
        anonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      }
      console.log('🟢 Using Supabase adapter')
    }

    // --------------------------- MONGODB ---------------------------
    else if (dbType === 'mongodb') {
      dbConfig = {
        type: 'mongodb',
        connectionString: process.env.NEXT_DB_MONGO_URI!,
        database: process.env.NEXT_DB_MONGO_DB_NAME!,
      }
      console.log('🟢 Using MongoDB adapter')
    }

    // --------------------------- MYSQL ---------------------------
    else if (dbType === 'mysql') {
      dbConfig = {
        type: 'mysql',
        host: process.env.NEXT_DB_MYSQL_HOST!,
        user: process.env.NEXT_DB_MYSQL_USER!,
        password: process.env.NEXT_DB_MYSQL_PASSWORD!,
        database: process.env.NEXT_DB_MYSQL_DATABASE!,
        port: process.env.NEXT_DB_MYSQL_PORT ? Number(process.env.NEXT_DB_MYSQL_PORT) : 3306,
      }
      console.log('🟢 Using MySQL adapter')
    }

    // --------------------------- POSTGRES ---------------------------
    else if (dbType === 'postgres') {
      dbConfig = {
        type: 'postgres',
        host: process.env.NEXT_DB_POSTGRES_HOST!,
        user: process.env.NEXT_DB_POSTGRES_USER!,
        password: process.env.NEXT_DB_POSTGRES_PASSWORD!,
        database: process.env.NEXT_DB_POSTGRES_DATABASE!,
        port: process.env.NEXT_DB_POSTGRES_PORT
          ? Number(process.env.NEXT_DB_POSTGRES_PORT)
          : 5432,
      }
      console.log('🟣 Using Postgres adapter')
    } else {
      throw new Error(`Unsupported DB type: ${dbType}`)
    }

    const adapter = getAdapter(dbType, dbConfig)
    if (!adapter.registerUser)
      return NextResponse.json({ error: 'Adapter does not support signup' }, { status: 400 })

    // --------------------------- SMTP CONFIG ---------------------------
    const smtpHost = process.env.NEXT_SMTP_HOST
    const smtpPort = process.env.NEXT_SMTP_PORT
    const smtpSecure = process.env.NEXT_SMTP_SECURE === 'true'
    const smtpUser = process.env.NEXT_SMTP_USER
    const smtpPassRaw = process.env.NEXT_SMTP_PASS || ''
    const smtpPass = smtpPassRaw.replace(/\\#/g, '#')
    const smtpFromEmail = process.env.NEXT_SMTP_FROM || 'Your App <no-reply@example.com>'

    const transporter = nodemailer.createTransport({
      host: smtpHost,
      port: Number(smtpPort),
      secure: smtpSecure,
      auth: { user: smtpUser, pass: smtpPass },
    })

    // --------------------------- SQL SIGNUP (MySQL / Postgres) ---------------------------
    if (dbType === 'mysql' || dbType === 'postgres') {
      const existingUser = await adapter.findUserByEmail!(dbConfig, email)
      if (existingUser)
        return NextResponse.json({ error: 'Email already exists' }, { status: 400 })

      // 🔹 FIXED: generate token once and use for both DB & email
      const emailToken = crypto.randomBytes(32).toString('hex')
      const emailTTL = new Date(Date.now() + 24 * 60 * 60 * 1000) // 24h

      const result = await adapter.registerUser(dbConfig, {
        full_name,
        email,
        password,
        token: emailToken,       // SAME token saved
        token_ttl: emailTTL.toISOString(),
      })

      const verifyUrl = `${process.env.NEXT_PUBLIC_BASE_URL}/verify-email?token=${emailToken}&email=${encodeURIComponent(email)}`

      await transporter.sendMail({
        from: smtpFromEmail,
        to: email,
        subject: 'Verify your email',
        html: `<p>Hi ${full_name},</p>
               <p>Click the link below to verify your email (expires in 24h):</p>
               <a href="${verifyUrl}">${verifyUrl}</a>`,
      })

      console.log('📧 Verification email sent to:', email)
      return NextResponse.json({ success: true, ...result })
    }

    // --------------------------- MongoDB SIGNUP ---------------------------
    if (dbType === 'mongodb') {
      const existingUser = await adapter.findUserByEmail!(dbConfig, email)
      if (existingUser)
        return NextResponse.json({ error: 'Email already exists' }, { status: 400 })

      // 🔹 FIXED: generate token once and use for both DB & email
      const emailToken = crypto.randomBytes(32).toString('hex')
      const emailTTL = new Date(Date.now() + 5 * 60 * 1000) // 5 min

      const result = await adapter.registerUser(dbConfig, {
        full_name,
        email,
        password,
        email_verified: false,
        email_verification_token: emailToken,    // SAME token saved
        email_verification_ttl: emailTTL.toISOString(),
      })

      const verifyUrl = `${process.env.NEXT_PUBLIC_BASE_URL}/verify-email?token=${result.emailToken}&email=${encodeURIComponent(email)}`

      await transporter.sendMail({
        from: smtpFromEmail,
        to: email,
        subject: 'Verify your email',
        html: `<p>Hi ${full_name},</p>
               <p>Click the link below to verify your email:</p>
               <a href="${verifyUrl}">${verifyUrl}</a>`,
      })

      return NextResponse.json({ success: true, ...result })
    }

    // --------------------------- Firebase / Supabase SIGNUP ---------------------------
    if (!adapter.registerUserInAuth)
      return NextResponse.json({ error: 'Adapter does not support signup' }, { status: 400 })

    const result = await adapter.registerUserInAuth(dbConfig, {
      full_name,
      email,
      password,
    })

    console.log('✅ Signup success:', result.id)
    return NextResponse.json({ success: true, userId: result.id })
  } catch (err: any) {
    console.error('🔥 SIGNUP ERROR:', err)
    return NextResponse.json({ error: err.message || 'Signup failed' }, { status: 500 })
  }
}
