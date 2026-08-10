import { getConfiguredAdapter } from '@/app/lib/getConfiguredAdapter';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const userId = searchParams.get('user_id');
  if (!userId) return NextResponse.json({ error: 'user_id required' }, { status: 400 });

  try {
    const adapter  = getConfiguredAdapter();
    const dbConfig = adapter.config;

    // Supabase and Firebase support concurrent queries safely.
    // Postgres and MySQL use a single shared client — concurrent queries
    // deadlock. Run sequentially for those adapters.
    const isSequential = dbConfig.type === 'postgres' || dbConfig.type === 'mysql'

    let users, pages, models, menuItems, mediaFiles, activityLogs, projects

    if (isSequential) {
      users        = await adapter.readAll!(dbConfig, 'nxf_users')
      pages        = await adapter.readAll!(dbConfig, 'nxf_pages')
      models       = await adapter.readAll!(dbConfig, 'nxf_system_models')
      menuItems    = await adapter.readAll!(dbConfig, 'nxf_menus')
      mediaFiles   = await adapter.readAll!(dbConfig, 'nxf_storage')
      activityLogs = await adapter.readAll!(dbConfig, 'nxf_system_activity_logs')
      projects     = await adapter.readAll!(dbConfig, 'nxf_system_projects')
    } else {
      ;[users, pages, models, menuItems, mediaFiles, activityLogs, projects] =
        await Promise.all([
          adapter.readAll!(dbConfig, 'nxf_users'),
          adapter.readAll!(dbConfig, 'nxf_pages'),
          adapter.readAll!(dbConfig, 'nxf_system_models'),
          adapter.readAll!(dbConfig, 'nxf_menus'),
          adapter.readAll!(dbConfig, 'nxf_storage'),
          adapter.readAll!(dbConfig, 'nxf_system_activity_logs'),
          adapter.readAll!(dbConfig, 'nxf_system_projects'),
        ])
    }

    const project = projects[0] ?? null;

    // ── User map for enriching activity ────────────────────────
    const userMap: Record<string, string> = {};
    users.forEach((u: any) => {
      userMap[u.user_id] = u.full_name || u.user_email || u.user_id;
    });

    // ── Recent activity — last 10 ───────────────────────────────
    const sortedLogs = [...activityLogs].sort((a: any, b: any) => {
      const aT = a.created_at?.toMillis?.() ?? new Date(a.created_at).getTime();
      const bT = b.created_at?.toMillis?.() ?? new Date(b.created_at).getTime();
      return bT - aT;
    });

    const recentActivity = sortedLogs.slice(0, 10).map((log: any) => ({
      id:         log.sal_id ?? log.id,
      user_id:    log.user_id,
      user_label: userMap[log.user_id] ?? log.user_id,
      action:     log.action,
      context:    log.context ?? {},
      created_at: log.created_at?.toMillis?.()
                    ? new Date(log.created_at.toMillis()).toISOString()
                    : log.created_at,
    }));

    // ── Recent pages — last 5 modified ──────────────────────────
    const recentPages = [...pages]
      .sort((a: any, b: any) => {
        const aT = a.updated_at?.toMillis?.() ?? new Date(a.updated_at ?? 0).getTime();
        const bT = b.updated_at?.toMillis?.() ?? new Date(b.updated_at ?? 0).getTime();
        return bT - aT;
      })
      .slice(0, 5)
      .map((p: any) => ({
        id:         p.id ?? p.page_id,
        title:      p.title ?? p.name ?? 'Untitled',
        slug:       p.slug,
        page_type:  p.page_type,
        updated_at: p.updated_at?.toMillis?.()
                      ? new Date(p.updated_at.toMillis()).toISOString()
                      : p.updated_at,
      }));

    // ── Storage bytes ────────────────────────────────────────────
    const storageBytes = mediaFiles.reduce(
      (sum: number, f: any) => sum + (Number(f.file_size) || 0), 0
    );

    return NextResponse.json({
      counts: {
        users:         users.length,
        active_users:  users.filter((u: any) => u.is_logged_in === true).length,
        admin_users:   users.filter((u: any) => u.role === 'admin').length,
        pages:         pages.length,
        models:        models.length,
        menu_items:    menuItems.length,
        media_files:   mediaFiles.length,
        storage_bytes: storageBytes,
      },
      project: project ? {
        project_id:   project.project_id ?? project.id,
        project_name: project.project_name ?? project.name ?? 'Unnamed Project',
        db_type:      process.env.NEXT_PUBLIC_DB_TYPE ?? 'firebase',
      } : null,
      recent_activity: recentActivity,
      recent_pages:    recentPages,
    });
  } catch (err: any) {
    console.error('[dashboard/stats]', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}