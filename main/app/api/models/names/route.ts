// app/api/models/names/route.ts
/**
 * GET /api/models/names
 *
 * Returns a lightweight list of all models for the current user's project.
 * Used by the FK dropdown and the dynamic select-options source in the
 * model editor.
 *
 * schema is always returned as a plain array of column definitions, whatever
 * shape it is stored in (versioned object, bare array, legacy object map).
 *
 * is_system is true for platform tables (nxf_system_* and every table the
 * installer creates) so the editor can hide them from "Source table".
 */

import { getConfiguredAdapter } from '@/app/lib/getConfiguredAdapter'
import { isPlatformTable }      from '@/app/lib/platformTables'
import { NextRequest, NextResponse } from 'next/server'

function normaliseSchema(schema: any): any[] {
  if (typeof schema === 'string') {
    try { schema = JSON.parse(schema) } catch { return [] }
  }
  if (!schema) return []

  // Bare array of columns (legacy)
  if (Array.isArray(schema)) return schema

  // Canonical versioned object: { version, columns, hooks, integrations }
  if (typeof schema === 'object' && Array.isArray(schema.columns)) {
    return schema.columns
  }

  // Legacy object map: { colName: { type, ... } }
  if (typeof schema === 'object' && !('columns' in schema)) {
    return Object.entries(schema).map(([name, def]: [string, any]) => ({
      name,
      ...(typeof def === 'object' && def !== null ? def : { type: def }),
    }))
  }

  return []
}

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
        sm_id:     m.id || m.sm_id,
        name:      m.name,
        schema:    normaliseSchema(m.schema),
        is_system: !!m.is_system || isPlatformTable(m.name),
      }))

    return NextResponse.json({ models })

  } catch (err: any) {
    console.error('GET /api/models/names error:', err.message)
    return NextResponse.json(
      { error: err.message || 'Failed to fetch models' },
      { status: 500 }
    )
  }
}