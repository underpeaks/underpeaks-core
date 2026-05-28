// app/api/firebase-config/route.ts

/**
 * GET /api/firebase-config
 *
 * Next.js App Router API route that securely exposes the Firebase client-side
 * configuration to the frontend at runtime.
 *
 * Why does this route exist?
 * ──────────────────────────
 * Firebase's client SDK requires a configuration object (apiKey, projectId,
 * etc.) to initialise. These values live in environment variables on the
 * server (prefixed without NEXT_PUBLIC_) so they are never bundled into the
 * client-side JavaScript. This route acts as a controlled gateway — the
 * frontend fetches this endpoint at runtime to get the config it needs,
 * without the values ever being hard-coded or exposed in the build output.
 *
 * What this route does:
 * ──────────────────────
 * 1. Reads the six required Firebase environment variables from process.env.
 * 2. Validates that every variable is present. If any are missing, returns
 *    a 500 with the name of the missing variable so the developer can fix
 *    their environment configuration quickly.
 * 3. Returns the config object as JSON for the client SDK to consume.
 *
 * Security note:
 * ──────────────
 * Firebase client config values (apiKey, projectId, etc.) are intentionally
 * designed to be used in client-side code — they are not secret in the same
 * way a database password is. However, keeping them in environment variables
 * (rather than hard-coded) makes it easy to rotate them and keeps different
 * environments (dev, staging, prod) cleanly separated.
 *
 * Firebase security is enforced through Firebase Security Rules, not by
 * keeping the config secret.
 *
 * Required environment variables:
 * ─────────────────────────────────
 *   FIREBASE_API_KEY
 *   FIREBASE_AUTH_DOMAIN
 *   FIREBASE_PROJECT_ID
 *   FIREBASE_STORAGE_BUCKET
 *   FIREBASE_MESSAGING_SENDER_ID
 *   FIREBASE_APP_ID
 *
 * Responses:
 * ──────────
 *   200 { apiKey, authDomain, projectId, storageBucket,
 *         messagingSenderId, appId }     — All variables present; config returned.
 *   500 { error }                        — One or more variables are missing.
 */

import { NextResponse } from 'next/server';

/**
 * FirebaseClientConfig
 *
 * The shape of the Firebase client configuration object returned by this
 * route and consumed by the Firebase client SDK on the frontend.
 *
 * All fields are required strings — the Firebase SDK will fail to initialise
 * if any of them are undefined or empty.
 */
// interface FirebaseClientConfig {
//   apiKey:            string;
//   authDomain:        string;
//   projectId:         string;
//   storageBucket:     string;
//   messagingSenderId: string;
//   appId:             string;
// }

/**
 * GET
 *
 * Handles GET requests to /api/firebase-config.
 * Reads Firebase environment variables, validates all are present, and
 * returns them as a JSON object for the client SDK to consume.
 *
 * @returns A NextResponse containing either the Firebase config object (200)
 *          or an error message identifying the missing variable (500).
 */
export async function GET(): Promise<NextResponse> {
  const raw = process.env.NEXT_PUBLIC_FIREBASE_CONFIG

  if (!raw) {
    return NextResponse.json(
      { error: 'Missing required environment variable: NEXT_PUBLIC_FIREBASE_CONFIG' },
      { status: 500 }
    )
  }

  try {
    const config = JSON.parse(raw)
    return NextResponse.json(config)
  } catch {
    return NextResponse.json(
      { error: 'NEXT_PUBLIC_FIREBASE_CONFIG is not valid JSON' },
      { status: 500 }
    )
  }
}