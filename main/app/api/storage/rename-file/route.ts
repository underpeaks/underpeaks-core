// app/api/storage/rename-file/route.ts
import 'server-only'

/**
 * POST /api/storage/rename-file
 * Body: { folder: string, oldName: string, newName: string }
 * Renames one file inside a storage folder through the configured adapter.
 *
 * SECURITY (Oct 2026): signed-in console user required; folder and names
 * must be plain strings with no path tricks; the new name may not use a
 * script / executable / HTML extension (uploads block those, so a rename
 * must not be a way around that); 500 responses are generic.
 */

import { NextRequest, NextResponse } from 'next/server'
import { getConfiguredAdapter }      from '@/app/lib/getConfiguredAdapter'
import { requireSessionUser }        from '@/app/lib/getSessionUser'

const BLOCKED_EXT = new Set([
  'html', 'htm', 'xhtml', 'shtml', 'js', 'mjs', 'cjs', 'jsp', 'php', 'phtml',
  'asp', 'aspx', 'exe', 'dll', 'msi', 'bat', 'cmd', 'com', 'sh', 'ps1', 'jar',
])

function hasBlockedExt(name: string): boolean {
  // Every dot-separated part counts, so "shell.php.jpg" is caught too.
  return name.toLowerCase().split('.').slice(1).some((p) => BLOCKED_EXT.has(p))
}

/** A folder path: string, <= 300 chars, no "..", ".", backslash or null byte. */
function validFolder(v: unknown): v is string {
  if (typeof v !== 'string' || !v || v.length > 300) return false
  if (v.includes('\\') || v.includes('\0')) return false
  return !v.split('/').some((seg) => seg === '..' || seg === '.')
}

/** A file name: string, <= 255 chars, no slashes, backslash, "..", or null byte. */
function validName(v: unknown): v is string {
  if (typeof v !== 'string' || !v || v.length > 255) return false
  if (v.includes('/') || v.includes('\\') || v.includes('\0')) return false
  return v !== '.' && !v.includes('..')
}

export async function POST(req: NextRequest) {
  const auth = await requireSessionUser(req)
  if (!auth.ok) return auth.response

  try {
    const body = await req.json().catch(() => null)
    const { folder, oldName, newName } = body ?? {}

    if (!validFolder(folder) || !validName(oldName) || !validName(newName)) {
      return NextResponse.json(
        { error: 'folder, oldName, and newName are all required and must be valid' },
        { status: 400 }
      )
    }

    if (hasBlockedExt(newName)) {
      return NextResponse.json({ error: 'This file type is not allowed' }, { status: 400 })
    }

    const adapter = getConfiguredAdapter()

    if (!adapter.renameFile) {
      return NextResponse.json(
        { error: 'File rename is not supported by the current storage adapter' },
        { status: 400 }
      )
    }

    await adapter.renameFile(folder, oldName, newName)

    return NextResponse.json({ success: true })

  } catch (err: any) {
    console.error('[rename-file] failed:', err?.message)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}