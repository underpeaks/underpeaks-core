// app/api/installer/save-config/route.ts

/**
 * POST /api/installer/save-config
 *
 * Saves the completed installer configuration to the database.
 *
 * WHY THIS ROUTE RECEIVES CONFIG IN THE REQUEST BODY:
 * ─────────────────────────────────────────────────────
 * Installer route — runs before the app is configured and before env vars
 * are guaranteed to be set. The installer wizard passes DB config explicitly.
 * This is the ONE legitimate exception to the rule that API routes must use
 * getConfiguredAdapter(). Do not change this pattern for installer routes.
 *
 * What this route does:
 * 1. Validates all required fields.
 * 2. Creates the admin user if one doesn't already exist.
 * 3. Creates the project if one doesn't already exist.
 * 4. Encrypts the database config (AES-256-GCM) before storing.
 * 5. Saves the full installer config to the database.
 *
 * Response:
 *   200 { success: true, project_id, config_id }
 *   400 { error, missingFields? }
 *   404 { error }  — Admin user could not be created or found.
 *   500 { error }
 */

import { NextResponse }  from 'next/server'
import { getAdapter }    from '@/app/db-adapter'
import { DBType }        from '@/app/db-adapter/types'
import crypto            from 'crypto'

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const IV_LENGTH = 16

const VALID_DB_TYPES: DBType[] = ['firebase', 'supabase', 'mongodb', 'mysql', 'postgres']

// ---------------------------------------------------------------------------
// Encryption helpers
// ---------------------------------------------------------------------------

function deriveEncryptionKey({
  projectId,
  configId,
  userId,
  createdAt,
}: {
  projectId:  string
  configId:   string
  userId:     string
  createdAt:  string
}) {
  const rawKey = projectId + configId + userId + createdAt
  return crypto.createHash('sha256').update(rawKey).digest()
}

function encrypt(data: any, key: Buffer) {
  const iv     = crypto.randomBytes(IV_LENGTH)
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv)

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

// ---------------------------------------------------------------------------
// Validation helper
// ---------------------------------------------------------------------------

function getMissingFields(fields: Record<string, any>): string[] {
  return Object.entries(fields)
    .filter(([_, value]) => value === undefined || value === null || value === '')
    .map(([key]) => key)
}

// ---------------------------------------------------------------------------
// POST handler
// ---------------------------------------------------------------------------

