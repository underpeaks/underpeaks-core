/**
 * POST /api/sessions
 *
 * This is a Next.js API Route Handler that validates an authentication token
 * and returns the corresponding user object if the session is valid.
 *
 * It is database-agnostic: it reads the NEXT_DB_TYPE environment variable at
 * runtime and branches into the correct authentication flow for whichever
 * database the project is configured to use (Firebase, Supabase, MongoDB,
 * MySQL, or PostgreSQL).
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * Request shape (POST body — JSON):
 * {
 *   token:        string   // The access token to validate (required)
 *   refreshToken: string   // A refresh token used to extend an expired session
 *                          // (optional — only used by Supabase + custom DBs)
 * }
 *
 * Alternatively, the access token may be supplied via the HTTP
 * "Authorization: Bearer <token>" header if it is not present in the body.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * Response shape (JSON):
 *
 * Success (200):
 * { user: { uid, email, user_id, full_name, role, ... } }
 *
 * Failure (401 / 404 / 500):
 * { user: null, error: "<reason string>" }
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * Auth flows by database type:
 *
 * ┌──────────────┬───────────────────────────────────────────────────────────┐
 * │ DB type      │ How the token is validated                                │
 * ├──────────────┼───────────────────────────────────────────────────────────┤
 * │ firebase     │ Decodes the Firebase ID token via the adapter, then       │
 * │              │ fetches the full user profile from the nxf_users table.   │
 * ├──────────────┼───────────────────────────────────────────────────────────┤
 * │ supabase     │ Validates the JWT via the Supabase adapter. If the token  │
 * │              │ is expired and a refreshToken is provided, it attempts a  │
 * │              │ Supabase session refresh.                                 │
 * ├──────────────┼───────────────────────────────────────────────────────────┤
 * │ mongodb      │ Looks up the token in the database's token store. If      │
 * │ mysql        │ expired and a refreshToken is provided, extends the       │
 * │ postgres     │ access token's expiry by 1 hour.                         │
 * └──────────────┴───────────────────────────────────────────────────────────┘
 */

// app/api/sessions/route.ts

import { NextRequest, NextResponse }                            from 'next/server'
import { getAdapter }                                           from '@/app/db-adapter'
import type { DBType, DBConfig }                                from '@/app/db-adapter/types'
import mysql                                                    from 'mysql2/promise'
import { Client as PgClient }                                   from 'pg'
import { parseFirebaseServiceAccount, parseFirebaseWebConfig }  from '@/app/lib/firebaseConfig'

// ---------------------------------------------------------------------------
// Route Handler
// ---------------------------------------------------------------------------

