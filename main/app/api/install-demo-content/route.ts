// app/api/install-demo-content/route.ts

import { NextRequest, NextResponse } from 'next/server'
import { getTranslations }           from 'next-intl/server'
import { getAdapter }                from '@/app/db-adapter'

export async function POST(req: NextRequest): Promise<NextResponse> {
  //const t = await getTranslations('installDemoContentRoute')

  try {
    const { config, selectedProjectType } = await req.json()

    // ─── Validation ────────────────────────────────────────────────────────

    if (!config)              throw new Error(('errors.missingConfig'))
    if (!selectedProjectType) throw new Error(('errors.missingProjectType'))

    // ─── Resolve the database adapter ──────────────────────────────────────

    const adapter = getAdapter(config.type, config)

    // ─── Capability check ──────────────────────────────────────────────────

    if (!adapter.installDemoContent) {
      throw new Error(('errors.adapterNotSupported'))
    }

    // ─── Resolve admin email ───────────────────────────────────────────────

    /**
     * adminEmail is needed by installDemoContent to look up the user_id,
     * project_id, and tenant_id so demo records are inserted with the correct
     * ownership IDs.
     *
     * Resolution order:
     *   1. config.adminEmail        — set explicitly by the installer wizard
     *   2. config.user_email        — saved by saveInstallerConfig()
     *   3. nxf_system_config lookup — fall back to the persisted system config
     *      record if the email was not forwarded in the request body at all.
     */
    let adminEmail: string | undefined =
      config.adminEmail ??
      config.user_email ??
      undefined

    if (!adminEmail && config.user_id) {
      /**
       * Last-resort lookup: if neither email field is on the config object
       * but we do have a user_id, fetch the system config record which was
       * saved during the installer and pull user_email from there.
       */
      console.log('[install-demo-content] adminEmail missing — attempting lookup via user_id')

      try {
        const systemConfig = await adapter.findSystemConfigByUserId?.(config, config.user_id)
        if (systemConfig?.user_email) {
          adminEmail = systemConfig.user_email
          console.log('[install-demo-content] adminEmail resolved from nxf_system_config')
        }
      } catch {
        console.warn('[install-demo-content] nxf_system_config lookup failed — continuing without adminEmail')
      }
    }

    if (!adminEmail) {
      /**
       * Non-fatal: log a warning but do not abort. installDemoContent handles
       * the missing-email case gracefully by skipping ID injection and still
       * inserting the raw demo records.
       */
      console.warn('[install-demo-content] adminEmail could not be resolved — demo content will be inserted without ownership IDs')
    }

    // ─── Install demo content ──────────────────────────────────────────────

    const result = await adapter.installDemoContent(
      adapter.config,
      selectedProjectType,
      adminEmail,
    )

    return NextResponse.json({ success: true, result })

  } catch (err: any) {
    console.error(('logs.installDemoContentError'), err)

    return NextResponse.json(
      { success: false, message: err.message },
      { status: 500 },
    )
  }
}