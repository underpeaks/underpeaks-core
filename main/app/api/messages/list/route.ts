import 'server-only'
import { NextRequest, NextResponse } from 'next/server'
import { getConfiguredAdapter } from '@/app/lib/getConfiguredAdapter '

export async function GET(req: NextRequest) {
  try {
    const authHeader = req.headers.get('Authorization')
    const token      = authHeader?.replace('Bearer ', '') ?? null

    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const adapter  = getConfiguredAdapter()
    const dbConfig = adapter.config
    const dbType   = dbConfig.type

    let uid: string | null = null

    if (adapter.supportsBuiltInAuth) {
      const decoded = await adapter.validateBuiltInSession?.(dbConfig, token)
      uid = decoded?.id ?? decoded?.uid ?? decoded?.user_id ?? null
    } else {
      const storedToken = await adapter.findTokenByAccessToken?.(token)
      uid = (storedToken && !storedToken.revoked) ? storedToken.user_id : null
    }

    if (!uid) return NextResponse.json({ error: 'Invalid token' }, { status: 401 })

    // Gracefully handle empty or missing projects table
    const projects   = await adapter.readAll!(dbConfig, 'nxf_system_projects').catch(() => [])
    const project_id = projects[0]?.project_id ?? projects[0]?.id ?? null

    if (!project_id) return NextResponse.json({ conversations: [] })

    if (!adapter.listConversations) {
      console.warn(`[messages/list] ${dbType} adapter does not implement listConversations`)
      return NextResponse.json({ conversations: [] })
    }

    // Gracefully handle empty or missing conversations table
    const conversations = await adapter.listConversations(dbConfig, project_id, uid).catch(() => [])
    return NextResponse.json({ conversations })

  } catch (err: any) {
    console.error('[messages/list] Error:', err.message)
    return NextResponse.json({ conversations: [] })
  }
}