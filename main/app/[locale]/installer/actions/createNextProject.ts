/**
 * createNextJSProject Utility
 *
 * This file contains a single async helper function that asks the server to
 * scaffold (create) a new Next.js project on the backend. Like its Flutter
 * equivalent, it is the client-side half of a two-part operation — this
 * function sends the request, and the API route at /api/nextjs/create performs
 * the actual file-system and CLI work.
 *
 * Why does the heavy work happen on the server?
 * ──────────────────────────────────────────────
 * Creating a Next.js project requires running `create-next-app` (a Node.js
 * CLI tool) and writing files to disk — neither of which is possible inside a
 * browser. All of that work is delegated to the API route on the server.
 *
 * What the server can return:
 * ───────────────────────────
 *   success: true, skipped: false  — A brand-new project was scaffolded.
 *   success: true, skipped: true   — The project already existed; creation
 *                                    was intentionally skipped to avoid
 *                                    overwriting existing work.
 *   success: false                 — Something went wrong; `data.error`
 *                                    contains a human-readable reason.
 *
 * Difference from createFlutterProject:
 * ──────────────────────────────────────
 * Unlike the Flutter helper, this function returns the full server response
 * object (spread with a normalised `skipped` field) rather than just an output
 * string. This gives the caller — typically an installer UI — access to all
 * metadata the server provides (e.g. project path, version, warnings) without
 * this utility needing to know which fields matter.
 *
 * Usage example:
 * ──────────────
 *   import { createNextJSProject } from '@/utils/createNextJSProject'
 *
 *   try {
 *     const result = await createNextJSProject('my-app')
 *     if (result.skipped) {
 *       console.log('Project already exists, skipped creation.')
 *     } else {
 *       console.log('Project created successfully.')
 *     }
 *   } catch (err) {
 *     console.error('Could not create project:', err)
 *   }
 */

import { getTranslations } from 'next-intl/server'

/**
 * CreateNextJSProjectResult
 *
 * The shape of the object returned by createNextJSProject on success.
 * It is the full server response spread with one guaranteed normalised field:
 *
 *   skipped {boolean} — true if the project already existed and creation was
 *                       skipped; false if a fresh project was scaffolded.
 *                       Always present (defaults to false if the server omits it).
 *
 * All other fields from the server response (e.g. output path, version info)
 * are passed through as-is via the index signature.
 */
interface CreateNextJSProjectResult {
  skipped: boolean
  [key: string]: unknown
}

/**
 * createNextJSProject
 *
 * Sends a POST request to the backend to scaffold a new Next.js project with
 * the given name. Returns the full server response — including a normalised
 * `skipped` flag — so the caller can react to whether the project was newly
 * created or already existed.
 *
 * @param projectName — The name of the Next.js project to create. Passed
 *                      directly to `create-next-app` on the server, so it
 *                      should follow Next.js naming conventions: lowercase
 *                      letters, digits, and hyphens (e.g. 'my-app').
 *
 * @returns A promise that resolves to a {@link CreateNextJSProjectResult}
 *          containing all server-provided metadata plus a normalised `skipped`
 *          boolean.
 *
 * @throws  An Error with a descriptive message if the server reports that
 *          project creation was unsuccessful.
 */
export async function createNextJSProject(
  projectName: string,
): Promise<CreateNextJSProjectResult> {
  /**
   * t — Server-side translation function scoped to the 'createNextJSProject'
   * namespace. Used for the error fallback message so it is consistent with
   * the app's i18n system. getTranslations() is the server-side equivalent of
   * the client-side useTranslations() hook.
   */
  //const t = await getTranslations('createNextJSProject')

  /**
   * POST the project name to the backend API route.
   * The server will run `create-next-app <projectName>` and return a JSON
   * response describing what happened.
   */
  const res = await fetch('/api/nextjs/create', {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify({ projectName }),
  })

  const data = await res.json()

  /**
   * If the server marks the operation as unsuccessful, throw an error so the
   * caller (typically an installer UI) can surface it to the user.
   * We prefer the server's own error message when available, and fall back to
   * a generic translated string if it is not provided.
   */
  if (!data.success) {
    throw new Error(data.error ?? ('errors.creationFailed'))
  }

  /**
   * Return the full server response spread into a new object, with `skipped`
   * explicitly normalised to a boolean. The server may omit `skipped` entirely
   * on a successful fresh creation, so we default it to false.
   *
   * Spreading `data` passes all other server fields (output path, version,
   * warnings, etc.) through to the caller without this utility needing to
   * enumerate them.
   */
  return {
    ...data,
    skipped: data.skipped ?? false,
  }
}