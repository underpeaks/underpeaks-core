//app/api/update-project-settings/route.ts
import 'server-only'
import { NextRequest, NextResponse } from 'next/server'
import fs                            from 'fs'
import path                          from 'path'
import { getConfiguredAdapter }      from '@/app/lib/getConfiguredAdapter'
import { requireAdmin }              from '@/app/lib/requireAdmin'
import { patchEnvFile }              from '@/app/lib/envFile'

function patchConfigFile(projectName: string) {
  const filePath = path.resolve(process.cwd(), 'underpeaks.config.json')
  if (!fs.existsSync(filePath)) return
  const config       = JSON.parse(fs.readFileSync(filePath, 'utf-8'))
  config.projectName = projectName
  fs.writeFileSync(filePath, JSON.stringify(config, null, 2), 'utf-8')
}

export async function POST(req: NextRequest) {
  try {
    // Admin only; the caller comes from the Bearer token, not the body.
    const auth = await requireAdmin(req)
    if (!auth.ok) return auth.response
    const user_id = auth.userId

    const { project_name, project_url, nxf_api_key } = await req.json()

    if (typeof project_name !== 'string' || !project_name.trim() || project_name.length > 200) {
      return NextResponse.json(
        { error: 'project_name is required' },
        { status: 400 }
      )
    }
    if (project_url !== undefined && project_url !== '' &&
        (typeof project_url !== 'string' || !/^https?:\/\/[^\s"'\\]+$/i.test(project_url))) {
      return NextResponse.json({ error: 'Invalid project_url' }, { status: 400 })
    }
    if (nxf_api_key !== undefined && (typeof nxf_api_key !== 'string' || nxf_api_key.length > 500)) {
      return NextResponse.json({ error: 'Invalid nxf_api_key' }, { status: 400 })
    }

    const adapter  = getConfiguredAdapter()
    const dbConfig = adapter.config

    const now = new Date().toISOString()

    // nxf_system_config has no project_url column — it is only written to the
    // local files below. nxf_api_key maps to the real column hosted_api_key.
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

    const envUpdates: Record<string, string> = {}
    if (project_url) envUpdates.NEXT_PUBLIC_APP_DOMAIN = project_url
    if (nxf_api_key) envUpdates.NXF_LICENSE_KEY        = nxf_api_key
    if (Object.keys(envUpdates).length) patchEnvFile(envUpdates)
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