// app/api/auth/verify-email/route.ts

import { NextRequest, NextResponse } from 'next/server'
import type { DBAdapter }            from '@/app/db-adapter/types'
import { getConfiguredAdapter } from '@/app/lib/getConfiguredAdapter'

export async function GET(req: NextRequest) {
  console.log('[verify-email] Request received')

  try {
    // ── Read and validate query parameters ──────────────────────────────────

    const { searchParams } = new URL(req.url)
    const token = searchParams.get('token')
    const email = searchParams.get('email')

    if (!token || !email) {
      return NextResponse.json(
        { error: 'token and email query parameters are required' },
        { status: 400 }
      )
    }

    // ── Resolve adapter ─────────────────────────────────────────────────────

    const adapter  = getConfiguredAdapter() as unknown as DBAdapter
    const dbConfig = (adapter as any).config
    const dbType   = dbConfig.type

    // ── Path 1: Native adapter verifyEmail method ───────────────────────────

    if (adapter.verifyEmail) {
      await adapter.verifyEmail(dbConfig, { token, email })
      return NextResponse.json({ success: true })
    }

    // ── Path 2: SQL fallback (MySQL / Postgres) ─────────────────────────────

    if (dbType === 'mysql' || dbType === 'postgres') {
      if (!adapter.findUserByToken || !adapter.updateUser) {
        throw new Error('SQL adapter is missing required methods: findUserByToken, updateUser')
      }

      const user = await adapter.findUserByToken(token)

      if (!user) {
        return NextResponse.json(
          { error: 'Invalid or already used verification token' },
          { status: 400 }
        )
      }

      if (user.token_ttl && new Date(user.token_ttl) < new Date()) {
        return NextResponse.json(
          { error: 'Verification token has expired — please request a new one' },
          { status: 400 }
        )
      }

      await adapter.updateUser(dbConfig, user.id, {
        email_verified: true,
        token:          null,
        token_ttl:      null,
      })

      return NextResponse.json({ success: true })
    }

    // ── Path 3: Firebase fallback ───────────────────────────────────────────

    if (dbType === 'firebase') {
      if (!adapter.updateUser || !adapter.findUserByEmail) {
        throw new Error('Firebase adapter is missing required methods: updateUser, findUserByEmail')
      }

      const user = await adapter.findUserByEmail(dbConfig, email)

      if (!user) {
        return NextResponse.json(
          { error: 'No user found for this email address' },
          { status: 400 }
        )
      }

      await adapter.updateUser(dbConfig, user.id, { email_verified: true })

      return NextResponse.json({ success: true })
    }

    // ── Path 4: No supported verification path ──────────────────────────────

    console.log('[verify-email] No verification path supported for this database type')
    return NextResponse.json(
      { error: 'Email verification is not supported for this database type' },
      { status: 400 }
    )

  } catch (err: any) {
    console.error('[verify-email] Error:', err.message)
    return NextResponse.json(
      { error: 'Email verification failed' },
      { status: 500 }
    )
  }
}