export async function POST(req: Request) {
  try {
    const {
      projectName,
      selectedStack,
      selectedDb,
      dbConfig,
      adminUser,
      featureFlags = {},
      selectedProjectType,
      branding = {},
    } = await req.json()

    if (!VALID_DB_TYPES.includes(selectedDb)) {
      return NextResponse.json(
        { error: `Unsupported database type: ${selectedDb}` },
        { status: 400 }
      )
    }

    const requirePassword = !['supabase', 'firebase', 'mongodb', 'mysql', 'postgres']
      .includes(selectedDb)

    const missingFields = getMissingFields({
      selectedStack,
      selectedDb,
      dbConfig,
      adminUserEmail: adminUser?.email,
      ...(requirePassword && { adminUserPassword: adminUser?.password }),
      selectedProjectType,
    })

    if (missingFields.length > 0) {
      console.error('[save-config] Missing required fields:', missingFields)
      return NextResponse.json(
        {
          error: 'Missing required fields',
          missingFields,
          received: {
            selectedStack,
            selectedDb,
            hasDbConfig:  !!dbConfig,
            adminUser: {
              email:       adminUser?.email ?? null,
              hasPassword: !!adminUser?.password,
            },
            selectedProjectType,
          },
        },
        { status: 400 }
      )
    }

    const adapter = getAdapter(selectedDb as DBType, dbConfig)

    if (!adapter.findUserByEmailWithRetry || !adapter.createAdminUser) {
      return NextResponse.json(
        { error: 'Adapter does not support required methods' },
        { status: 400 }
      )
    }

    console.log(`[save-config] Using adapter for db type: ${selectedDb}`)

    // ── Find or create admin user ──────────────────────────────────────────

    let user = await adapter.findUserByEmailWithRetry(adapter.config, adminUser.email)

    if (!user?.user_id && !user?.id) {
      console.log('[save-config] Admin user not found — creating new admin account')
      const userId = crypto.randomUUID()

      await adapter.createAdminUser(adapter.config, {
        user_id:    userId,
        user_email: adminUser.email,
        password:   adminUser.password ?? '',
        full_name:  adminUser.full_name,
        role:       'admin',
      })

      user = await adapter.findUserByEmailWithRetry(adapter.config, adminUser.email)
    }

    const userId = user?.user_id || user?.id
    if (!userId) {
      return NextResponse.json(
        { error: 'Admin user could not be created or found' },
        { status: 404 }
      )
    }

    console.log('[save-config] Admin user resolved successfully')

    // ── Find or create tenant — look up by email, not user ID ─────────────

    let tenant = await adapter.findTenantByUserEmail?.(adapter.config, adminUser.email)
    let tenantId = tenant?.ten_id || tenant?.id || null

    if (!tenantId && adapter.createTenant) {
      console.log('[save-config] Tenant not found — creating new tenant')
      tenantId = await adapter.createTenant(adapter.config, {
        subdomain:  adminUser.email.split('@')[0] || 'console',
        user_email: adminUser.email,
      })
    }

    console.log('[save-config] Tenant resolved:', tenantId)

    // ── Find or create project ─────────────────────────────────────────────

    let project = await adapter.findProjectByOwnerId?.(adapter.config, userId)

    if (!project?.project_id && !project?.id) {
      console.log('[save-config] Project not found — creating new project')

      const projectId = await adapter.createProject!(adapter.config, {
        name:      projectName || `${adminUser.full_name}'s Project`,
        user_id:   userId,
        tenant_ID: tenantId ?? undefined,
      })

      project = { project_id: projectId }
    }

    const projectId = project.project_id || project.id
    console.log('[save-config] Project resolved successfully')

    // ── Encrypt the database config ────────────────────────────────────────

    const createdAt      = new Date().toISOString()
    const configIdForKey = crypto.randomUUID()

    const encryptionKey     = deriveEncryptionKey({ projectId, configId: configIdForKey, userId, createdAt })
    const encryptedDbConfig = encrypt(dbConfig, encryptionKey)

    console.log('[save-config] Database config encrypted')

    // ── Branding defaults ──────────────────────────────────────────────────

    const safeBranding = {
      logo_url:      branding?.logoUrl      || '',
      favicon_url:   branding?.faviconUrl   || '/images/favicon/NXT_Flutter_favicon.png',
      primary_color: branding?.primaryColor || '#000000',
    }

    // ── Save installer config ──────────────────────────────────────────────

    console.log('[save-config] Saving installer config to database')

    const configId = await adapter.saveInstallerConfig!(adapter.config, {
      config_id:             configIdForKey,
      tenant_id:             tenantId,
      project_id:            projectId,
      project_name:          projectName || `${adminUser.full_name}'s Project`,
      user_id:               userId,
      deployment_type:       'self_hosted',
      status:                'configured',
      selected_stack:        selectedStack,
      selected_db:           selectedDb,
      selected_project_type: selectedProjectType,
      db_config:             encryptedDbConfig,
      admin_user: {
        email:     adminUser.email,
        full_name: adminUser.full_name,
        user_id:   userId,
        ...(requirePassword && { password: adminUser.password }),
      },
      feature_flags:     featureFlags,
      branding:          safeBranding,
      generator_version: '1.0.0',
      is_active:         true,
      created_at:        createdAt,
      updated_at:        createdAt,
    })

    console.log('[save-config] Installer config saved successfully')

    return NextResponse.json({
      success:     true,
      project_id:  projectId,
      config_id:   configId,
      projectName: projectName || `${adminUser.full_name}'s Project`,
    })

  } catch (err: any) {
    console.error('[save-config] Unexpected error:', err.message)
    return NextResponse.json(
      { error: err.message ?? 'Internal Server Error' },
      { status: 500 }
    )
  }
}