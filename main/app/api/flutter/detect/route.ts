// app/api/flutter/detect/route.ts

/**
 * GET /api/flutter/detect
 *
 * Next.js App Router API route that checks whether the Flutter CLI is
 * installed and accessible on the server's system PATH.
 *
 * Why does this route exist?
 * ──────────────────────────
 * The installer wizard needs to know upfront whether Flutter is available
 * before attempting to scaffold a Flutter project. Showing the user a clear
 * "Flutter not found" message early in the wizard is far better than letting
 * the install fail mid-way through with a cryptic shell error.
 *
 * This route is intentionally simple — it runs `flutter --version` and
 * reports back whether the command succeeded. The version string is included
 * in the success response so the installer UI can display it to the user
 * (e.g. "Flutter 3.19.0 detected ✓").
 *
 * What this route does:
 * ──────────────────────
 * 1. Runs `flutter --version` via execa (a safe alternative to exec/shell
 *    that does not spawn a shell process and is not vulnerable to injection).
 * 2. If the command succeeds, returns { found: true, version: <stdout> }.
 * 3. If the command throws (Flutter not installed, not on PATH, or any other
 *    execution error), returns { found: false, version: null } — this is a
 *    known/expected case, not an unexpected server error, so no 500 is thrown.
 *
 * No request body is needed — this is a simple presence check.
 *
 * Responses:
 * ──────────
 *   200 { found: true,  version: string } — Flutter CLI found; version string
 *                                           from `flutter --version` stdout.
 *   200 { found: false, version: null   } — Flutter CLI not found or not on PATH.
 *
 * Note: Both outcomes return HTTP 200 because "Flutter not found" is an
 * expected application-level state, not an HTTP or server error. The caller
 * uses the `found` boolean to determine how to proceed.
 */

import { NextResponse } from 'next/server';
import { execa }        from 'execa';

/**
 * FlutterDetectResponse
 *
 * The shape of the JSON body returned by this route in both outcomes.
 *
 * Fields:
 *   - found   {boolean}       — true if `flutter --version` ran successfully.
 *   - version {string | null} — The raw stdout from `flutter --version` when
 *                               found is true; null when Flutter is not found.
 */
interface FlutterDetectResponse {
  found:   boolean;
  version: string | null;
}

/**
 * GET
 *
 * Handles GET requests to /api/flutter/detect.
 * Runs `flutter --version` and reports whether the Flutter CLI is available.
 *
 * @returns A NextResponse containing a {@link FlutterDetectResponse} object.
 *          Always returns HTTP 200 — use the `found` field to check the result.
 */
export async function GET(): Promise<NextResponse<FlutterDetectResponse>> {
  try {
    /**
     * Run `flutter --version` using execa.
     *
     * execa is used instead of execaCommand/exec because:
     *   - It takes the command and arguments as separate parameters, which
     *     avoids shell injection risks entirely (no shell: true needed).
     *   - It provides clean access to stdout and stderr as typed strings.
     *
     * If Flutter is installed and on PATH, this resolves with the version
     * output in stdout (e.g. "Flutter 3.19.0 • channel stable • ...").
     * If Flutter is not found, execa throws and the catch block handles it.
     */
    const { stdout } = await execa('flutter', ['--version']);

    return NextResponse.json({ found: true, version: stdout });

  } catch {
    /**
     * Any error here means Flutter could not be run — either it is not
     * installed, not on the server's PATH, or the binary is broken.
     *
     * This is treated as a known application state (found: false) rather than
     * an unexpected server error, so we return 200 with found: false instead
     * of a 500. The installer UI uses this to show a "Flutter not detected"
     * warning and prompt the user to install it before continuing.
     */
    return NextResponse.json({ found: false, version: null });
  }
}