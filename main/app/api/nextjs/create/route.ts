/**
 * POST /api/installer/create-nextjs
 *
 * A Next.js API route that scaffolds a new Next.js project on the server's
 * file system using `create-next-app`. This is called during the installer
 * wizard to set up the Next.js side of the user's project.
 *
 * IMPORTANT — This route executes shell commands on the server:
 * - It clears the npm/npx cache to prevent common ENOTEMPTY errors that
 *   occur when npx tries to create temp folders that already exist.
 * - It runs `npx create-next-app@latest` to scaffold the project.
 * This means it should ONLY be accessible in a trusted installer environment,
 * never exposed as a public API endpoint.
 *
 * Request:
 * - Method:  POST
 * - Headers: Content-Type: application/json
 * - Body:    { projectName: string }
 *
 * Response (success — project created):
 * - 200 { success: true, skipped: false, path: string }
 *
 * Response (success — project already exists, skipped):
 * - 200 { success: true, skipped: true, message: string, path: string }
 *
 * Response (error):
 * - 400 { error: 'Invalid project name.' }  — Missing or non-string project name.
 * - 500 { error: string, details: any }     — Shell command or file system failure.
 *
 * How it works (step by step):
 * 1. Reads and validates `projectName` from the request body.
 * 2. Resolves the installation directory (sibling `nextjs/` folder relative
 *    to the current working directory) and creates it if it doesn't exist.
 * 3. Checks if a folder with `projectName` already exists — if so, skips
 *    creation and returns early with `skipped: true`.
 * 4. Clears the npx cache folder to prevent ENOTEMPTY errors.
 * 5. Runs `npm cache clean --force` for a clean install environment.
 * 6. Runs `npx create-next-app@latest <projectName> --yes` to scaffold
 *    the project non-interactively (--yes accepts all defaults).
 * 7. Checks again if the project folder exists after the command runs
 *    and returns the appropriate success response.
 *
 * Note on error details:
 * - The 500 response includes `error.stderr` and `error.stdout` from the
 *   shell command to help diagnose what went wrong during scaffolding.
 *   These are only sent to the installer client, not logged publicly.
 */

import { NextResponse }  from 'next/server'
import { execaCommand }  from 'execa'
import path              from 'path'
import os                from 'os'
import fs                from 'fs/promises'
import fsSync            from 'fs'
import { mkdirp }        from 'mkdirp'

/**
 * POST handler
 *
 * Scaffolds a new Next.js project on the server file system.
 * Skips silently if the project folder already exists.
 *
 * @param req - The incoming request object containing { projectName } in the body.
 * @returns    A NextResponse indicating success, skip, or failure.
 */
