import { NextRequest, NextResponse } from 'next/server'
import { getAdapter } from '@/app/db-adapter'
import type { DBType, DBConfig } from '@/app/db-adapter/types'
import crypto from 'crypto'
import nodemailer from 'nodemailer'

export async function POST(req: NextRequest) {
  console.log('🆕 [SIGNIN API] Request received')

  try {
    const { email, password } = await req.json()
    console.log('📥 Payload:', { email, password: password ? '***' : null })

    if (!email || !password) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const dbType = process.env.NEXT_DB_TYPE as DBType
    if (!dbType) throw new Error('NEXT_DB_TYPE not set')

    // --------------------------- DB CONFIG ---------------------------
    let dbConfig: DBConfig
    if (dbType === 'firebase') {
      const serviceAccount = JSON.parse(process.env.NEXT_DB_FIREBASE_SERVICE_ACCOUNT!)
      dbConfig = {
        type: 'firebase',
        firebaseConfigJson: JSON.stringify(serviceAccount),
        storageBucket: 'gs://' + serviceAccount.storageBucket,
      }
    } else if (dbType === 'supabase') {
      dbConfig = {
        type: 'supabase',
        url: process.env.NEXT_PUBLIC_SUPABASE_URL!,
        anonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      }
    } else if (dbType === 'mongodb') {
      dbConfig = {
        type: 'mongodb',
        connectionString: process.env.NEXT_DB_MONGO_URI!,
        database: process.env.NEXT_DB_MONGO_DB_NAME!,
      }
    } else if (dbType === 'mysql') {
      dbConfig = {
        type: 'mysql',
        host: process.env.NEXT_DB_MYSQL_HOST!,
        user: process.env.NEXT_DB_MYSQL_USER!,
        password: process.env.NEXT_DB_MYSQL_PASSWORD!,
        database: process.env.NEXT_DB_MYSQL_DATABASE!,
        port: process.env.NEXT_DB_MYSQL_PORT ? Number(process.env.NEXT_DB_MYSQL_PORT) : 3306,
      }
    } else if (dbType === 'postgres') {
      dbConfig = {
        type: 'postgres',
        host: process.env.NEXT_DB_POSTGRES_HOST!,
        user: process.env.NEXT_DB_POSTGRES_USER!,
        password: process.env.NEXT_DB_POSTGRES_PASSWORD!,
        database: process.env.NEXT_DB_POSTGRES_DATABASE!,
        port: process.env.NEXT_DB_POSTGRES_PORT ? Number(process.env.NEXT_DB_POSTGRES_PORT) : 5432,
      }
    } else {
      throw new Error(`Unsupported DB type: ${dbType}`)
    }

    const adapter = getAdapter(dbType, dbConfig)
    if (!adapter) throw new Error('Adapter not found')

    // --------------------------- LOGIN ---------------------------
    console.log('🔑 Attempting login...')
    let loginResult: any
    let user: any

    if (dbType === 'firebase' || dbType === 'supabase') {
      if (!adapter.loginUserInAuth) throw new Error('Adapter does not support login')
      loginResult = await adapter.loginUserInAuth(dbConfig, email, password)
      user = loginResult.user
    } else if (dbType === 'mongodb') {
      loginResult = await adapter.loginWithMongo!(dbConfig, email, password)
      user = loginResult.user
    } else if (dbType === 'mysql') {
      loginResult = await adapter.loginWithMysql!(dbConfig, email, password)
      user = loginResult.user
    } else if (dbType === 'postgres') {
      loginResult = await adapter.loginWithPostgres!(dbConfig, email, password)
      user = loginResult.user
    }

    // --------------------------- LOGIN FAILURE ---------------------------
    if (!loginResult.success) {
      console.log('❌ Login failed:', loginResult.error)
      return NextResponse.json(
        { success: false, error: loginResult.error || 'Signin failed' },
        { status: 401 }
      )
    }

    console.log('VALID PASS:', !!user)

    // --------------------------- EMAIL VERIFICATION ---------------------------
    if (!user.email_verified) {
      console.log('VERIFICATION REQUIRED')

      const emailToken = crypto.randomBytes(32).toString('hex')
      const emailTTL = new Date(Date.now() + 24 * 60 * 60 * 1000) // 24h

      if (adapter.resendVerificationEmail) {
        await adapter.resendVerificationEmail(dbConfig, email, emailToken, emailTTL)
        console.log('✅ Token updated for verification email:', emailToken)
      }

      if (process.env.NEXT_ENABLE_SMTP === 'true') {
        await sendVerificationEmail(user.full_name, email, emailToken)
        console.log('✅ Verification email sent with token:', emailToken)
      }

      return NextResponse.json({
        success: false,
        error: 'Please verify your email',
        user: { ...user, emailVerifiedRequired: true },
      })
    }

    // --------------------------- SUCCESS ---------------------------
    // Generate accessToken / refreshToken for SQL/Mongo users if missing
    const accessToken =
      loginResult.accessToken ??
      crypto.randomUUID() // fallback token
    const refreshToken =
      loginResult.refreshToken ??
      crypto.randomUUID() // fallback token

    console.log('✅ Login successful')
    return NextResponse.json({
      success: true,
      user,
      accessToken,
      refreshToken,
    })
  } catch (err: any) {
    console.error('🔥 SIGNIN ERROR:', err)
    return NextResponse.json({ error: err.message || 'Signin failed' }, { status: 500 })
  }
}

// --------------------------- HELPER FUNCTION ---------------------------
async function sendVerificationEmail(fullName: string, email: string, token: string) {
  try {
    const transporter = nodemailer.createTransport({
      host: process.env.NEXT_SMTP_HOST,
      port: Number(process.env.NEXT_SMTP_PORT),
      secure: process.env.NEXT_SMTP_SECURE === 'true',
      auth: {
        user: process.env.NEXT_SMTP_USER,
        pass: (process.env.NEXT_SMTP_PASS || '').replace(/\\#/g, '#'),
      },
      logger: true,
      debug: true,
    })

    const verifyUrl = `${process.env.NEXT_PUBLIC_BASE_URL}/verify-email?token=${token}&email=${encodeURIComponent(
      email
    )}`

    const info = await transporter.sendMail({
      from: process.env.NEXT_SMTP_FROM,
      to: email,
      subject: 'Verify your email',
      html: `<p>Hi ${fullName},</p>
             <p>Click the link below to verify your email (expires in 24h):</p>
             <a href="${verifyUrl}">${verifyUrl}</a>`,
    })

    console.log('VERIFICATION EMAIL SENT:', info.messageId)
  } catch (err) {
    console.error('❌ SMTP ERROR:', err)
  }
}
