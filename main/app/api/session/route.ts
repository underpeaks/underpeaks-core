// app/api/sessions/route.ts

import { NextRequest, NextResponse } from 'next/server'
import mysql                         from 'mysql2/promise'
import { Client as PgClient }        from 'pg'
import { getConfiguredAdapter } from '@/app/lib/getConfiguredAdapter '

export async function POST(req: NextRequest) {
  console.log('[Sessions API] Request received')

  try {
    // ── Parse body + token fallback ─────────────────────────────────────────

    const body = await req.json().catch(() => ({}))
    let { token, refreshToken } = body

    if (!token) {
      const authHeader = req.headers.get('Authorization')
      if (authHeader?.startsWith('Bearer ')) {
        token = authHeader.replace('Bearer ', '')
        console.log('[Sessions API] Token extracted from Authorization header')
      }
    }

    if (!token) {
      return NextResponse.json({ user: null, error: 'Token is required' }, { status: 401 })
    }

    // ── Resolve adapter ─────────────────────────────────────────────────────
    // getConfiguredAdapter reads NEXT_PUBLIC_DB_TYPE — the bug was NEXT_DB_TYPE
    // (missing PUBLIC) which returned undefined and caused the login loop.

    const adapter  = getConfiguredAdapter()
    const dbConfig = adapter.config
    const dbType   = dbConfig.type

    console.log('[Sessions API] Using DB type:', dbType)

    // ── MySQL connection test ───────────────────────────────────────────────
    // Kept from original — verifies DB is reachable before proceeding.

    if (dbType === 'mysql') {
      const conn: mysql.Connection = await Promise.race([
        mysql.createConnection({
          host:     dbConfig.host,
          port:     Number(dbConfig.port ?? 3306),
          user:     dbConfig.user,
          password: dbConfig.password,
          database: dbConfig.database,
        }),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('MySQL connection timeout')), 5000)
        ),
      ])
      await conn.end()
      console.log('[Sessions API] MySQL connection OK')
    }

    // ── PostgreSQL connection test ──────────────────────────────────────────

    if (dbType === 'postgres') {
      const client = new PgClient({
        host:     dbConfig.host,
        port:     Number(dbConfig.port ?? 5432),
        user:     dbConfig.user,
        password: dbConfig.password,
        database: dbConfig.database,
      })
      await Promise.race([
        client.connect(),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('Postgres connection timeout')), 5000)
        ),
      ])
      await client.end()
      console.log('[Sessions API] Postgres connection OK')
    }

    // ── Firebase ────────────────────────────────────────────────────────────

    if (dbType === 'firebase') {
      try {
        console.log('[Sessions API] Validating Firebase ID token...')

        const decoded = await adapter.validateBuiltInSession?.(dbConfig, token)

        if (!decoded) {
          console.warn('[Sessions API] Firebase token invalid')
          return NextResponse.json({ user: null, error: 'Invalid token' }, { status: 401 })
        }

        console.log('[Sessions API] Firebase token valid')

        // getUserById takes (uid) only — not (config, uid)
        const result = await adapter.getUserById?.(decoded.uid)

        if (!result?.user) {
          console.warn('[Sessions API] Firebase auth valid but no nxf_users record found')
          return NextResponse.json({ user: null, error: 'User profile not found' }, { status: 404 })
        }

        // CMS-level status check — suspended/disabled blocks even with valid token
        if (adapter.checkUserStatus) {
          const statusCheck = await adapter.checkUserStatus(dbConfig, decoded.uid)
          if (!statusCheck.allowed) {
            return NextResponse.json(
              { user: null, error: `Account ${statusCheck.reason}` },
              { status: 403 }
            )
          }
        }

        return NextResponse.json({
          user: {
            uid:            decoded.uid,
            email:          decoded.email ?? result.user.user_email,
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

      } catch (err: any) {
        console.error('[Sessions API] Firebase session error:', err)
        return NextResponse.json({ user: null, error: 'Firebase session failed' }, { status: 500 })
      }
    }

    // ── Supabase ────────────────────────────────────────────────────────────
    // Supabase needs a live client instance for session refresh.
    // getConfiguredAdapter only sets supabaseUrl + anonKey, so we create
    // the client here and inject it for the refresh call.

    if (dbType === 'supabase') {
      const isJwt = token.split('.').length === 3
      let user: any = null

      if (isJwt) {
        user = await adapter.validateBuiltInSession?.(dbConfig, token)
        console.log('[Sessions API] Supabase built-in session validated')
      }

      if (!user && refreshToken) {
        try {
          console.log('[Sessions API] Attempting Supabase token refresh...')
          const { createClient } = await import('@supabase/supabase-js')
          const supabase = createClient(
            dbConfig.supabaseUrl!,
            dbConfig.anonKey ?? dbConfig.supabaseKey!
          )
          const { data, error } = await supabase.auth.refreshSession({
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

      if (!user) {
        return NextResponse.json(
          { user: null, error: 'Invalid or expired session' },
          { status: 401 }
        )
      }

      return NextResponse.json({ user })
    }

    // ── Custom token flow (MongoDB / MySQL / PostgreSQL) ────────────────────
    // Tokens stored in the database token store.
    // Wrapped in a 3-second timeout to prevent hanging on slow DB connections.

    if (!adapter.findTokenByAccessToken) {
      throw new Error(`${dbType} adapter does not implement findTokenByAccessToken`)
    }

    let user: any = null

    try {
      const storedToken = await Promise.race([
        adapter.findTokenByAccessToken(token),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('DB query timeout')), 3000)
        ),
      ])

      if (!storedToken) {
        console.warn('[Sessions API] Token not found in DB')

      } else if (storedToken.revoked) {
        console.warn('[Sessions API] Token has been revoked')

      } else if (new Date(storedToken.expires_at) < new Date()) {
        console.log('[Sessions API] Access token expired, checking refresh token...')

        if (refreshToken && adapter.findTokenByRefreshToken && adapter.extendToken) {
          const refresh = await adapter.findTokenByRefreshToken(refreshToken)

          if (
            refresh &&
            !refresh.revoked &&
            new Date(refresh.refresh_expires_at) > new Date()
          ) {
            console.log('[Sessions API] Refresh token valid, extending access token')
            const newExpiry = new Date(Date.now() + 60 * 60 * 1000).toISOString()
            await adapter.extendToken(refresh.token_id, {
              expires_at: newExpiry,
              updated_at: new Date().toISOString(),
            })
            user = { user_id: refresh.user_id }
          } else {
            console.warn('[Sessions API] Refresh token invalid or expired')
          }
        }

      } else {
        user = { user_id: storedToken.user_id }
        console.log('[Sessions API] Access token valid')
      }

    } catch (err) {
      console.error('[Sessions API] Token query failed:', err)
    }

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
    console.error('[Sessions API] Unhandled error:', err.message)
    return NextResponse.json({ user: null, error: err.message }, { status: 500 })
  }
}