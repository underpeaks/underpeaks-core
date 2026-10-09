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

    // Filter in code, not through readAll's filter argument: only some
    // adapters (Postgres, Firebase) honour it. MySQL, MongoDB and Supabase
    // ignore it and return the whole table, which made pages[0] the wrong
    // row. Prefer the admin page for this slug, fall back to any match.
    const allPages = await adapter.readAll!(dbConfig, 'nxf_pages')
    const matches  = (allPages ?? []).filter((p: any) => p.slug === cleanSlug)
    const pages    = matches.some((p: any) => p.page_type === 'admin')
      ? matches.filter((p: any) => p.page_type === 'admin')
      : matches

    if (!pages || pages.length === 0) return { page: null, model: null, projectId: '', tenantId: '' }

    const rawPage = pages[0] as any

    const page: PageRecord = {
      ...rawPage,
      template_type: rawPage.template_type ?? rawPage.template ?? 'list',
      model_id:      rawPage.model_id      ?? rawPage.model      ?? null,
    }

    let model: ModelRecord | null = null
    if (page.model_id) {
      const allModels = await adapter.readAll!(dbConfig, 'nxf_system_models')
      const models    = (allModels ?? []).filter((m: any) => m.sm_id === page.model_id)

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

  if (!page || !model) {
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