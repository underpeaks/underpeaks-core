// app/api/cmsusers/route.ts

import { NextRequest, NextResponse }              from 'next/server'
import { getAvatarColour, getAvatarInitials }     from '@/app/lib/avatarColour'
import { NxfUser, UpdateUserPayload, UserListRow } from '@/app/[locale]/console/types/users'
import { getConfiguredAdapter } from '@/app/lib/getConfiguredAdapter '

async function getSupabaseAdminClient(dbConfig: any) {
  const { createClient } = await import('@supabase/supabase-js')
  return createClient(
    dbConfig.supabaseUrl!,
    dbConfig.serviceRoleKey ?? dbConfig.anonKey!
  )
}

// ── GET /api/cmsusers?user_id=xxx ──────────────────────────────────────────

export async function GET(req: NextRequest) {
  try {
    const adapter  = getConfiguredAdapter()
    const dbConfig = adapter.config
    const { searchParams } = new URL(req.url)
    const user_id = searchParams.get('user_id')

    if (!user_id) {
      return NextResponse.json(
        { error: 'user_id is required' },
        { status: 400 }
      )
    }

    const allUsers = (await adapter.readAll!(dbConfig, 'nxf_users')) as NxfUser[]

    let activityLogs: Array<{
      user_id:    string
      action:     string
      created_at: string
    }> = []

    try {
      const logs = await adapter.readAll!(dbConfig, 'nxf_system_activity_logs')
      activityLogs = logs as typeof activityLogs
    } catch {
      // Activity logs may not exist yet — not a fatal error
    }

    const lastLoginMap = new Map<string, string>()
    const sortedLogs = [...activityLogs].sort(
      (a, b) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    )
    for (const log of sortedLogs) {
      if (log.action === 'user_login' && !lastLoginMap.has(log.user_id)) {
        lastLoginMap.set(log.user_id, log.created_at)
      }
    }

    const rows: UserListRow[] = allUsers.map((u) => {
      const seed        = u.user_id || u.user_email
      const displayName = u.full_name?.trim() || u.user_email?.split('@')[0]
      const initials    = getAvatarInitials(
        u.full_name,
        undefined,
        undefined,
        u.user_email
      )
      const colour = getAvatarColour(seed)

      return {
        user_id:         u.user_id,
        display_name:    displayName,
        full_name:       u.full_name,
        user_email:      u.user_email,
        role:            u.role,
        status:          u.status,
        created_at:      u.created_at,
        last_login:      u.last_login ?? lastLoginMap.get(u.user_id),
        is_logged_in:    u.is_logged_in ?? false,
        avatar_initials: initials,
        avatar_colour:   colour,
      }
    })

    return NextResponse.json({ users: rows })
  } catch (error) {
    console.error('[GET /api/cmsusers]', error)
    return NextResponse.json(
      { error: 'Failed to fetch users' },
      { status: 500 }
    )
  }
}

// ── PATCH /api/cmsusers ────────────────────────────────────────────────────

