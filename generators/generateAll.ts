/**
 * index.ts  (Code Generator Entry Point)
 * ----------------------------------------
 * This is the main orchestrator for NXTFlutter's code generation system.
 *
 * What does this file do?
 * ------------------------
 * It coordinates the generation of model code for both Flutter and Next.js apps.
 * When you define models in your CMS (e.g. "Product", "User", "BlogPost"), this
 * file is responsible for:
 *
 *  1. Loading all your shared model definitions from the file system
 *  2. Sorting them in the correct order (so a model is always generated before
 *     any other model that depends on it)
 *  3. Calling the Flutter and/or Next.js generators for each model
 *  4. Handling and reporting any errors that occur during generation
 *
 * What is "topological sorting"?
 * --------------------------------
 * If Model A references Model B (e.g. a "BlogPost" has an "Author" field),
 * then "Author" must be generated BEFORE "BlogPost". Topological sorting is the
 * algorithm that figures out the correct order automatically, no matter how
 * many models and cross-references you have.
 *
 * How do you use this?
 * ----------------------
 * Call generateAllModels() to process every model in the shared_models folder.
 * Call generateModelCode() directly if you only want to generate one specific model.
 */

import * as path from 'path'
import { fileURLToPath } from 'url'
import { loadSharedModels } from '../utils/modelLoader'
import { generateFlutterModel } from '../generators/flutter/model_genarator'
import { generateNextModel } from '../generators/nextjs/model_genarator'
import {
  ModelDefinition,
  isModelField,
  isListField,
  isObjectField,
} from '../types/model'

/**
 * GenerateOptions
 * ---------------
 * A configuration object you can pass to the generator functions to control
 * what gets generated and how.
 *
 * @property flutter - Set to false to skip Flutter model generation (default: true)
 * @property next    - Set to false to skip Next.js model generation (default: true)
 * @property force   - Reserved for future use: force regeneration even if output already exists
 * @property format  - Reserved for future use: run a code formatter (e.g. Prettier) on the output
 * @property mocks   - If true, include mock data placeholders in the generated output
 */
export interface GenerateOptions {
  flutter?: boolean
  next?: boolean
  force?: boolean
  format?: boolean
  mocks?: boolean
}

/**
 * getDependencies
 * ---------------
 * Looks at all the fields of a model and collects the names of any other models
 * that this model depends on (i.e. references).
 *
 * This is used by the topological sort to determine generation order.
 * It works recursively — if a nested object or list also contains model references,
 * those are collected too.
 *
 * @param model - The model definition to inspect
 * @returns       An array of model name strings that this model depends on
 *
 * Example:
 *   A "BlogPost" model with an "author" field of type model 'Author'
 *   → getDependencies(BlogPost) returns ['Author']
 */
function getDependencies(model: ModelDefinition): string[] {
  // Using a Set automatically deduplicates — so if two fields reference the same model,
  // it only appears once in the dependency list
  const deps = new Set<string>()

  for (const field of Object.values(model.fields)) {
    if (isModelField(field)) {
      // Direct model reference (e.g. author: { type: 'model', of: 'Author' })
      deps.add(field.of)

    } else if (isListField(field)) {
      // List field — the items in the list might be a model or a primitive
      if (typeof field.of === 'string') {
        // List of a named model (e.g. tags: { type: 'List', of: 'Tag' })
        deps.add(field.of)
      } else if (isObjectField(field.of)) {
        // List of inline objects — recursively collect their dependencies too
        const nestedDeps = getDependencies({ name: '', fields: field.of.fields })
        nestedDeps.forEach((dep) => deps.add(dep))
      }

    } else if (isObjectField(field)) {
      // Inline object field — recursively collect its dependencies
      const nestedDeps = getDependencies({ name: '', fields: field.fields })
      nestedDeps.forEach((dep) => deps.add(dep))
    }
  }

  return Array.from(deps)
}

/**
 * sortModelsByDependencies
 * -------------------------
 * Takes a flat list of models and returns them sorted so that each model
 * always appears AFTER all the models it depends on.
 *
 * This uses a classic algorithm called "depth-first topological sort":
 *  - For each model, we first recursively visit all its dependencies
 *  - Only after all dependencies are added do we add the model itself
 *  - A "visited" set prevents us from processing the same model twice
 *    (which also protects against infinite loops in circular references)
 *
 * @param models - An unsorted array of all model definitions
 * @returns        The same models in dependency-safe generation order
 *
 * Example:
 *   Input:  [BlogPost (depends on Author), Author]
 *   Output: [Author, BlogPost]
 */
