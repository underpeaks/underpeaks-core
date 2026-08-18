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
 */

import { NextRequest, NextResponse } from 'next/server'
import { assembleProjectData }       from '@/app/lib/codegen/assembleProjectData'

type Params = { target: string }

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

    return new NextResponse(zipBuffer, {
      status:  200,
      headers: {
        'Content-Type':        'application/zip',
        'Content-Disposition': `attachment; filename="nxf-${target}-${Date.now()}.zip"`,
        'Content-Length':      String(zipBuffer.length),
      },
    })
  } catch (err: any) {
    console.error('[codegen/generate/target]', err.message)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}