import { NextRequest, NextResponse } from 'next/server'
import { getAdapter } from '@/app/db-adapter'
import type { DBType, DBConfig } from '@/app/db-adapter/types'
import crypto from 'crypto'
import nodemailer from 'nodemailer'
import admin from 'firebase-admin'

export async function POST(req: NextRequest) {
  console.log('🆕 [SIGNUP API] Request received')

  try {
    const { full_name, email, password } = await req.json()
    if (!full_name || !email || !password)
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })

    const dbType = process.env.NEXT_PUBLIC_DB_TYPE as DBType
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
      console.log('🟠 Using Firebase adapter (API will skip email verification)')
    }

    // --------------------------- SUPABASE ---------------------------
    else if (dbType === 'supabase') {
    
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
      const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

    
 
 
      if (!supabaseUrl || !anonKey ) {
        throw new Error(
          'SupabaseAdapter requires supabaseUrl, anonKey, and serviceRoleKey in config'
        )
      }

      dbConfig = {
        type: 'supabase',
        supabaseUrl:supabaseUrl,
        anonKey:anonKey,
      }

      console.log('TYPE:: '+dbType);
      console.log('DBCONFIG URL:: '+dbConfig.supabaseUrl);
       console.log('DBCONFIG KEY:: '+dbConfig.anonKey);
      
       const supaadapter = getAdapter(dbType, dbConfig) // <-- call only once here
      console.log('🟢 Using Supabase adapter (server-side keys)')
      

      

      if (!supaadapter.registerSupabaseUser) {
        throw new Error('registerUserInSupabase not implemented in this adapter')
      }

      // 1️⃣ Check if email already exists in your users table
      const existingUser = await supaadapter.findUserByEmail!(dbConfig, email)
      if (existingUser) {
        return NextResponse.json({ error: 'Email already exists' }, { status: 400 })
      }

      // 2️⃣ Call Supabase signup function (server-side)
     try{
    const result = await supaadapter.registerSupabaseUser(dbConfig, {
        full_name,
        email,
        password,
      })

       console.log('✅ Supabase user created:', result)
      return NextResponse.json({ success: true, userId: result.id })
    }catch(e){
      console.log(e)
    }
      

     
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
        port: process.env.NEXT_DB_POSTGRES_PORT ? Number(process.env.NEXT_DB_POSTGRES_PORT) : 5432,
      }
      console.log('🟣 Using Postgres adapter')
    } else {
      throw new Error(`Unsupported DB type: ${dbType}`)
    }

    

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
      const adapter = getAdapter(dbType, dbConfig)
    if (!adapter.registerUser)
      return NextResponse.json({ error: 'Adapter does not support signup' }, { status: 400 })
      const existingUser = await adapter.findUserByEmail!(dbConfig, email)
      if (existingUser)
        return NextResponse.json({ error: 'Email already exists' }, { status: 400 })

      const emailToken = crypto.randomBytes(32).toString('hex')
      const emailTTL = new Date(Date.now() + 24 * 60 * 60 * 1000) // 24h

      const result = await adapter.registerUser(dbConfig, {
        full_name,
        email,
        password,
        token: emailToken,
        token_ttl: emailTTL.toISOString(),
      })

      const verifyUrl = `${process.env.NEXT_PUBLIC_APP_DOMAIN}/verify-email?token=${emailToken}&email=${encodeURIComponent(
        email
      )}`

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
  const adapter = getAdapter(dbType, dbConfig)

  if (!adapter.registerMongoUser)
    return NextResponse.json({ error: 'Adapter does not support signup' }, { status: 400 })

  const existingUser = await adapter.findUserByEmail!(dbConfig, email)
  if (existingUser)
    return NextResponse.json({ error: 'Email already exists' }, { status: 400 })

  // 1️⃣ Register user (this already creates token + ttl)
  const result = await adapter.registerMongoUser(dbConfig, {
    full_name,
    email,
    password,
    email_verified: false,
  })

  // 2️⃣ Build verification URL using token returned
  const verifyUrl = `${process.env.NEXT_PUBLIC_APP_DOMAIN}/verify-email?token=${result.token}&email=${encodeURIComponent(email)}`

  console.log('🔗 VERIFY URL:', verifyUrl)

  // 3️⃣ Send email
  await transporter.sendMail({
    from: smtpFromEmail,
    to: email,
    subject: 'Verify your email',
    html: `
      <p>Hi ${full_name},</p>
      <p>Click the link below to verify your email (expires in 24h):</p>
      <a href="${verifyUrl}">${verifyUrl}</a>
    `,
  })

  console.log('📧 Verification email sent to:', email)

  // 4️⃣ Return success
  return NextResponse.json({
    success: true,
    user_id: result.user_id,
  })
}

    // --------------------------- FIREBASE SIGNUP (API SKIPS EMAIL) ---------------------------
    if (dbType === 'firebase') {
      console.log('🔥 Firebase API branch: using Admin SDK for email verification')
const adapter = getAdapter(dbType, dbConfig)
    if (!adapter.registerUser)
      return NextResponse.json({ error: 'Adapter does not support signup' }, { status: 400 })
      // 1️⃣ Register user in Firebase Auth & Firestore
      const result = await adapter.registerUser(dbConfig, {
        full_name,
        email,
        password,
      })

      // 2️⃣ Generate email verification link using Admin SDK
      const link = await admin.auth().generateEmailVerificationLink(email, {
        url: `${process.env.NEXT_PUBLIC_APP_DOMAIN}/signin`,
      })

      // 3️⃣ Send the link via SMTP
      const transporter = nodemailer.createTransport({
        host: process.env.NEXT_SMTP_HOST,
        port: Number(process.env.NEXT_SMTP_PORT),
        secure: process.env.NEXT_SMTP_SECURE === 'true',
        auth: { user: process.env.NEXT_SMTP_USER, pass: process.env.NEXT_SMTP_PASS?.replace(/\\#/g, '#') },
      })

      await transporter.sendMail({
        from: process.env.NEXT_SMTP_FROM || 'Your App <no-reply@example.com>',
        to: email,
        subject: 'Verify your email',
        html: `<p>Hi ${full_name},</p>
               <p>Click below to verify your email:</p>
               <a href="${link}">${link}</a>`,
      })

      console.log('✅ Firebase verification email sent to:', email)

      return NextResponse.json({ success: true, userId: result.userId })
    }
  } catch (err: any) {
    console.error('🔥 SIGNUP ERROR:', err)
    return NextResponse.json({ error: err.message || 'Signup failed' }, { status: 500 })
  }
}