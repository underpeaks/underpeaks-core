// ============================================================
// FILE: app/api/users/[id]/route.ts
// PURPOSE: GET single user. project resolved via user_id.
//          Password reset handled client-side via Firebase SDK.
// ============================================================

import { NextRequest, NextResponse } from 'next/server';
import { NxfUser } from '@/app/[locale]/console/types/users';
import { getConfiguredAdapter } from '@/app/lib/getConfiguredAdapter';


export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const adapter  = getConfiguredAdapter();
    const dbConfig = adapter.config;
    const { searchParams } = new URL(req.url);
    const user_id = searchParams.get('user_id'); // requestor for project resolution

    if (!user_id) {
      return NextResponse.json(
        { error: 'user_id is required' },
        { status: 400 }
      );
    }

    const allUsers = (await adapter.readAll!(dbConfig, 'nxf_users')) as NxfUser[];
    const user     = allUsers.find((u) => u.user_id === params.id);

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    return NextResponse.json({ user });
  } catch (error) {
    console.error('[GET /api/users/[id]]', error);
    return NextResponse.json(
      { error: 'Failed to fetch user' },
      { status: 500 }
    );
  }
}