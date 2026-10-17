// app/api/installer/status/route.ts
/**
 * GET    /api/installer/status
 * DELETE /api/installer/status
 *
 * GET tells the installer wizard whether an installation already exists, so it
 * can show "An existing installation was detected. Re-installing will
 * overwrite everything. Continue?" before it changes anything.
 *
 *   { installed: boolean,   // a database with users exists
 *     canProceed: boolean } // this request may use the installer routes
 *                           // (fresh install, signed-in admin, or the owner
 *                           //  set NXF_ALLOW_REINSTALL=true)
 *
 * It only says yes or no. It never returns settings or users.
 *
 * DELETE ends the install session. The wizard calls it as its last step, with
 * the x-install-token it was given, so the token cannot be used afterwards.
 */

import { NextRequest, NextResponse } from 'next/server'
import {
  isInstalled,
  requireInstallerAccess,
  hasValidInstallToken,
  clearInstallToken,
} from '@/app/lib/installLock'

export async function GET(req: NextRequest): Promise<NextResponse> {
  try {
    const installed = await isInstalled()
    const gate      = await requireInstallerAccess(req)
    return NextResponse.json({ installed, canProceed: gate.ok })
  } catch {
    return NextResponse.json({ error: 'Could not check the installation' }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest): Promise<NextResponse> {
  if (!hasValidInstallToken(req)) {
    return NextResponse.json({ error: 'Not allowed' }, { status: 403 })
  }
  clearInstallToken()
  return NextResponse.json({ success: true })
}