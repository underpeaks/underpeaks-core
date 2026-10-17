// app/lib/installLock.ts
//
// Decides who may use the installer routes (save-db-config, test-db-connection,
// create-system-tables, create-admin-user, the Flutter / Next.js create routes,
// write-config, create-models, storage buckets, demo content).
//
// A request is allowed when ANY of these is true:
//
//   1. Fresh install    — no database is configured yet, or it has no users.
//                         A fresh server has nothing to protect.
//   2. Install session  — the request carries the x-install-token that
//                         create-system-tables handed to the wizard when this
//                         install started. It lets the wizard finish its own
//                         steps after the admin account exists. It is stored
//                         hashed in .install-session, expires after 1 hour and
//                         is removed when the wizard finishes.
//   3. Owner override   — NXF_ALLOW_REINSTALL=true in .env.local (needs a
//                         restart). For re-installing when nobody can sign in.
//   4. Signed-in admin  — a console user with role "admin".
//
// Fails closed: if the database is configured but cannot be checked, the
// answer is "locked", so an outage can never open the installer to anyone.
// The one exception is a "table does not exist" error: with no users table
// there is nothing to protect yet (this is the wizard between saving the
// database settings and creating the tables).

import 'server-only'
import crypto from 'crypto'
import fs     from 'fs'
import path   from 'path'
import { NextRequest, NextResponse } from 'next/server'
import { getConfiguredAdapter } from '@/app/lib/getConfiguredAdapter'
import { requireSessionUser }   from '@/app/lib/getSessionUser'

// Postgres: relation "x" does not exist (42P01). MySQL: Table 'x' doesn't exist
// (ER_NO_SUCH_TABLE). Supabase: Could not find the table (PGRST205).
function isMissingTableError(err: any): boolean {
  const code = String(err?.code ?? '')
  const msg  = String(err?.message ?? '')
  return (
    code === '42P01' ||
    code === 'ER_NO_SUCH_TABLE' ||
    code === 'PGRST205' ||
    /does not exist|doesn't exist|no such table|could not find the table/i.test(msg)
  )
}

export async function isInstalled(): Promise<boolean> {
  // Not configured in this running process → still a fresh install.
  if (!process.env.NEXT_DB_TYPE) return false

  try {
    const adapter = getConfiguredAdapter()
    const users   = await adapter.readAll!(adapter.config, 'nxf_users')
    return Array.isArray(users) && users.length > 0
  } catch (err) {
    // Tables not created yet: nothing to protect.
    if (isMissingTableError(err)) return false
    // Configured but unreadable (down, wrong password). Fail closed.
    return true
  }
}

// ─── Install session token ───────────────────────────────────────────────────

const TOKEN_FILE   = path.join(process.cwd(), '.install-session')
const TOKEN_TTL_MS = 60 * 60 * 1000
export const INSTALL_TOKEN_HEADER = 'x-install-token'

function sha256(value: string): string {
  return crypto.createHash('sha256').update(value).digest('hex')
}

/** Starts an install session. Returns the token the wizard must send back. */
export function issueInstallToken(): string {
  const token = crypto.randomBytes(32).toString('hex')
  fs.writeFileSync(
    TOKEN_FILE,
    JSON.stringify({ hash: sha256(token), expires: Date.now() + TOKEN_TTL_MS }),
    'utf-8',
  )
  return token
}

export function hasValidInstallToken(req: NextRequest | Request): boolean {
  const token = req.headers.get(INSTALL_TOKEN_HEADER)
  if (!token || token.length > 200) return false

  try {
    const saved = JSON.parse(fs.readFileSync(TOKEN_FILE, 'utf-8'))
    if (typeof saved?.hash !== 'string' || typeof saved?.expires !== 'number') return false
    if (saved.expires < Date.now()) return false

    const a = Buffer.from(sha256(token), 'hex')
    const b = Buffer.from(saved.hash, 'hex')
    return a.length === b.length && crypto.timingSafeEqual(a, b)
  } catch {
    return false
  }
}

/** Ends the install session. Safe to call when there is none. */
export function clearInstallToken(): void {
  try { fs.unlinkSync(TOKEN_FILE) } catch { /* nothing to remove */ }
}

// ─── Gate ────────────────────────────────────────────────────────────────────

export type GateResult =
  | { ok: true }
  | { ok: false; response: NextResponse }

/** Fresh install, install session, owner override, or signed-in admin. */
export async function requireInstallerAccess(req: NextRequest | Request): Promise<GateResult> {
  if (!(await isInstalled())) return { ok: true }

  if (hasValidInstallToken(req)) return { ok: true }
  if (process.env.NXF_ALLOW_REINSTALL === 'true') return { ok: true }

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