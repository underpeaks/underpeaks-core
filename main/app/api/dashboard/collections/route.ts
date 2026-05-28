import { NextRequest, NextResponse } from 'next/server';
import { DashboardCollection } from '@/app/[locale]/console/types/dashboard';
import { getConfiguredAdapter } from '@/app/lib/getConfiguredAdapter ';


// System collections always available
const SYSTEM_COLLECTIONS: DashboardCollection[] = [
  { key: 'nxf_users',                   label: 'Users',          system: true },
  { key: 'nxf_pages',                   label: 'Pages',          system: true },
  { key: 'nxf_system_models',           label: 'Models',         system: true },
  { key: 'nxf_menu',                    label: 'Menu Items',     system: true },
  { key: 'nxf_storage',                 label: 'Media Files',    system: true },
  { key: 'nxf_system_activity_logs',    label: 'Activity Logs',  system: true },
  { key: 'nxf_themes',                  label: 'Themes',         system: true },
];

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const userId = searchParams.get('user_id');
  if (!userId) return NextResponse.json({ error: 'user_id required' }, { status: 400 });

  try {
    const adapter  = getConfiguredAdapter();
    const dbConfig = adapter.config;

    // Load developer-created models to get their collection names
    let developerCollections: DashboardCollection[] = [];
    try {
      const models = await adapter.readAll!(dbConfig, 'nxf_system_models');
      developerCollections = (models as any[])
        .filter((m) => m.collection_name || m.name)
        .map((m) => ({
          key:    m.collection_name ?? m.name,
          label:  m.label ?? m.title ?? m.collection_name ?? m.name,
          system: false,
        }));
    } catch {
      // models table may be empty — not fatal
    }

    // Deduplicate — developer model collection names should not clash with system ones
    const systemKeys = new Set(SYSTEM_COLLECTIONS.map((c) => c.key));
    const filtered   = developerCollections.filter((c) => !systemKeys.has(c.key));

    return NextResponse.json({
      collections: [...SYSTEM_COLLECTIONS, ...filtered],
    });
  } catch (err: any) {
    console.error('[dashboard/collections]', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}