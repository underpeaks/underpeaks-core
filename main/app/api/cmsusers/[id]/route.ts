// File: app/api/cmsusers/[id]/route.ts

// ============================================================
// FILE: app/api/cmsusers/[id]/route.ts
// PURPOSE: GET single user. project resolved via user_id.
//          Password reset handled client-side via Firebase SDK.
//          Credential fields (password hash, tokens, secrets) are
//          never returned.
// ============================================================

import { NextRequest, NextResponse } from 'next/server';
import { NxfUser } from '@/app/[locale]/console/types/users';
import { getConfiguredAdapter } from '@/app/lib/getConfiguredAdapter';

// Any field whose name matches this is removed from the response.
const SENSITIVE_FIELD = /password|token|secret/i

function stripSensitive(user: NxfUser): Record<string, any> {
  const safe: Record<string, any> = {}
  for (const [key, value] of Object.entries(user as Record<string, any>)) {
    if (!SENSITIVE_FIELD.test(key)) safe[key] = value
  }
  return safe
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

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
    const user     = allUsers.find((u) => u.user_id === id);

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    return NextResponse.json({ user: stripSensitive(user) });
  } catch (error) {
    console.error('[GET /api/cmsusers/[id]]', error);
    return NextResponse.json(
      { error: 'Failed to fetch user' },
      { status: 500 }
    );
  }
}