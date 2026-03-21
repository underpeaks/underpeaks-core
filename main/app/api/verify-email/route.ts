import { NextRequest, NextResponse } from 'next/server'
import { getAdapter } from '@/app/db-adapter'
import type { DBType, DBConfig } from '@/app/db-adapter/types'

export async function GET(req: NextRequest) {
  console.log('📩 [VERIFY EMAIL API] Request received')

  try {
    const { searchParams } = new URL(req.url)
    const token = searchParams.get('token')
    const email = searchParams.get('email')

    if (!token && !email) {
      return NextResponse.json({ error: 'Missing token or email' }, { status: 400 })
    }

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
        port: process.env.NEXT_DB_MYSQL_PORT ? Number(process.env.NEXT_DB_MYSQL_PORT) : 3306,
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
        port: process.env.NEXT_DB_POSTGRES_PORT ? Number(process.env.NEXT_DB_POSTGRES_PORT) : 5432,
      }
    } else {
      throw new Error(`Unsupported DB type: ${dbType}`)
    }

    const adapter = getAdapter(dbType, dbConfig)

    // ============================================================
    // ✅ NEW GENERIC VERIFICATION HANDLER (NON-DESTRUCTIVE)
    // ============================================================

    // 1️⃣ Preferred: unified adapter method
    if (adapter.verifyEmail) {
      const result = await adapter.verifyEmail(dbConfig, {
        token,
        email,
      })

      return NextResponse.json({ success: true, ...result })
    }

    // ============================================================
    // 🔁 FALLBACKS PER DB (ONLY IF verifyEmail NOT IMPLEMENTED)
    // ============================================================

    // --------------------------- SQL (MySQL / Postgres) ---------------------------
    if (dbType === 'mysql' || dbType === 'postgres') {
      if (!adapter.findUserByToken || !adapter.updateUser) {
        throw new Error('SQL adapter missing required methods')
      }

      const user = await adapter.findUserByToken( token!)

      if (!user) {
        return NextResponse.json({ error: 'Invalid token' }, { status: 400 })
      }

      if (new Date(user.token_ttl) < new Date()) {
        return NextResponse.json({ error: 'Token expired' }, { status: 400 })
      }

      await adapter.updateUser(dbConfig, user.id, {
        email_verified: true,
        token: null,
        token_ttl: null,
      })

      return NextResponse.json({ success: true })
    }

    // --------------------------- MongoDB ---------------------------
    if (dbType === 'mongodb') {
      if (!adapter.verifyMongoEmail) {
        throw new Error('Mongo adapter missing verifyMongoEmail')
      }

      const result = await adapter.verifyMongoEmail(dbConfig, token!)
      return NextResponse.json({ success: true, ...result })
    }

    // --------------------------- Firebase ---------------------------
    if (dbType === 'firebase') {
      // Firebase already verifies via link itself
      // Here we just mark DB as verified

      if (!adapter.updateUser || !email) {
        throw new Error('Firebase adapter missing updateUser or email')
      }

      const user = await adapter.findUserByEmail!(dbConfig, email)

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