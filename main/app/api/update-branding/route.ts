import 'server-only'
import { NextRequest, NextResponse } from 'next/server'
import { getAdapter } from '@/app/db-adapter'
import { DBConfig, DBType } from '@/app/db-adapter/types'
import { parseFirebaseServiceAccount, parseFirebaseWebConfig } from '@/app/lib/firebaseConfig'
import fs from 'fs'
import path from 'path'

function patchConfigFile(logoUrl: string, faviconUrl: string) {
  const filePath = path.resolve(process.cwd(), 'nxt_flutter.config.json')
  if (!fs.existsSync(filePath)) return
  const config      = JSON.parse(fs.readFileSync(filePath, 'utf-8'))
  config.logoUrl    = logoUrl
  config.faviconUrl = faviconUrl
  fs.writeFileSync(filePath, JSON.stringify(config, null, 2), 'utf-8')
}

export async function POST(req: NextRequest) {
  try {
    const { user_id, logo_url, favicon_url } = await req.json()

    if (!user_id)
      return NextResponse.json({ error: 'user_id is required' }, { status: 400 })

    const dbType = process.env.NEXT_PUBLIC_DB_TYPE as DBType
    let dbConfig: DBConfig

    if (dbType === 'firebase') {
      const serviceAccount = process.env.NEXT_DB_FIREBASE_SERVICE_ACCOUNT
      const configAccount  = process.env.NEXT_PUBLIC_FIREBASE_CONFIG
      if (!serviceAccount) throw new Error('Firebase service account missing')
      const parsedAccount = parseFirebaseServiceAccount(serviceAccount)
      const parsedConfig  = parseFirebaseWebConfig(configAccount)
      dbConfig = {
        type:               'firebase',
        firebaseConfigJson: JSON.stringify(parsedAccount),
        storageBucket:      'gs://' + parsedConfig.storageBucket,
      }
    } else {
      throw new Error(`Unsupported DB type: ${dbType}`)
    }

    const adapter  = getAdapter(dbType, dbConfig)
    const existing = await adapter.findSystemConfigByUserId!(adapter.config, user_id)

    if (!existing?.id)
      return NextResponse.json({ error: 'System config not found' }, { status: 404 })

    await adapter.update!(adapter.config, 'nxf_system_config', existing.id, {
      'branding.logo_url':    logo_url    ?? '',
      'branding.favicon_url': favicon_url ?? '',
      updated_at:             new Date().toISOString(),
    })

    patchConfigFile(logo_url ?? '', favicon_url ?? '')

    return NextResponse.json({ success: true })
  } catch (err: any) {
    console.error('[update-branding ERROR]', err)
    return NextResponse.json({ error: err.message ?? 'Internal Server Error' }, { status: 500 })
  }
}