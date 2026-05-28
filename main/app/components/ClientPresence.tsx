'use client'

/**
 * ClientPresence
 *
 * Mount this once in your root layout (inside the auth boundary,
 * after the user is confirmed logged in).
 *
 * Handles two things:
 *
 * 1. beforeunload — fires sendBeacon to /api/cmsusers/presence and
 *    logActivity beacon on tab/browser close. Best-effort: if it
 *    doesn't fire, the user just stays shown as online until their
 *    next login. No errors are thrown either way.
 *
 * 2. Firebase onDisconnect — sets a presence doc in Firestore that
 *    marks the user offline if the client loses its connection.
 *    More reliable than beforeunload for Firebase users.
 *    Falls back gracefully if Firebase isn't the active DB type.
 */

import { useEffect }  from 'react'
import { logActivity } from '@/app/lib/logActivity'

interface ClientPresenceProps {
  userId: string
}

export function ClientPresence({ userId }: ClientPresenceProps) {
  useEffect(() => {
    if (!userId) return

    // ── beforeunload (all DB types) ───────────────────────────────────────
    // Best-effort. If it doesn't complete, nothing breaks — the user just
    // stays marked as online until their next login clears the stale state.
    function handleUnload() {
      // Mark offline in nxf_users
      navigator.sendBeacon(
        '/api/cmsusers/presence',
        new Blob(
          [JSON.stringify({ user_id: userId, is_logged_in: false })],
          { type: 'application/json' },
        ),
      )
      // Log the offline event
      logActivity(userId, 'user_offline', {}, true /* beacon */)
    }

    window.addEventListener('beforeunload', handleUnload)

    // ── Firebase onDisconnect (Firebase only) ─────────────────────────────
    // Writes a presence flag to Firestore that fires server-side when the
    // client's connection drops — more reliable than beforeunload.
    let cancelDisconnect: (() => void) | null = null

    if (process.env.NEXT_PUBLIC_DB_TYPE === 'firebase') {
      ;(async () => {
        try {
          const { getDatabase, ref, onDisconnect, set } = await import('firebase/database')
          const db           = getDatabase()
          const presenceRef  = ref(db, `presence/${userId}`)

          // When the client disconnects, Firebase will automatically
          // execute this write server-side
          await onDisconnect(presenceRef).set({
            is_logged_in: false,
            updated_at:   new Date().toISOString(),
          })

          // Mark online now
          await set(presenceRef, {
            is_logged_in: true,
            updated_at:   new Date().toISOString(),
          })

          // Store a cancel handle so we can clean up on unmount
          cancelDisconnect = () => {
            onDisconnect(presenceRef).cancel()
          }
        } catch {
          // Firebase Realtime Database may not be enabled — not fatal
        }
      })()
    }

    return () => {
      window.removeEventListener('beforeunload', handleUnload)
      cancelDisconnect?.()
    }
  }, [userId])

  return null
}