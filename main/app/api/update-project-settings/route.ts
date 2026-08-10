//app/api/update-project-settings/route.ts
import 'server-only'
import { NextRequest, NextResponse } from 'next/server'
import fs                            from 'fs'
import path                          from 'path'
import { getConfiguredAdapter }      from '@/app/lib/getConfiguredAdapter'

function patchEnvFile(key: string, value: string) {
  const envPath = path.resolve(process.cwd(), '.env.local')
  let content   = fs.existsSync(envPath) ? fs.readFileSync(envPath, 'utf-8') : ''
  const line    = `${key}="${value}"`
  const regex   = new RegExp(`^${key}=.*$`, 'm')
  content       = regex.test(content) ? content.replace(regex, line) : content + `\n${line}`
  fs.writeFileSync(envPath, content, 'utf-8')
}

function patchConfigFile(projectName: string) {
  const filePath = path.resolve(process.cwd(), 'underpeaks.config.json')
  if (!fs.existsSync(filePath)) return
  const config       = JSON.parse(fs.readFileSync(filePath, 'utf-8'))
  config.projectName = projectName
  fs.writeFileSync(filePath, JSON.stringify(config, null, 2), 'utf-8')
}

export async function POST(req: NextRequest) {
  try {
    const { user_id, project_name, project_url, nxf_api_key } = await req.json()

    if (!user_id || !project_name) {
      return NextResponse.json(
        { error: 'user_id and project_name are required' },
        { status: 400 }
      )
    }

    const adapter  = getConfiguredAdapter()
    const dbConfig = adapter.config

    const now = new Date().toISOString()

    // FIX: nxf_system_config has no project_url column — dropped from the
    // payload entirely (was causing every save to fail). nxf_api_key maps
    // to the real column hosted_api_key.
    const updatePayload: Record<string, any> = {
      project_name,
      updated_at:  now,
    }

    if (nxf_api_key !== undefined) {
      updatePayload.hosted_api_key = nxf_api_key
    }

    const existing = await adapter.findSystemConfigByUserId?.(dbConfig, user_id)
    const recordId = existing?.config_id ?? null

    if (recordId) {
      await adapter.update!(dbConfig, 'nxf_system_config', recordId, updatePayload, 'config_id')
    } else {
      await adapter.create!(dbConfig, 'nxf_system_config', {
        ...updatePayload,
        user_id,
        created_at: now,
      })
    }

    // project_url only patched into local files — not stored in DB.
    if (project_url) patchEnvFile('NEXT_PUBLIC_APP_DOMAIN', project_url)
    if (nxf_api_key) patchEnvFile('NXF_LICENSE_KEY', nxf_api_key)
    patchConfigFile(project_name)

    return NextResponse.json({ success: true })

  } catch (err: any) {
    console.error('[update-project] Error:', err.message)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}