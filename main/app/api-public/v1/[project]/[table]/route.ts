/**
 * api-public/v1/[project]/[table]/route.ts
 *
 * Public developer-facing REST API gateway.
 *
 * Used by Flutter apps, Next.js frontends, and third-party integrations
 * to read and write data from a self-hosted NXTFlutter instance.
 *
 * Auth: API key passed as X-API-Key header, validated against nxf_system_apis.
 *
 * Rate limiting: DB-backed. Each API key has rate_limit_count and
 * rate_limit_reset_at columns on nxf_system_apis. On each request:
 *   1. If now > rate_limit_reset_at → reset count to 0, set new window
 *   2. Increment count
 *   3. If count > limit → return 429
 *
 * Self-hosted limits: 100 req/min per key (upgradeable in hosted version).
 *
 * CORS: permissive by default for self-hosted (developer controls their server).
 */

import { NextRequest, NextResponse } from 'next/server'
import { getConfiguredAdapter }      from '@/app/lib/getConfiguredAdapter '

const RATE_LIMIT     = 100   // requests per window
const WINDOW_MS      = 60_000 // 1 minute in milliseconds

// ---------------------------------------------------------------------------
// CORS headers
// ---------------------------------------------------------------------------

function corsHeaders(): Record<string, string> {
  return {
    'Access-Control-Allow-Origin':  '*',
    'Access-Control-Allow-Methods': 'GET, POST, PATCH, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, X-API-Key, Authorization',
  }
}

// ---------------------------------------------------------------------------
// OPTIONS — preflight
// ---------------------------------------------------------------------------

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: corsHeaders() })
}

// ---------------------------------------------------------------------------
// API key validation + rate limiting
// ---------------------------------------------------------------------------

async function validateApiKey(
  req:       NextRequest,
  projectId: string
): Promise<{ valid: boolean; error?: string; status?: number; key?: any }> {
  const apiKey = req.headers.get('X-API-Key') ?? req.headers.get('x-api-key')

  if (!apiKey) {
    return { valid: false, error: 'X-API-Key header is required', status: 401 }
  }

  try {
    const adapter  = getConfiguredAdapter()
    const dbConfig = adapter.config

    // Find the key record — match by key_prefix (first 8 chars) for fast lookup
    // then compare the full key. In self-hosted we store the full key since
    // enterprise encryption is a hosted feature.
    const allKeys = await adapter.readAll!(dbConfig, 'nxf_system_apis')
    const keyRecord = (allKeys ?? []).find((k: any) =>
      k.project_id === projectId &&
      k.status     === 'active'  &&
      (k.key_value === apiKey || k.key_encrypted === apiKey)
    )

    if (!keyRecord) {
      return { valid: false, error: 'Invalid or revoked API key', status: 401 }
    }

    // ── Rate limiting ──────────────────────────────────────────────────────

    const now         = Date.now()
    const resetAt     = keyRecord.rate_limit_reset_at
      ? new Date(keyRecord.rate_limit_reset_at).getTime()
      : 0
    const count       = keyRecord.rate_limit_count ?? 0
    const windowExpired = now > resetAt

    const newCount    = windowExpired ? 1 : count + 1
    const newResetAt  = windowExpired
      ? new Date(now + WINDOW_MS).toISOString()
      : keyRecord.rate_limit_reset_at

    // Update count in DB — fire and forget, don't block the response
    const api_id  = keyRecord.api_id ?? keyRecord.id
    const idCol   = keyRecord.api_id ? 'api_id' : 'id'

    adapter.update!(dbConfig, 'nxf_system_apis', api_id, {
      rate_limit_count:    newCount,
      rate_limit_reset_at: newResetAt,
      last_used_at:        new Date().toISOString(),
    }, idCol).catch((err: any) =>
      console.error('[api-public] Rate limit update failed:', err.message)
    )

    if (!windowExpired && count >= RATE_LIMIT) {
      return {
        valid:  false,
        error:  `Rate limit exceeded. Limit is ${RATE_LIMIT} requests per minute.`,
        status: 429,
      }
    }

    return { valid: true, key: keyRecord }
  } catch (err: any) {
    console.error('[api-public] API key validation failed:', err.message)
    return { valid: false, error: 'API key validation failed', status: 500 }
  }
}

