import * as fs from 'fs/promises'
import * as path from 'path'
import { generateModelCode } from './generators/generateAll'

async function testSingleModelFile() {
  try {
    // Load user model first
    const userModelFile = path.resolve(__dirname, 'shared_models', 'test_models', 'user_model.json')
    const userRaw = await fs.readFile(userModelFile, 'utf-8')
    const userModel = JSON.parse(userRaw)

    // Load nested model (inline_nested_model)
    const nestedModelFile = path.resolve(__dirname, 'shared_models', 'test_models', 'post.json')
    const nestedRaw = await fs.readFile(nestedModelFile, 'utf-8')
    const parsedNested = JSON.parse(nestedRaw)

    // If nested is array, else wrap it in array
    const nestedModels = Array.isArray(parsedNested) ? parsedNested : [parsedNested]

    // Generate User model first
    console.log(`\n🛠 Generating model from file (model: ${userModel.name})...`)
    await generateModelCode(userModel, {
      flutter: true,
      next: true,
      mocks: false,
      force: false,
      format: false,
    })

    // Then generate nested models
    for (const model of nestedModels) {
      console.log(`\n🛠 Generating model from file (model: ${model.name})...`)
      await generateModelCode(model, {
        flutter: true,
        next: true,
        mocks: false,
        force: false,
        format: false,
      })
    }

    console.log('\n✅ Single file test models generated successfully!')
  } catch (error) {
    console.error('❌ Test generation failed:', error)
  }
}

testSingleModelFile()
