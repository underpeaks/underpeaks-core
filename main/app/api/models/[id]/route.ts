// app/api/models/[id]/route.ts
/**
 * PUT    /api/models/[id] — Update a model's name and/or schema.
 * DELETE /api/models/[id] — Delete a model and drop the underlying table.
 *
 * URL params:
 *   id {string} — The sm_id of the model in nxf_system_models.
 *
 * The caller comes from the Bearer token — a user_id in the body is ignored.
 * The model is loaded by id and must belong to the caller's project. The
 * table name and the previous schema are taken from that STORED record, never
 * from the browser: name / old_name / old_schema in the request body are not
 * trusted for anything that touches the database.
 *
 * PUT body (JSON):
 *   name       {string}      — Required. New (or unchanged) model name.
 *   schema     {ColumnDef[]} — Required. Full updated column list.
 *
 * DELETE body: none needed (a name in the body is ignored).
 *
 * Protection:
 *   PUT    — nxf_system_* tables cannot be modified; platform tables cannot be
 *            renamed, and nothing can be renamed to a platform table name.
 *   DELETE — nxf_system_* and every platform table cannot be deleted.
 */

import { NextRequest, NextResponse } from 'next/server'
import { ColumnDef }                 from '@/app/db-adapter/types'
import { getConfiguredAdapter }      from '@/app/lib/getConfiguredAdapter'
import { isPlatformTable }           from '@/app/lib/platformTables'
import { requireSessionUser }        from '@/app/lib/getSessionUser'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Columns of a stored schema, whatever shape it is stored in. */
function columnsOf(schema: any): ColumnDef[] {
  if (typeof schema === 'string') {
    try { schema = JSON.parse(schema) } catch { return [] }
  }
  if (!schema) return []
  if (Array.isArray(schema)) return schema
  if (typeof schema === 'object' && Array.isArray(schema.columns)) return schema.columns
  return []
}

/**
 * Loads the model with this id and checks it belongs to the caller's project.
 * Returns the stored row, or null if it does not exist / is not theirs.
 */
async function loadOwnedModel(adapter: any, dbConfig: any, userId: string, id: string) {
  const project = adapter.findProjectByOwnerId
    ? await adapter.findProjectByOwnerId(dbConfig, userId)
    : null
  if (!project) return null

  const projectId = project.id || project.project_id
  const allModels = await adapter.read!(dbConfig, 'nxf_system_models')

  return (allModels ?? []).find(
    (m: any) => (m.id || m.sm_id) === id && m.project_id === projectId
  ) ?? null
}

// ---------------------------------------------------------------------------
// PUT — Update an existing model
// ---------------------------------------------------------------------------

export async function PUT(
  req:     NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  try {
    const session = await requireSessionUser(req)
    if (!session.ok) return session.response

    const { id } = await params

    let body: any
    try {
      body = await req.json()
    } catch {
      return NextResponse.json(
        { error: 'Invalid request body' },
        { status: 400 }
      )
    }

    const { name, schema } = body

    const newColumns: ColumnDef[] = columnsOf(schema)

    if (!name || typeof name !== 'string' || newColumns.length === 0) {
      return NextResponse.json(
        { error: 'Missing required fields: name, schema' },
        { status: 400 }
      )
    }

    if (name.length > 128 || name.includes('\0')) {
      return NextResponse.json({ error: 'Invalid model name' }, { status: 400 })
    }

    // Column names must be strings too (they are quoted into the ALTER TABLE).
    if (newColumns.some((c: any) => !c || typeof c.name !== 'string' || !c.name || c.name.length > 128 || c.name.includes('\0'))) {
      return NextResponse.json({ error: 'Invalid column name' }, { status: 400 })
    }

    const adapter  = getConfiguredAdapter()
    const dbConfig = adapter.config

    // The stored record is the source of truth for the old name and schema.
    const model = await loadOwnedModel(adapter, dbConfig, session.userId, id)
    if (!model) {
      return NextResponse.json({ error: 'Model not found' }, { status: 404 })
    }

    const old_name   = model.name as string
    const oldColumns = columnsOf(model.schema)
    const renamed    = name !== old_name

    if (
      old_name.toLowerCase().startsWith('nxf_system_') ||
      name.toLowerCase().startsWith('nxf_system_') ||
      (renamed && (isPlatformTable(old_name) || isPlatformTable(name)))
    ) {
      return NextResponse.json(
        { error: 'System tables cannot be modified' },
        { status: 403 }
      )
    }

    const primaryKeyCount = newColumns.filter((f) => f.is_primary).length
    if (primaryKeyCount > 1) {
      return NextResponse.json(
        { error: 'A model can only have one primary key' },
        { status: 400 }
      )
    }

    // Step 1 — Rename table if name changed
    if (renamed && adapter.renameTable) {
      await adapter.renameTable(old_name, name)
    }

    // Step 2 — Diff stored and new columns to find added ones
    const oldFieldNames = new Set(oldColumns.map((c) => c.name))
    const addedColumns  = newColumns.filter((c) => !oldFieldNames.has(c.name))

    if (addedColumns.length > 0 && adapter.alterTable) {
      await adapter.alterTable(name, { add: addedColumns })
    }

    // Step 3 — Update the nxf_system_models record (PK is sm_id)
    await adapter.update!(dbConfig, 'nxf_system_models', id, {
      name,
      schema,
      updated_at: new Date().toISOString(),
    }, 'sm_id')

    return NextResponse.json({ success: true })

  } catch (err: any) {
    console.error('PUT /api/models/[id] error:', err?.message)
    return NextResponse.json({ error: 'Failed to update model' }, { status: 500 })
  }
}

// ---------------------------------------------------------------------------
// DELETE — Delete a model and drop its table
// ---------------------------------------------------------------------------

export async function DELETE(
  req:     NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  try {
    const session = await requireSessionUser(req)
    if (!session.ok) return session.response

    const { id } = await params

    const adapter  = getConfiguredAdapter()
    const dbConfig = adapter.config

    // The table to drop is the one stored on the model record — a name sent
    // by the browser is ignored, so a model id can never be used to drop
    // some other table.
    const model = await loadOwnedModel(adapter, dbConfig, session.userId, id)
    if (!model) {
      return NextResponse.json({ error: 'Model not found' }, { status: 404 })
    }

    const name = model.name as string

    if (
      model.is_system ||
      name.toLowerCase().startsWith('nxf_system_') ||
      isPlatformTable(name)
    ) {
      return NextResponse.json(
        { error: 'System tables cannot be deleted' },
        { status: 403 }
      )
    }

    // Step 1 — Drop the actual table / delete all documents
    if (adapter.dropTable) {
      await adapter.dropTable(name)
    }

    // Step 2 — Remove the model metadata (PK is sm_id; id value comes first)
    await adapter.delete!(dbConfig, 'nxf_system_models', id, 'sm_id')

    return NextResponse.json({ success: true })

  } catch (err: any) {
    console.error('DELETE /api/models/[id] error:', err?.message)
    return NextResponse.json({ error: 'Failed to delete model' }, { status: 500 })
  }
}