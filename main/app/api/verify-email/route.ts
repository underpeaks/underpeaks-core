import { NextRequest, NextResponse } from 'next/server'
import { getAdapter } from '@/app/db-adapter'
import type { DBType, DBConfig, DBAdapter } from '@/app/db-adapter/types'

export async function GET(req: NextRequest) {
  console.log('📩 [VERIFY EMAIL API] Request received')
console.log("REACH 18")
  try {
    console.log("REACH 19")
    const { searchParams } = new URL(req.url)
console.log("REACH 20")
    const token = searchParams.get('token')
    const email = searchParams.get('email')
console.log("REACH 21")
    if (!token || !email) {
      console.log("REACH 22")
      return NextResponse.json(
        { error: 'Missing token or email' },
        { status: 400 }
      )
    }
console.log("REACH 23")
    const dbType = process.env.NEXT_PUBLIC_DB_TYPE
    if (!dbType) throw new Error('NEXT_PUBLIC_DB_TYPE not set')
console.log("REACH 24")
    let dbConfig: DBConfig

    // --------------------------- FIREBASE ---------------------------
    if (dbType === 'firebase') {
      const serviceAccount = JSON.parse(
        process.env.NEXT_DB_FIREBASE_SERVICE_ACCOUNT!
      )

      dbConfig = {
        type: 'firebase',
        firebaseConfigJson: JSON.stringify(serviceAccount),
        storageBucket: 'gs://' + serviceAccount.storageBucket,
      }
    }

    // --------------------------- SUPABASE ---------------------------
    else if (dbType === 'supabase') {
      dbConfig = {
        type: 'supabase',
        supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL!,
        anonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      }
    }

    // --------------------------- MONGODB ---------------------------
    else if (dbType === 'mongodb') {
      console.log("REACH 13")
      dbConfig = {
        type: 'mongodb',
        connectionString: process.env.NEXT_DB_MONGO_URI!,
        database: process.env.NEXT_DB_MONGO_DB_NAME!,
      }
      console.log("REACH 14")
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
    } else {
      throw new Error(`Unsupported DB type: ${dbType}`)
    }

    const adapter = getAdapter(dbType, dbConfig) as DBAdapter

    // ============================================================
    // ✅ GENERIC ADAPTER HANDLER (IF SUPPORTED)
    // ============================================================
console.log("REACH 15")
    if (adapter.verifyEmail) {
      const result = await adapter.verifyEmail(dbConfig, {
        token,
        email,
      })
console.log("REACH 16")
      return NextResponse.json({ success: true,})
    }

    // ============================================================
    // 🔁 FALLBACKS PER DATABASE
    // ============================================================

    // --------------------------- SQL (MySQL / Postgres) ---------------------------
    if (dbType === 'mysql' || dbType === 'postgres') {
      if (!adapter.findUserByToken || !adapter.updateUser) {
        throw new Error('SQL adapter missing required methods')
      }

      const user = await adapter.findUserByToken(token)

      if (!user) {
        return NextResponse.json({ error: 'Invalid token' }, { status: 400 })
      }

      if (user.token_ttl && new Date(user.token_ttl) < new Date()) {
        return NextResponse.json({ error: 'Token expired' }, { status: 400 })
      }

      await adapter.updateUser(dbConfig, user.id, {
        email_verified: true,
        token: null,
        token_ttl: null,
      })

      return NextResponse.json({ success: true })
    }

    // --------------------------- FIREBASE ---------------------------
    if (dbType === 'firebase') {
      if (!adapter.updateUser || !adapter.findUserByEmail) {
        throw new Error('Firebase adapter missing required methods')
      }

      const user = await adapter.findUserByEmail(dbConfig, email)

      if (!user) {
        return NextResponse.json({ error: 'User not found' }, { status: 400 })
      }

      await adapter.updateUser(dbConfig, user.id, {
        email_verified: true,
      })

      return NextResponse.json({ success: true })
    }

    // ============================================================
    // ❌ FINAL FALLBACK
    // ============================================================
console.log("REACH 17")
    return NextResponse.json(
      { error: 'Verification not supported for this adapter' },
      { status: 400 }
    )
  } catch (err: any) {
    console.error('🔥 VERIFY EMAIL ERROR:', err)

    return NextResponse.json(
      { error: err.message || 'Verification failed' },
      { status: 500 }
    )
  }
}