/**
 * testSingleModelFile — Developer Test Script
 *
 * This is a standalone Node.js script used during development to test the
 * code generation pipeline against real JSON model files. It is NOT part of
 * the browser app and is never shipped to end users.
 *
 * What it does:
 * 1. Reads a primary model file (`user_model.json`) from the test models folder.
 * 2. Reads a secondary "nested" model file (`post.json`) from the same folder.
 * 3. Runs the code generator (`generateModelCode`) for each model with a fixed
 *    set of options (Flutter + Next.js output, no mocks, no formatting).
 * 4. Logs progress to the terminal so the developer can see what is happening.
 * 5. If anything fails, logs the error and exits gracefully.
 *
 * When to use this script:
 * - When you add or change a model JSON file and want to verify the generator
 *   produces correct output before running the full generation suite.
 * - When debugging the generator itself against a known test model.
 *
 * How to run it (from the project root):
 *   npx ts-node src/testSingleModelFile.ts
 *   (or whichever path this file lives at)
 *
 * NOTE: All console.log and console.error calls in this file are intentional.
 * This script runs at CLI/build time where next-intl is unavailable. The logs
 * are genuine progress and error signals for the developer — not debug
 * breadcrumbs — and must remain visible in the terminal output.
 */

import * as fs   from 'fs/promises'              // Node.js async file system — read files without blocking
import * as path from 'path'                      // Node.js path helpers — safely build file paths
import { generateModelCode } from './generators/generateAll'  // The core code-generation function

// ---------------------------------------------------------------------------
// Main function
// ---------------------------------------------------------------------------

/**
 * testSingleModelFile
 *
 * An async function that orchestrates the entire test generation run.
 * It is defined as async so we can use `await` for each file read and
 * generation step, keeping the code easy to read top-to-bottom.
 *
 * All logic lives inside a single try/catch block so that any unexpected
 * error (missing file, bad JSON, generator crash) is caught in one place
 * and reported clearly to the terminal.
 */
async function testSingleModelFile() {
  try {

    // -----------------------------------------------------------------------
    // Step 1 — Load the primary (User) model
    // -----------------------------------------------------------------------

    /*
     * `path.resolve` builds an absolute path starting from `__dirname`,
     * which is the directory this script file lives in. This ensures the
     * path works correctly regardless of which directory the developer
     * runs the script from.
     */
    const userModelFile = path.resolve(
      __dirname,
      'shared_models',
      'test_models',
      'user_model.json'
    )

    /*
     * Read the raw JSON text from disk asynchronously.
     * `await` pauses here until the file is fully read before moving on.
     * 'utf-8' decodes the raw bytes into a readable string.
     */
    const userRaw   = await fs.readFile(userModelFile, 'utf-8')

    /*
     * Parse the raw JSON string into a JavaScript object.
     * If the file contains invalid JSON, this will throw and be caught
     * by the outer catch block.
     */
    const userModel = JSON.parse(userRaw)

    // -----------------------------------------------------------------------
    // Step 2 — Load the nested (Post) model
    // -----------------------------------------------------------------------

    /*
     * Same pattern as above, but for the Post model file.
     * This file may export a single model object OR an array of models,
     * so we handle both cases below.
     */
    const nestedModelFile = path.resolve(
      __dirname,
      'shared_models',
      'test_models',
      'post.json'
    )
    const nestedRaw    = await fs.readFile(nestedModelFile, 'utf-8')
    const parsedNested = JSON.parse(nestedRaw)

    /*
     * Normalise to an array so the generation loop below always works the
     * same way, regardless of whether the JSON file contains one model or
     * many. If it's already an array, use it directly; otherwise wrap the
     * single object in an array.
     */
    const nestedModels = Array.isArray(parsedNested) ? parsedNested : [parsedNested]

    // -----------------------------------------------------------------------
    // Step 3 — Generate the User model
    // -----------------------------------------------------------------------

    /*
     * Log which model is about to be generated so the developer can follow
     * along in the terminal and spot any model that causes a failure.
     */
    console.log(`\n🛠 Generating model from file (model: ${userModel.name})...`)

    /*
     * Call the code generator with the parsed User model and a fixed set of
     * generation options suitable for this test run:
     *   flutter: true  — produce Dart model files for Flutter
     *   next:    true  — produce TypeScript model files for Next.js
     *   mocks:   false — skip generating mock/fake data files
     *   force:   false — do not overwrite existing files automatically
     *   format:  false — skip running the code formatter after generation
     */
    await generateModelCode(userModel, {
      flutter: true,
      next:    true,
      mocks:   false,
      force:   false,
      format:  false,
    })

    // -----------------------------------------------------------------------
    // Step 4 — Generate each nested (Post) model
    // -----------------------------------------------------------------------

    /*
     * Loop over the normalised array of nested models (usually just one,
     * but the loop handles multiple gracefully). Each model is generated
     * with the same fixed options as the User model above.
     */
    for (const model of nestedModels) {
      console.log(`\n🛠 Generating model from file (model: ${model.name})...`)

      await generateModelCode(model, {
        flutter: true,
        next:    true,
        mocks:   false,
        force:   false,
        format:  false,
      })
    }

    // -----------------------------------------------------------------------
    // Step 5 — Done
    // -----------------------------------------------------------------------

    /*
     * If we reach this line, all models were generated without error.
     * The ✅ prefix makes this easy to spot at a glance in the terminal.
     */
    console.log('\n✅ Single file test models generated successfully!')

  } catch (error) {
    /*
     * Something went wrong — could be a missing file, invalid JSON, or a
     * crash inside the generator. Log the full error so the developer has
     * enough context to diagnose and fix the problem.
     *
     * We do NOT re-throw here; the process will exit naturally after this
     * catch block runs.
     */
    console.error('❌ Test generation failed:', error)
  }
}

// ---------------------------------------------------------------------------
// Entry point
// ---------------------------------------------------------------------------

/*
 * Call the function immediately when this script is executed.
 * Because `testSingleModelFile` is async, it returns a Promise, but we
 * don't need to `.catch` it here — all errors are already handled inside
 * the function's own try/catch block.
 */
testSingleModelFile()