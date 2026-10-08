// app/api/models/[id]/route.ts
/**
 * PUT    /api/models/[id] — Update a model's name and/or schema.
 * DELETE /api/models/[id] — Delete a model and drop the underlying table.
 *
 * URL params:
 *   id {string} — The sm_id of the model in nxf_system_models.
 *
 * PUT body (JSON):
 *   user_id    {string}      — Required.
 *   name       {string}      — Required. New (or unchanged) model name.
 *   schema     {ColumnDef[]} — Required. Full updated column list.
 *   old_name   {string}      — Required. Previous name for rename detection.
 *   old_schema {ColumnDef[]} — Required. Previous schema for diff calculation.
 *
 * DELETE body (JSON):
 *   name {string} — Required. The table/collection name to drop.
 *
 * Protection:
 *   PUT    — nxf_system_* tables cannot be modified; platform tables cannot be
 *            renamed, and nothing can be renamed to a platform table name.
 *   DELETE — nxf_system_* and every platform table cannot be deleted.
 */

import { NextRequest, NextResponse } from 'next/server'
import { ColumnDef }                 from '@/app/db-adapter/types'
import { getConfiguredAdapter } from '@/app/lib/getConfiguredAdapter'
import { isPlatformTable }      from '@/app/lib/platformTables'

// ---------------------------------------------------------------------------
// PUT — Update an existing model
// ---------------------------------------------------------------------------

export async function PUT(
  req:     NextRequest,
  { params }: { params: { id: string } }
): Promise<NextResponse> {
  try {
    const { id } = params

    let body: any
    try {
      body = await req.json()
    } catch {
      return NextResponse.json(
        { error: 'Invalid request body' },
        { status: 400 }
      )
    }

    const { user_id, name, schema, old_name, old_schema } = body

    const newColumns: ColumnDef[] = Array.isArray(schema?.columns)
      ? schema.columns
      : Array.isArray(schema)
        ? schema
        : []

    const oldColumns: ColumnDef[] = Array.isArray(old_schema?.columns)
      ? old_schema.columns
      : Array.isArray(old_schema)
        ? old_schema
        : []

    if (!user_id || !name || newColumns.length === 0 || !old_name || oldColumns.length === 0) {
      return NextResponse.json(
        { error: 'Missing required fields: user_id, name, schema, old_name, old_schema' },
        { status: 400 }
      )
    }

    const renamed = name !== old_name

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

    const adapter  = getConfiguredAdapter()
    const dbConfig = adapter.config

    // Step 1 — Rename table if name changed
    if (renamed && adapter.renameTable) {
      await adapter.renameTable(old_name, name)
    }

    // Step 2 — Diff old and new columns to find added ones
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
    console.error('PUT /api/models/[id] error:', err.message)
    return NextResponse.json(
      { error: err.message || 'Failed to update model' },
      { status: 500 }
    )
  }
}

// ---------------------------------------------------------------------------
// DELETE — Delete a model and drop its table
// ---------------------------------------------------------------------------

export async function DELETE(
  req:     NextRequest,
  { params }: { params: { id: string } }
): Promise<NextResponse> {
  try {
    const { id } = params

    let body: any
    try {
      body = await req.json()
    } catch {
      return NextResponse.json(
        { error: 'Invalid request body' },
        { status: 400 }
      )
    }

    const { name } = body

    if (!name) {
      return NextResponse.json(
        { error: 'Missing required field: name' },
        { status: 400 }
      )
    }

    if (isPlatformTable(name)) {
      return NextResponse.json(
        { error: 'System tables cannot be deleted' },
        { status: 403 }
      )
    }

    const adapter  = getConfiguredAdapter()
    const dbConfig = adapter.config

    // Step 1 — Drop the actual table / delete all documents
    if (adapter.dropTable) {
      await adapter.dropTable(name)
    }

    // Step 2 — Remove the model metadata (PK is sm_id; id value comes first)
    await adapter.delete!(dbConfig, 'nxf_system_models', id, 'sm_id')

    return NextResponse.json({ success: true })

  } catch (err: any) {
    console.error('DELETE /api/models/[id] error:', err.message)
    return NextResponse.json(
      { error: err.message || 'Failed to delete model' },
      { status: 500 }
    )
  }
}