/**
 * api-cms/data/[table]/route.ts
 *
 * Internal CMS data API — generic CRUD for dynamic pages.
 * Auth: session token. Never expose publicly.
 */

import { NextRequest, NextResponse } from 'next/server'
import { getConfiguredAdapter }      from '@/app/lib/getConfiguredAdapter '
import { runHook }                   from '@/app/extensions/registry'

// ---------------------------------------------------------------------------
// Auth helper
// ---------------------------------------------------------------------------

async function getSessionUser(req: NextRequest): Promise<{ user_id: string } | null> {
  try {
    const authHeader = req.headers.get('Authorization')
    const token      = authHeader?.replace('Bearer ', '').trim()

    if (!token) {
      console.warn('[api-cms/data] No bearer token in request')
      return null
    }

    const adapter  = await getConfiguredAdapter()
    const dbConfig = adapter.config
    const dbType   = dbConfig.type

    if (dbType === 'firebase') {
      const decoded = await adapter.validateBuiltInSession?.(dbConfig, token)
      if (!decoded) {
        console.warn('[api-cms/data] Firebase token validation returned null')
        return null
      }
      return { user_id: decoded.uid ?? decoded.id ?? decoded.user_id }
    }

    if (dbType === 'supabase') {
      const user = await adapter.validateBuiltInSession?.(dbConfig, token)
      if (!user) return null
      return { user_id: user.id ?? user.uid ?? user.user_id }
    }

    if (!adapter.findTokenByAccessToken) return null
    const storedToken = await adapter.findTokenByAccessToken(token)
    if (!storedToken)                                              return null
    if (storedToken.revoked)                                       return null
    if (new Date(storedToken.expires_at).getTime() < Date.now())  return null
    return { user_id: storedToken.user_id }
  } catch (err: any) {
    console.error('[api-cms/data] getSessionUser error:', err?.message)
    return null
  }
}

// ---------------------------------------------------------------------------
// GET — list records
// ---------------------------------------------------------------------------

