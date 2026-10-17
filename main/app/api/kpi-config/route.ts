// app/api/kpi-config/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { KpiPageConfig }             from '@/app/[locale]/console/kpi/kpi';
import { getConfiguredAdapter } from '@/app/lib/getConfiguredAdapter';
import { requireSessionUser }   from '@/app/lib/getSessionUser';

interface StoredKpiConfig extends KpiPageConfig {
  id?:      string;
  widgets?: unknown[];
}

async function getProject(
  adapter:   ReturnType<typeof getConfiguredAdapter>,
  dbConfig:  any
) {
  try {
    const projects = await adapter.readAll!(dbConfig, 'nxf_system_projects');
    if (!projects || projects.length === 0) return null;
    return projects[0] as { project_id?: string; id?: string; ten_id?: string };
  } catch {
    return null;
  }
}

/**
 * Finds the config for this page in THIS project only. Rows saved without a
 * project_id (older saves) still match; a config that belongs to another
 * project never does.
 */
function findConfig(
  allConfigs: StoredKpiConfig[],
  page:       string,
  projectId:  string
): StoredKpiConfig | null {
  return (
    allConfigs.find(
      (c) => c.page === page && (c.project_id === projectId || !c.project_id)
    ) ?? null
  );
}

// ── GET /api/kpi-config?page=xxx ───────────────────────────
export async function GET(req: NextRequest) {
  try {
    // Signed-in console users only. A user_id in the URL is ignored.
    const session = await requireSessionUser(req);
    if (!session.ok) return session.response;

    const adapter  = getConfiguredAdapter();
    const dbConfig = adapter.config;
    const { searchParams } = new URL(req.url);
    const page    = searchParams.get('page');

    if (!page) {
      return NextResponse.json(
        { error: 'page is required' },
        { status: 400 }
      );
    }

    const project = await getProject(adapter, dbConfig);
    if (!project) return NextResponse.json({ config: null });

    const projectId = project.project_id || project.id || '';

    const allConfigs = (await adapter.readAll!(
      dbConfig,
      'nxf_system_kpi_configs'
    )) as StoredKpiConfig[];

    const config = findConfig(allConfigs, page, projectId);

    return NextResponse.json({ config });
  } catch (error) {
    console.error('[GET /api/kpi-config]', error);
    return NextResponse.json(
      { error: 'Failed to fetch KPI config' },
      { status: 500 }
    );
  }
}

// ── POST /api/kpi-config ───────────────────────────────────
export async function POST(req: NextRequest) {
  try {
    // Signed-in console users only. A user_id in the body is ignored.
    const session = await requireSessionUser(req);
    if (!session.ok) return session.response;

    const adapter  = getConfiguredAdapter();
    const dbConfig = adapter.config;

    const body = await req.json();
    const { page } = body;

    // Always read from 'blocks'. Dashboard previously sent 'kpi_blocks'
    // as well — support both so old saved docs still work on load,
    // but only ever write 'blocks' so there is one source of truth.
    const kpiBlocks: unknown[] = body.blocks ?? body.kpi_blocks ?? [];
    const widgets:   unknown[] = body.widgets ?? [];

    if (!page) {
      return NextResponse.json(
        { error: 'page is required' },
        { status: 400 }
      );
    }

    // Validate KPI bar limits
    const totalKpis = (kpiBlocks as { kpis?: unknown[] }[]).reduce(
      (sum, b) => sum + (b.kpis?.length ?? 0), 0
    );
    if (totalKpis > 5) {
      return NextResponse.json(
        { error: 'Maximum 5 KPIs allowed per page' },
        { status: 400 }
      );
    }
    for (const block of kpiBlocks as { kpis?: unknown[]; block_id: string }[]) {
      if ((block.kpis?.length ?? 0) > 4) {
        return NextResponse.json(
          { error: `Block ${block.block_id} exceeds 4 KPIs maximum` },
          { status: 400 }
        );
      }
    }

    const project   = await getProject(adapter, dbConfig);
    const projectId = project?.project_id ?? project?.id ?? '';
    const tenantId  = project?.ten_id ?? '';
    const now       = new Date().toISOString();

    const allConfigs = (await adapter.readAll!(
      dbConfig,
      'nxf_system_kpi_configs'
    )) as StoredKpiConfig[];

    const existing = findConfig(allConfigs, page, projectId);

    if (existing) {
      // Firestore rows carry a document ID (existing.id) and are updated by it.
      // Postgres, MySQL and Mongo rows have no such ID, so they are updated by
      // their business key (config_id).
      const docId = existing.id ?? existing.config_id;
      if (existing.id) {
        await adapter.update!(
          dbConfig,
          'nxf_system_kpi_configs',
          docId,
          { blocks: kpiBlocks, widgets, updated_at: now }
        );
      } else {
        await adapter.update!(
          dbConfig,
          'nxf_system_kpi_configs',
          docId,
          { blocks: kpiBlocks, widgets, updated_at: now },
          'config_id'
        );
      }
      console.info(`[POST /api/kpi-config] Updated "${docId}" for page "${page}"`);
      return NextResponse.json({ config_id: existing.config_id, updated: true });
    }

    // Create new doc — Firestore generates the document ID,
    // we store config_id as a field so we can reference it later.
    const newConfigId = crypto.randomUUID();
    await adapter.create!(dbConfig, 'nxf_system_kpi_configs', {
      config_id:  newConfigId,
      page,
      project_id: projectId,
      tenant_id:  tenantId,
      blocks:     kpiBlocks,
      widgets,
      updated_at: now,
    });
    console.info(`[POST /api/kpi-config] Created "${newConfigId}" for page "${page}"`);
    return NextResponse.json({ config_id: newConfigId, updated: false });

  } catch (error) {
    console.error('[POST /api/kpi-config]', error);
    return NextResponse.json(
      { error: 'Failed to save KPI config' },
      { status: 500 }
    );
  }
}