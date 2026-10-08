// app/api/settings/update-smtp/route.ts

import 'server-only'
import { NextRequest, NextResponse } from 'next/server'
import crypto                        from 'crypto'
import fs                            from 'fs'
import path                          from 'path'
import { getConfiguredAdapter } from '@/app/lib/getConfiguredAdapter'

// ---------------------------------------------------------------------------
// Constants + helpers — all unchanged
// ---------------------------------------------------------------------------

const IV_LENGTH = 16

function deriveEncryptionKey({
  projectId, configId, userId, createdAt,
}: {
  projectId: string
  configId:  string
  userId:    string
  createdAt: string
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
    content     = regex.test(content) ? content.replace(regex, line) : content + `\n${line}`
  }

  fs.writeFileSync(envPath, content, 'utf-8')
}

function parseJson(v: any): Record<string, any> {
  if (!v) return {}
  if (typeof v === 'string') {
    try { return JSON.parse(v) } catch { return {} }
  }
  return v
}

// ---------------------------------------------------------------------------
// POST handler
// ---------------------------------------------------------------------------

export async function POST(req: NextRequest) {
  try {
    // ── Validate body ───────────────────────────────────────────────────────

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
      return NextResponse.json(
        { error: 'user_id is required' },
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

    const configId = existing?.config_id ?? existing?.id ?? existing?._id?.toString()

    if (!configId) {
      return NextResponse.json(
        { error: 'System config record not found for this user' },
        { status: 404 }
      )
    }

    // ── Derive encryption key ───────────────────────────────────────────────

    const encryptionKey = deriveEncryptionKey({
      projectId: existing.project_id ?? user_id,
      configId,
      userId:    user_id,
      createdAt: existing.created_at instanceof Date
        ? existing.created_at.toISOString()
        : (existing.created_at ?? new Date().toISOString()),
    })

    // ── Build + write SMTP update ───────────────────────────────────────────
    // Firestore: dot-notation updates only nested smtp.* fields.
    // Everything else: smtp is a JSON column — merge into the existing object
    // (keeps the stored encrypted password when none is provided) and write
    // it back whole.

    const idColumn = existing.config_id ? 'config_id' : undefined
    const now      = new Date().toISOString()

    if (dbConfig.type === 'firebase') {
      const smtpUpdate: Record<string, any> = {
        'smtp.enabled':         smtp_enabled    ?? false,
        'smtp.verify_email':    verify_email    ?? false,
        'smtp.forgot_password': forgot_password ?? false,
        'smtp.host':            host            ?? '',
        'smtp.port':            port            ?? '587',
        'smtp.from_address':    from_address    ?? '',
        'smtp.username':        username        ?? '',
        'smtp.encryption':      encryption      ?? 'TLS',
        updated_at:             now,
      }

      if (password) {
        smtpUpdate['smtp.password_encrypted'] = encrypt(password, encryptionKey)
      }

      await adapter.update(dbConfig, 'nxf_system_config', configId, smtpUpdate)
    } else {
      const smtp: Record<string, any> = {
        ...parseJson(existing.smtp),
        enabled:         smtp_enabled    ?? false,
        verify_email:    verify_email    ?? false,
        forgot_password: forgot_password ?? false,
        host:            host            ?? '',
        port:            port            ?? '587',
        from_address:    from_address    ?? '',
        username:        username        ?? '',
        encryption:      encryption      ?? 'TLS',
      }

      if (password) {
        smtp.password_encrypted = encrypt(password, encryptionKey)
      }

      const value = dbConfig.type === 'postgres' || dbConfig.type === 'mysql'
        ? JSON.stringify(smtp)
        : smtp

      await adapter.update(dbConfig, 'nxf_system_config', configId, {
        smtp:       value,
        updated_at: now,
      }, idColumn)
    }

    // ── Patch .env.local ────────────────────────────────────────────────────
    // NEXT_SMTP_PASSWORD has no NEXT_PUBLIC_ prefix — never exposed to browser

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

    if (password) {
      envUpdates['NEXT_SMTP_PASSWORD'] = password
    }

    patchEnvFile(envUpdates)

    return NextResponse.json({ success: true })

  } catch (err: any) {
    console.error('[update-smtp] Error:', err.message)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}