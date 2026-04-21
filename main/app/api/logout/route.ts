// /app/api/logout/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getAdapter } from '@/app/db-adapter'
import type { DBType, DBConfig } from '@/app/db-adapter/types'
import mysql from 'mysql2/promise'
import { Client as PgClient } from 'pg'
import { parseFirebaseServiceAccount, parseFirebaseWebConfig } from '@/app/lib/firebaseConfig'

export async function POST(req: NextRequest) {
  console.log('🔐 [LOGOUT API] Request received')

  try {
    const body = await req.json().catch(() => ({}))
    let { token, refreshToken } = body
    console.log('🚪 Body:', { token, refreshToken })

    // fallback: Authorization header
    if (!token) {
      const authHeader = req.headers.get('Authorization')
      if (authHeader?.startsWith('Bearer ')) {
        token = authHeader.replace('Bearer ', '')
      }
    }

    console.log('🚪 Token:', token)
    if (!token) {
      return NextResponse.json({ success: false, error: 'Token is required' }, { status: 401 })
    }

    const dbType = process.env.NEXT_DB_TYPE as DBType
    console.log('🚪 DB Type:', dbType)
    if (!dbType) throw new Error('NEXT_DB_TYPE is not set')

    let dbConfig: DBConfig

    // ======================= FIREBASE =======================
    if (dbType === 'firebase') {
      console.log('🚪 Preparing Firebase config')
      const serviceAccount = process.env.NEXT_DB_FIREBASE_SERVICE_ACCOUNT
      const configAccount = process.env.NEXT_PUBLIC_FIREBASE_CONFIG
      if (!serviceAccount) throw new Error('Firebase service account missing')
      const parsedAccount =  parseFirebaseServiceAccount(serviceAccount) //JSON.parse(serviceAccount)
    const parsedconfig = parseFirebaseWebConfig(configAccount);

      dbConfig = {
        type: 'firebase',
        firebaseConfigJson: JSON.stringify(parsedAccount),
        storageBucket: 'gs://' + parsedconfig.storageBucket,
      }

    // ======================= SUPABASE =======================
    } else if (dbType === 'supabase') {
      dbConfig = {
        type: 'supabase',
        supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL!,
        supabaseKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      }

    // ======================= MONGODB =======================
    } else if (dbType === 'mongodb') {
      dbConfig = {
        type: 'mongodb',
        connectionString: process.env.NEXT_DB_MONGO_URI!,
        database: process.env.NEXT_DB_MONGO_DB_NAME!,
      }

    // ======================= MYSQL =======================
    } else if (dbType === 'mysql') {
      console.log('🚪 Preparing MySQL config')
      const host = process.env.NEXT_DB_MYSQL_HOST
      const port = process.env.NEXT_DB_MYSQL_PORT ? Number(process.env.NEXT_DB_MYSQL_PORT) : 3306
      const database = process.env.NEXT_DB_MYSQL_DATABASE
      const user = process.env.NEXT_DB_MYSQL_USER
      const password = process.env.NEXT_DB_MYSQL_PASSWORD

      if (!host || !database || !user || !password) {
        throw new Error('MySQL environment variables missing')
      }

      dbConfig = { type: 'mysql', host, port, database, user, password }

      // test connection
      const conn = await mysql.createConnection({ host, port, user, password, database })
      await conn.end()
      console.log('🚪 MySQL connection OK')

    // ======================= POSTGRES =======================
    } else if (dbType === 'postgres') {
      console.log('🚪 Preparing Postgres config')
      const host = process.env.NEXT_DB_POSTGRES_HOST
      const port = process.env.NEXT_DB_POSTGRES_PORT ? Number(process.env.NEXT_DB_POSTGRES_PORT) : 5432
      const database = process.env.NEXT_DB_POSTGRES_DATABASE
      const user = process.env.NEXT_DB_POSTGRES_USER
      const password = process.env.NEXT_DB_POSTGRES_PASSWORD

      if (!host || !database || !user || !password) {
        throw new Error('Postgres environment variables missing')
      }

      dbConfig = { type: 'postgres', host, port, database, user, password }

      console.log('🚪 Testing Postgres connection...')
      const client = new PgClient({ host, port, database, user, password })
      await client.connect()
      await client.end()
      console.log('🚪 Postgres connection OK')

    } else {
      throw new Error(`Unsupported DB type: ${dbType}`)
    }

    console.log('🚪 Creating adapter...')
    const adapter = getAdapter(dbType, dbConfig)
    console.log('🚪 Adapter ready')

    // ======================= BUILT-IN AUTH =======================
    if (adapter.supportsBuiltInAuth) {
      console.log('🚪 Using built-in auth logout flow')
      if (dbType === 'firebase') {
        const { getApps, initializeApp } = await import('firebase/app')
        const { getAuth, signOut } = await import('firebase/auth')
        const firebaseConfig =  parseFirebaseWebConfig(process.env.NEXT_PUBLIC_FIREBASE_CONFIG!)  //JSON.parse(process.env.NEXT_PUBLIC_FIREBASE_CONFIG!)
        const app = getApps().length ? getApps()[0] : initializeApp(firebaseConfig)
        const auth = getAuth(app)
        await signOut(auth)
      } else if (dbType === 'supabase') {
        await adapter.client.auth.signOut()
      }

    // ======================= CUSTOM TOKEN LOGOUT =======================
    } else {
      console.log('🚪 Custom token logout flow')
      console.log('🚪 Looking up token...')
      const storedToken = await adapter.findTokenByAccessToken?.(token)
      console.log('🚪 Token lookup result:', storedToken)

      if (!storedToken) {
        return NextResponse.json({ success: false, error: 'Token not found' }, { status: 404 })
      }

      console.log('🚪 Revoking token id:', storedToken.token_id)
      await adapter.extendToken?.(storedToken.token_id, {
        revoked: true,
        updated_at: new Date().toISOString(),
      })
      console.log('🚪 Token revoked')
    }

    return NextResponse.json({ success: true, message: 'Logged out successfully' })

  } catch (err: any) {
    console.error('🔥 LOGOUT API ERROR:', err)
    return NextResponse.json({ success: false, error: err.message }, { status: 500 })
  }
}