// ---------------------------------------------------------------------------
// Model visibility check
// ---------------------------------------------------------------------------

async function getModelForTable(
  tableName: string,
  projectId: string
): Promise<any | null> {
  try {
    const adapter   = getConfiguredAdapter()
    const dbConfig  = adapter.config
    const allModels = await adapter.readAll!(dbConfig, 'nxf_system_models')

    return (allModels ?? []).find(
      (m: any) =>
        m.name       === tableName &&
        m.project_id === projectId
    ) ?? null
  } catch {
    return null
  }
}

// ---------------------------------------------------------------------------
// GET — list or single record
// ---------------------------------------------------------------------------

export async function GET(
  req:     NextRequest,
  context: { params: Promise<{ project: string; table: string }> }
) {
  try {
    const { project: projectId, table } = await context.params

    const auth = await validateApiKey(req, projectId)
    if (!auth.valid) {
      return NextResponse.json(
        { error: auth.error },
        { status: auth.status ?? 401, headers: corsHeaders() }
      )
    }

    // Check model exists and is accessible
    const model = await getModelForTable(table, projectId)
    if (!model) {
      return NextResponse.json(
        { error: `Table '${table}' not found for this project` },
        { status: 404, headers: corsHeaders() }
      )
    }

    const adapter  = getConfiguredAdapter()
    const dbConfig = adapter.config

    const { searchParams } = new URL(req.url)
    const recordId  = searchParams.get('id')
    const search    = searchParams.get('search')     ?? ''
    const sortField = searchParams.get('sort_field') ?? ''
    const sortDir   = searchParams.get('sort_dir')   ?? 'asc'
    const pageNum   = parseInt(searchParams.get('page')  ?? '1')
    const limitNum  = Math.min(parseInt(searchParams.get('limit') ?? '20'), 100)

    // Single record fetch
    if (recordId) {
      const allRecords = await adapter.readAll!(dbConfig, table)
      const record = (allRecords ?? []).find(
        (r: any) =>
          r.id        === recordId ||
          Object.values(r).some((v) => v === recordId)
      )

      if (!record) {
        return NextResponse.json(
          { error: 'Record not found' },
          { status: 404, headers: corsHeaders() }
        )
      }

      // Strip hidden fields
      const schema  = model.schema ?? {}
      const columns = Array.isArray(schema) ? schema : (schema.columns ?? [])
      const hidden  = new Set(
        columns.filter((c: any) => c.hidden).map((c: any) => c.name)
      )
      const safeRecord: Record<string, unknown> = {}
      Object.entries(record).forEach(([k, v]) => {
        if (!hidden.has(k)) safeRecord[k] = v
      })

      return NextResponse.json({ record: safeRecord }, { headers: corsHeaders() })
    }

    // List
    let records = await adapter.readAll!(dbConfig, table)
    if (!records) records = []

    // Filter to this project only
    records = records.filter((r: any) => r.project_id === projectId)

    // Search
    if (search.trim()) {
      const q = search.trim().toLowerCase()
      records = records.filter((row: any) =>
        Object.values(row).some(
          (v) => typeof v === 'string' && v.toLowerCase().includes(q)
        )
      )
    }

    // Filter by extra params
    const reserved = new Set(['id', 'search', 'sort_field', 'sort_dir', 'page', 'limit'])
    searchParams.forEach((value, key) => {
      if (!reserved.has(key) && value) {
        records = records.filter((r: any) => String(r[key]) === value)
      }
    })

    // Sort
    if (sortField) {
      records = [...records].sort((a: any, b: any) => {
        const av = a[sortField] ?? ''
        const bv = b[sortField] ?? ''
        const cmp =
          typeof av === 'string' && typeof bv === 'string'
            ? av.localeCompare(bv)
            : (av as number) - (bv as number)
        return sortDir === 'asc' ? cmp : -cmp
      })
    }

    // Strip hidden fields
    const schema  = model.schema ?? {}
    const columns = Array.isArray(schema) ? schema : (schema.columns ?? [])
    const hidden  = new Set(
      columns.filter((c: any) => c.hidden).map((c: any) => c.name)
    )

    const safeRecords = records
      .slice((pageNum - 1) * limitNum, pageNum * limitNum)
      .map((row: any) => {
        const safe: Record<string, unknown> = {}
        Object.entries(row).forEach(([k, v]) => {
          if (!hidden.has(k)) safe[k] = v
        })
        return safe
      })

    return NextResponse.json({
      records: safeRecords,
      total:   records.length,
      page:    pageNum,
      limit:   limitNum,
      pages:   Math.ceil(records.length / limitNum),
    }, { headers: corsHeaders() })

  } catch (err: any) {
    console.error('[api-public] GET failed:', err.message)
    return NextResponse.json({ error: err.message }, { status: 500, headers: corsHeaders() })
  }
}

