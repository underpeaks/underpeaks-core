/**
 * Admin dynamic page router
 * Location: app/[locale]/console/[slug]/page.tsx
 *
 * Reads page from DB by slug, loads linked model, picks template from
 * the registry, renders it. Behind console layout's admin auth.
 *
 * Features:
 *   - Single-format slug lookup (canonical: no leading slash in DB)
 *   - Legacy field fallback (template/template_type, model/model_id)
 *     while old records get migrated through edit/save
 *   - "No model linked" placeholder for data templates without a model
 *   - LockedPlaceholder for hosted-plan templates
 *
 * URL examples:
 *   /en/console/inventory
 *   /en/console/products
 *   /en/console/orders
 */

import { cookies }              from 'next/headers'
import { notFound }             from 'next/navigation'
import { getConfiguredAdapter } from '@/app/lib/getConfiguredAdapter '
import {
  getTemplate, templateRequiresModel,
}                                from './components/templateRegistry'
import LockedPlaceholder         from './components/LockedPlaceholder'
import NoModelLinked             from './components/NoModelLinked'
import type { PageRecord, ModelRecord } from './types'

interface PageProps {
  params: Promise<{ locale: string; slug: string }>
}

// ---------------------------------------------------------------------------
// Load page + linked model from DB
//
// Slugs are stored WITHOUT a leading slash (canonical format).
// We still strip any leading slash from the URL param defensively in case
// someone types one manually, but the DB lookup is single-format.
// ---------------------------------------------------------------------------

async function loadPageAndModel(slug: string): Promise<{
  page:      PageRecord | null
  model:     ModelRecord | null
  projectId: string
  tenantId:  string
}> {
  try {
    const adapter   = await getConfiguredAdapter()
    const dbConfig  = (adapter as any).dbConfig

    // Defensive strip — DB stores slugs without leading slash
    const cleanSlug = slug.startsWith('/') ? slug.slice(1) : slug

    const pages = await adapter.readAll!(dbConfig, 'nxf_pages', { slug: cleanSlug })
    if (!pages || pages.length === 0) {
      return { page: null, model: null, projectId: '', tenantId: '' }
    }

    const rawPage = pages[0] as any

    // Normalize the page — handle legacy field names so old records
    // (saved before the field rename) still work until migrated
    const page: PageRecord = {
      ...rawPage,
      template_type: rawPage.template_type ?? rawPage.template ?? 'list',
      model_id:      rawPage.model_id      ?? rawPage.model      ?? null,
    }

    // Load the linked model
    let model: ModelRecord | null = null
    if (page.model_id) {
      const models = await adapter.readAll!(
        dbConfig,
        'nxf_system_models',
        { sm_id: page.model_id }
      )
      if (models && models.length > 0) {
        const raw = models[0] as any
        let schema = raw.schema

        // Normalize schema — handle legacy array and new versioned object
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

// ---------------------------------------------------------------------------
// Auth token
// ---------------------------------------------------------------------------

async function getAuthToken(): Promise<string> {
  const cookieStore = await cookies()
  return cookieStore.get('access_token')?.value ?? ''
}

// ---------------------------------------------------------------------------
// Page component
// ---------------------------------------------------------------------------

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

  // Locked template (hosted-plan only)
  if (registryEntry.locked) {
    return <LockedPlaceholder templateName={registryEntry.name} page={page} />
  }

  const Template = registryEntry.component

  // Data templates require a linked model
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