// app/lib/installLock.ts
//
// Decides whether the installer routes (save-db-config, test-db-connection)
// may be used without signing in.
//
//   open   — nothing is installed yet. A fresh server has no database, no
//            users and nothing to protect, so the wizard works as before.
//   locked — a database is configured and users exist. From then on only a
//            signed-in admin may call the installer routes.
//
// Fails closed: if the database is configured but cannot be checked, the
// answer is "locked", so an outage can never open the installer to anyone.

import 'server-only'
import fs   from 'fs'
import path from 'path'
import { NextRequest, NextResponse } from 'next/server'
import { getConfiguredAdapter } from '@/app/lib/getConfiguredAdapter'
import { requireSessionUser }   from '@/app/lib/getSessionUser'

export async function isInstalled(): Promise<boolean> {
  // Not configured in this running process → still a fresh install.
  // (.env.local is only loaded when the server starts, so a file written a
  // moment ago by the wizard does not count until the restart.)
  if (!process.env.NEXT_DB_TYPE) return false

  try {
    const adapter = getConfiguredAdapter()
    const users   = await adapter.readAll!(adapter.config, 'nxf_users')
    return Array.isArray(users) && users.length > 0
  } catch {
    // Configured but unreadable (down, or tables not created yet). Fail closed.
    return true
  }
}

export type GateResult =
  | { ok: true }
  | { ok: false; response: NextResponse }

/** Open on a fresh install; admin-only once installed. */
export async function requireInstallerAccess(req: NextRequest | Request): Promise<GateResult> {
  if (!(await isInstalled())) return { ok: true }

  const session = await requireSessionUser(req as NextRequest)
  if (!session.ok) return { ok: false, response: session.response }

  try {
    const adapter = getConfiguredAdapter()
    const users   = (await adapter.readAll!(adapter.config, 'nxf_users')) as any[]
    const caller  = users.find((u) => u.user_id === session.userId)
    if (caller?.role === 'admin') return { ok: true }
  } catch { /* fall through */ }

  return {
    ok: false,
    response: NextResponse.json(
      { success: false, error: 'Already installed. Sign in as an admin to change this.' },
      { status: 403 }
    ),
  }
}