// ---------------------------------------------------------------------------
// POST — create record
// ---------------------------------------------------------------------------

export async function POST(
  req:     NextRequest,
  context: { params: Promise<{ project: string; table: string }> }
) {
  try {
    const { project: projectId, table } = await context.params

    const auth = await validateApiKey(req, projectId)
    if (!auth.valid) {
      return NextResponse.json(
        { error: auth.error },
        { status: auth.status ?? 401, headers: corsHeaders() }
      )
    }

    const model = await getModelForTable(table, projectId)
    if (!model) {
      return NextResponse.json(
        { error: `Table '${table}' not found` },
        { status: 404, headers: corsHeaders() }
      )
    }

    const body = await req.json()
    const adapter  = getConfiguredAdapter()
    const dbConfig = adapter.config
    const now      = new Date().toISOString()

    const record = {
      ...body,
      project_id: projectId,
      tenant_id:  model.tenant_id ?? null,
      created_at: now,
      updated_at: now,
    }

    const created = await adapter.create!(dbConfig, table, record)

    return NextResponse.json(
      { success: true, record: created ?? record },
      { status: 201, headers: corsHeaders() }
    )
  } catch (err: any) {
    console.error('[api-public] POST failed:', err.message)
    return NextResponse.json({ error: err.message }, { status: 500, headers: corsHeaders() })
  }
}

// ---------------------------------------------------------------------------
// PATCH — update record
// ---------------------------------------------------------------------------

export async function PATCH(
  req:     NextRequest,
  context: { params: Promise<{ project: string; table: string }> }
) {
  try {
    const { project: projectId, table } = await context.params

    const auth = await validateApiKey(req, projectId)
    if (!auth.valid) {
      return NextResponse.json(
        { error: auth.error },
        { status: auth.status ?? 401, headers: corsHeaders() }
      )
    }

    const body = await req.json()
    const { id, id_column, ...data } = body

    if (!id) {
      return NextResponse.json(
        { error: 'id is required' },
        { status: 400, headers: corsHeaders() }
      )
    }

    const adapter  = getConfiguredAdapter()
    const dbConfig = adapter.config
    const idCol    = id_column ?? 'id'

    const updated = await adapter.update!(dbConfig, table, id, {
      ...data,
      updated_at: new Date().toISOString(),
    }, idCol)

    return NextResponse.json(
      { success: true, record: updated },
      { headers: corsHeaders() }
    )
  } catch (err: any) {
    console.error('[api-public] PATCH failed:', err.message)
    return NextResponse.json({ error: err.message }, { status: 500, headers: corsHeaders() })
  }
}

// ---------------------------------------------------------------------------
// DELETE — delete record
// ---------------------------------------------------------------------------

export async function DELETE(
  req:     NextRequest,
  context: { params: Promise<{ project: string; table: string }> }
) {
  try {
    const { project: projectId, table } = await context.params

    const auth = await validateApiKey(req, projectId)
    if (!auth.valid) {
      return NextResponse.json(
        { error: auth.error },
        { status: auth.status ?? 401, headers: corsHeaders() }
      )
    }

    const body = await req.json()
    const { id, id_column } = body

    if (!id) {
      return NextResponse.json(
        { error: 'id is required' },
        { status: 400, headers: corsHeaders() }
      )
    }

    const adapter  = getConfiguredAdapter()
    const dbConfig = adapter.config
    const idCol    = id_column ?? 'id'

    await adapter.delete!(dbConfig, table,  idCol) //NEEDS TO BE FIXED 

    return NextResponse.json({ success: true }, { headers: corsHeaders() })
  } catch (err: any) {
    console.error('[api-public] DELETE failed:', err.message)
    return NextResponse.json({ error: err.message }, { status: 500, headers: corsHeaders() })
  }
}