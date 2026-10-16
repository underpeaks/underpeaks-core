/**
 * api-cms/models/[id]/route.ts
 *
 * Fetches a single model record from nxf_system_models by sm_id.
 * Used by dynamic page templates to get the schema field definitions
 * so they can render the correct columns, form fields, and drawer inputs.
 *
 * Auth: console session token, checked by the shared requireSessionUser
 * helper. This file used to carry its own copy of the check, which accepted
 * any token in nxf_system_tokens, including customer tokens.
 */

import { NextRequest, NextResponse } from 'next/server'
import { getConfiguredAdapter }      from '@/app/lib/getConfiguredAdapter'
import { requireSessionUser }        from '@/app/lib/getSessionUser'

export async function GET(
  req:     NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params

    const session = await requireSessionUser(req)
    if (!session.ok) return session.response

    const adapter  = getConfiguredAdapter()
    const dbConfig = adapter.config

    const allModels = await adapter.readAll!(dbConfig, 'nxf_system_models')
    const model = (allModels ?? []).find(
      (m: any) => m.sm_id === id || m.id === id
    )

    if (!model) {
      return NextResponse.json({ error: 'Model not found' }, { status: 404 })
    }

    // Normalise schema — handle both array and object formats
    let schema = model.schema ?? []
    if (!Array.isArray(schema)) {
      try {
        schema = typeof schema === 'string' ? JSON.parse(schema) : schema
      } catch {
        schema = []
      }
    }

    // Ensure schema has version, hooks, integrations
    const normalisedSchema = {
      version:      schema.version      ?? '1.0',
      columns:      Array.isArray(schema) ? schema : (schema.columns ?? []),
      hooks:        schema.hooks         ?? [],
      integrations: schema.integrations  ?? [],
    }

    return NextResponse.json({
      model: {
        sm_id:      model.sm_id ?? model.id,
        name:       model.name,
        project_id: model.project_id,
        tenant_id:  model.tenant_id,
        schema:     normalisedSchema,
        created_at: model.created_at,
        updated_at: model.updated_at,
      }
    })
  } catch (err: any) {
    console.error('[api-cms/models] GET failed:', err.message)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}