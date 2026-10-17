// app/api/cmsusers/[id]/login-history/route.ts

// ============================================================
// FILE: app/api/cmsusers/[id]/login-history/route.ts
// PURPOSE: GET login/logout/online events for a specific user
//          from nxf_system_activity_logs. Uses correct
//          readAll(config, collection) signature.
//          The caller is taken from the Bearer token — a user_id
//          in the URL is ignored.
// ============================================================

import { NextRequest, NextResponse } from 'next/server';
import { LoginHistoryEvent } from '@/app/[locale]/console/types/users';
import { getConfiguredAdapter } from '@/app/lib/getConfiguredAdapter';
import { requireSessionUser }   from '@/app/lib/getSessionUser';


const AUTH_ACTIONS = new Set([
  'user_login',
  'user_logout',
  'user_online',
  'user_offline',
]);

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireSessionUser(req);
    if (!session.ok) return session.response;

    const { id } = await params;

    const adapter  = getConfiguredAdapter();
    const dbConfig = adapter.config;

    const allLogs = (await adapter.readAll!(
      dbConfig,
      'nxf_system_activity_logs'
    )) as LoginHistoryEvent[];

    const authLogs = allLogs
      .filter(
        (log) =>
          log.user_id === id &&
          AUTH_ACTIONS.has(log.action)
      )
      .sort(
        (a, b) =>
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      )
      .slice(0, 10);

    return NextResponse.json({ history: authLogs });
  } catch (error) {
    console.error('[GET /api/cmsusers/[id]/login-history]', error);
    return NextResponse.json(
      { error: 'Failed to fetch login history' },
      { status: 500 }
    );
  }
}