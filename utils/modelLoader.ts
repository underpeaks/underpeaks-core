/**
 * loadSharedModels Utility
 *
 * This file provides a single utility function that scans a directory for
 * JSON model definition files, parses each one, and returns them as an array
 * of typed ModelDefinition objects.
 *
 * It is used by the code-generation pipeline (not the browser app) to read
 * the shared model definitions that describe the shape of the app's data.
 * Think of it as the "loader" step — before any code can be generated, all
 * the model blueprints need to be read from disk and turned into JavaScript
 * objects that the generator can work with.
 *
 * This file runs in Node.js only (not in the browser), which is why it can
 * safely use the `fs` and `path` modules from Node's standard library.
 *
 * Why console.error is kept here:
 * This utility runs as part of a CLI / build-time script, not inside the
 * Next.js app, so `next-intl` translations are not available. The error log
 * is a genuine operational signal (a model file has invalid JSON) that a
 * developer needs to see in their terminal output. It is intentionally kept.
 */

import * as fs   from 'fs'    // Node.js built-in: read files and directories from disk
import * as path from 'path'  // Node.js built-in: safely join and resolve file path strings

import { ModelDefinition } from '../types/model'  // The TypeScript shape every loaded model must match

// ---------------------------------------------------------------------------
// Function
// ---------------------------------------------------------------------------

/**
 * loadSharedModels
 *
 * Scans the given directory for `.json` files, parses each one as a
 * ModelDefinition, and returns all successfully parsed models as an array.
 * Files that fail to parse are skipped with an error logged to the console;
 * they do not crash the entire load process.
 *
 * How it works step by step:
 * 1. Read the list of all filenames inside `dir` using `fs.readdirSync`.
 * 2. Loop over every filename and skip anything that does not end in `.json`.
 * 3. For each `.json` file, build its full absolute path with `path.join`.
 * 4. Read the raw text content of the file with `fs.readFileSync`.
 * 5. Parse the text as JSON inside a try/catch block.
 *    - Success → push the resulting object into the `models` array.
 *    - Failure → log the filename and the parse error; continue to next file.
 * 6. Return the complete `models` array once all files have been processed.
 *
 * Why synchronous file reads?
 * `readdirSync` and `readFileSync` block execution until the operation
 * completes. This is intentional — this function is called once at the start
 * of a build/generation script where sequential, predictable loading is
 * preferable over async complexity.
 *
 * @param dir - The absolute or relative path to the directory containing
 *              the JSON model files. All `.json` files in this directory
 *              (non-recursive) will be loaded.
 *
 * @returns    An array of ModelDefinition objects, one per successfully
 *             parsed `.json` file. Files with invalid JSON are silently
 *             skipped (after logging) and will not appear in the result.
 *
 * @example
 * const models = loadSharedModels(path.join(process.cwd(), 'shared/models'))
 * // models → [{ name: 'User', fields: { ... } }, { name: 'Post', fields: { ... } }]
 */
export function loadSharedModels(dir: string): ModelDefinition[] {
  /*
   * Read every filename inside the target directory synchronously.
   * `readdirSync` returns a plain string array of filenames (not full paths),
   * e.g. ['user.json', 'post.json', 'README.md'].
   */
  const files = fs.readdirSync(dir)

  /*
   * Accumulator array — successfully parsed models are pushed here.
   * We start with an empty typed array so TypeScript can enforce that only
   * valid ModelDefinition objects are added.
   */
  const models: ModelDefinition[] = []

  files.forEach((file) => {
    /*
     * Skip any file that is not a JSON file.
     * This safely ignores README files, .DS_Store, editor swap files, etc.
     * that might exist alongside the model files in the same directory.
     */
    if (file.endsWith('.json')) {

      /*
       * Build the full path to this file by joining the directory path and
       * the filename. `path.join` handles the correct path separator for the
       * current operating system (/ on Mac/Linux, \ on Windows).
       */
      const filePath = path.join(dir, file)

      /*
       * Read the raw text content of the file as a UTF-8 string.
       * UTF-8 is the standard encoding for JSON files, so this is always safe.
       */
      const fileContent = fs.readFileSync(filePath, 'utf-8')

      try {
        /*
         * Attempt to parse the raw JSON string into a JavaScript object.
         * If the file contains valid JSON, `model` will be a plain object
         * matching the ModelDefinition shape, and we add it to the array.
         */
        const model = JSON.parse(fileContent)
        models.push(model)
      } catch (err) {
        /*
         * If JSON.parse throws (e.g. the file has a syntax error, a trailing
         * comma, or is completely empty), we catch that error here.
         *
         * We log the filename and the error so the developer can identify and
         * fix the broken file. We intentionally do NOT re-throw — we want the
         * loader to continue processing the remaining files rather than aborting
         * the entire generation run because of one bad file.
         *
         * NOTE: This console.error is kept intentionally. This utility runs at
         * build/CLI time (not inside the browser app), so next-intl translations
         * are unavailable. The error is a genuine signal for the developer and
         * must appear in the terminal output.
         */
        console.error(`❌ Failed to parse model ${file}:`, err)
      }
    }
  })

  /*
   * Return all models that were loaded and parsed without error.
   * The caller receives a clean typed array ready for code generation.
   */
  return models
}