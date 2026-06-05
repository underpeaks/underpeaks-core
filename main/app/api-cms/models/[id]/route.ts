/**
 * api-cms/models/[id]/route.ts
 *
 * Fetches a single model record from nxf_system_models by sm_id.
 * Used by dynamic page templates to get the schema field definitions
 * so they can render the correct columns, form fields, and drawer inputs.
 *
 * Auth: session token (same pattern as api-cms/data).
 */

import { NextRequest, NextResponse } from 'next/server'
import { getConfiguredAdapter }      from '@/app/lib/getConfiguredAdapter '

async function getSessionUser(req: NextRequest): Promise<{ user_id: string } | null> {
  try {
    const authHeader = req.headers.get('Authorization')
    const token      = authHeader?.replace('Bearer ', '').trim()
    if (!token) return null

    const adapter  = getConfiguredAdapter()
    const dbConfig = adapter.config
    const dbType   = dbConfig.type

    if (dbType === 'firebase') {
      const decoded = await adapter.validateBuiltInSession?.(dbConfig, token)
      if (!decoded) return null
      return { user_id: decoded.uid ?? decoded.id ?? decoded.user_id }
    }

    if (dbType === 'supabase') {
      const user = await adapter.validateBuiltInSession?.(dbConfig, token)
      if (!user) return null
      return { user_id: user.id ?? user.uid ?? user.user_id }
    }

    if (!adapter.findTokenByAccessToken) return null
    const storedToken = await adapter.findTokenByAccessToken(token)
    if (!storedToken)                                               return null
    if (storedToken.revoked)                                        return null
    if (new Date(storedToken.expires_at).getTime() < Date.now())   return null
    return { user_id: storedToken.user_id }
  } catch {
    return null
  }
}

export async function GET(
  req:     NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params

    const sessionUser = await getSessionUser(req)
    if (!sessionUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

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
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}