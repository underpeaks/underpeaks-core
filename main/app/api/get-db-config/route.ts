// app/api/get-db-config/route.ts

/**
 * GET /api/get-db-config
 *
 * Retrieves the system configuration record for a specific user from the database.
 *
 * What is "system config"?
 * ─────────────────────────
 * A per-user record stored in the database holding the runtime configuration
 * for that user's NXTFlutter project — branding, feature flags, active modules,
 * project metadata, etc. Loaded by ConsoleLayout on every session refresh.
 *
 * Query parameters:
 *   user_id {string} — The ID of the user whose system config to fetch. Required.
 *
 * Responses:
 *   200 { config: object | null } — Config found and returned, or null if none exists yet.
 *   400 { config: null }          — user_id query parameter is missing.
 *   500 { config: null }          — Unexpected server error.
 */

import { getConfiguredAdapter } from '@/app/lib/getConfiguredAdapter '
import { NextRequest, NextResponse }  from 'next/server'

export async function GET(req: NextRequest): Promise<NextResponse> {
  try {
    // -----------------------------------------------------------------------
    // Validate query parameters
    // -----------------------------------------------------------------------

    const userId = req.nextUrl.searchParams.get('user_id')

    if (!userId) {
      return NextResponse.json({ config: null }, { status: 400 })
    }

    // -----------------------------------------------------------------------
    // Resolve adapter — reads all env vars and builds DBConfig internally
    // -----------------------------------------------------------------------

    const adapter  = getConfiguredAdapter()
    const dbConfig = adapter.config

    if (!adapter.findSystemConfigByUserId) {
      throw new Error(`${dbConfig.type} adapter does not implement findSystemConfigByUserId`)
    }

    // -----------------------------------------------------------------------
    // Fetch and return the system config
    // -----------------------------------------------------------------------

    const config = await adapter.findSystemConfigByUserId(dbConfig, userId)

    // Normalise undefined → null so the response is always { config: object | null }
    return NextResponse.json({ config: config ?? null })

  } catch (err: any) {
    console.error('[get-db-config] Error:', err.message)
    return NextResponse.json({ config: null }, { status: 500 })
  }
}