export async function PATCH(req: NextRequest) {
  try {
    const adapter  = getConfiguredAdapter()
    const dbConfig = adapter.config

    const body = (await req.json()) as UpdateUserPayload & {
      user_id:        string
      target_user_id: string
      is_logged_in?:  boolean
      last_login?:    string
    }

    const { user_id, target_user_id, role, status, is_logged_in, last_login } = body

    if (!user_id || !target_user_id) {
      return NextResponse.json(
        { error: 'user_id and target_user_id are required' },
        { status: 400 }
      )
    }

    if (role && role !== 'admin') {
      const allUsers = (await adapter.readAll!(dbConfig, 'nxf_users')) as NxfUser[]
      const remainingAdmins = allUsers.filter(
        (u) => u.role === 'admin' && u.user_id !== target_user_id
      ).length

      if (remainingAdmins === 0) {
        return NextResponse.json(
          { error: 'Cannot demote the last admin. Promote another user first.' },
          { status: 400 }
        )
      }
    }

    const updates: Partial<NxfUser> = {
      updated_at: new Date().toISOString(),
    }

    if (role         !== undefined) updates.role         = role
    if (status       !== undefined) updates.status       = status
    if (is_logged_in !== undefined) updates.is_logged_in = is_logged_in
    if (last_login   !== undefined) updates.last_login   = last_login

    if (dbConfig.type === 'supabase') {
      const supabase = await getSupabaseAdminClient(dbConfig)

      const { data: updatedUser, error } = await supabase
        .from('nxf_users')
        .update(updates)
        .eq('user_id', target_user_id)
        .select()

      if (error) {
        console.error('[PATCH /api/cmsusers] Supabase update error:', error.message)
        throw new Error(error.message)
      }

      return NextResponse.json({ success: true, user: updatedUser?.[0] ?? null })
    }

    if (dbConfig.type === 'mongodb') {
      const allUsers  = (await adapter.readAll!(dbConfig, 'nxf_users')) as NxfUser[]
      const targetDoc = allUsers.find((u) => u.user_id === target_user_id)
      if (!targetDoc) return NextResponse.json({ error: 'User not found' }, { status: 404 })

      const docId = (targetDoc as any)._id?.toString() ?? (targetDoc as any).id
      await adapter.update!(dbConfig, 'nxf_users', docId, updates)
      return NextResponse.json({ success: true, user: targetDoc })
    }

    if (dbConfig.type === 'postgres' || dbConfig.type === 'mysql') {
      const allUsers  = (await adapter.readAll!(dbConfig, 'nxf_users')) as NxfUser[]
      const targetDoc = allUsers.find((u) => u.user_id === target_user_id)
      if (!targetDoc) return NextResponse.json({ error: 'User not found' }, { status: 404 })

      await adapter.update!(dbConfig, 'nxf_users', target_user_id, updates, 'user_id')
      return NextResponse.json({ success: true, user: targetDoc })
    }

    return NextResponse.json({ error: 'Unsupported DB type' }, { status: 400 })

  } catch (error: any) {
    console.error('[PATCH /api/cmsusers] unhandled error:', error.message)
    return NextResponse.json(
      { error: 'Failed to update user' },
      { status: 500 }
    )
  }
}

// ── DELETE /api/cmsusers?user_id=xxx&target_user_id=yyy ───────────────────

export async function DELETE(req: NextRequest) {
  try {
    const adapter  = getConfiguredAdapter()
    const dbConfig = adapter.config

    const { searchParams } = new URL(req.url)
    const user_id        = searchParams.get('user_id')
    const target_user_id = searchParams.get('target_user_id')

    if (!user_id || !target_user_id) {
      return NextResponse.json(
        { error: 'user_id and target_user_id are required' },
        { status: 400 }
      )
    }

    const allUsers   = (await adapter.readAll!(dbConfig, 'nxf_users')) as NxfUser[]
    const targetUser = allUsers.find((u) => u.user_id === target_user_id)

    if (!targetUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    if (targetUser.role === 'admin') {
      const remainingAdmins = allUsers.filter(
        (u) => u.role === 'admin' && u.user_id !== target_user_id
      ).length

      if (remainingAdmins === 0) {
        return NextResponse.json(
          { error: 'Cannot delete the last admin. Promote another user to admin first.' },
          { status: 400 }
        )
      }
    }

    if (dbConfig.type === 'supabase') {
      const supabase = await getSupabaseAdminClient(dbConfig)

      const { error } = await supabase
        .from('nxf_users')
        .delete()
        .eq('user_id', target_user_id)

      if (error) {
        console.error('[DELETE /api/cmsusers] Supabase delete error:', error.message)
        throw new Error(error.message)
      }

      return NextResponse.json({ success: true })
    }

    const docId = (targetUser as any)._id?.toString() ?? (targetUser as any).id
    await adapter.delete!(dbConfig, 'nxf_users', docId)

    return NextResponse.json({ success: true })

  } catch (error: any) {
    console.error('[DELETE /api/cmsusers]', error.message)
    return NextResponse.json(
      { error: 'Failed to delete user' },
      { status: 500 }
    )
  }
}