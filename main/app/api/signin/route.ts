// app/api/signin/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getAdapter } from '@/app/db-adapter'
import type { DBType, DBConfig } from '@/app/db-adapter/types'
import crypto from 'crypto'
import nodemailer from 'nodemailer'
import { cleanEnvString, parseFirebaseServiceAccount, parseFirebaseWebConfig } from '@/app/lib/firebaseConfig'

export async function POST(req: NextRequest) {
  console.log('🆕 [SIGNIN API] Request received')

  try {
    const body = await req.json()
    const { email, password, idToken } = body

    console.log('📥 Payload:', {
      email,
      password: password ? '***' : null,
      idToken: idToken ? '***' : null,
    })

    if (!email && !idToken) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    const dbType = process.env.NEXT_PUBLIC_DB_TYPE as DBType
    if (!dbType) throw new Error('NEXT_DB_TYPE not set')

    // --------------------------- DB CONFIG ---------------------------
    let dbConfig: DBConfig

    // =========================================================
    // 🔥 FIREBASE FIX (ONLY THIS BLOCK MODIFIED)
    // =========================================================
    if (dbType === 'firebase') {
  console.log('🔥 [FIREBASE CONFIG] START')

  // =========================
  // 1. SERVICE ACCOUNT (ADMIN)
  // =========================
  const saRaw = process.env.NEXT_DB_FIREBASE_SERVICE_ACCOUNT
  if (!saRaw) throw new Error('Missing Firebase service account')

 const serviceAccount = cleanEnvString(saRaw)

  console.log('🔥 SERVICE ACCOUNT LOADED')

  // =========================
  // 2. WEB CONFIG (FOR STORAGE BUCKET)
  // =========================
  const webRaw = process.env.NEXT_PUBLIC_FIREBASE_CONFIG
  if (!webRaw) throw new Error('Missing Firebase web config')

  const webConfig = parseFirebaseWebConfig(webRaw)

  console.log('🔥 WEB CONFIG LOADED:', webConfig.storageBucket)

  // =========================
  // 3. FIX STORAGE BUCKET (FROM WEB CONFIG)
  // =========================
  let bucket = webConfig.storageBucket

 



  console.log('🔥 FINAL BUCKET:', bucket)

  // =========================
  // 4. BUILD DB CONFIG
  // =========================
  dbConfig = {
    type: 'firebase',
    firebaseConfigJson: JSON.stringify(serviceAccount),
    storageBucket:`gs://${bucket}`,
  }

  console.log('🔥 FIREBASE CONFIG READY ' + dbConfig)
}
    // --------------------------- SUPABASE ---------------------------
    else if (dbType === 'supabase') {
      const url = process.env.NEXT_PUBLIC_SUPABASE_URL
      const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
      if (!url || !anonKey) throw new Error('Supabase env vars missing')

      dbConfig = {
        type: 'supabase',
        supabaseUrl: url,
        anonKey,
      }
    }

    // --------------------------- MONGODB ---------------------------
    else if (dbType === 'mongodb') {
      dbConfig = {
        type: 'mongodb',
        connectionString: process.env.NEXT_DB_MONGO_URI!,
        database: process.env.NEXT_DB_MONGO_DB_NAME!,
      }
    }

    // --------------------------- MYSQL ---------------------------
    else if (dbType === 'mysql') {
      dbConfig = {
        type: 'mysql',
        host: process.env.NEXT_DB_MYSQL_HOST!,
        user: process.env.NEXT_DB_MYSQL_USER!,
        password: process.env.NEXT_DB_MYSQL_PASSWORD!,
        database: process.env.NEXT_DB_MYSQL_DATABASE!,
        port: process.env.NEXT_DB_MYSQL_PORT
          ? Number(process.env.NEXT_DB_MYSQL_PORT)
          : 3306,
      }
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
    }

    else {
      throw new Error(`Unsupported DB type: ${dbType}`)
    }

    console.log('🔍 dbConfig before adapter:', dbConfig)

    const adapter = getAdapter(dbType, dbConfig)
    if (!adapter) throw new Error('Adapter not found')

    console.log('🔑 Attempting login...')

    let loginResult: any
    let user: any

    // ---------------- FIREBASE LOGIN ----------------
    if (dbType === 'firebase') {
      const idTokenFromHeader =
        req.headers.get('authorization')?.replace('Bearer ', '') || idToken

      if (!idTokenFromHeader) {
        return NextResponse.json(
          { success: false, error: 'No ID token provided' },
          { status: 401 }
        )
      }

      let decodedToken: any
      console.log(`TOKEN FROM HEADER: ${idTokenFromHeader}`)
      try {
        decodedToken = await adapter!.validateBuiltInSession!(
        dbConfig,
        idTokenFromHeader
       )

        // decodedToken =
        //   await adapter.admin.auth().verifyIdToken(idTokenFromHeader)
      } catch (err) {
        console.error('❌ Invalid Firebase ID token', err)
        return NextResponse.json(
          { success: false, error: 'Invalid Firebase ID token' },
          { status: 401 }
        )
      }
const uid = decodedToken.uid

const userResult = await adapter.getUserById!(uid)

if (userResult.error || !userResult.user) {
  return NextResponse.json(
    { success: false, error: userResult.error || 'User not found' },
    { status: 401 }
  )
}

const user = userResult.user

loginResult = {
  success: true,
  user,
  accessToken: idTokenFromHeader,
  refreshToken: null,
}

      if (!user?.email_verified) {
        return NextResponse.json({
          success: false,
          error: 'Please verify your email',
          user: { ...user, emailVerifiedRequired: true },
        })
      }
    }

    // ---------------- SUPABASE ----------------
    else if (dbType === 'supabase') {
      const { createClient } = await import('@supabase/supabase-js')

      const supabase = createClient(
        dbConfig.supabaseUrl!,
        dbConfig.anonKey!
      )

      const { data, error } =
        await supabase.auth.signInWithPassword({
          email: email!,
          password: password!,
        })

      if (error || !data.session) {
        return NextResponse.json(
          { success: false, error: error?.message },
          { status: 401 }
        )
      }

      loginResult = {
        success: true,
        user: data.user,
        accessToken: data.session.access_token,
        refreshToken: data.session.refresh_token,
      }

      user = data.user
    }

    // ---------------- DATABASES ----------------
    else if (dbType === 'mongodb') {
      loginResult =
        await adapter.loginWithMongo!(dbConfig, email!, password!)
      user = loginResult.user
    }

    else if (dbType === 'mysql') {
      loginResult =
        await adapter.loginWithMySQL!(dbConfig, email!, password!)
      user = loginResult.user
    }

    else if (dbType === 'postgres') {
      loginResult =
        await adapter.loginWithPostgres!(dbConfig, email!, password!)
      user = loginResult.user
    }

    if (!loginResult.success) {
      return NextResponse.json(
        {
          success: false,
          error: loginResult.error || 'Signin failed',
        },
        { status: 401 }
      )
    }

    const accessToken =
      loginResult.accessToken ?? crypto.randomUUID()

    const refreshToken =
      loginResult.refreshToken ?? crypto.randomUUID()

    console.log('✅ Login successful')

    return NextResponse.json({
      success: true,
      user,
      accessToken,
      refreshToken,
      projectId: loginResult.projectId,
    })

  } catch (err: any) {
    console.error('🔥 SIGNIN ERROR:', err)
    return NextResponse.json(
      { error: err.message || 'Signin failed' },
      { status: 500 }
    )
  }
}

/* =========================================================
   EMAIL HELPER (UNCHANGED - LEFT EXACTLY AS YOU WROTE IT)
========================================================= */
async function sendVerificationEmail(
  fullName: string,
  email: string,
  token: string
) {
  try {
    const transporter = nodemailer.createTransport({
      host: process.env.NEXT_SMTP_HOST,
      port: Number(process.env.NEXT_SMTP_PORT),
      secure: process.env.NEXT_SMTP_SECURE === 'true',
      auth: {
        user: process.env.NEXT_SMTP_USER,
        pass: (process.env.NEXT_SMTP_PASS || '').replace(/\\#/g, '#'),
      },
    })

    const verifyUrl =
      `${process.env.NEXT_PUBLIC_APP_DOMAIN}` +
      `/verify-email?token=${token}&email=${encodeURIComponent(email)}`

    await transporter.sendMail({
      from: process.env.NEXT_SMTP_FROM,
      to: email,
      subject: 'Verify your email',
      html: `
        <p>Hi ${fullName},</p>
        <p>Click below to verify your email:</p>
        <a href="${verifyUrl}">${verifyUrl}</a>
      `,
    })
  } catch (err) {
    console.error('❌ SMTP ERROR:', err)
  }
}