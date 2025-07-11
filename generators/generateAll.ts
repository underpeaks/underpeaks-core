import * as path from 'path'
import { loadSharedModels } from '../utils/modelLoader'
import { generateFlutterModel } from './flutter/model_genarator'
import { generateNextModel } from './nextjs/model_genarator'
import {
  ModelDefinition,
  isModelField,
  isListField,
  isObjectField,
} from '../types/model'

export interface GenerateOptions {
  flutter?: boolean
  next?: boolean
  force?: boolean
  format?: boolean
  mocks?: boolean
}

/**
 * Recursively get model dependencies from fields
 */
function getDependencies(model: ModelDefinition): string[] {
  const deps = new Set<string>()

  for (const field of Object.values(model.fields)) {
    if (isModelField(field)) {
      deps.add(field.of)
    } else if (isListField(field)) {
      if (typeof field.of === 'string') {
        deps.add(field.of)
      } else if (isObjectField(field.of)) {
        const nestedDeps = getDependencies({ name: '', fields: field.of.fields })
        nestedDeps.forEach((dep) => deps.add(dep))
      }
    } else if (isObjectField(field)) {
      const nestedDeps = getDependencies({ name: '', fields: field.fields })
      nestedDeps.forEach((dep) => deps.add(dep))
    }
  }

  return Array.from(deps)
}

/**
 * Topologically sort models so dependencies come before dependents
 */
function sortModelsByDependencies(models: ModelDefinition[]): ModelDefinition[] {
  const sorted: ModelDefinition[] = []
  const visited = new Set<string>()

  const modelMap = new Map(models.map((m) => [m.name, m]))

  function visit(model: ModelDefinition) {
    if (visited.has(model.name)) return
    visited.add(model.name)

    const deps = getDependencies(model)
    for (const depName of deps) {
      const depModel = modelMap.get(depName)
      if (depModel) {
        visit(depModel)
      }
    }

    sorted.push(model)
  }

  for (const model of models) {
    visit(model)
  }

  return sorted
}

/**
 * Generates code for all shared models sorted by dependencies
 */
export async function generateAllModels(options: GenerateOptions = {}) {
  const models: ModelDefinition[] = loadSharedModels(
    path.resolve(__dirname, '../../shared_models')
  )

  const sortedModels = sortModelsByDependencies(models)

  console.log(`🔁 Generating code for all models (${sortedModels.length})...`)

  for (const model of sortedModels) {
    await generateModelCode(model, options)
  }
}

/**
 * Generate Flutter and/or Next.js model code with validation checks
 */
export async function generateModelCode(
  model: ModelDefinition | undefined,
  options: GenerateOptions
) {
  try {
    if (!model) throw new Error('Model is undefined')
    if (!model.name) throw new Error('Model missing "name" property')
    if (!model.fields || typeof model.fields !== 'object' || Array.isArray(model.fields)) {
      throw new Error(`Model "${model.name}" has invalid or missing "fields"`)
    }

    if (options.flutter !== false) await generateFlutterModel(model, options)
    if (options.next !== false) await generateNextModel(model, options)

    console.log(`✅ Finished generating for model: ${model.name}\n`)
  } catch (err) {
    console.error(`❌ Failed to generate code for ${model?.name ?? 'undefined'}:`, err)
  }
}
