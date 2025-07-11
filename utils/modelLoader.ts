import * as fs from 'fs'              // Node.js file system module to read files
import * as path from 'path'
         // Node.js path module to handle file paths
import { ModelDefinition } from '../types/model'  // Import TypeScript interface for model shape

/**
 * Loads all JSON model files from a given directory.
 * Parses each JSON file and returns an array of model definitions.
 *
 * @param dir - The directory path containing JSON model files
 * @returns An array of ModelDefinition objects
 */
export function loadSharedModels(dir: string): ModelDefinition[] {
  // Read all filenames in the specified directory
  const files = fs.readdirSync(dir)
  const models: ModelDefinition[] = []

  // Iterate over each file in the directory
  files.forEach((file) => {
    // Process only files ending with '.json'
    if (file.endsWith('.json')) {
      const filePath = path.join(dir, file)  // Create full file path
      const fileContent = fs.readFileSync(filePath, 'utf-8')  // Read file content as string

      try {
        // Parse JSON content into JavaScript object
        const model = JSON.parse(fileContent)
        models.push(model)  // Add parsed model to models array
      } catch (err) {
        // Log error if JSON parsing fails
        console.error(`❌ Failed to parse model ${file}:`, err)
      }
    }
  })

  // Return all successfully loaded models
  return models
}
