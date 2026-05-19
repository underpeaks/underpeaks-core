/**
 * GET /api/models/names
 *
 * Returns a lightweight list of all models for the current user's project.
 * Used by the FK dropdown in the model editor.
 *
 * Applies the same document ID resolution fix as the main GET /api/models
 * route so sm_id always contains the real Firestore document ID.
 */

import { NextRequest, NextResponse } from 'next/server'
import { getTranslations }           from 'next-intl/server'
import { getStorageAdapter } from '@/app/lib/getStorageAdapter'

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

export async function GET(req: NextRequest): Promise<NextResponse> {
 // const t = await getTranslations('modelsRoute')

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
        sm_id:  m.id || m.sm_id,
        name:   m.name,
        schema: normaliseSchema(m.schema),
      }))

    return NextResponse.json({ models })

  } catch (err: any) {
    console.error('GET /api/models/names error:', err.message)
    return NextResponse.json(
      { error: err.message || ('errors.fetchFailed') },
      { status: 500 }
    )
  }
}