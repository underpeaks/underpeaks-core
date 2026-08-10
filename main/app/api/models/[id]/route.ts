//app/api/models/[id]/route.ts
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
 * System table protection:
 *   Any model whose name starts with 'nxf_system_' is blocked from
 *   both PUT and DELETE at the API level, regardless of what the UI shows.
 */

import { NextRequest, NextResponse } from 'next/server'
import { ColumnDef }                 from '@/app/db-adapter/types'
import { getConfiguredAdapter } from '@/app/lib/getConfiguredAdapter'

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

    if (
      old_name.toLowerCase().startsWith('nxf_system_') ||
      name.toLowerCase().startsWith('nxf_system_')
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
    if (name !== old_name && adapter.renameTable) {
      await adapter.renameTable(old_name, name)
    }

    // Step 2 — Diff old and new columns to find added ones
    const oldFieldNames = new Set(oldColumns.map((c) => c.name))
    const addedColumns  = newColumns.filter((c) => !oldFieldNames.has(c.name))

    if (addedColumns.length > 0 && adapter.alterTable) {
      await adapter.alterTable(name, { add: addedColumns })
    }

    // Step 3 — Update the nxf_system_models record with the full versioned schema
    // FIX: PK is sm_id, not id — missing idColumn 5th arg meant this always
    // targeted a non-existent 'id' column.
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

    if (name.toLowerCase().startsWith('nxf_system_')) {
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

    // Step 2 — Remove the model metadata from nxf_system_models
    // FIX: PK is sm_id, not id — same missing idColumn issue as PUT above.
    await adapter.delete!(dbConfig, 'nxf_system_models',  'sm_id')

    return NextResponse.json({ success: true })

  } catch (err: any) {
    console.error('DELETE /api/models/[id] error:', err.message)
    return NextResponse.json(
      { error: err.message || 'Failed to delete model' },
      { status: 500 }
    )
  }
}