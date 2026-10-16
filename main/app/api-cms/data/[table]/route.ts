/**
 * api-cms/data/[table]/route.ts
 *
 * Internal CMS data API — generic CRUD for dynamic pages.
 * Auth: console session token (shared requireSessionUser helper).
 * Never expose publicly.
 *
 * SECURITY HARDENING (Oct 2026):
 *  - The table in the URL must be a model that exists in nxf_system_models.
 *    Before, any signed-in token could read or change ANY table: nxf_users
 *    (password hashes), nxf_system_tokens, nxf_system_apis, nxf_system_config.
 *  - System tables are blocked even if a model with that name existed.
 *  - Table, filter, field and id_column names must be plain identifiers (the
 *    adapters put them into SQL); id_column must be a real column.
 *  - Customer tokens are no longer accepted (the local auth copy took any
 *    token in nxf_system_tokens).
 *  - 500 responses no longer return internal error messages.
 */

import { NextRequest, NextResponse } from 'next/server'
import { getConfiguredAdapter }      from '@/app/lib/getConfiguredAdapter'
import { requireSessionUser }        from '@/app/lib/getSessionUser'
import { runHook }                   from '@/app/extensions/registry'

// ---------------------------------------------------------------------------
// Guards
// ---------------------------------------------------------------------------

const IDENT = /^[A-Za-z_][A-Za-z0-9_]{0,62}$/

function isBlockedTable(name: string): boolean {
  return (
    !IDENT.test(name) ||
    name.startsWith('nxf_system_') ||
    name === 'nxf_users' ||
    name === 'nxf_storage'
  )
}

function modelColumns(model: any): any[] {
  let schema = model?.schema ?? {}
  if (typeof schema === 'string') { try { schema = JSON.parse(schema) } catch { schema = {} } }
  return Array.isArray(schema) ? schema : (schema.columns ?? [])
}

/** The model for this table, or null when the table is not a model (or is blocked). */
async function getModel(table: string): Promise<any | null> {
  if (isBlockedTable(table)) return null
  const adapter = await getConfiguredAdapter()
  const models  = await adapter.readAll!(adapter.config, 'nxf_system_models')
  return (models ?? []).find((m: any) => m.name === table) ?? null
}

function badKeys(obj: Record<string, unknown>): string | null {
  for (const k of Object.keys(obj)) if (!IDENT.test(k)) return k
  return null
}

function validIdColumn(model: any, idCol: string): boolean {
  if (!IDENT.test(idCol)) return false
  return idCol === 'id' || modelColumns(model).some((c: any) => c.name === idCol)
}

const notFound = (table: string) =>
  NextResponse.json({ error: `Table '${table}' not found` }, { status: 404 })

const serverError = (label: string, err: any) => {
  console.error(`[api-cms/data] ${label} failed:`, err?.message)
  return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
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

    const session = await requireSessionUser(req)
    if (!session.ok) return session.response

    const model = await getModel(table)
    if (!model) return notFound(table)

    const adapter  = await getConfiguredAdapter()
    const dbConfig = adapter.config

    const { searchParams } = new URL(req.url)
    const search    = searchParams.get('search')     ?? ''
    const sortField = searchParams.get('sort_field') ?? ''
    const sortDir   = searchParams.get('sort_dir')   ?? 'asc'
    const pageNum   = Math.max(1, parseInt(searchParams.get('page') ?? '1') || 1)
    const limitNum  = Math.min(Math.max(1, parseInt(searchParams.get('limit') ?? '50') || 50), 500)

    const reserved = new Set(['search', 'sort_field', 'sort_dir', 'page', 'limit', 'user_id'])
    const filter: Record<string, string> = {}
    searchParams.forEach((value, key) => {
      if (!reserved.has(key) && value) filter[key] = value
    })
    const badFilter = badKeys(filter)
    if (badFilter) {
      return NextResponse.json({ error: 'Invalid filter field' }, { status: 400 })
    }

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
    return serverError('GET', err)
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

    const session = await requireSessionUser(req)
    if (!session.ok) return session.response
    const sessionUser = { user_id: session.userId }

    const model = await getModel(table)
    if (!model) return notFound(table)

    const body                              = await req.json()
    const { project_id, tenant_id, ...data } = body ?? {}

    const badField = badKeys(data)
    if (badField) {
      return NextResponse.json({ error: 'Invalid field name' }, { status: 400 })
    }

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
    return serverError('POST', err)
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

    const session = await requireSessionUser(req)
    if (!session.ok) return session.response
    const sessionUser = { user_id: session.userId }

    const model = await getModel(table)
    if (!model) return notFound(table)

    const body                                              = await req.json()
    const { id, id_column, project_id, tenant_id, ...data } = body ?? {}

    if (!id) {
      return NextResponse.json({ error: 'id is required' }, { status: 400 })
    }

    const idCol = id_column ?? 'id'
    if (!validIdColumn(model, idCol)) {
      return NextResponse.json({ error: 'Invalid id_column' }, { status: 400 })
    }
    const badField = badKeys(data)
    if (badField) {
      return NextResponse.json({ error: 'Invalid field name' }, { status: 400 })
    }

    const adapter  = await getConfiguredAdapter()
    const dbConfig = adapter.config

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
    return serverError('PATCH', err)
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

    const session = await requireSessionUser(req)
    if (!session.ok) return session.response
    const sessionUser = { user_id: session.userId }

    const model = await getModel(table)
    if (!model) return notFound(table)

    const body                                     = await req.json()
    const { id, id_column, project_id, tenant_id } = body ?? {}

    if (!id) {
      return NextResponse.json({ error: 'id is required' }, { status: 400 })
    }

    const idCol = id_column ?? 'id'
    if (!validIdColumn(model, idCol)) {
      return NextResponse.json({ error: 'Invalid id_column' }, { status: 400 })
    }

    const adapter  = await getConfiguredAdapter()
    const dbConfig = adapter.config

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
    return serverError('DELETE', err)
  }
}