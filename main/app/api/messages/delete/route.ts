// app/api/messages/delete/route.ts

import 'server-only'

/**
 * DELETE /api/messages/delete
 *
 * Permanently deletes a conversation and all of its messages.
 *
 * The deletion is atomic — either both the conversation record and all its
 * messages are deleted, or neither is. The adapter handles the implementation
 * detail for each DB type (Firestore batch for Firebase, transactions for others).
 *
 * Authentication:
 *   Requires a valid Bearer token in the Authorization header.
 *   Firebase/Supabase — validated via adapter.validateBuiltInSession()
 *   Custom token DBs  — validated via adapter.findTokenByAccessToken()
 *
 * Request body:
 *   conversation_id {string} — ID of the conversation to delete. Required.
 *
 * Request headers:
 *   Authorization: Bearer <token> — Valid session token. Required.
 *
 * Responses:
 *   200 { success: true }   — Conversation and all messages deleted.
 *   400 { error: string }   — conversation_id missing.
 *   401 { error: string }   — No token or invalid token.
 *   500 { error: string }   — Unexpected server error.
 */

import { NextRequest, NextResponse } from 'next/server'
import { getConfiguredAdapter } from '@/app/lib/getConfiguredAdapter '

export async function DELETE(req: NextRequest): Promise<NextResponse> {
  try {
    // -----------------------------------------------------------------------
    // Parse and validate request body
    // -----------------------------------------------------------------------

    const { conversation_id } = await req.json()

    if (!conversation_id) {
      return NextResponse.json(
        { error: 'conversation_id is required' },
        { status: 400 }
      )
    }

    // -----------------------------------------------------------------------
    // Resolve adapter
    // -----------------------------------------------------------------------

    const adapter  = getConfiguredAdapter()
    const dbConfig = adapter.config
    const dbType   = dbConfig.type

    // -----------------------------------------------------------------------
    // Authenticate the caller
    // -----------------------------------------------------------------------

    const authHeader = req.headers.get('Authorization')
    const token      = authHeader?.replace('Bearer ', '') ?? null

    if (!token) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Validate session — approach differs by auth type
    let isAuthenticated = false

    if (adapter.supportsBuiltInAuth) {
      // Firebase / Supabase — validate the ID token
      const decoded = await adapter.validateBuiltInSession?.(dbConfig, token)
      isAuthenticated = !!(decoded?.uid ?? decoded?.user_id)
    } else {
      // Custom token flow — look up the token record
      const storedToken = await adapter.findTokenByAccessToken?.(token)
      isAuthenticated   = !!(storedToken && !storedToken.revoked)
    }

    if (!isAuthenticated) {
      return NextResponse.json(
        { error: 'Invalid or expired token' },
        { status: 401 }
      )
    }

    // -----------------------------------------------------------------------
    // Delete conversation and all its messages via adapter
    // -----------------------------------------------------------------------

    if (!adapter.deleteConversation) {
      throw new Error(`${dbType} adapter does not implement deleteConversation`)
    }

    await adapter.deleteConversation(dbConfig, conversation_id)

    return NextResponse.json({ success: true })

  } catch (err: any) {
    console.error('[messages/delete] Error:', err.message)
    return NextResponse.json(
      { error: err.message ?? 'An unexpected error occurred' },
      { status: 500 }
    )
  }
}