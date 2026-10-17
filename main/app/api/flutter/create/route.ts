// app/api/flutter/create/route.ts

/**
 * POST /api/flutter/create
 *
 * Next.js App Router API route that scaffolds a new Flutter project on the
 * server's file system using the `flutter create` CLI command.
 *
 * This route is called by the installer wizard during the "Installing Flutter
 * project" step. Because the Flutter SDK is a server-side tool (it cannot run
 * in the browser), all scaffolding work must happen here in an API route.
 *
 * Access: open on a fresh install; once installed, only a signed-in admin
 * (or an install session / NXF_ALLOW_REINSTALL, see installLock.ts).
 *
 * What this route does:
 * ──────────────────────
 * 1. Validates the incoming projectName (letters, digits and underscores only,
 *    starting with a letter — it goes into a shell command and a folder name).
 * 2. Ensures the parent Flutter projects directory exists (creates it if not).
 * 3. Checks that the Flutter CLI is installed and on the system PATH.
 *    If not, returns a clear 400 so the user knows what to install.
 * 4. Checks whether the project directory already exists. If it does, skips
 *    creation and returns success with skipped: true — re-running the installer
 *    is safe and will not overwrite existing work.
 * 5. Runs `flutter create` to scaffold the project into the correct directory.
 * 6. Returns the CLI stdout as `output` so the installer UI can display it.
 *
 * Project location on disk:
 * ──────────────────────────
 * Projects are created at:
 *   <repo-root>/../flutter/<projectName>
 *
 * The `..` step moves one level above the Next.js app root so that Flutter
 * projects sit alongside (not inside) the Next.js project directory.
 *
 * Request body (JSON):
 * ────────────────────
 *   projectName {string} — Name of the Flutter project to create. Letters,
 *                          digits and underscores only, starting with a
 *                          letter (the flutter create CLI also requires a
 *                          valid Dart package name). Required.
 *
 * Responses:
 * ──────────
 *   200 { success: true,  skipped: false, output }   — Project created.
 *   200 { success: true,  skipped: true,  output }   — Project already existed;
 *                                                       creation skipped.
 *   400 { success: false, skipped: false, error }    — Invalid input or Flutter
 *                                                       not installed.
 *   500 { success: false, error, details }           — Unexpected error during
 *                                                       project creation.
 */

import { NextRequest, NextResponse } from 'next/server';
import { execaCommand }              from 'execa';
import path                          from 'path';
import fs                            from 'fs-extra';
import { requireInstallerAccess }    from '@/app/lib/installLock';

/**
 * Letters, digits and underscores only, starting with a letter. This keeps
 * shell metacharacters, spaces and path separators out of the command line
 * and out of the folder name.
 */
const SAFE_PROJECT_NAME = /^[A-Za-z][A-Za-z0-9_]{0,63}$/;

/**
 * POST
 *
 * Handles POST requests to /api/flutter/create.
 * Validates the project name, checks prerequisites, and runs `flutter create`.
 *
 * @param req — The incoming Next.js API request containing the JSON body.
 * @returns A NextResponse JSON object describing the outcome of the operation.
 */
