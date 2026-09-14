// File: app/lib/codegen/assembleProjectData.ts (Core)

/**
 * assembleProjectData
 *
 * Core's local equivalent of Studio's project-data/route.ts. Reads models,
 * pages, routes, and theme directly from Core's own configured adapter
 * (whichever of the 5 DB types this instance runs), and assembles the same
 * ProjectData shape hosted's generator packages expect.
 *
 * IMPORTANT: readAll(config, table) takes NO filter argument on 3 of the
 * 5 adapters (Mongo, MySQL, Firebase) — only Postgres/Supabase accept one.
 * To behave identically across all adapters, this always fetches
 * everything and filters by project_id in JS afterward, never relying on
 * adapter-level filtering.
 *
 * Core has no API Builder or integrations (per product decision), so
 * endpoints/integrations are always omitted from the returned ProjectData.
 *
 * FIX (Core parity): pages/routes mappers were dropping nav_settings and
 * attach_to even when present on the row — Navigator triggers that depend
 * on attach_to (card-tap/button/primary-action) and nav-bar rendering that
 * depends on nav_settings would silently never match on Core-generated
 * output. Requires the nxf_page_routes.attach_to and nxf_pages.nav_settings
 * columns to exist — run the migration before relying on this.
 *
 * FIX (single-tenant ID mismatch): the `projectId` argument passed in comes
 * from Studio's project_id (embedded in the license key / phone-home
 * response), which is NEVER the same value as this Core instance's own
 * local nxf_system_projects.project_id — nothing reconciles the two IDs,
 * and nothing should have to, because Core's local Postgres only ever
 * holds ONE project. So: stop matching/filtering the project row by the
 * incoming projectId entirely — just take whatever single local project
 * row exists. All other tables (models/pages/routes/theme) are then
 * filtered against THAT row's own project_id, not the argument, so they
 * still resolve correctly.
 */

import { getConfiguredAdapter } from '@/app/lib/getConfiguredAdapter'

export async function assembleProjectData(projectId: string) {
  const adapter  = getConfiguredAdapter()
  const dbConfig = adapter.config

  const [allProjects, allPages, allModels, allRoutes, allThemes] = await Promise.all([
    adapter.readAll!(dbConfig, 'nxf_system_projects'),
    adapter.readAll!(dbConfig, 'nxf_pages'),
    adapter.readAll!(dbConfig, 'nxf_system_models'),
    adapter.readAll!(dbConfig, 'nxf_page_routes'),
    adapter.readAll!(dbConfig, 'nxf_themes'),
  ])

  // Single-tenant: don't match against the passed-in projectId at all —
  // just take the one local project row that exists.
  const projectRow = (allProjects ?? [])[0]
  if (!projectRow) {
    throw new Error('Project not found')
  }

  // Use the LOCAL row's own project_id for all subsequent filtering —
  // NOT the argument passed into this function.
  const localProjectId = projectRow.project_id
  const tenantId = projectRow.tenant_id ?? null

  const models = (allModels ?? [])
    .filter((m: any) => m.project_id === localProjectId)
    .map((m: any) => {
      const rawSchema = m.schema
      const schema =
        rawSchema && typeof rawSchema === 'object' && Array.isArray(rawSchema.columns)
          ? rawSchema
          : {
              version:      '1.0',
              columns:      Array.isArray(rawSchema) ? rawSchema : [],
              hooks:        [],
              integrations: [],
            }

      return {
        sm_id:      m.sm_id || m.id,
        name:       m.name,
        slug:       m.slug ?? undefined,
        schema,
        project_id: m.project_id,
        tenant_id:  tenantId,
      }
    })

  // Core has no separate admin/public page distinction the way hosted's
  // visibility/page_type split does — Core's nxf_pages are already
  // console-only by construction (per architecture: real physical tables,
  // no shard/CMS split). Still exclude anything explicitly flagged admin,
  // in case that convention is ever reused here.
  const pages = (allPages ?? [])
    .filter((p: any) =>
      p.project_id === localProjectId &&
      p.page_type  !== 'admin' &&
      p.visibility !== 'admin'
    )
    .map((p: any) => ({
      page_id:       p.page_id ?? p.id,
      name:          p.title ?? p.name ?? '',
      slug:          p.slug ?? '',
      template_type: p.template_type ?? 'list',
      nav_type:      p.nav_type ?? 'none',
      nav_settings:  p.nav_settings ?? null,
      model_id:      p.model_id ?? null,
      visibility:    p.visibility ?? 'public',
    }))

  const routes = (allRoutes ?? [])
    .filter((r: any) => r.project_id === localProjectId)
    .map((r: any) => ({
      route_id:     r.route_id,
      from_page_id: r.from_page_id,
      to_page_id:   r.to_page_id,
      trigger:      r.trigger ?? 'tap',
      label:        r.label ?? null,
      attach_to:    r.attach_to ?? null,
    }))

  const themeRow = (allThemes ?? []).find(
    (t: any) => t.project_id === localProjectId
  )

  const theme = {
    colours: themeRow?.colours ?? {
      primary:        '#0A0A0A',
      'primary-fg':   '#FFFFFF',
      secondary:      '#404040',
      'secondary-fg': '#FFFFFF',
      accent:         '#6366F1',
      background:     '#F9FAFB',
      surface:        '#FFFFFF',
      border:         '#E5E7EB',
      success:        '#22C55E',
      warning:        '#F59E0B',
      danger:         '#EF4444',
      text:           '#111827',
      'text-muted':   '#6B7280',
    },
    typography: themeRow?.typography ?? {
      headingFont:   'Inter',
      bodyFont:      'Inter',
      monoFont:      'JetBrains Mono',
      headingWeight: '700',
      bodyWeight:    '400',
      scale:         'default',
    },
    spacing: themeRow?.spacing ?? {
      radius:  'md',
      density: 'default',
      shadow:  'sm',
    },
  }

  return {
    project_id:    localProjectId,
    project_name:  projectRow.name ?? 'Untitled Project',
    project_type:  projectRow.project_type ?? 'custom',
    models,
    pages,
    routes,
    theme,
    state_manager: 'riverpod' as const,
    source:        'core' as const,
    // No endpoints/integrations — Core doesn't support either.
  }
}