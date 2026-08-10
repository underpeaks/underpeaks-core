// app/api/signin/route.ts

import { NextRequest, NextResponse } from 'next/server'
import crypto                        from 'crypto'
import nodemailer                    from 'nodemailer'
import { getConfiguredAdapter } from '@/app/lib/getConfiguredAdapter'

export async function POST(req: NextRequest) {
  console.log('[Signin API] Request received')

  try {
    const body = await req.json()
    const { email, password, idToken } = body

    console.log('[Signin API] Payload received:', {
      email,
      password: password ? '[REDACTED]' : null,
      idToken:  idToken  ? '[REDACTED]' : null,
    })

    if (!email && !idToken) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    const adapter  = getConfiguredAdapter()
    const dbConfig = adapter.config
    const dbType   = dbConfig.type

    if (!adapter) throw new Error('Adapter not found')

    console.log('[Signin API] Adapter ready, attempting login...')

    let loginResult: any
    let user: any

    // ── Firebase ────────────────────────────────────────────────────────────

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
      try {
        decodedToken = await adapter.validateBuiltInSession!(dbConfig, idTokenFromHeader)
      } catch (err) {
        console.error('[Signin API] Invalid Firebase ID token:', err)
        return NextResponse.json(
          { success: false, error: 'Invalid Firebase ID token' },
          { status: 401 }
        )
      }

      const uid        = decodedToken.uid
      const userResult = await adapter.getUserById!(uid)

      if (userResult.error || !userResult.user) {
        return NextResponse.json(
          { success: false, error: userResult.error || 'User not found' },
          { status: 401 }
        )
      }

      user = userResult.user

      loginResult = {
        success:      true,
        user,
        accessToken:  idTokenFromHeader,
        refreshToken: null,
      }

      if (!user?.email_verified) {
        return NextResponse.json({
          success: false,
          error:   'Please verify your email',
          user:    { ...user, emailVerifiedRequired: true },
        })
      }
    }

    // ── Supabase ────────────────────────────────────────────────────────────

    else if (dbType === 'supabase') {
      const { createClient } = await import('@supabase/supabase-js')
      console.log(`SUPASBASE SIGNIN ******* : CREATING CLIENT`)
      const supabase = createClient(
        dbConfig.supabaseUrl!,
        dbConfig.anonKey!,
        
      )
console.log(`SUPASBASE SIGNIN ******* : GOT CLIENT`)
console.log(`SUPASBASE SIGNIN ******* : SIGN IN STARTED`)
      const { data, error } = await supabase.auth.signInWithPassword({
        email:    email!,
        password: password!,
      })
 console.log(`SUPASBASE SIGNIN ******* : SIGNIN COMPLETED`)     

      if (error || !data.session) {
        return NextResponse.json(
          { success: false, error: error?.message },
          { status: 401 }
        )
      }

      loginResult = {
        success:      true,
        user:         data.user,
        accessToken:  data.session.access_token,
        refreshToken: data.session.refresh_token,
      }
      user = data.user
    }

    // ── MongoDB ─────────────────────────────────────────────────────────────

    else if (dbType === 'mongodb') {
      loginResult = await adapter.loginWithMongo!(dbConfig, email!, password!)
      user        = loginResult.user
    }

    // ── MySQL ───────────────────────────────────────────────────────────────

    else if (dbType === 'mysql') {
      loginResult = await adapter.loginWithMySQL!(dbConfig, email!, password!)
      user        = loginResult.user
    }

    // ── PostgreSQL ──────────────────────────────────────────────────────────

    else if (dbType === 'postgres') {
      loginResult = await adapter.loginWithPostgres!(dbConfig, email!, password!)
      user        = loginResult.user
    }

    else {
      throw new Error(`Unsupported DB type: ${dbType}`)
    }

    if (!loginResult.success) {
      return NextResponse.json(
        { success: false, error: loginResult.error || 'Signin failed' },
        { status: 401 }
      )
    }

    const accessToken  = loginResult.accessToken  ?? crypto.randomUUID()
    const refreshToken = loginResult.refreshToken ?? crypto.randomUUID()

    // FIX: normalize user_id across all adapters so recordLogin() always
    // receives a defined value regardless of which DB type is in use.
    // Supabase returns `id`, Firebase returns `uid`, custom adapters use `user_id`.
    const normalizedUser = {
      ...user,
      user_id: user.user_id ?? user.uid ?? user.id,
    }

    console.log('[Signin API] Login successful')

    return NextResponse.json({
      success:      true,
      user:         normalizedUser,
      accessToken,
      refreshToken,
      projectId:    loginResult.projectId,
    })

  } catch (err: any) {
    console.error('[Signin API] Unhandled error:', err)
    return NextResponse.json(
      { error: err.message || 'Signin failed' },
      { status: 500 }
    )
  }
}

// ── Email Helper ────────────────────────────────────────────────────────────

async function sendVerificationEmail(
  fullName: string,
  email:    string,
  token:    string
) {
  try {
    const transporter = nodemailer.createTransport({
      host:   process.env.NEXT_SMTP_HOST,
      port:   Number(process.env.NEXT_SMTP_PORT),
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
      from:    process.env.NEXT_SMTP_FROM,
      to:      email,
      subject: 'Verify your email',
      html: `
        <p>Hi ${fullName},</p>
        <p>Click below to verify your email:</p>
        <a href="${verifyUrl}">${verifyUrl}</a>
      `,
    })
  } catch (err) {
    console.error('[Signin API] SMTP error sending verification email:', err)
  }
}