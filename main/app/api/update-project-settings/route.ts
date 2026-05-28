// app/api/settings/update-project/route.ts

import 'server-only'
import { NextRequest, NextResponse } from 'next/server'
import fs                            from 'fs'
import path                          from 'path'
import { getConfiguredAdapter } from '@/app/lib/getConfiguredAdapter '

// ---------------------------------------------------------------------------
// Helpers — unchanged
// ---------------------------------------------------------------------------

function patchEnvFile(key: string, value: string) {
  const envPath = path.resolve(process.cwd(), '.env.local')
  let content   = fs.existsSync(envPath) ? fs.readFileSync(envPath, 'utf-8') : ''
  const line    = `${key}="${value}"`
  const regex   = new RegExp(`^${key}=.*$`, 'm')
  content       = regex.test(content) ? content.replace(regex, line) : content + `\n${line}`
  fs.writeFileSync(envPath, content, 'utf-8')
}

function patchConfigFile(projectName: string, projectUrl: string) {
  const filePath = path.resolve(process.cwd(), 'nxt_flutter.config.json')
  if (!fs.existsSync(filePath)) return
  const config       = JSON.parse(fs.readFileSync(filePath, 'utf-8'))
  config.projectName = projectName
  config.projectUrl  = projectUrl
  fs.writeFileSync(filePath, JSON.stringify(config, null, 2), 'utf-8')
}

// ---------------------------------------------------------------------------
// POST handler
// ---------------------------------------------------------------------------

export async function POST(req: NextRequest) {
  try {
    // ── Validate body ───────────────────────────────────────────────────────

    const { user_id, project_name, project_url, nxf_api_key } = await req.json()

    if (!user_id || !project_name) {
      return NextResponse.json(
        { error: 'user_id and project_name are required' },
        { status: 400 }
      )
    }

    // ── Resolve adapter ─────────────────────────────────────────────────────

    const adapter  = getConfiguredAdapter()
    const dbConfig = adapter.config

    if (!adapter.findSystemConfigByUserId || !adapter.update) {
      throw new Error(`${dbConfig.type} adapter does not implement required methods`)
    }

    // ── Look up existing system config ──────────────────────────────────────

    const existing = await adapter.findSystemConfigByUserId(dbConfig, user_id)

    if (!existing?.id) {
      return NextResponse.json(
        { error: 'System config record not found for this user' },
        { status: 404 }
      )
    }

    // ── Build update payload ────────────────────────────────────────────────
    // nxf_api_key only included if explicitly sent — undefined check preserves
    // ability to clear the key with an empty string if caller intends that

    const updatePayload: Record<string, any> = {
      project_name,
      project_url: project_url ?? '',
      updated_at:  new Date().toISOString(),
    }

    if (nxf_api_key !== undefined) {
      updatePayload.nxf_api_key = nxf_api_key
    }

    // ── Update database ─────────────────────────────────────────────────────

    await adapter.update(dbConfig, 'nxf_system_config', existing.id, updatePayload)

    // ── Patch local files ───────────────────────────────────────────────────

    if (project_url) patchEnvFile('NEXT_PUBLIC_APP_DOMAIN', project_url)
    if (nxf_api_key) patchEnvFile('NXF_API_KEY', nxf_api_key)
    patchConfigFile(project_name, project_url ?? '')

    return NextResponse.json({ success: true })

  } catch (err: any) {
    console.error('[update-project] Error:', err.message)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}