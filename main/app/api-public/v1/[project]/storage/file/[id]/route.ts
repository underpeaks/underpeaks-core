// app/api-public/v1/[project]/storage/file/[id]/route.ts
/**
 * api-public/v1/[project]/storage/file/[id]/route.ts
 *
 * Core (self-hosted) — PUBLIC file serve. No auth, no token (Core public
 * model). This is the permanent URL handed to apps for supabase/firebase
 * installs, whose stored signed urls expire.
 *
 * Behaviour by adapter type:
 *   - disk (postgres/mysql/mongodb): the stored url is already a permanent
 *     public /uploads/... path — redirect to it.
 *   - supabase/firebase: fetch a fresh signed url via listFiles(folder) and
 *     stream the bytes back (bucket stays private).
 *
 * SECURITY HARDENING (Oct 2026): files are served from your own domain, so the
 * type the uploader chose must not be trusted. Only images (not SVG), audio,
 * video and PDF display inline; everything else is a download. Every response
 * carries nosniff and a sandbox CSP, so an uploaded HTML or SVG file cannot run
 * script on your domain.
 */

import { NextRequest, NextResponse } from 'next/server'
import { getConfiguredAdapter }      from '@/app/lib/getConfiguredAdapter'

type Params = { project: string; id: string }

const INLINE_OK = /^(image\/(png|jpe?g|gif|webp|avif|bmp|x-icon)|audio\/[a-z0-9.+-]+|video\/[a-z0-9.+-]+|application\/pdf)$/i

function safeHeaders(mime: string, fileName: string): Record<string, string> {
  const inline = INLINE_OK.test(mime)
  const name   = (fileName || 'file').replace(/[^a-zA-Z0-9._-]/g, '_')
  return {
    'Content-Type':                inline ? mime : 'application/octet-stream',
    'Content-Disposition':         `${inline ? 'inline' : 'attachment'}; filename="${name}"`,
    'X-Content-Type-Options':      'nosniff',
    'Content-Security-Policy':     "default-src 'none'; sandbox",
    'Cache-Control':               'public, max-age=31536000, immutable',
    'Access-Control-Allow-Origin': '*',
  }
}

export async function GET(_req: NextRequest, { params }: { params: Promise<Params> }) {
  const { project: projectId, id } = await params

  try {
    const adapter  = getConfiguredAdapter()
    const dbConfig = adapter.config

    const rows = (await (adapter as any).readAll(dbConfig, 'nxf_storage')) ?? []
    const row  = rows.find((r: any) => r.storage_id === id && r.project_id === projectId)

    if (!row) return new NextResponse('Not found', { status: 404 })

    const type = dbConfig.type

    // Disk adapters: stored url is permanent + public. Redirect to it.
    if (type === 'postgres' || type === 'mysql' || type === 'mongodb') {
      if (!row.url) return new NextResponse('Not found', { status: 404 })
      return NextResponse.redirect(row.url, 302)
    }

    // supabase / firebase: get a fresh signed url for this file and stream it.
    const files   = (await (adapter as any).listFiles(row.folder)) ?? []
    const match   = files.find((f: any) => f.name === row.file_name || f.folderPath === row.file_path)
    if (!match?.url) return new NextResponse('Not found', { status: 404 })

    const upstream = await fetch(match.url)
    if (!upstream.ok) return new NextResponse('Not found', { status: 404 })

    const arrayBuf = await upstream.arrayBuffer()
    return new NextResponse(Buffer.from(arrayBuf), {
      status: 200,
      headers: safeHeaders(row.mime_type ?? '', row.file_name ?? ''),
    })
  } catch (err: any) {
    console.error('[api-public] storage file serve failed:', err.message)
    return new NextResponse('Error', { status: 500 })
  }
}