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
import { getConfiguredAdapter } from '@/app/lib/getConfiguredAdapter '

// ---------------------------------------------------------------------------
// PUT — Update an existing model
// ---------------------------------------------------------------------------

export async function PUT(
  req:     NextRequest,
  { params }: { params: { id: string } }
): Promise<NextResponse> {
  try {
    const { id } = params

    // -----------------------------------------------------------------------
    // Parse body safely
    // -----------------------------------------------------------------------

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

    if (!user_id || !name || !schema?.length || !old_name || !old_schema) {
      return NextResponse.json(
        { error: 'Missing required fields: user_id, name, schema, old_name, old_schema' },
        { status: 400 }
      )
    }

    // -----------------------------------------------------------------------
    // Block system table edits
    // -----------------------------------------------------------------------

    /**
     * Pure system tables (nxf_system_*) cannot be edited via the API.
     * Editable system tables (nxf_users, nxf_messages, nxf_notifications)
     * are allowed through — they are not prefixed with nxf_system_.
     */
    if (
      old_name.toLowerCase().startsWith('nxf_system_') ||
      name.toLowerCase().startsWith('nxf_system_')
    ) {
      return NextResponse.json(
        { error: 'System tables cannot be modified' },
        { status: 403 }
      )
    }

    // -----------------------------------------------------------------------
    // Enforce single primary key
    // -----------------------------------------------------------------------

    const primaryKeyCount = (schema as any[]).filter((f) => f.is_primary).length
    if (primaryKeyCount > 1) {
      return NextResponse.json(
        { error: 'A model can only have one primary key' },
        { status: 400 }
      )
    }

    const adapter  = getConfiguredAdapter()
    const dbConfig = adapter.config

    // -----------------------------------------------------------------------
    // Step 1 — Rename table if the model name changed
    // -----------------------------------------------------------------------

    /**
     * For Firebase this is a no-op — Firestore collections are implicit
     * and everything references models by sm_id, not by name.
     * For SQL databases this issues ALTER TABLE RENAME (or equivalent).
     */
    if (name !== old_name && adapter.renameTable) {
      await adapter.renameTable(old_name, name)
    }

    // -----------------------------------------------------------------------
    // Step 2 — Diff old and new schema to find added columns
    // -----------------------------------------------------------------------

    /**
     * We only ADD new columns to the real DB table — we never drop columns
     * from the DB even if the user removed a field from the model definition.
     *
     * Why not drop?
     * Dropping a column is irreversible and could destroy real user data or
     * break existing foreign key relationships. The removed field disappears
     * from the nxf_system_models schema record but the DB column stays intact.
     * When the project migrates to hosted, the reconciliation step will surface
     * any mismatches for manual review.
     *
     * For Firebase, alterTable is a no-op (schemaless).
     */
    const oldFieldNames = new Set(
      (old_schema as ColumnDef[]).map((c) => c.name)
    )
    const addedColumns = (schema as ColumnDef[]).filter(
      (c) => !oldFieldNames.has(c.name)
    )

    if (addedColumns.length > 0 && adapter.alterTable) {
      await adapter.alterTable(name, { add: addedColumns })
    }

    // -----------------------------------------------------------------------
    // Step 3 — Update the nxf_system_models record
    // -----------------------------------------------------------------------

    /**
     * Update name, schema, and updated_at.
     * sm_id and project_id are immutable — never updated.
     */
    await adapter.update!(dbConfig, 'nxf_system_models', id, {
      name,
      schema,
      updated_at: new Date().toISOString(),
    })

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

    // -----------------------------------------------------------------------
    // Parse body safely
    // -----------------------------------------------------------------------

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

    // -----------------------------------------------------------------------
    // Block system table deletion
    // -----------------------------------------------------------------------

    if (name.toLowerCase().startsWith('nxf_system_')) {
      return NextResponse.json(
        { error: 'System tables cannot be deleted' },
        { status: 403 }
      )
    }

    const adapter  = getConfiguredAdapter()
    const dbConfig = adapter.config

    // -----------------------------------------------------------------------
    // Step 1 — Drop the actual table / delete all documents
    // -----------------------------------------------------------------------

    /**
     * For Firebase: dropTable now batch-deletes all documents in the
     * collection. Firestore collections disappear naturally when empty.
     *
     * For SQL databases: issues DROP TABLE CASCADE so all dependent
     * foreign key references are also cleaned up.
     *
     * We drop the table BEFORE removing the nxf_system_models record so
     * that if the drop fails, the metadata record is still intact and
     * the user can retry.
     */
    if (adapter.dropTable) {
      await adapter.dropTable(name)
    }

    // -----------------------------------------------------------------------
    // Step 2 — Remove the model metadata from nxf_system_models
    // -----------------------------------------------------------------------

    await adapter.delete!(dbConfig, 'nxf_system_models', id)

    return NextResponse.json({ success: true })

  } catch (err: any) {
    console.error('DELETE /api/models/[id] error:', err.message)
    return NextResponse.json(
      { error: err.message || 'Failed to delete model' },
      { status: 500 }
    )
  }
}