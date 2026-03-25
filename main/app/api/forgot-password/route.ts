import { NextRequest, NextResponse } from 'next/server'
import { getAdapter } from '@/app/db-adapter'
import nodemailer from 'nodemailer'
import { DBType } from '@/app/db-adapter/types'

const SMTP_ENABLED = process.env.NEXT_ENABLE_SMTP === 'true'

export async function POST(req: NextRequest) {
  console.log('🔐 [FORGOT PASSWORD API] Request received')

  try {
    const { email } = await req.json()
    console.log('📥 Email:', email)

    if (!email)
      return NextResponse.json({ error: 'Email is required' }, { status: 400 })

    const envDbType = process.env.NEXT_DB_TYPE
    if (!envDbType) throw new Error('NEXT_DB_TYPE not set')

    const dbType: DBType =
      envDbType === 'firebase' ||
      envDbType === 'supabase' ||
      envDbType === 'mongodb' ||
      envDbType === 'mysql' ||
      envDbType === 'postgres'
        ? envDbType
        : (() => {
            throw new Error(`Unsupported NEXT_DB_TYPE: ${envDbType}`)
          })()

    console.log('🗄 DB Type:', dbType)

    let dbConfig: any

    // ---------------- FIREBASE ----------------
    if (dbType === 'firebase') {
      throw new Error('Firebase handled separately')
    }

    // ---------------- SUPABASE ----------------
    if (dbType === 'supabase') {
      console.log('🟢 Using Supabase adapter')

      const adapter = getAdapter(dbType, {
  type: 'supabase',
  supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL!,
  anonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
})

if (!adapter.sendResetEmail) {
  throw new Error('Supabase adapter missing sendResetEmail method')
}

const redirectUrl = `${process.env.NEXT_PUBLIC_APP_DOMAIN}/reset-password`

await adapter.sendResetEmail(dbConfig, email, redirectUrl)

console.log('✅ Supabase reset email sent')

return NextResponse.json({ success: true })
      
    }

    // ---------------- MONGODB ----------------
    if (dbType === 'mongodb') {
      console.log('🟢 Using MongoDB adapter')

      dbConfig = {
        type: 'mongodb',
        connectionString: process.env.NEXT_DB_MONGO_URI!,
        database: process.env.NEXT_DB_MONGO_DB_NAME!,
        
      }
    }

    // ---------------- MYSQL ----------------
    else if (dbType === 'mysql') {
      console.log('🟢 Using MySQL adapter')

      dbConfig = {
        type: 'mysql',
        host: process.env.NEXT_DB_MYSQL_HOST!,
        port: Number(process.env.NEXT_DB_MYSQL_PORT || 3306),
        user: process.env.NEXT_DB_MYSQL_USER!,
        password: process.env.NEXT_DB_MYSQL_PASSWORD?.replace(/["]/g, '')!,
        database: process.env.NEXT_DB_MYSQL_DATABASE!,
      }
    }

    // ---------------- POSTGRES ----------------
    else if (dbType === 'postgres') {
      console.log('🟣 Using Postgres adapter')

      dbConfig = {
        type: 'postgres',
        host: process.env.NEXT_DB_POSTGRES_HOST!,
        port: Number(process.env.NEXT_DB_POSTGRES_PORT || 5432),
        user: process.env.NEXT_DB_POSTGRES_USER!,
        password: process.env.NEXT_DB_POSTGRES_PASSWORD!,
        database: process.env.NEXT_DB_POSTGRES_DATABASE!,
      }

      console.log('🐘 Postgres config ready')
    }

    else {
      throw new Error(`No handler implemented for DB type: ${dbType}`)
    }

    console.log('🚀 Creating adapter...')
    const adapter = getAdapter(dbType, dbConfig)
    console.log('🚀 Adapter ready')

    if (!adapter.findUserByEmail || !adapter.createPasswordResetToken)
      throw new Error(`${dbType} adapter missing required methods`)

    console.log('🔎 Looking up user...')
    const user = await adapter.findUserByEmail(adapter.config, email)
    console.log('🔎 User result:', user ? 'FOUND' : 'NOT FOUND')

    if (!user)
      return NextResponse.json({ error: 'User not found' }, { status: 404 })

    console.log('🔑 Creating reset token...')
    const token = await adapter.createPasswordResetToken(email)
    console.log('🔑 Reset token created:', token)

    const resetLink = `${process.env.NEXT_PUBLIC_APP_DOMAIN}/reset-password?token=${token}`
    console.log('🔗 Reset link:', resetLink)

    if (SMTP_ENABLED) {
      console.log('📧 SMTP enabled — sending email')

      const transporter = nodemailer.createTransport({
        host: process.env.NEXT_SMTP_HOST,
        port: Number(process.env.NEXT_SMTP_PORT),
        secure: process.env.NEXT_SMTP_SECURE === 'true',
        auth: {
          user: process.env.NEXT_SMTP_USER,
          pass: process.env.NEXT_SMTP_PASS?.replace(/["]/g, ''),
        },
        logger: true,
        debug: true,
      })

      await transporter.sendMail({
        from: process.env.NEXT_SMTP_FROM || `"iDigiSol Web" <Anton@idigisolweb.com>`,
        to: email,
        subject: 'Password Reset Request',
        html: `
          <p>Hello ${user.full_name || ''},</p>
          <p>You requested a password reset. Click the link below to reset your password:</p>
          <a href="${resetLink}">${resetLink}</a>
          <p>If you didn't request this, ignore this email.</p>
        `,
      })

      console.log('✅ Reset email sent')
    } else {
      console.log('⚠️ SMTP disabled — email skipped')
    }

    console.log('✅ Forgot password flow complete')
    return NextResponse.json({ success: true })

  } catch (err: any) {
    console.error('🔥 Forgot password error:', err)
    return NextResponse.json(
      { error: err.message || 'Failed to send reset link' },
      { status: 500 }
    )
  }
}
