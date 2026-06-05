/**
 * extensions/registry.ts
 *
 * Extension registry — loads and manages all active extensions.
 * Empty in self-hosted version. Structure is here so future extensions
 * can register themselves and the hook runner in api-cms can call them.
 */

import type {
  Extension,
  ExtensionHookName,
  ExtensionHookContext,
  ExtensionResult,
} from './types'

// ---------------------------------------------------------------------------
// Registry
// ---------------------------------------------------------------------------

const extensions: Extension[] = []

/**
 * registerExtension
 * Adds an extension to the registry.
 */
export function registerExtension(extension: Extension): void {
  const existing = extensions.findIndex((e) => e.id === extension.id)
  if (existing >= 0) {
    extensions[existing] = extension
    console.log(`[Extensions] Updated extension: ${extension.id}`)
  } else {
    extensions.push(extension)
    console.log(`[Extensions] Registered extension: ${extension.id}`)
  }
}

/**
 * getExtensions
 * Returns all registered extensions.
 */
export function getExtensions(): Extension[] {
  return [...extensions]
}

/**
 * getExtensionById
 * Returns a single extension by ID, or undefined if not found.
 */
export function getExtensionById(id: string): Extension | undefined {
  return extensions.find((e) => e.id === id)
}

/**
 * runHook
 * Runs all extensions that have registered a handler for the given hook name.
 * Runs sequentially — order matters for hooks like cart.checkout.
 * Errors in individual extensions are caught and logged but do not
 * block other extensions from running.
 */
export async function runHook(
  hookName: ExtensionHookName,
  context:  ExtensionHookContext
): Promise<ExtensionResult[]> {
  const results: ExtensionResult[] = []

  for (const extension of extensions) {
    const handler = extension.hooks?.[hookName]
    if (!handler) continue

    try {
      const result = await handler(context)
      results.push(result)
    } catch (err: any) {
      console.error(`[Extensions] Hook ${hookName} failed in ${extension.id}:`, err.message)
      results.push({ success: false, error: err.message })
    }
  }

  return results
}