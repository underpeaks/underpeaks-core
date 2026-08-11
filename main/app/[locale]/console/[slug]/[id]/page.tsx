/**
 * Admin detail page router
 * Location: app/[locale]/console/[slug]/[id]/page.tsx
 */

import { cookies }            from 'next/headers'
import { notFound }           from 'next/navigation'
import DetailTemplate         from '../components/admin/DetailTemplate'
import type { PageRecord, ModelRecord } from '../types'
import { getConfiguredAdapter } from '@/app/lib/getConfiguredAdapter'

interface DetailPageProps {
  params: Promise<{ locale: string; slug: string; id: string }>
}

async function loadPageAndModel(slug: string): Promise<{
  page:      PageRecord | null
  model:     ModelRecord | null
  projectId: string
  tenantId:  string
}> {
  try {
    const adapter   = await getConfiguredAdapter()
    const dbConfig  = (adapter as any).dbConfig

    // Slugs are stored WITHOUT a leading slash (canonical format) — matches
    // app/[locale]/console/[slug]/page.tsx's convention.
    const cleanSlug = slug.startsWith('/') ? slug.slice(1) : slug

    console.log('[DEBUG][detail] Incoming slug param:', slug)
    console.log('[DEBUG][detail] Cleaned slug used for lookup:', cleanSlug)

    const pages = await adapter.readAll!(dbConfig, 'nxf_pages', { slug: cleanSlug })

    console.log('[DEBUG][detail] Pages found:', pages?.length ?? 0, JSON.stringify(pages))

    if (!pages || pages.length === 0) return { page: null, model: null, projectId: '', tenantId: '' }

    const rawPage = pages[0] as any

    const page: PageRecord = {
      ...rawPage,
      template_type: rawPage.template_type ?? rawPage.template ?? 'list',
      model_id:      rawPage.model_id      ?? rawPage.model      ?? null,
    }

    console.log('[DEBUG][detail] Resolved page:', JSON.stringify(page))

    let model: ModelRecord | null = null
    if (page.model_id) {
      const models = await adapter.readAll!(dbConfig, 'nxf_system_models', { sm_id: page.model_id })

      console.log('[DEBUG][detail] Models found for model_id', page.model_id, ':', models?.length ?? 0)

      if (models && models.length > 0) {
        const raw = models[0] as any
        let schema = raw.schema
        if (Array.isArray(schema)) {
          schema = { version: '1.0', columns: schema, hooks: [], integrations: [] }
        } else if (schema && !schema.columns) {
          schema = { version: '1.0', columns: [], hooks: [], integrations: [] }
        }
        model = { ...raw, schema }
      }
    }

    return {
      page,
      model,
      projectId: page.project_id ?? '',
      tenantId:  page.tenant_id  ?? '',
    }
  } catch (err) {
    console.error('[console/[slug]/[id]] loadPageAndModel:', err)
    return { page: null, model: null, projectId: '', tenantId: '' }
  }
}

async function getAuthToken(): Promise<string> {
  const cookieStore = await cookies()
  return cookieStore.get('access_token')?.value ?? ''
}

export default async function ConsoleDetailPage({ params }: DetailPageProps) {
  const { slug, id } = await params

  console.log('[DEBUG][detail] ConsoleDetailPage rendering for slug:', slug, 'id:', id)

  const { page, model, projectId, tenantId } = await loadPageAndModel(slug)
  const authToken = await getAuthToken()

  console.log('[DEBUG][detail] page found:', !!page, '| model found:', !!model)

  if (!page || !model) {
    console.log('[DEBUG][detail] Missing page or model — calling notFound()')
    notFound()
  }

  return (
    <DetailTemplate
      page={page}
      model={model}
      projectId={projectId}
      tenantId={tenantId}
      authToken={authToken}
      recordId={id}
    />
  )
}