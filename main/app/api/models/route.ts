/**
 * GET  /api/models  — Fetch all models for a user's project from nxf_system_models.
 * POST /api/models  — Create a new model in nxf_system_models and the real DB table.
 */

import { NextRequest, NextResponse } from 'next/server'
import { getTranslations }           from 'next-intl/server'
import { v4 as uuidv4 }             from 'uuid'
import { getStorageAdapter } from '@/app/lib/getStorageAdapter'

// ---------------------------------------------------------------------------
// Helper — normalise schema to always be an array
// ---------------------------------------------------------------------------

/**
 * normaliseSchema
 *
 * The schema column in nxf_system_models is jsonb and may have been written
 * as either an array or an object depending on the source that created it.
 * This function ensures the console always works with a consistent ColumnDef[].
 *
 * @param schema - Raw schema value from the database.
 * @returns      A normalised array of column definition objects.
 */
function normaliseSchema(schema: any): any[] {
  if (!schema) return []
  if (Array.isArray(schema)) return schema
  if (typeof schema === 'object') {
    return Object.entries(schema).map(([name, def]: [string, any]) => ({
      name,
      ...(typeof def === 'object' ? def : { type: def }),
    }))
  }
  return []
}

/**
 * resolveDocumentId
 *
 * Resolves the correct document ID to use for update() and delete() calls.
 *
 * The problem:
 * When adapter.create() saves to Firestore, Firestore auto-generates its own
 * document ID (e.g. "abc123xyz"). We also store sm_id as a field inside the
 * document (e.g. "9f1340bb-5656-..."). These two IDs are different.
 *
 * adapter.update() and adapter.delete() need the real Firestore document ID,
 * not the sm_id UUID field. The adapter's read() method returns documents with
 * their Firestore document ID in the `id` field alongside all other fields.
 *
 * Fix:
 * We use the Firestore `id` field (real document ID) as the sm_id that gets
 * sent to the frontend. This way update() and delete() always use the correct ID.
 *
 * For non-Firebase adapters (SQL databases), the document/row ID is typically
 * stored in sm_id itself, so we fall back to sm_id if no separate `id` exists.
 *
 * @param doc - A raw document/row returned by adapter.read()
 * @returns   The correct ID to use for update() and delete() operations
 */
function resolveDocumentId(doc: any): string {
  /**
   * Firestore adapter returns the real document ID in `doc.id`.
   * SQL adapters store the primary key in `doc.sm_id`.
   * We prefer `doc.id` when it exists and differs from `doc.sm_id`.
   */
  return doc.id || doc.sm_id
}

// ---------------------------------------------------------------------------
// GET — List all models for a project
// ---------------------------------------------------------------------------

export async function GET(req: NextRequest): Promise<NextResponse> {
  //const t = await getTranslations('modelsRoute')

  try {
    const userId = req.nextUrl.searchParams.get('user_id')

    if (!userId) {
      return NextResponse.json(
        { error: ('errors.userIdRequired') },
        { status: 400 }
      )
    }

    const adapter  = getStorageAdapter()
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
        /**
         * KEY FIX: Override sm_id with the real Firestore document ID.
         *
         * The frontend uses sm_id for all update() and delete() calls.
         * By setting sm_id to the real document ID here, we ensure those
         * calls use the correct ID that Firestore can actually find.
         *
         * For SQL adapters, doc.id and doc.sm_id are the same value so
         * this assignment is harmless.
         */
        sm_id:  resolveDocumentId(m),
        schema: normaliseSchema(m.schema),
      }))

    return NextResponse.json({ models })

  } catch (err: any) {
    console.error('GET /api/models error:', err.message)
    return NextResponse.json(
      { error: err.message || ('errors.fetchFailed') },
      { status: 500 }
    )
  }
}

// ---------------------------------------------------------------------------
// POST — Create a new model
// ---------------------------------------------------------------------------

export async function POST(req: NextRequest): Promise<NextResponse> {
 // const t = await getTranslations('modelsRoute')

  try {
    let body: any
    try {
      body = await req.json()
    } catch {
      return NextResponse.json(
        { error: ('errors.invalidBody') },
        { status: 400 }
      )
    }

    const { user_id, name, schema } = body

    if (!user_id || !name || !Array.isArray(schema) || schema.length === 0) {
      return NextResponse.json(
        { error: ('errors.missingFields') },
        { status: 400 }
      )
    }

    if (name.toLowerCase().startsWith('nxf_system_')) {
      return NextResponse.json(
        { error: ('errors.systemTableProtected') },
        { status: 403 }
      )
    }

    const primaryKeyCount = schema.filter((f: any) => f.is_primary).length
    if (primaryKeyCount > 1) {
      return NextResponse.json(
        { error: ('errors.multiplePrimaryKeys') },
        { status: 400 }
      )
    }

    const adapter  = getStorageAdapter()
    const dbConfig = adapter.config

    const project = adapter.findProjectByOwnerId
      ? await adapter.findProjectByOwnerId(dbConfig, user_id)
      : null

    if (!project) {
      return NextResponse.json(
        { error: ('errors.projectNotFound') },
        { status: 400 }
      )
    }

    const projectId = project.id || project.project_id

    const existingModels = await adapter.read!(dbConfig, 'nxf_system_models')
    const duplicate      = (existingModels ?? []).find(
      (m: any) =>
        m.project_id === projectId &&
        m.name.toLowerCase() === name.toLowerCase()
    )

    if (duplicate) {
      return NextResponse.json(
        { error: ('errors.nameAlreadyExists') },
        { status: 409 }
      )
    }

    if (adapter.createTable) {
      await adapter.createTable(name, { columns: schema })
    }

    const now      = new Date().toISOString()
    const modelRow = {
      sm_id:      uuidv4(),
      project_id: projectId,
      name,
      schema,
      created_at: now,
      updated_at: now,
    }

    await adapter.create!(dbConfig, 'nxf_system_models', modelRow)

    return NextResponse.json({ success: true, model: modelRow })

  } catch (err: any) {
    console.error('POST /api/models error:', err.message)
    return NextResponse.json(
      { error: err.message || ('errors.createFailed') },
      { status: 500 }
    )
  }
}