/**
 * Admin dynamic page router
 * Location: app/[locale]/console/[slug]/page.tsx
 */

import { cookies }              from 'next/headers'
import { notFound }             from 'next/navigation'
import { getConfiguredAdapter } from '@/app/lib/getConfiguredAdapter'
import {
  getTemplate, templateRequiresModel,
}                                from './components/templateRegistry'
import LockedPlaceholder         from './components/LockedPlaceholder'
import NoModelLinked             from './components/NoModelLinked'
import type { PageRecord, ModelRecord } from './types'

interface PageProps {
  params: Promise<{ locale: string; slug: string }>
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

    const cleanSlug = slug.startsWith('/') ? slug.slice(1) : slug

    // FIX: adapter.readAll's filter argument is being ignored by the
    // Postgres adapter (it always runs SELECT * with no WHERE clause) —
    // this returned the whole table every time, so pages[0] grabbed
    // whatever row happened to be first (e.g. the splash page) instead
    // of the actual slug requested. Filtering here client-side, on the
    // full result set, sidesteps that broken filter without touching the
    // shared adapter — matching only admin pages for this exact slug.
    const allPages = await adapter.readAll!(dbConfig, 'nxf_pages')
    const pages = (allPages ?? []).filter(
      (p: any) => p.slug === cleanSlug && p.page_type === 'admin'
    )

    if (!pages || pages.length === 0) {
      return { page: null, model: null, projectId: '', tenantId: '' }
    }

    const rawPage = pages[0] as any

    const page: PageRecord = {
      ...rawPage,
      template_type: rawPage.template_type ?? rawPage.template ?? 'list',
      model_id:      rawPage.model_id      ?? rawPage.model      ?? null,
    }

    let model: ModelRecord | null = null
    if (page.model_id) {
      const allModels = await adapter.readAll!(dbConfig, 'nxf_system_models')
      const models = (allModels ?? []).filter((m: any) => m.sm_id === page.model_id)

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
    console.error('[console/[slug]] loadPageAndModel error:', err)
    return { page: null, model: null, projectId: '', tenantId: '' }
  }
}

async function getAuthToken(): Promise<string> {
  const cookieStore = await cookies()
  return cookieStore.get('access_token')?.value ?? ''
}

export default async function ConsoleDynamicPage({ params }: PageProps) {
  const { locale, slug } = await params

  const { page, model, projectId, tenantId } = await loadPageAndModel(slug)
  const authToken = await getAuthToken()

  if (!page) notFound()

  const registryEntry = getTemplate(page.template_type)
  if (!registryEntry) {
    console.error('[console/[slug]] No registry entry for template_type:', page.template_type)
    notFound()
  }

  if (registryEntry.locked) {
    return <LockedPlaceholder templateName={registryEntry.name} page={page} />
  }

  const Template = registryEntry.component

  if (templateRequiresModel(page.template_type) && !model) {
    return (
      <NoModelLinked
        locale={locale}
        templateName={registryEntry.name}
        pageName={page.name ?? page.title ?? 'This page'}
      />
    )
  }

  return (
    <Template
      page={page}
      model={model ?? undefined}
      projectId={projectId}
      tenantId={tenantId}
      authToken={authToken}
    />
  )
}