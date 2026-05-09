import 'server-only'
import { NextRequest, NextResponse } from 'next/server'
import { getAdapter } from '@/app/db-adapter'
import { DBConfig, DBType } from '@/app/db-adapter/types'
import { parseFirebaseServiceAccount, parseFirebaseWebConfig } from '@/app/lib/firebaseConfig'
import crypto from 'crypto'
import fs from 'fs'
import path from 'path'

const IV_LENGTH = 16

function deriveEncryptionKey({
  projectId, configId, userId, createdAt,
}: {
  projectId: string; configId: string; userId: string; createdAt: string
}) {
  const rawKey = projectId + configId + userId + createdAt
  return crypto.createHash('sha256').update(rawKey).digest()
}

function encrypt(data: any, key: Buffer) {
  const iv        = crypto.randomBytes(IV_LENGTH)
  const cipher    = crypto.createCipheriv('aes-256-gcm', key, iv)
  const encrypted = Buffer.concat([
    cipher.update(JSON.stringify(data), 'utf8'),
    cipher.final(),
  ])
  return {
    iv:      iv.toString('hex'),
    content: encrypted.toString('hex'),
    tag:     cipher.getAuthTag().toString('hex'),
  }
}

function patchEnvFile(updates: Record<string, string>) {
  const envPath = path.resolve(process.cwd(), '.env.local')
  let content   = fs.existsSync(envPath) ? fs.readFileSync(envPath, 'utf-8') : ''

  for (const [key, value] of Object.entries(updates)) {
    const line  = `${key}="${value}"`
    const regex = new RegExp(`^${key}=.*$`, 'm')
    if (regex.test(content)) {
      content = content.replace(regex, line)
    } else {
      content += `\n${line}`
    }
  }

  fs.writeFileSync(envPath, content, 'utf-8')
}

export async function POST(req: NextRequest) {
  try {
    const {
      user_id,
      verify_email,
      forgot_password,
      smtp_enabled,
      host,
      port,
      from_address,
      username,
      password,
      encryption,
    } = await req.json()

    if (!user_id) {
      return NextResponse.json({ error: 'user_id is required' }, { status: 400 })
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

    // ── Encrypt password using same pattern as save-config ────────────────
    const encryptionKey = deriveEncryptionKey({
      projectId: existing.project_id ?? user_id,
      configId:  existing.config_id  ?? existing.id,
      userId:    user_id,
      createdAt: existing.created_at ?? new Date().toISOString(),
    })

    const smtpUpdate: Record<string, any> = {
      'smtp.enabled':         smtp_enabled    ?? false,
      'smtp.verify_email':    verify_email    ?? false,
      'smtp.forgot_password': forgot_password ?? false,
      'smtp.host':            host            ?? '',
      'smtp.port':            port            ?? '587',
      'smtp.from_address':    from_address    ?? '',
      'smtp.username':        username        ?? '',
      'smtp.encryption':      encryption      ?? 'TLS',
      updated_at:             new Date().toISOString(),
    }

    if (password) {
      smtpUpdate['smtp.password_encrypted'] = encrypt(password, encryptionKey)
    }

    await adapter.update!(
      adapter.config,
      'nxf_system_config',
      existing.id,
      smtpUpdate
    )

    // ── Patch .env.local ──────────────────────────────────────────────────
    const envUpdates: Record<string, string> = {
      NEXT_PUBLIC_SMTP_HOST:         host         ?? '',
      NEXT_PUBLIC_SMTP_PORT:         port         ?? '587',
      NEXT_PUBLIC_SMTP_FROM:         from_address ?? '',
      NEXT_PUBLIC_SMTP_USER:         username     ?? '',
      NEXT_PUBLIC_SMTP_ENCRYPTION:   encryption   ?? 'TLS',
      NEXT_PUBLIC_SMTP_VERIFY_EMAIL: String(verify_email    ?? false),
      NEXT_PUBLIC_SMTP_FORGOT_PW:    String(forgot_password ?? false),
      NEXT_PUBLIC_SMTP_ENABLED:      String(smtp_enabled    ?? false),
    }

    // Password kept server-only — not exposed to browser bundle
    if (password) {
      envUpdates['NEXT_SMTP_PASSWORD'] = password
    }

    patchEnvFile(envUpdates)

    return NextResponse.json({ success: true })
  } catch (err: any) {
    console.error('[UPDATE SMTP SETTINGS ERROR]', err)
    return NextResponse.json(
      { error: err.message ?? 'Internal Server Error' },
      { status: 500 }
    )
  }
}