export async function POST(req: NextRequest) {
  console.log('[Sessions API] Request received')

  try {
    // -----------------------------------------------------------------------
    // 1. Parse the request body
    // -----------------------------------------------------------------------

    /**
     * We use .catch(() => ({})) so that a malformed or empty body doesn't
     * crash the handler — it simply falls back to an empty object.
     * We then attempt to extract `token` and `refreshToken` from it.
     */
    const body = await req.json().catch(() => ({}))
    let { token, refreshToken } = body

    // -----------------------------------------------------------------------
    // 2. Token fallback — Authorization header
    // -----------------------------------------------------------------------

    /**
     * Some clients send the token in the "Authorization: Bearer <token>" header
     * rather than the JSON body. If no body token was found, we check the header.
     */
    if (!token) {
      const authHeader = req.headers.get('Authorization')
      if (authHeader?.startsWith('Bearer ')) {
        token = authHeader.replace('Bearer ', '')
        console.log('[Sessions API] Token extracted from Authorization header')
      }
    }

    /**
     * If we still have no token after checking both the body and the header,
     * we cannot proceed — return a 401 Unauthorized response immediately.
     */
    if (!token) {
      return NextResponse.json({ user: null, error: 'Token is required' }, { status: 401 })
    }

    // -----------------------------------------------------------------------
    // 3. Determine the database type
    // -----------------------------------------------------------------------

    /**
     * NEXT_DB_TYPE is a required environment variable that tells the adapter
     * which database driver and auth strategy to use.
     * Valid values: 'firebase' | 'supabase' | 'mongodb' | 'mysql' | 'postgres'
     */
    const dbType = process.env.NEXT_DB_TYPE as DBType
    if (!dbType) throw new Error('NEXT_DB_TYPE is not set')

    console.log('[Sessions API] Using DB type:', dbType)

    // -----------------------------------------------------------------------
    // 4. Build the database config object
    //    Each branch reads the relevant environment variables for that database
    //    and constructs a DBConfig object that the adapter understands.
    // -----------------------------------------------------------------------

    let dbConfig: DBConfig

    // ========================= FIREBASE =========================
    if (dbType === 'firebase') {
      /**
       * Firebase requires two things:
       * - A service account JSON (NEXT_DB_FIREBASE_SERVICE_ACCOUNT) used by the
       *   Firebase Admin SDK on the server to verify ID tokens.
       * - A public web config (NEXT_PUBLIC_FIREBASE_CONFIG) used to extract the
       *   storageBucket value for file operations.
       */
      const serviceAccount = process.env.NEXT_DB_FIREBASE_SERVICE_ACCOUNT
      const configAccount  = process.env.NEXT_PUBLIC_FIREBASE_CONFIG

      if (!serviceAccount) throw new Error('Firebase service account missing')

      const parsedAccount = parseFirebaseServiceAccount(serviceAccount)
      const parsedConfig = parseFirebaseWebConfig(configAccount) as { storageBucket?: string }
     
     if (!parsedConfig.storageBucket) {
       throw new Error('Missing storageBucket in Firebase web config')
     }
      dbConfig = {
        type:               dbType,
        firebaseConfigJson: JSON.stringify(parsedAccount),
        storageBucket:      process.env.NEXT_PUBLIC_FIREBASE_STORAGE_URL,
      }
      console.log('[Sessions API] Firebase config prepared')
    }

    // ========================= SUPABASE =========================
    else if (dbType === 'supabase') {
      /**
       * Supabase requires a project URL and a service key.
       * We also create a Supabase client here so the adapter can use it
       * directly for JWT validation and session refresh operations.
       */
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
      const anonKey     = process.env.NEXT_PUBLIC_SUPABASE_SERVICE_KEY!

      const { createClient } = await import('@supabase/supabase-js')
      const supabase = createClient(supabaseUrl, anonKey)

      dbConfig = {
        type: dbType,
        supabaseUrl,
        anonKey,
        client: supabase,
      }
      console.log('[Sessions API] Supabase config prepared')
    }

    // ========================= MONGODB ==========================
    else if (dbType === 'mongodb') {
      /**
       * MongoDB only needs a connection string and the target database name.
       * Token validation for MongoDB is done via a custom token store in the DB
       * (see the custom token auth section below).
       */
      dbConfig = {
        type:             dbType,
        connectionString: process.env.NEXT_DB_MONGO_URI!,
        database:         process.env.NEXT_DB_MONGO_DB_NAME!,
      }
      console.log('[Sessions API] MongoDB config prepared')
    }

    // ========================== MYSQL ===========================
    else if (dbType === 'mysql') {
      /**
       * MySQL requires host, port, database name, username, and password.
       * We also perform a quick test connection (with a 5-second timeout) to
       * verify the database is reachable before we try to use it. This gives
       * a cleaner error than a silent failure later in the flow.
       */
      const host     = process.env.NEXT_DB_MYSQL_HOST
      const port     = process.env.NEXT_DB_MYSQL_PORT ? Number(process.env.NEXT_DB_MYSQL_PORT) : 3306
      const database = process.env.NEXT_DB_MYSQL_DATABASE
      const user     = process.env.NEXT_DB_MYSQL_USER
      const password = process.env.NEXT_DB_MYSQL_PASSWORD

      if (!host || !database || !user || !password)
        throw new Error('MySQL environment variables missing')

      dbConfig = { type: 'mysql', host, port, database, user, password }

      // Test the connection — race against a 5-second timeout
      const conn: mysql.Connection = await Promise.race([
        mysql.createConnection({ host, port, user, password, database }),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('MySQL connection timeout')), 5000)
        ),
      ])
      await conn.end()
      console.log('[Sessions API] MySQL connection OK')
    }

    // ======================== POSTGRESQL ========================
    else if (dbType === 'postgres') {
      /**
       * PostgreSQL follows the same pattern as MySQL: read env vars, build the
       * config, and verify reachability with a test connection + timeout race.
       */
      const host     = process.env.NEXT_DB_POSTGRES_HOST
      const port     = process.env.NEXT_DB_POSTGRES_PORT ? Number(process.env.NEXT_DB_POSTGRES_PORT) : 5432
      const database = process.env.NEXT_DB_POSTGRES_DATABASE
      const user     = process.env.NEXT_DB_POSTGRES_USER
      const password = process.env.NEXT_DB_POSTGRES_PASSWORD

      if (!host || !database || !user || !password)
        throw new Error('Postgres environment variables missing')

      dbConfig = { type: 'postgres', host, port, database, user, password }

      // Test the connection — race against a 5-second timeout
      const client = new PgClient({ host, port, database, user, password })
      await Promise.race([
        client.connect(),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('Postgres connection timeout')), 5000)
        ),
      ])
      await client.end()
      console.log('[Sessions API] Postgres connection OK')
    }

    else {
      throw new Error(`Unsupported DB type: ${dbType}`)
    }

    // -----------------------------------------------------------------------
    // 5. Instantiate the database adapter
    // -----------------------------------------------------------------------

    /**
     * getAdapter returns a database-specific adapter object that exposes a
     * consistent interface (e.g. validateBuiltInSession, findTokenByAccessToken)
     * regardless of which database is being used. This is the "adapter pattern":
     * the code below doesn't need to know which DB it's talking to.
     */
    const adapter = getAdapter(dbType, dbConfig)
    console.log('[Sessions API] Adapter ready')

    let user: any = null

    // -----------------------------------------------------------------------
    // 6. Validate the token
    //    Two paths: built-in auth (Firebase / Supabase) or custom token auth
    //    (MongoDB / MySQL / PostgreSQL).
    // -----------------------------------------------------------------------

    // ============== BUILT-IN AUTH (Firebase / Supabase) ==============
    if (adapter.supportsBuiltInAuth) {
      console.log('[Sessions API] Using built-in auth')

      /**
       * A JWT (JSON Web Token) always has exactly 3 segments separated by dots.
       * We use this quick check to distinguish JWTs (Supabase) from opaque tokens
       * (non-JWT formats), since they require different validation strategies.
       */
      const isJwt = token.split('.').length === 3

      // ------------------- Firebase -------------------
      if (dbType === 'firebase') {
        /**
         * Firebase tokens are validated by the Firebase Admin SDK via the adapter.
         * On success, we also fetch the user's full profile from the nxf_users
         * table (our custom user store) and return a flat, predictable object.
         */
        try {
          console.log('[Sessions API] Validating Firebase ID token...')

          const decoded = await adapter.validateBuiltInSession?.(dbConfig, token)

          if (!decoded) {
            console.warn('[Sessions API] Firebase token invalid')
            return NextResponse.json({ user: null, error: 'Invalid token' }, { status: 401 })
          }

          console.log('[Sessions API] Firebase token valid')

          // Fetch the full user profile from our nxf_users table using the Firebase UID
          const result = await adapter.getUserById?.(decoded.uid)

          if (!result?.user) {
            console.warn('[Sessions API] Firebase auth valid but no nxf_users record found')
            return NextResponse.json({ user: null, error: 'User profile not found' }, { status: 404 })
          }

          /**
           * Return a clean, flat user object that the client can rely on.
           * We merge the Firebase auth identity (uid, email) with the full
           * nxf_users profile (role, status, avatar_url, etc.).
           */
          return NextResponse.json({
            user: {
              // Firebase auth identity
              uid:   decoded.uid,
              email: decoded.email ?? result.user.user_email,

              // Full nxf_users profile fields
              user_id:        result.user.user_id,
              user_email:     result.user.user_email,
              full_name:      result.user.full_name,
              role:           result.user.role,
              status:         result.user.status,
              avatar_url:     result.user.avatar_url     ?? null,
              email_verified: result.user.email_verified ?? false,
              created_at:     result.user.created_at     ?? null,
            }
          })
        } catch (err) {
          console.error('[Sessions API] Firebase session error:', err)
          return NextResponse.json({ user: null, error: 'Firebase session failed' }, { status: 500 })
        }
      }

      // ------------------- Supabase -------------------
      else if (dbType === 'supabase' && isJwt) {
        /**
         * Supabase JWTs are validated by the adapter's validateBuiltInSession method.
         * If the token is expired but a refreshToken was provided, we attempt a
         * session refresh via the Supabase client to get a new access token.
         */
        user = await adapter.validateBuiltInSession?.(dbConfig, token)
        console.log('[Sessions API] Supabase built-in session validated')

        if (!user && refreshToken) {
          try {
            console.log('[Sessions API] Attempting Supabase token refresh...')
            const { data, error } = await adapter.client.auth.refreshSession({
              refresh_token: refreshToken,
            })
            if (!error && data?.session) {
              user = data.session.user
              console.log('[Sessions API] Supabase token refresh successful')
            }
          } catch (e) {
            console.error('[Sessions API] Supabase refresh failed:', e)
          }
        }
      }
    }

    // ============== CUSTOM TOKEN AUTH (MongoDB / MySQL / PostgreSQL) ==============
    else {
      /**
       * For databases without a built-in auth system, we store tokens in a
       * dedicated token table/collection in the database.
       *
       * Flow:
       * 1. Look up the access token in the DB.
       * 2. If found and not revoked and not expired → session is valid.
       * 3. If expired and a refreshToken is provided → check the refresh token.
       *    If the refresh token is still valid, extend the access token by 1 hour.
       * 4. If anything is wrong (not found, revoked, refresh invalid) → reject.
       *
       * The entire lookup is wrapped in a 3-second timeout to prevent the
       * request from hanging indefinitely if the DB is slow.
       */
      console.log('[Sessions API] Using custom token auth')

      try {
        const storedToken = await Promise.race([
          adapter.findTokenByAccessToken?.(token) ?? Promise.resolve(null),
          new Promise<never>((_, reject) =>
            setTimeout(() => reject(new Error('DB query timeout')), 3000)
          ),
        ])

        if (!storedToken) {
          // Token does not exist in the database at all
          console.warn('[Sessions API] Token not found in DB')

        } else if (storedToken.revoked) {
          // Token was explicitly revoked (e.g. user logged out)
          console.warn('[Sessions API] Token has been revoked')

        } else if (new Date(storedToken.expires_at) < new Date()) {
          // Access token has expired — attempt a refresh if a refreshToken was sent
          console.log('[Sessions API] Access token expired, checking refresh token...')

          if (refreshToken) {
            const refresh = await adapter.findTokenByRefreshToken?.(refreshToken)

            if (
              refresh &&
              new Date(refresh.refresh_expires_at) > new Date() &&
              !refresh.revoked
            ) {
              /**
               * The refresh token is valid — extend the access token's expiry
               * by 1 hour (3600 seconds) from now and return the user.
               */
              console.log('[Sessions API] Refresh token valid, extending access token')
              const newExpiry = new Date(Date.now() + 60 * 60 * 1000).toISOString()
              await adapter.extendToken?.(refresh.token_id, {
                expires_at: newExpiry,
                updated_at: new Date().toISOString(),
              })
              user = { user_id: refresh.user_id }
            } else {
              console.warn('[Sessions API] Refresh token invalid or expired')
            }
          }
        } else {
          // Access token is valid — extract the user_id and continue
          user = { user_id: storedToken.user_id }
          console.log('[Sessions API] Access token valid')
        }
      } catch (err) {
        console.error('[Sessions API] Token query failed:', err)
      }
    }

    // -----------------------------------------------------------------------
    // 7. Final guard — return 401 if no valid user was resolved
    // -----------------------------------------------------------------------

    if (!user) {
      console.warn('[Sessions API] Session invalid or expired — rejecting request')
      return NextResponse.json(
        { user: null, error: 'Invalid or expired session' },
        { status: 401 }
      )
    }

    console.log('[Sessions API] Session valid — returning user')
    return NextResponse.json({ user })

  } catch (err: any) {
    console.error('[Sessions API] Unhandled error:', err)
    return NextResponse.json({ user: null, error: err.message }, { status: 500 })
  }
}