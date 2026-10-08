// app/api/models/route.ts
/**
 * GET  /api/models  — Fetch all models for a user's project from nxf_system_models.
 * POST /api/models  — Create a new model in nxf_system_models and the real DB table.
 */

import { getConfiguredAdapter } from '@/app/lib/getConfiguredAdapter'
import { isPlatformTable }      from '@/app/lib/platformTables'
import { NextRequest, NextResponse } from 'next/server'
import { v4 as uuidv4 }             from 'uuid'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function normaliseSchemaToVersioned(schema: any): any {
  if (typeof schema === 'string') {
    try { schema = JSON.parse(schema) } catch { schema = null }
  }
  if (!schema) {
    return { version: '1.0', columns: [], hooks: [], integrations: [] }
  }
  if (Array.isArray(schema)) {
    return { version: '1.0', columns: schema, hooks: [], integrations: [] }
  }
  if (typeof schema === 'object' && Array.isArray(schema.columns)) {
    return {
      version:      schema.version      ?? '1.0',
      columns:      schema.columns,
      hooks:        schema.hooks        ?? [],
      integrations: schema.integrations ?? [],
    }
  }
  return { version: '1.0', columns: [], hooks: [], integrations: [] }
}

/**
 * Firestore returns the real document ID in `doc.id`; SQL adapters use `sm_id`.
 */
function resolveDocumentId(doc: any): string {
  return doc.id || doc.sm_id
}

// ---------------------------------------------------------------------------
// GET — List all models for a project
// ---------------------------------------------------------------------------

export async function GET(req: NextRequest): Promise<NextResponse> {
  try {
    const userId = req.nextUrl.searchParams.get('user_id')

    if (!userId) {
      return NextResponse.json(
        { error: 'user_id is required' },
        { status: 400 }
      )
    }

    const adapter  = getConfiguredAdapter()
    const dbConfig = adapter.config

    const project = adapter.findProjectByOwnerId
      ? await adapter.findProjectByOwnerId(dbConfig, userId)
      : null

    if (!project) {
      return NextResponse.json({ models: [] })
    }

    const projectId = project.id || project.project_id

    const allModels = await adapter.read!(dbConfig, 'nxf_system_models')

    const models = (allModels ?? [])
      .filter((m: any) => m.project_id === projectId)
      .map((m: any) => ({
        ...m,
        sm_id:       resolveDocumentId(m),
        schema:      normaliseSchemaToVersioned(m.schema),
        is_platform: isPlatformTable(m.name),
      }))

    return NextResponse.json({ models })

  } catch (err: any) {
    console.error('GET /api/models error:', err.message)
    return NextResponse.json(
      { error: err.message || 'Failed to fetch models' },
      { status: 500 }
    )
  }
}

// ---------------------------------------------------------------------------
// POST — Create a new model
// ---------------------------------------------------------------------------

export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    let body: any
    try {
      body = await req.json()
    } catch {
      return NextResponse.json(
        { error: 'Invalid request body' },
        { status: 400 }
      )
    }

    const { user_id, name, schema } = body

    const columns = Array.isArray(schema?.columns) ? schema.columns : null

    if (!user_id || !name || !columns || columns.length === 0) {
      return NextResponse.json(
        { error: 'Missing required fields: user_id, name, schema' },
        { status: 400 }
      )
    }

    // Only real platform tables are reserved
    if (isPlatformTable(name)) {
      return NextResponse.json(
        { error: 'System tables cannot be modified' },
        { status: 403 }
      )
    }

    const primaryKeyCount = columns.filter((f: any) => f.is_primary).length
    if (primaryKeyCount > 1) {
      return NextResponse.json(
        { error: 'A model can only have one primary key' },
        { status: 400 }
      )
    }

    const adapter  = getConfiguredAdapter()
    const dbConfig = adapter.config

    const project = adapter.findProjectByOwnerId
      ? await adapter.findProjectByOwnerId(dbConfig, user_id)
      : null

    if (!project) {
      return NextResponse.json(
        { error: 'Project not found for this user' },
        { status: 400 }
      )
    }

    const projectId = project.id || project.project_id

    // tenant_id is NOT NULL on nxf_system_models. Take it from the project,
    // otherwise fall back to the single tenant row (single-tenant Core).
    let tenantId: string | undefined = project.tenant_id
    if (!tenantId) {
      const tenants = await adapter.read!(dbConfig, 'nxf_system_tenants')
      const first   = (tenants ?? [])[0]
      tenantId      = first?.ten_id || first?.id
    }

    if (!tenantId) {
      return NextResponse.json(
        { error: 'Tenant not found for this project' },
        { status: 400 }
      )
    }

    const existingModels = await adapter.read!(dbConfig, 'nxf_system_models')
    const duplicate      = (existingModels ?? []).find(
      (m: any) =>
        m.project_id === projectId &&
        m.name.toLowerCase() === name.toLowerCase()
    )

    if (duplicate) {
      return NextResponse.json(
        { error: 'A model with this name already exists' },
        { status: 409 }
      )
    }

    if (adapter.createTable) {
      await adapter.createTable(name, { columns })
    }

    const now      = new Date().toISOString()
    const modelRow = {
      sm_id:      uuidv4(),
      tenant_id:  tenantId,
      project_id: projectId,
      name,
      schema,
      is_system:  false,
      created_at: now,
      updated_at: now,
    }

    await adapter.create!(dbConfig, 'nxf_system_models', modelRow)

    return NextResponse.json({ success: true, model: modelRow })

  } catch (err: any) {
    console.error('POST /api/models error:', err.message)
    return NextResponse.json(
      { error: err.message || 'Failed to create model' },
      { status: 500 }
    )
  }
}