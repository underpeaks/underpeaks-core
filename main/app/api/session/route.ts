import { NextRequest, NextResponse } from 'next/server'
import mysql                         from 'mysql2/promise'
import { getConfiguredAdapter }      from '@/app/lib/getConfiguredAdapter '

export async function POST(req: NextRequest) {
  console.log('[Sessions API] Request received')

  try {
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

    const adapter  = getConfiguredAdapter()
    const dbConfig = adapter.config
    const dbType   = dbConfig.type

    console.log('[Sessions API] Using DB type:', dbType)

    // ── MySQL connection test ─────────────────────────────────────────────
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

    // ── Firebase ──────────────────────────────────────────────────────────
    if (dbType === 'firebase') {
      try {
        console.log('[Sessions API] Validating Firebase ID token...')

        const decoded = await adapter.validateBuiltInSession?.(dbConfig, token)

        if (!decoded) {
          console.warn('[Sessions API] Firebase token invalid')
          return NextResponse.json({ user: null, error: 'Invalid token' }, { status: 401 })
        }

        console.log('[Sessions API] Firebase token valid')

        const result = await adapter.getUserById?.(decoded.uid)

        if (!result?.user) {
          console.warn('[Sessions API] Firebase auth valid but no nxf_users record found')
          return NextResponse.json({ user: null, error: 'User profile not found' }, { status: 404 })
        }

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
            full_name:      result.user.full_name      ?? null,
            role:           result.user.role           ?? null,
            status:         result.user.status         ?? null,
            avatar_url:     result.user.avatar_url     ?? null,
            is_logged_in:   result.user.is_logged_in   ?? false,
            last_login:     result.user.last_login      ?? null,
            email_verified: result.user.email_verified ?? false,
            created_at:     result.user.created_at     ?? null,
          }
        })

      } catch (err: any) {
        console.error('[Sessions API] Firebase session error:', err)
        return NextResponse.json({ user: null, error: 'Firebase session failed' }, { status: 500 })
      }
    }

    // ── Supabase ──────────────────────────────────────────────────────────
    if (dbType === 'supabase') {
      const isJwt = token.split('.').length === 3
      let authUser: any = null

      if (isJwt) {
        authUser = await adapter.validateBuiltInSession?.(dbConfig, token)
        console.log('[Sessions API] Supabase built-in session validated')
      }

      if (!authUser && refreshToken) {
        try {
          console.log('[Sessions API] Attempting Supabase token refresh...')
          const { createClient } = await import('@supabase/supabase-js')
          const supabase = createClient(
            dbConfig.supabaseUrl!,
            dbConfig.anonKey ?? dbConfig.serviceRoleKey!
          )
          const { data, error } = await supabase.auth.refreshSession({
            refresh_token: refreshToken,
          })
          if (!error && data?.session) {
            authUser = data.session.user
            console.log('[Sessions API] Supabase token refresh successful')
          }
        } catch (e) {
          console.error('[Sessions API] Supabase refresh failed:', e)
        }
      }

      if (!authUser) {
        console.warn('[Sessions API] Supabase auth failed — no valid token or refresh')
        return NextResponse.json(
          { user: null, error: 'Invalid or expired session' },
          { status: 401 }
        )
      }

      try {
        const { createClient } = await import('@supabase/supabase-js')
        const supabase = createClient(
          dbConfig.supabaseUrl!,
          dbConfig.serviceRoleKey ?? dbConfig.anonKey!
        )

        const { data: nxfUser, error: profileError } = await supabase
          .from('nxf_users')
          .select('*')
          .eq('user_id', authUser.id)
          .single()

        if (profileError || !nxfUser) {
          console.error(
            '[Sessions API] nxf_users profile not found for id:',
            authUser.id,
            profileError?.message
          )
          return NextResponse.json(
            { user: null, error: 'User profile not found' },
            { status: 404 }
          )
        }

        return NextResponse.json({
          user: {
            uid:            authUser.id,
            user_id:        nxfUser.user_id,
            email:          authUser.email    ?? nxfUser.user_email,
            user_email:     nxfUser.user_email,
            full_name:      nxfUser.full_name      ?? null,
            role:           nxfUser.role           ?? null,
            status:         nxfUser.status         ?? null,
            avatar_url:     nxfUser.avatar_url     ?? null,
            is_logged_in:   nxfUser.is_logged_in   ?? false,
            last_login:     nxfUser.last_login      ?? null,
            created_at:     nxfUser.created_at     ?? null,
            email_verified: authUser.email_confirmed_at ? true : false,
          }
        })

      } catch (err: any) {
        console.error('[Sessions API] Failed to fetch nxf_users profile:', err.message)
        return NextResponse.json(
          { user: null, error: 'Failed to load user profile' },
          { status: 500 }
        )
      }
    }

    // ── Custom token flow (MongoDB / MySQL / PostgreSQL) ──────────────────

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

      } else if (new Date(storedToken.expires_at).getTime() < Date.now()) {
        console.log('[Sessions API] Access token expired, checking refresh token...')
        console.log('[Sessions API] expires_at raw value:', storedToken.expires_at)
        console.log('[Sessions API] expires_at parsed:', new Date(storedToken.expires_at))
        console.log('[Sessions API] now:', new Date())

        if (!refreshToken) {
          console.warn('[Sessions API] No refresh token provided by client — cannot extend session')
        } else if (adapter.findTokenByRefreshToken && adapter.extendToken) {
          const refresh = await adapter.findTokenByRefreshToken(refreshToken)

          if (!refresh) {
            console.warn('[Sessions API] Refresh token not found in DB')
          } else if (refresh.revoked) {
            console.warn('[Sessions API] Refresh token has been revoked')
          } else if (new Date(refresh.refresh_expires_at).getTime() <= Date.now()) {
            console.warn('[Sessions API] Refresh token expired — refresh_expires_at:', refresh.refresh_expires_at)
          } else {
            console.log('[Sessions API] Refresh token valid, extending access token')
            const newExpiry = new Date(Date.now() + 60 * 60 * 1000).toISOString()
            await adapter.extendToken(refresh.token_id, {
              expires_at: newExpiry,
              updated_at: new Date().toISOString(),
            })
            user = { user_id: refresh.user_id }
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

    // ── Fetch full user profile from nxf_users ────────────────────────────
    try {
      const allUsers = await adapter.readAll!(dbConfig, 'nxf_users')
      const fullUser = allUsers.find((u: any) => u.user_id === user.user_id)

      if (fullUser) {
        user = {
          user_id:        fullUser.user_id,
          user_email:     fullUser.user_email,
          email:          fullUser.user_email,
          full_name:      fullUser.full_name      ?? null,
          role:           fullUser.role           ?? null,
          status:         fullUser.status         ?? null,
          avatar_url:     fullUser.avatar_url     ?? null,
          is_logged_in:   fullUser.is_logged_in   ?? false,
          last_login:     fullUser.last_login      ?? null,
          created_at:     fullUser.created_at     ?? null,
          email_verified: fullUser.email_verified ?? false,
        }
      }
    } catch (err: any) {
      console.error('[Sessions API] Failed to fetch full user profile:', err.message)
    }

    console.log('[Sessions API] Session valid — returning user')
    return NextResponse.json({ user })

  } catch (err: any) {
    console.error('[Sessions API] Unhandled error:', err.message)
    return NextResponse.json({ user: null, error: err.message }, { status: 500 })
  }
}