function sortModelsByDependencies(models: ModelDefinition[]): ModelDefinition[] {
  const sorted: ModelDefinition[] = []
  const visited = new Set<string>()

  // Build a lookup map so we can find a model by name in O(1) time
  const modelMap = new Map(models.map((m) => [m.name, m]))

  /**
   * visit
   * -----
   * Internal recursive helper. Visits a model and all its dependencies first,
   * then pushes the model into the sorted output list.
   *
   * @param model - The model to visit
   */
  function visit(model: ModelDefinition) {
    // If we've already processed this model, skip it to avoid duplicates
    if (visited.has(model.name)) return
    visited.add(model.name)

    // First, recursively visit all models this one depends on
    const deps = getDependencies(model)
    for (const depName of deps) {
      const depModel = modelMap.get(depName)
      if (depModel) {
        visit(depModel)
      }
      // If a dependency isn't found in our model map, we skip it silently.
      // This can happen if a model references an external/built-in type.
    }

    // All dependencies have been added — now it's safe to add this model
    sorted.push(model)
  }

  // Kick off the sort by visiting every model in the input list
  for (const model of models) {
    visit(model)
  }

  return sorted
}

/**
 * generateAllModels
 * -----------------
 * The top-level function that generates code for EVERY model in the shared_models folder.
 *
 * Steps:
 *  1. Loads all model definitions from the shared_models directory on disk
 *  2. Sorts them in dependency-safe order using topological sort
 *  3. Generates Flutter and/or Next.js code for each model in sequence
 *
 * @param options - Optional generation settings (see GenerateOptions above).
 *                  Defaults to an empty object, which generates both Flutter and Next.js output.
 *
 * Usage example:
 *   await generateAllModels()                        // generate everything
 *   await generateAllModels({ flutter: false })      // Next.js only
 *   await generateAllModels({ next: false })         // Flutter only
 *   await generateAllModels({ mocks: true })         // include mock placeholders
 */
export async function generateAllModels(options: GenerateOptions = {}) {
  // Recreate __dirname for ESM — Next.js App Router uses ESM modules, not CommonJS,
  // so the built-in __dirname variable is not available. This is the standard ESM workaround.
  const __filename = fileURLToPath(import.meta.url)
  const __dirname = path.dirname(__filename)

  const models: ModelDefinition[] = loadSharedModels(
    path.resolve(__dirname, '../../shared_models')
  )

  const sortedModels = sortModelsByDependencies(models)
  console.log(`🔁 Generating code for ${sortedModels.length} model(s)...`)

  for (const model of sortedModels) {
    await generateModelCode(model, options)
  }
}

/**
 * generateModelCode
 * -----------------
 * Generates Flutter and/or Next.js code for a SINGLE model, with validation
 * checks before generation begins.
 *
 * This function is safe to call on its own if you want to generate code for
 * just one specific model rather than all of them.
 *
 * Validation checks performed before generating:
 *  - The model object itself must exist (not undefined)
 *  - The model must have a non-empty 'name' property
 *  - The model must have a valid 'fields' object (not an array, not null)
 *
 * @param model   - The model definition to generate code for. Accepts undefined
 *                  so the function can safely handle bad input without crashing.
 * @param options - Generation settings controlling which targets to generate
 *
 * Usage example:
 *   await generateModelCode(myModel, { flutter: true, next: false })
 */
export async function generateModelCode(
  model: ModelDefinition | undefined,
  options: GenerateOptions
) {
  try {
    // ── Input Validation ──
    // We validate before doing any work so error messages are clear and specific

    if (!model) {
      throw new Error('Model is undefined — make sure a valid ModelDefinition was passed in')
    }

    if (!model.name) {
      throw new Error('Model is missing a "name" property — every model must have a name')
    }

    if (!model.fields || typeof model.fields !== 'object' || Array.isArray(model.fields)) {
      throw new Error(
        `Model "${model.name}" has invalid or missing "fields" — fields must be a plain object`
      )
    }

    // ── Code Generation ──
    // Each generator is only called if its option is not explicitly set to false.
    // This means omitting the option (undefined) defaults to generating that target.

    if (options.flutter !== false) {
      await generateFlutterModel(model, options)
    }

    if (options.next !== false) {
      await generateNextModel(model, options)
    }

    // Confirmation log — lets the developer see which model just completed successfully
    console.log(`✅ Successfully generated code for model: ${model.name}`)

  } catch (err) {
    // ── Error Handling ──
    // We catch all errors here so one bad model doesn't stop the rest from generating.
    // The error is logged with the model name (if available) for easy debugging.
    console.error(`❌ Code generation failed for model: ${model?.name ?? 'unknown'}`, err)
  }
}