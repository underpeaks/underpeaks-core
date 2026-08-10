// ============================================================
// FILE: app/api/users/[id]/login-history/route.ts
// PURPOSE: GET login/logout/online events for a specific user
//          from nxf_system_activity_logs. Uses correct
//          readAll(config, collection) signature.
// ============================================================

import { NextRequest, NextResponse } from 'next/server';
import { LoginHistoryEvent } from '@/app/[locale]/console/types/users';
import { getConfiguredAdapter } from '@/app/lib/getConfiguredAdapter';


const AUTH_ACTIONS = new Set([
  'user_login',
  'user_logout',
  'user_online',
  'user_offline',
]);

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const adapter  = getConfiguredAdapter();
    const dbConfig = adapter.config;
    const { searchParams } = new URL(req.url);
    const user_id = searchParams.get('user_id'); // requestor

    if (!user_id) {
      return NextResponse.json(
        { error: 'user_id is required' },
        { status: 400 }
      );
    }

    const allLogs = (await adapter.readAll!(
      dbConfig,
      'nxf_system_activity_logs'
    )) as LoginHistoryEvent[];

    const authLogs = allLogs
      .filter(
        (log) =>
          log.user_id === params.id &&
          AUTH_ACTIONS.has(log.action)
      )
      .sort(
        (a, b) =>
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      )
      .slice(0, 50);

    return NextResponse.json({ history: authLogs });
  } catch (error) {
    console.error('[GET /api/users/[id]/login-history]', error);
    return NextResponse.json(
      { error: 'Failed to fetch login history' },
      { status: 500 }
    );
  }
}