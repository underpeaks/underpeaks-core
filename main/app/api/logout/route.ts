// app/api/logout/route.ts

/**
 * POST /api/logout
 *
 * Logs out the current user by invalidating their session.
 *
 * Logout flow by database type:
 * ──────────────────────────────
 * Firebase / Supabase (built-in auth)
 *   The server has no client session to invalidate — the client SDK holds it.
 *   This route writes the logout activity log entry and returns success.
 *   The CLIENT must call signOut() (Firebase) or supabase.auth.signOut()
 *   (Supabase) using its own SDK after this endpoint returns.
 *
 * MongoDB / MySQL / PostgreSQL (custom token flow)
 *   1. Reads the access token from the request body or Authorization header.
 *   2. Looks up the token record in the database.
 *   3. Marks it as revoked — future requests with this token will be rejected.
 *      The record is kept (not deleted) to preserve the audit trail.
 *
 * Request body:
 *   token   {string} — Access token to invalidate. Also accepted via
 *                      Authorization: Bearer header. Required for custom
 *                      token flow; optional for built-in auth.
 *   user_id {string} — The user's ID. Used to write the activity log entry.
 *
 * Responses:
 *   200 { success: true,  message }  — Logged out successfully.
 *   401 { success: false, error }    — No token provided (custom token flow only).
 *   404 { success: false, error }    — Token not found (custom token flow only).
 *   500 { success: false, error }    — Unexpected server error.
 */

import { getConfiguredAdapter } from '@/app/lib/getConfiguredAdapter'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    // -----------------------------------------------------------------------
    // Parse request body
    // -----------------------------------------------------------------------

    const body = await req.json().catch(() => ({}))
    const { user_id } = body
    let   { token }   = body

    // Token fallback — read from Authorization header if not in body
    if (!token) {
      const authHeader = req.headers.get('Authorization')
      if (authHeader?.startsWith('Bearer ')) {
        token = authHeader.replace('Bearer ', '')
      }
    }

    // -----------------------------------------------------------------------
    // Resolve adapter
    // -----------------------------------------------------------------------

    const adapter  = getConfiguredAdapter()
    const dbConfig = adapter.config
    const dbType   = dbConfig.type

    // -----------------------------------------------------------------------
    // Built-in auth (Firebase / Supabase)
    // The server cannot invalidate a client-side session — the client must
    // call signOut() itself after this endpoint returns success.
    // We write the activity log entry and return.
    // -----------------------------------------------------------------------

    if (adapter.supportsBuiltInAuth) {
      if (user_id && adapter.writeActivityLog) {
        await adapter.writeActivityLog(dbConfig, {
          user_id,
          action:  'user_logout',
          context: { db_type: dbType },
        })
      }

      return NextResponse.json({
        success: true,
        message: 'Logged out successfully',
      })
    }

    // -----------------------------------------------------------------------
    // Custom token flow (MongoDB / MySQL / PostgreSQL)
    // Token must be present — it identifies which session to revoke
    // -----------------------------------------------------------------------

    if (!token) {
      return NextResponse.json(
        { success: false, error: 'No token provided' },
        { status: 401 }
      )
    }

    if (!adapter.findTokenByAccessToken || !adapter.extendToken) {
      throw new Error(`${dbType} adapter does not implement token management methods`)
    }

    const storedToken = await adapter.findTokenByAccessToken(token)

    if (!storedToken) {
      return NextResponse.json(
        { success: false, error: 'Token not found' },
        { status: 404 }
      )
    }

    // Mark as revoked — keeps the record for audit trail, rejects future use
    await adapter.extendToken(storedToken.token_id, {
      revoked:    true,
      updated_at: new Date().toISOString(),
    })

    // Write activity log for custom token flow too
    if (user_id && adapter.writeActivityLog) {
      await adapter.writeActivityLog(dbConfig, {
        user_id,
        action:  'user_logout',
        context: { db_type: dbType },
      })
    }

    return NextResponse.json({
      success: true,
      message: 'Logged out successfully',
    })

  } catch (err: any) {
    console.error('[logout] Error:', err.message)
    return NextResponse.json(
      { success: false, error: err.message ?? 'An unexpected error occurred' },
      { status: 500 }
    )
  }
}