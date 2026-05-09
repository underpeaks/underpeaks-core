
import 'server-only'
import { NextRequest, NextResponse } from 'next/server'
import { getAdapter } from '@/app/db-adapter'
import { DBConfig, DBType } from '@/app/db-adapter/types'
import { parseFirebaseServiceAccount, parseFirebaseWebConfig } from '@/app/lib/firebaseConfig'
import fs from 'fs'
import path from 'path'

// ── Patch a single key in .env.local without rewriting the whole file ─────────

function patchEnvFile(key: string, value: string) {
  const envPath = path.resolve(process.cwd(), '.env.local')
  let content = fs.existsSync(envPath) ? fs.readFileSync(envPath, 'utf-8') : ''
  const line  = `${key}="${value}"`
  const regex = new RegExp(`^${key}=.*$`, 'm')

  if (regex.test(content)) {
    content = content.replace(regex, line)
  } else {
    content += `\n${line}`
  }

  fs.writeFileSync(envPath, content, 'utf-8')
}

// ── Patch projectName in nxt_flutter.config.json ──────────────────────────────

function patchConfigFile(projectName: string, projectUrl: string) {
  const filePath = path.resolve(process.cwd(), 'nxt_flutter.config.json')
  if (!fs.existsSync(filePath)) return

  const config        = JSON.parse(fs.readFileSync(filePath, 'utf-8'))
  config.projectName  = projectName
  config.projectUrl   = projectUrl
  fs.writeFileSync(filePath, JSON.stringify(config, null, 2), 'utf-8')
}

// ── API ───────────────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  try {
    const { user_id, project_name, project_url, nxf_api_key } = await req.json()

    if (!user_id || !project_name) {
      return NextResponse.json(
        { error: 'user_id and project_name are required' },
        { status: 400 }
      )
    }

    const dbType = process.env.NEXT_PUBLIC_DB_TYPE as DBType
    let dbConfig: DBConfig

    if (dbType === 'firebase') {
      const serviceAccount = process.env.NEXT_DB_FIREBASE_SERVICE_ACCOUNT
      const configAccount  = process.env.NEXT_PUBLIC_FIREBASE_CONFIG
      if (!serviceAccount) throw new Error('Firebase service account missing')
      const parsedAccount = parseFirebaseServiceAccount(serviceAccount)
      const parsedConfig  = parseFirebaseWebConfig(configAccount)
      dbConfig = {
        type: 'firebase',
        firebaseConfigJson: JSON.stringify(parsedAccount),
        storageBucket: 'gs://' + parsedConfig.storageBucket,
      }
    } else {
      throw new Error(`Unsupported DB type: ${dbType}`)
    }

    const adapter  = getAdapter(dbType, dbConfig)
    const existing = await adapter.findSystemConfigByUserId!(adapter.config, user_id)

    if (!existing?.id) {
      return NextResponse.json(
        { error: 'System config not found for this user' },
        { status: 404 }
      )
    }

    // Build update payload — only include nxf_api_key if provided
    const updatePayload: Record<string, any> = {
      project_name,
      project_url: project_url ?? '',
      updated_at:  new Date().toISOString(),
    }
    if (nxf_api_key !== undefined) {
      updatePayload.nxf_api_key = nxf_api_key
    }

    await adapter.update!(adapter.config, 'nxf_system_config', existing.id, updatePayload)

    // Patch .env.local
    if (project_url) patchEnvFile('NEXT_PUBLIC_APP_DOMAIN', project_url)
    if (nxf_api_key) patchEnvFile('NXF_API_KEY', nxf_api_key)

    // Patch nxt_flutter.config.json
    patchConfigFile(project_name, project_url ?? '')

    return NextResponse.json({ success: true })
  } catch (err: any) {
    console.error('[UPDATE PROJECT SETTINGS ERROR]', err)
    return NextResponse.json(
      { error: err.message ?? 'Internal Server Error' },
      { status: 500 }
    )
  }
}