export async function POST(req: Request) {
  try {
    // -----------------------------------------------------------------------
    // Step 1: Parse and validate the request body
    // -----------------------------------------------------------------------

    const body = await req.json()
    const { projectName } = body

    /**
     * Validate that `projectName` is a non-empty string.
     * A missing or non-string project name would cause the shell command
     * to fail in unpredictable ways, so we reject early with a clear error.
     */
    if (!projectName || typeof projectName !== 'string') {
      return NextResponse.json(
        { error: 'Invalid project name.' },
        { status: 400 }
      )
    }

    // -----------------------------------------------------------------------
    // Step 2: Resolve the installation directory
    // -----------------------------------------------------------------------

    /**
     * The Next.js project will be created inside a `nextjs/` folder that
     * sits one level above the current working directory (i.e. a sibling
     * of the installer app's root).
     *
     * Example:
     *   CWD:         /home/user/underpeaks-installer
     *   installDir:  /home/user/nextjs
     *   projectPath: /home/user/nextjs/<projectName>
     *
     * `mkdirp` creates the directory and any missing parent directories,
     * similar to `mkdir -p` in a terminal. Safe to call if it already exists.
     */
    const installDir   = path.join(process.cwd(), '..', 'nextjs')
    await mkdirp(installDir)

    const projectPath  = path.join(installDir, projectName)

    console.log(`[create-nextjs] Target directory: ${installDir}`)

    // -----------------------------------------------------------------------
    // Step 3: Skip if the project already exists
    // -----------------------------------------------------------------------

    /**
     * If the project folder already exists, we skip creation entirely.
     * This prevents accidental overwrites and makes the installer idempotent
     * (safe to re-run without breaking an existing project).
     */
    if (fsSync.existsSync(projectPath)) {
      console.log(`[create-nextjs] Project folder already exists — skipping creation`)
      return NextResponse.json({
        success: true,
        skipped: true,
        message: `Next.js project "${projectName}" already exists. Skipping.`,
        path:    projectPath,
      })
    }

    // -----------------------------------------------------------------------
    // Step 4: Clear the npx cache
    // -----------------------------------------------------------------------

    /**
     * Clear the npx cache folder before running create-next-app.
     *
     * Why? When npx downloads and runs a package (like create-next-app),
     * it stores temporary files in ~/.npm/_npx. If a previous run was
     * interrupted, leftover files in this folder can cause ENOTEMPTY errors
     * on the next run. Deleting the folder first prevents this.
     *
     * We use a try/catch here because failing to clear the cache is not
     * fatal — we log a warning and continue. The `force: true` option
     * means no error is thrown if the folder doesn't exist.
     */
    const npxCache = path.join(os.homedir(), '.npm', '_npx')
    try {
      await fs.rm(npxCache, { recursive: true, force: true })
      console.log('[create-nextjs] npx cache cleared')
    } catch (err) {
      console.warn('[create-nextjs] Warning: Failed to clear npx cache folder:', err)
    }

    // -----------------------------------------------------------------------
    // Step 5: Clean the npm cache
    // -----------------------------------------------------------------------

    /**
     * Run `npm cache clean --force` to ensure we start with a clean npm
     * cache. This complements the npx cache clear above and helps avoid
     * stale or corrupted cached packages affecting the installation.
     */
    console.log('[create-nextjs] Cleaning npm cache...')
    await execaCommand('npm cache clean --force')

    // -----------------------------------------------------------------------
    // Step 6: Scaffold the Next.js project
    // -----------------------------------------------------------------------

    /**
     * Run `npx create-next-app@latest <projectName> --yes` to scaffold
     * the project non-interactively.
     *
     * Options:
     * - `@latest`  — Always uses the most recent stable version.
     * - `--yes`    — Skips all interactive prompts and accepts defaults.
     * - `cwd`      — Sets the working directory for the command to `installDir`
     *                so the project is created in the right location.
     * - `shell: true` — Runs the command through the system shell, required
     *                   for npx to work correctly on all platforms.
     *
     * `stdout` is destructured but intentionally not logged to avoid
     * printing potentially large scaffolding output to the server log.
     */
    console.log(`[create-nextjs] Running create-next-app for "${projectName}"...`)
    const { stdout } = await execaCommand(
      `npx create-next-app@latest ${projectName} --yes`,
      { cwd: installDir, shell: true }
    )

    // -----------------------------------------------------------------------
    // Step 7: Verify the project was created and return success
    // -----------------------------------------------------------------------

    /**
     * After the command runs, confirm the project folder now exists.
     * This guards against edge cases where create-next-app exits without
     * error but still fails to create the folder.
     */
    if (fsSync.existsSync(projectPath)) {
      console.log(`[create-nextjs] Project "${projectName}" created successfully`)
      return NextResponse.json({
        success: true,
        skipped: false,
        path:    projectPath,
      })
    }

    /**
     * If we reach here, the command completed but the folder wasn't created.
     * This is an unexpected state — return a 500 with a descriptive message.
     */
    console.warn(`[create-nextjs] Command completed but project folder not found`)
    return NextResponse.json(
      { error: `Project folder was not created. Check server logs for details.` },
      { status: 500 }
    )

  } catch (error: any) {
    /**
     * Catch-all error handler for shell command failures and file system errors.
     *
     * We include `error.stderr` and `error.stdout` in the response because
     * for shell command failures (from execa), these contain the actual
     * error output from the terminal — essential for diagnosing what went wrong
     * (e.g. permission errors, missing Node version, network failures).
     *
     * We log only error.message to avoid printing full stack traces or
     * potentially sensitive path information to the server log.
     */
    console.error('[create-nextjs] Project creation failed:', error.message)
    return NextResponse.json(
      {
        error:   `Step failed: Creating NextJS project - ${error.message || error}`,
        details: error.stderr || error.stdout || error,
      },
      { status: 500 }
    )
  }
}