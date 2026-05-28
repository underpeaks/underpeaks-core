/**
 * createFlutterProject Utility
 *
 * This file contains a single async helper function that asks the server to
 * scaffold (create) a new Flutter project on the backend. It is the client-
 * side half of a two-part operation — this function sends the request, and
 * the API route at /api/flutter/create does the actual file-system work.
 *
 * Why does the heavy work happen on the server?
 * ──────────────────────────────────────────────
 * Flutter projects are created by running the `flutter create` CLI command,
 * which requires the Flutter SDK to be installed. That SDK lives on the server,
 * not in the user's browser, so all file-system and CLI operations must be
 * delegated to an API route.
 *
 * What the server can return:
 * ───────────────────────────
 *   success: true, skipped: false  — A brand-new project was created.
 *   success: true, skipped: true   — The project already existed; creation
 *                                    was intentionally skipped to avoid
 *                                    overwriting existing work.
 *   success: false / res.ok false  — Something went wrong; `data.error`
 *                                    contains a human-readable reason.
 *
 * Usage example:
 * ──────────────
 *   import { createFlutterProject } from '@/utils/createFlutterProject'
 *
 *   try {
 *     const output = await createFlutterProject('my_app')
 *     console.log('Project ready at:', output)
 *   } catch (err) {
 *     console.error('Could not create project:', err)
 *   }
 */



/**
 * createFlutterProject
 *
 * Sends a POST request to the backend to scaffold a new Flutter project with
 * the given name. Logs the outcome and returns the project output path/details
 * reported by the server.
 *
 * @param projectName — The name of the Flutter project to create. This is
 *                      passed directly to the `flutter create` CLI command on
 *                      the server, so it should follow Flutter's naming rules:
 *                      lowercase letters, digits, and underscores only
 *                      (e.g. 'my_app', not 'MyApp' or 'my-app').
 *
 * @returns A promise that resolves to the `output` string returned by the
 *          server — typically the path or name of the created project.
 *
 * @throws  An Error with a descriptive message if the HTTP request fails or
 *          the server reports that project creation was unsuccessful.
 */
export async function createFlutterProject(projectName: string): Promise<string> {

  

  /**
   * t — Server-side translation function scoped to the 'createFlutterProject'
   * namespace. Used for log messages so they are consistent with the app's
   * i18n system. getTranslations() is the server-side equivalent of the
   * client-side useTranslations() hook.
   */
  //const t = await getTranslations('createFlutterProject')

  /**
   * POST the project name to the backend API route.
   * The server will run `flutter create <projectName>` and return a JSON
   * response describing what happened.
   */
  const res = await fetch('/api/flutter/create', {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify({ projectName }),
  })

  const data = await res.json()

  /**
   * If the HTTP status is not 2xx, or the response body explicitly marks the
   * operation as unsuccessful, throw an error so the caller can handle it.
   * We prefer the server's own error message when available, and fall back to
   * a generic translated message if it is not provided.
   */
  if (!res.ok || !data.success) {
    throw new Error(data.error ?? ('errors.creationFailed'))
  }

  /**
   * Log the outcome at the info level so developers can trace project creation
   * activity in server logs without exposing any sensitive data.
   *
   *   skipped: true  — the project already existed; no files were changed.
   *   skipped: false — a fresh project was scaffolded successfully.
   */
  if (data.skipped) {
    console.log('logs.skipped', )
  } else {
    console.log('logs.created', { output: data.output })
  }

  /**
   * Return the server's output value — typically the path or identifier of
   * the newly created (or already existing) Flutter project.
   */
  return data.output
}