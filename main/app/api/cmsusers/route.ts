// app/api/cmsusers/route.ts

import { NextRequest, NextResponse }              from 'next/server'
import { getAvatarColour, getAvatarInitials }     from '@/app/lib/avatarColour'
import { NxfUser, UpdateUserPayload, UserListRow } from '@/app/[locale]/console/types/users'
import { getConfiguredAdapter } from '@/app/lib/getConfiguredAdapter'
import { requireSessionUser }   from '@/app/lib/getSessionUser'

async function getSupabaseAdminClient(dbConfig: any) {
  const { createClient } = await import('@supabase/supabase-js')
  return createClient(
    dbConfig.supabaseUrl!,
    dbConfig.serviceRoleKey ?? dbConfig.anonKey!
  )
}

/** Never send credentials or reset tokens back to the browser. */
function stripSecrets<T extends Record<string, any>>(user: T | null | undefined) {
  if (!user) return null
  const { password_hash, token, token_ttl, ...safe } = user
  return safe
}

// ── GET /api/cmsusers ──────────────────────────────────────────────────────
// Caller identity comes from the Bearer token, not from a user_id parameter.

export async function GET(req: NextRequest) {
  try {
    const session = await requireSessionUser(req)
    if (!session.ok) return session.response

    const adapter  = getConfiguredAdapter()
    const dbConfig = adapter.config

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
// Body: { target_user_id, role?, status?, is_logged_in?, last_login? }
//   - Any signed-in user may update their OWN is_logged_in / last_login
//     (the sign-in page does this right after login).
//   - Changing role or status, or touching another user, needs an admin.

export async function PATCH(req: NextRequest) {
  try {
    const session = await requireSessionUser(req)
    if (!session.ok) return session.response

    const adapter  = getConfiguredAdapter()
    const dbConfig = adapter.config

    const body = (await req.json()) as UpdateUserPayload & {
      user_id?:       string   // ignored: the caller is taken from the token
      target_user_id: string
      is_logged_in?:  boolean
      last_login?:    string
    }

    const { target_user_id, role, status, is_logged_in, last_login } = body

    if (!target_user_id) {
      return NextResponse.json(
        { error: 'target_user_id is required' },
        { status: 400 }
      )
    }

    const allUsers = (await adapter.readAll!(dbConfig, 'nxf_users')) as NxfUser[]
    const caller   = allUsers.find((u) => u.user_id === session.userId)
    const isAdmin  = caller?.role === 'admin'
    const isSelf   = target_user_id === session.userId
    const changesAccess = role !== undefined || status !== undefined

    if (!isAdmin && (!isSelf || changesAccess)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    if (role && role !== 'admin') {
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

      return NextResponse.json({ success: true, user: stripSecrets(updatedUser?.[0]) })
    }

    // Mongo / Postgres / MySQL / Firebase — key on user_id (the nxf_users PK)
    const targetDoc = allUsers.find((u) => u.user_id === target_user_id)
    if (!targetDoc) return NextResponse.json({ error: 'User not found' }, { status: 404 })

    await adapter.update!(dbConfig, 'nxf_users', target_user_id, updates, 'user_id')
    return NextResponse.json({ success: true, user: stripSecrets(targetDoc) })
  } catch (error: any) {
    console.error('[PATCH /api/cmsusers] unhandled error:', error.message)
    return NextResponse.json(
      { error: 'Failed to update user' },
      { status: 500 }
    )
  }
}

// ── DELETE /api/cmsusers?target_user_id=yyy ────────────────────────────────
// Admin only. The caller comes from the Bearer token.

export async function DELETE(req: NextRequest) {
  try {
    const session = await requireSessionUser(req)
    if (!session.ok) return session.response

    const adapter  = getConfiguredAdapter()
    const dbConfig = adapter.config

    const { searchParams } = new URL(req.url)
    const target_user_id = searchParams.get('target_user_id')

    if (!target_user_id) {
      return NextResponse.json(
        { error: 'target_user_id is required' },
        { status: 400 }
      )
    }

    const allUsers = (await adapter.readAll!(dbConfig, 'nxf_users')) as NxfUser[]
    const caller   = allUsers.find((u) => u.user_id === session.userId)

    if (caller?.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

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

    await adapter.delete!(dbConfig, 'nxf_users', target_user_id, 'user_id')

    return NextResponse.json({ success: true })

  } catch (error: any) {
    console.error('[DELETE /api/cmsusers]', error.message)
    return NextResponse.json(
      { error: 'Failed to delete user' },
      { status: 500 }
    )
  }
}