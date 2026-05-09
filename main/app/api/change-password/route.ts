import 'server-only'
import { NextRequest, NextResponse } from 'next/server'
import { getStorageAdapter } from '@/app/lib/getStorageAdapter'
import bcrypt from 'bcryptjs'
import admin from 'firebase-admin'

export async function POST(req: NextRequest) {
  try {
    const { currentPassword, newPassword } = await req.json()

    if (!currentPassword || !newPassword)
      return NextResponse.json({ error: 'Current and new password are required' }, { status: 400 })

    if (newPassword.length < 8)
      return NextResponse.json({ error: 'Password must be at least 8 characters' }, { status: 400 })

    // ── Resolve user from token ────────────────────────────────────────────
    const authHeader = req.headers.get('Authorization')
    const token      = authHeader?.replace('Bearer ', '') ?? null

    if (!token)
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const adapter = getStorageAdapter()
    const decoded = await adapter.validateBuiltInSession?.(adapter.config, token)
    const uid     = decoded?.uid ?? decoded?.user_id ?? null

    if (!uid)
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 })

    // ── Get user from nxf_users ────────────────────────────────────────────
    const result = await adapter.getUserById?.(uid)
    if (!result?.user)
      return NextResponse.json({ error: 'User not found' }, { status: 404 })

    const user = result.user

    // ── Verify current password ────────────────────────────────────────────
    const passwordMatch = await bcrypt.compare(currentPassword, user.password_hash)
    if (!passwordMatch)
      return NextResponse.json({ error: 'Current password is incorrect' }, { status: 400 })

    // ── Hash new password ──────────────────────────────────────────────────
    const newHash = await bcrypt.hash(newPassword, 10)

    // ── Update nxf_users ───────────────────────────────────────────────────
    await adapter.update!(adapter.config, 'nxf_users', uid, {
      password_hash: newHash,
      updated_at:    new Date().toISOString(),
    })

    // ── Update Firebase Auth password ──────────────────────────────────────
    // For Firebase — keep Auth in sync with nxf_users
    const dbType = process.env.NEXT_PUBLIC_DB_TYPE
    if (dbType === 'firebase') {
      try {
        await admin.auth().updateUser(uid, { password: newPassword })
        console.log('[change-password] Firebase Auth password updated')
      } catch (err: any) {
        console.warn('[change-password] Firebase Auth update failed:', err.message)
        // Don't fail — nxf_users is already updated
      }
    }

    return NextResponse.json({ success: true })
  } catch (err: any) {
    console.error('[change-password]', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}