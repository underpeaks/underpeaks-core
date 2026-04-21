// app/api/sessions/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getAdapter } from '@/app/db-adapter'
import type { DBType, DBConfig } from '@/app/db-adapter/types'
import mysql from 'mysql2/promise'
import { Client as PgClient } from 'pg'
import { parseFirebaseServiceAccount, parseFirebaseWebConfig } from '@/app/lib/firebaseConfig'

export async function POST(req: NextRequest) {
  console.log('🔐 [SESSIONS API] Request received')

  try {
    const body = await req.json().catch(() => ({}))
    let { token, refreshToken } = body
    console.log('Request body:', body)

    // fallback: Authorization header
    if (!token) {
      const authHeader = req.headers.get('Authorization')
      if (authHeader?.startsWith('Bearer ')) {
        token = authHeader.replace('Bearer ', '')
        console.log('Token extracted from Authorization header')
      }
    }

    console.log('Received token:', token)
    if (!token) {
      return NextResponse.json({ user: null, error: 'Token is required' }, { status: 401 })
    }

    const dbType = process.env.NEXT_DB_TYPE as DBType
    console.log('Using DB type:', dbType)
    if (!dbType) throw new Error('NEXT_DB_TYPE is not set')

    let dbConfig: DBConfig

    // ======================= FIREBASE =======================
    if (dbType === 'firebase') {
      const serviceAccount = process.env.NEXT_DB_FIREBASE_SERVICE_ACCOUNT
      const configAccount = process.env.NEXT_PUBLIC_FIREBASE_CONFIG
      if (!serviceAccount) throw new Error('Firebase service account missing')
      const parsedAccount =  parseFirebaseServiceAccount(serviceAccount); //JSON.parse(serviceAccount)
      const parsedConfig = parseFirebaseWebConfig(configAccount);
      dbConfig = {
        type: dbType,
        firebaseConfigJson: JSON.stringify(parsedAccount),
        storageBucket: 'gs://' + parsedConfig.storageBucket,
      }
      console.log('Firebase config prepared')
    }

    // ======================= SUPABASE =======================
    else if (dbType === 'supabase') {
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
      const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

      const { createClient } = await import('@supabase/supabase-js')
      const supabase = createClient(supabaseUrl, anonKey)

      dbConfig = {
        type: dbType,
        supabaseUrl,
        anonKey,
        client: supabase,
      }

      console.log('Supabase config prepared')
    }

    // ======================= MONGODB =======================
    else if (dbType === 'mongodb') {
      dbConfig = {
        type: dbType,
        connectionString: process.env.NEXT_DB_MONGO_URI!,
        database: process.env.NEXT_DB_MONGO_DB_NAME!,
      }
      console.log('MongoDB config prepared')
    }

    // ======================= MYSQL =======================
    else if (dbType === 'mysql') {
      const host = process.env.NEXT_DB_MYSQL_HOST
      const port = process.env.NEXT_DB_MYSQL_PORT ? Number(process.env.NEXT_DB_MYSQL_PORT) : 3306
      const database = process.env.NEXT_DB_MYSQL_DATABASE
      const user = process.env.NEXT_DB_MYSQL_USER
      const password = process.env.NEXT_DB_MYSQL_PASSWORD

      if (!host || !database || !user || !password)
        throw new Error('MySQL environment variables missing')

      dbConfig = { type: 'mysql', host, port, database, user, password }

      // Test connection with 5s timeout
      const conn: mysql.Connection = await Promise.race([
        mysql.createConnection({ host, port, user, password, database }),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('MySQL connection timeout')), 5000)
        ),
      ])
      await conn.end()
      console.log('MySQL connection OK')
    }

    // ======================= POSTGRESQL =======================
    else if (dbType === 'postgres') {
      const host = process.env.NEXT_DB_POSTGRES_HOST
      const port = process.env.NEXT_DB_POSTGRES_PORT ? Number(process.env.NEXT_DB_POSTGRES_PORT) : 5432
      const database = process.env.NEXT_DB_POSTGRES_DATABASE
      const user = process.env.NEXT_DB_POSTGRES_USER
      const password = process.env.NEXT_DB_POSTGRES_PASSWORD

      if (!host || !database || !user || !password)
        throw new Error('Postgres environment variables missing')

      dbConfig = { type: 'postgres', host, port, database, user, password }

      // Test connection with 5s timeout
      const client = new PgClient({ host, port, database, user, password })
      await Promise.race([
        client.connect(),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('Postgres connection timeout')), 5000)
        ),
      ])
      await client.end()
      console.log('Postgres connection OK')
    }

    else {
      throw new Error(`Unsupported DB type: ${dbType}`)
    }

    const adapter = getAdapter(dbType, dbConfig)
    console.log('🚀 Adapter ready')

    let user: any = null

    // ================= BUILT-IN AUTH (Firebase/Supabase) =================
    if (adapter.supportsBuiltInAuth) {
      console.log('Using built-in auth')

      // Only attempt Supabase JWT validation if token looks like a JWT (3 segments)
      const isJwt = token.split('.').length === 3

    // ================= BUILT-IN AUTH (Firebase/Supabase) =================
if (adapter.supportsBuiltInAuth) {
  console.log('Using built-in auth')

  const isJwt = token.split('.').length === 3

  // ✅ FIREBASE FIX
  if (dbType === 'firebase') {
    try {
      console.log('🔥 Validating Firebase ID token...')
      
      const decoded = await adapter.validateBuiltInSession?.(dbConfig, token)

      if (!decoded) {
        console.warn('❌ Firebase token invalid')
      } else {
        console.log('✅ Firebase token valid:', decoded.uid)

        // OPTIONAL: attach full user from DB if needed
        const userDoc = await adapter.getUserById?.(decoded.uid)

        user = userDoc || { uid: decoded.uid }
      }
    } catch (err) {
      console.error('❌ Firebase validation error:', err)
    }
  }

  // ================= SUPABASE (UNCHANGED) =================
  else if (dbType === 'supabase' && isJwt) {
    user = await adapter.validateBuiltInSession?.(dbConfig, token)
    console.log('Built-in session validation result:', user)

    if (!user && refreshToken) {
      try {
        console.log('Attempting Supabase refresh via adapter...')
        const { data, error } = await adapter.client.auth.refreshSession({
          refresh_token: refreshToken,
        })
        if (!error && data?.session) {
          user = data.session.user
          console.log('Supabase refresh success, user:', user)
        }
      } catch (e) {
        console.error('Supabase refresh exception:', e)
      }
    }
  }

}
    }

    // ================= CUSTOM TOKEN AUTH (Mongo/MySQL/Postgres) =================
    else {
      console.log('Using custom token auth')
      try {
        const storedToken = await Promise.race([
          adapter.findTokenByAccessToken?.(token) ?? Promise.resolve(null),
          new Promise<never>((_, reject) =>
            setTimeout(() => reject(new Error('DB query timeout')), 3000)
          ),
        ])
        console.log('Stored token lookup result:', storedToken)

        if (!storedToken) {
          console.warn('❌ Token not found in DB')
        } else if (storedToken.revoked) {
          console.warn('❌ Token revoked')
        } else if (new Date(storedToken.expires_at) < new Date()) {
          console.log('⏰ Access token expired')

          if (refreshToken) {
            const refresh = await adapter.findTokenByRefreshToken?.(refreshToken)
            if (refresh && new Date(refresh.refresh_expires_at) > new Date() && !refresh.revoked) {
              console.log('Refresh token valid, extending access token')
              const newExpiry = new Date(Date.now() + 60 * 60 * 1000).toISOString()
              await adapter.extendToken?.(refresh.token_id, {
                expires_at: newExpiry,
                updated_at: new Date().toISOString(),
              })
              user = { user_id: refresh.user_id }
            } else {
              console.warn('❌ Refresh token invalid or expired')
            }
          }
        } else {
          user = { user_id: storedToken.user_id }
          console.log('✅ Access token valid, user:', user)
        }
      } catch (err) {
        console.error('❌ Token query failed:', err)
      }
    }

    if (!user) {
      console.warn('❌ Session invalid or expired')
      return NextResponse.json(
        { user: null, error: 'Invalid or expired session' },
        { status: 401 }
      )
    }

    console.log('✅ Session valid:', user)
    return NextResponse.json({ user })
  } catch (err: any) {
    console.error('🔥 SESSION API ERROR:', err)
    return NextResponse.json({ user: null, error: err.message }, { status: 500 })
  }
}
