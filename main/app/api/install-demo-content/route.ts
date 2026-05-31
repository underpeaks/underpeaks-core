// app/api/install-demo-content/route.ts

/**
 * POST /api/install-demo-content
 *
 * Installer-only route. Seeds the database with demo content for the selected
 * project type.
 *
 * WHY THIS ROUTE RECEIVES CONFIG IN THE REQUEST BODY:
 * ─────────────────────────────────────────────────────
 * This is an installer route — it runs before the application is fully
 * configured and before environment variables are guaranteed to be set.
 * The installer wizard passes DB config explicitly in the request body.
 * This is the ONE legitimate exception to the rule that API routes must
 * use getConfiguredAdapter(). Do not change this pattern for installer routes.
 *
 * Request body:
 *   config              {DBConfig} — Full database connection config from the installer.
 *   selectedProjectType {string}   — The project template to seed (e.g. 'ecommerce').
 *
 * Responses:
 *   200 { success: true, result }           — Demo content installed successfully.
 *   400 { success: false, message: string } — Missing or invalid fields.
 *   500 { success: false, message: string } — Adapter error or install failure.
 */

import { NextRequest, NextResponse } from 'next/server'
import { getAdapter }                from '@/app/db-adapter'
import { DBType }                    from '@/app/db-adapter/types'

// Valid DB types — used to validate the client-supplied config.type
const VALID_DB_TYPES: DBType[] = ['firebase', 'supabase', 'mongodb', 'mysql', 'postgres']

export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    const { config, selectedProjectType } = await req.json()

    if (!config) {
      return NextResponse.json(
        { success: false, message: 'Database config is required' },
        { status: 400 }
      )
    }

    if (!selectedProjectType) {
      return NextResponse.json(
        { success: false, message: 'Selected project type is required' },
        { status: 400 }
      )
    }

    if (!VALID_DB_TYPES.includes(config.type)) {
      return NextResponse.json(
        { success: false, message: `Unsupported database type: ${config.type}` },
        { status: 400 }
      )
    }

    const adapter = getAdapter(config.type as DBType, config)

    if (!adapter.installDemoContent) {
      return NextResponse.json(
        { success: false, message: `Demo content installation is not supported for: ${config.type}` },
        { status: 400 }
      )
    }

    // ── Resolve adminEmail ──────────────────────────────────────────────────
    // Resolution order:
    //   1. config.adminEmail        — set explicitly by the installer wizard
    //   2. config.user_email        — saved by saveInstallerConfig()
    //   3. nxf_system_config lookup — fallback via user_id
    // Last-resort nxf_users lookup is handled inside installDemoContent itself

    let adminEmail: string | undefined =
      config.adminEmail ??
      config.user_email ??
      undefined

    if (!adminEmail && config.user_id) {
      console.log('[install-demo-content] attempting lookup via user_id')
      try {
        const systemConfig = await adapter.findSystemConfigByUserId?.(config, config.user_id)
        if (systemConfig?.user_email) {
          adminEmail = systemConfig.user_email
          console.log('[install-demo-content] adminEmail resolved from nxf_system_config:', adminEmail)
        }
      } catch {
        console.warn('[install-demo-content] nxf_system_config lookup failed')
      }
    }

    if (!adminEmail) {
      console.warn('[install-demo-content] adminEmail not resolved from config — installDemoContent will attempt its own lookup')
    }

    const result = await adapter.installDemoContent(
      config,
      selectedProjectType,
      adminEmail,
    )

    return NextResponse.json({ success: true, result })

  } catch (err: any) {
    console.error('[install-demo-content] Error:', err.message)
    return NextResponse.json(
      { success: false, message: err.message ?? 'An unexpected error occurred' },
      { status: 500 }
    )
  }
}