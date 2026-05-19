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
 * What this route does:
 * ──────────────────────
 * 1. Validates the incoming projectName.
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
 *   projectName {string} — Name of the Flutter project to create. Must follow
 *                          Flutter naming rules: lowercase letters, digits, and
 *                          underscores only (enforced by the flutter create CLI).
 *                          Required.
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
  /**
   * t — Server-side translation function scoped to the 'flutterCreateRoute'
   * namespace. getTranslations() is the server-side equivalent of the
   * client-side useTranslations() hook.
   */
  //const t = await getTranslations('flutterCreateRoute');

  try {
    /**
     * Parse the incoming request body and extract the project name.
     */
    const { projectName } = await req.json();

    // -----------------------------------------------------------------------
    // Validation
    // -----------------------------------------------------------------------

    /**
     * projectName must be a non-empty string. The flutter create CLI will
     * further enforce naming rules (lowercase, digits, underscores), but we
     * catch obviously invalid values here before shelling out.
     */
    if (!projectName || typeof projectName !== 'string') {
      return NextResponse.json(
        { error: ('errors.missingProjectName') },
        { status: 400 },
      );
    }

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
          error:   ('errors.flutterNotInstalled'),
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
      console.log('logs.projectAlreadyExists', { projectName });
      return NextResponse.json({
        success: true,
        skipped: true,
        output:  'logs.projectAlreadyExists',  projectName ,
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
     */
    const createCmd = `flutter create --project-name ${projectName.toLowerCase()} ${installPath}`;
    const { stdout, stderr } = await execaCommand(createCmd, { shell: true });

    /**
     * Flutter sometimes writes informational messages to stderr even on
     * success (e.g. SDK version warnings). We log these as warnings rather
     * than treating them as errors so the install does not fail unnecessarily.
     */
    if (stderr) console.warn(('logs.flutterStderr'), stderr);

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
    console.error(('logs.flutterCreateFailed'), error);

    return NextResponse.json(
      {
        success: false,
        error:   'errors.stepFailed',  message: error.message || error,
        details: error.stderr || error.stdout || error,
      },
      { status: 500 },
    );
  }
}