export async function GET(
  req:     NextRequest,
  context: { params: Promise<{ table: string }> }
) {
  try {
    const { table } = await context.params

    const sessionUser = await getSessionUser(req)
    if (!sessionUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const adapter  = await getConfiguredAdapter()
    const dbConfig = adapter.config

    const { searchParams } = new URL(req.url)
    const search    = searchParams.get('search')     ?? ''
    const sortField = searchParams.get('sort_field') ?? ''
    const sortDir   = searchParams.get('sort_dir')   ?? 'asc'
    const pageNum   = parseInt(searchParams.get('page')  ?? '1')
    const limitNum  = parseInt(searchParams.get('limit') ?? '50')

    const reserved = new Set(['search', 'sort_field', 'sort_dir', 'page', 'limit', 'user_id'])
    const filter: Record<string, string> = {}
    searchParams.forEach((value, key) => {
      if (!reserved.has(key) && value) filter[key] = value
    })

    // Pass filter to the adapter — it now supports equality filtering
    let records: Record<string, unknown>[] = await adapter.readAll!(dbConfig, table, filter) ?? []

    // In-memory search (substring match across all string fields)
    if (search.trim()) {
      const q = search.trim().toLowerCase()
      records = records.filter((row) =>
        Object.values(row).some(
          (v) => typeof v === 'string' && v.toLowerCase().includes(q)
        )
      )
    }

    // In-memory sort
    if (sortField) {
      records = [...records].sort((a, b) => {
        const av = a[sortField] ?? ''
        const bv = b[sortField] ?? ''
        const cmp =
          typeof av === 'string' && typeof bv === 'string'
            ? av.localeCompare(bv)
            : (av as number) - (bv as number)
        return sortDir === 'asc' ? cmp : -cmp
      })
    }

    const total  = records.length
    const offset = (pageNum - 1) * limitNum
    const paged  = records.slice(offset, offset + limitNum)

    return NextResponse.json({
      records: paged,
      total,
      page:    pageNum,
      limit:   limitNum,
      pages:   Math.ceil(total / limitNum),
    })
  } catch (err: any) {
    console.error('[api-cms/data] GET failed:', err.message)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

// ---------------------------------------------------------------------------
// POST — create record
// ---------------------------------------------------------------------------

export async function POST(
  req:     NextRequest,
  context: { params: Promise<{ table: string }> }
) {
  try {
    const { table } = await context.params

    const sessionUser = await getSessionUser(req)
    if (!sessionUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body                              = await req.json()
    const { project_id, tenant_id, ...data } = body

    if (!project_id) {
      return NextResponse.json({ error: 'project_id is required' }, { status: 400 })
    }

    const adapter  = await getConfiguredAdapter()
    const dbConfig = adapter.config
    const now      = new Date().toISOString()

    const record = {
      ...data,
      project_id,
      tenant_id:  tenant_id ?? null,
      created_at: data.created_at ?? now,
      updated_at: now,
    }

    const created = await adapter.create!(dbConfig, table, record)

    runHook('record.created', {
      model:      table,
      record:     (created ?? record) as Record<string, unknown>,
      user_id:    sessionUser.user_id,
      project_id,
      tenant_id:  tenant_id ?? '',
    }).catch((err: any) => console.error('[api-cms/data] POST hook error:', err.message))

    return NextResponse.json({ success: true, record: created ?? record }, { status: 201 })
  } catch (err: any) {
    console.error('[api-cms/data] POST failed:', err.message)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

// ---------------------------------------------------------------------------
// PATCH — update record
// ---------------------------------------------------------------------------

export async function PATCH(
  req:     NextRequest,
  context: { params: Promise<{ table: string }> }
) {
  try {
    const { table } = await context.params

    const sessionUser = await getSessionUser(req)
    if (!sessionUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body                                              = await req.json()
    const { id, id_column, project_id, tenant_id, ...data } = body

    if (!id) {
      return NextResponse.json({ error: 'id is required' }, { status: 400 })
    }

    const adapter  = await getConfiguredAdapter()
    const dbConfig = adapter.config
    const idCol    = id_column ?? 'id'

    const updates = { ...data, updated_at: new Date().toISOString() }

    const updated = await (adapter.update as Function)(dbConfig, table, id, updates, idCol)

    runHook('record.updated', {
      model:      table,
      record:     (updated ?? { id, ...updates }) as Record<string, unknown>,
      user_id:    sessionUser.user_id,
      project_id: project_id ?? '',
      tenant_id:  tenant_id  ?? '',
    }).catch((err: any) => console.error('[api-cms/data] PATCH hook error:', err.message))

    return NextResponse.json({ success: true, record: updated })
  } catch (err: any) {
    console.error('[api-cms/data] PATCH failed:', err.message)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

// ---------------------------------------------------------------------------
// DELETE — delete record
// ---------------------------------------------------------------------------

export async function DELETE(
  req:     NextRequest,
  context: { params: Promise<{ table: string }> }
) {
  try {
    const { table } = await context.params

    const sessionUser = await getSessionUser(req)
    if (!sessionUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body                                     = await req.json()
    const { id, id_column, project_id, tenant_id } = body

    if (!id) {
      return NextResponse.json({ error: 'id is required' }, { status: 400 })
    }

    const adapter  = await getConfiguredAdapter()
    const dbConfig = adapter.config
    const idCol    = id_column ?? 'id'

    await (adapter.delete as Function)(dbConfig, table, id, idCol)

    runHook('record.deleted', {
      model:      table,
      record:     { id } as Record<string, unknown>,
      user_id:    sessionUser.user_id,
      project_id: project_id ?? '',
      tenant_id:  tenant_id  ?? '',
    }).catch((err: any) => console.error('[api-cms/data] DELETE hook error:', err.message))

    return NextResponse.json({ success: true })
  } catch (err: any) {
    console.error('[api-cms/data] DELETE failed:', err.message)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}