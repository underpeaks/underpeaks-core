// File: app/api/codegen/generate/[target]/route.ts (Core)

/**
 * POST /api/codegen/generate/[target]
 *
 * Core never runs code generation itself. This route assembles ProjectData
 * from Core's own local DB, then forwards it to hosted Studio's
 * /api/codegen-private/generate/[target] route, which does the actual
 * generateFlutter/generateNextjs call and returns the zip. Core just
 * proxies that zip response straight back to the CLI.
 *
 * Auth here is the SAME nxf login flow used for hosted — the CLI's
 * ~/.nxf/credentials.json license_key (JWT) is forwarded as the
 * Authorization header on the call to hosted. Hosted validates it exactly
 * as it does for its own users.
 *
 * FIX: this route was building its own NextResponse with only
 * Content-Type/Content-Disposition/Content-Length — every debug/metadata
 * header hosted's response actually sets (X-Underpeaks-Project-Name,
 * X-Debug-Page-Count, X-Debug-Page-Types, X-Debug-Presentation-Files,
 * X-Debug-Total-Files, X-Debug-Widget-Missing) was silently dropped,
 * never forwarded to the CLI. That made the CLI fall back to a hardcoded
 * default project name ('underpeaks-project') instead of the real one,
 * which in turn made it check/scaffold the wrong output folder — looked
 * like a broken folder-existence check, but the check was fine; it was
 * just checking the wrong path. Debug info also always printed as null
 * for the same reason. Now explicitly forwarded. (Header names below are
 * lowercase but .get() on a Headers object matches case-insensitively,
 * so this works regardless of how hosted capitalizes them.)
 */

import { NextRequest, NextResponse } from 'next/server'
import { assembleProjectData }       from '@/app/lib/codegen/assembleProjectData'

type Params = { target: string }

// Headers hosted's generate route sets that the CLI actually reads.
// Keep this list in sync with whatever hosted's route emits.
const FORWARDED_HEADERS = [
  'x-underpeaks-project-name',
  'x-debug-page-count',
  'x-debug-page-types',
  'x-debug-presentation-files',
  'x-debug-total-files',
  'x-debug-widget-missing',
]

export async function POST(req: NextRequest, { params }: { params: Promise<Params> }) {
  try {
    const { target } = await params

    if (!['flutter', 'nextjs'].includes(target)) {
      return NextResponse.json({ error: `Unknown target: ${target}` }, { status: 400 })
    }

    const authHeader = req.headers.get('authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Missing license key' }, { status: 401 })
    }

    const body       = await req.json()
    const projectId  = body.project_id

    if (!projectId) {
      return NextResponse.json({ error: 'project_id is required' }, { status: 400 })
    }

    const projectData = await assembleProjectData(projectId)

    if (body.state_manager)  projectData.state_manager = body.state_manager
    if (body.filter_models)  (projectData as any).filter_models = body.filter_models
    if (body.filter_pages)   (projectData as any).filter_pages  = body.filter_pages

    const studioUrl = process.env.NEXT_PUBLIC_STUDIO_API_URL ?? 'https://studio.underpeaks.com'

    const hostedRes = await fetch(`${studioUrl}/api/codegen-private/generate/${target}`, {
      method:  'POST',
      headers: {
        'Content-Type':  'application/json',
        'Authorization': authHeader,
      },
      body: JSON.stringify({
        project_id:  projectId,
        project_data: projectData,
      }),
    })

    if (!hostedRes.ok) {
      const err = await hostedRes.json().catch(() => ({ error: 'Unknown error from hosted' }))
      return NextResponse.json({ error: err.error }, { status: hostedRes.status })
    }

    const zipBuffer = Buffer.from(await hostedRes.arrayBuffer())

    const responseHeaders: Record<string, string> = {
      'Content-Type':        'application/zip',
      'Content-Disposition': `attachment; filename="nxf-${target}-${Date.now()}.zip"`,
      'Content-Length':      String(zipBuffer.length),
    }

    for (const headerName of FORWARDED_HEADERS) {
      const value = hostedRes.headers.get(headerName)
      if (value !== null) {
        responseHeaders[headerName] = value
      }
    }

    return new NextResponse(zipBuffer, {
      status:  200,
      headers: responseHeaders,
    })
  } catch (err: any) {
    console.error('[codegen/generate/target]', err.message)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}