export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    const gate = await requireInstallerAccess(req);
    if (!gate.ok) return gate.response as NextResponse;

    /**
     * Parse the incoming request body and extract the project name.
     */
    const { projectName } = await req.json();

    // -----------------------------------------------------------------------
    // Validation
    // -----------------------------------------------------------------------

    /**
     * projectName must be a non-empty string made only of letters, digits
     * and underscores. It is placed in a shell command, so anything else is
     * refused before shelling out.
     */
    if (!projectName || typeof projectName !== 'string') {
      return NextResponse.json(
        { error: 'Project name is required' },
        { status: 400 },
      );
    }

    if (!SAFE_PROJECT_NAME.test(projectName)) {
      return NextResponse.json(
        {
          success: false,
          skipped: false,
          error:   'Project name may only contain letters, digits and underscores, and must start with a letter',
        },
        { status: 400 },
      );
    }

    console.log(`FLUTTER PROJECT NAME: ${projectName} `)

    // -----------------------------------------------------------------------
    // Resolve paths
    // -----------------------------------------------------------------------

    /**
     * rootPath    — The parent directory that holds all Flutter projects.
     *               Sits one level above the Next.js app root so Flutter
     *               projects are not nested inside the web project.
     *
     * installPath — The full path where this specific project will be created.
     */
    const rootPath    = path.join(process.cwd(), '..', 'flutter');
    const installPath = path.join(rootPath, projectName);

    /**
     * Ensure the parent Flutter directory exists before running any checks.
     * fs.ensureDir() creates the directory (and any missing parents) if it
     * does not already exist, and is a no-op if it does — safe to call always.
     */
    await fs.ensureDir(rootPath);

    // -----------------------------------------------------------------------
    // Step 1 — Verify Flutter is installed
    // -----------------------------------------------------------------------

    /**
     * Run `flutter --version` to confirm the Flutter CLI is available on the
     * system PATH. If this throws, Flutter is either not installed or not
     * accessible from the server's shell environment.
     *
     * We return a 400 (not 500) because this is a configuration problem the
     * user can fix (by installing Flutter), not an unexpected server error.
     */
    try {
      await execaCommand('flutter --version', { shell: true });
    } catch {
      return NextResponse.json(
        {
          success: false,
          skipped: false,
          error:   'Flutter is not installed or not available on the system PATH',
        },
        { status: 400 },
      );
    }

    // -----------------------------------------------------------------------
    // Step 2 — Check if the project already exists
    // -----------------------------------------------------------------------

    /**
     * If the target directory already exists, skip creation and return a
     * success response with skipped: true. This makes the installer idempotent
     * — re-running it will not overwrite or corrupt an existing Flutter project.
     */
    const projectExists = await fs.pathExists(installPath);
    if (projectExists) {
      console.log(`[flutter/create] Project already exists: ${projectName}`);
      return NextResponse.json({
        success: true,
        skipped: true,
        output:  `Project '${projectName}' already exists — skipping creation`,
      });
    }

    // -----------------------------------------------------------------------
    // Step 3 — Scaffold the Flutter project
    // -----------------------------------------------------------------------

    /**
     * Build and run the flutter create command.
     *
     * --project-name uses projectName.toLowerCase() because Flutter requires
     * the project name to be lowercase (the directory name can differ, but
     * the Dart package name must be lowercase).
     *
     * The full installPath is passed as the target directory so the project
     * is created in the correct location regardless of the current working
     * directory.
     *
     * projectName has been validated above, so it contains no characters
     * that the shell could interpret.
     */
    const createCmd = `flutter create --project-name ${projectName.toLowerCase()} ${installPath}`;
    const { stdout, stderr } = await execaCommand(createCmd, { shell: true });

    /**
     * Flutter sometimes writes informational messages to stderr even on
     * success (e.g. SDK version warnings). We log these as warnings rather
     * than treating them as errors so the install does not fail unnecessarily.
     */
    if (stderr) console.warn('[flutter/create] stderr:', stderr);

    return NextResponse.json({ success: true, skipped: false, output: stdout });

  } catch (error: any) {
    /**
     * Catch-all for unexpected errors — e.g. file system permission failures,
     * the flutter create command exiting with a non-zero code, or network
     * issues downloading packages during scaffolding.
     *
     * `details` provides the raw stderr/stdout from the failed command so the
     * installer UI or a developer inspecting the response can diagnose the
     * root cause without needing to check server logs.
     */
    console.error('[flutter/create] Error:', error);

    return NextResponse.json(
      {
        success: false,
        error:   error.message || 'Flutter project creation failed',
        details: error.stderr || error.stdout || error,
      },
      { status: 500 },
    );
  }
}