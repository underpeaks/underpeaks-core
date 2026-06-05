/**
 * Admin detail page router
 * Location: app/[locale]/console/[slug]/[id]/page.tsx
 */

import { cookies }            from 'next/headers'
import { notFound }           from 'next/navigation'
import DetailTemplate         from '../components/admin/DetailTemplate'
import type { PageRecord, ModelRecord } from '../types'
import { getConfiguredAdapter } from '@/app/lib/getConfiguredAdapter '

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

    const normalized = slug.startsWith('/') ? slug : `/${slug}`

    const pages = await adapter.readAll!(dbConfig, 'nxf_pages', { slug: normalized })
    if (!pages || pages.length === 0) return { page: null, model: null, projectId: '', tenantId: '' }

    const page = pages[0] as PageRecord

    let model: ModelRecord | null = null
    if (page.model_id) {
      const models = await adapter.readAll!(dbConfig, 'nxf_system_models', { sm_id: page.model_id })
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

  const { page, model, projectId, tenantId } = await loadPageAndModel(slug)
  const authToken = await getAuthToken()

  if (!page || !model) notFound()

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