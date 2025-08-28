import { writeFile } from 'fs/promises'
import path from 'path'

const ENV_FILE_PATH = path.resolve(process.cwd(), '.env.local')

// Escape newlines in private_key inside a JSON object
function serializeJsonValue(value: any): string {
  if (typeof value === 'object' && value !== null) {
    const clone = JSON.parse(JSON.stringify(value)) // deep clone
    if (typeof clone.private_key === 'string') {
      clone.private_key = clone.private_key.replace(/\n/g, '\\n')
    }
    return JSON.stringify(clone)
  }
  return String(value)
}

async function writeEnvFileFromObject(envObject: Record<string, any>) {
  const lines: string[] = []

  for (const [key, value] of Object.entries(envObject)) {
    if (value === undefined || value === null) continue

    if (key.toLowerCase() === 'firebaseconfigjson' || key === 'FIREBASE_CONFIG_JSON') {
      const serialized = serializeJsonValue(value)
      lines.push(`DB_FIREBASECONFIGJSON=${serialized}`)
    } else {
      const envKey = `DB_${key.toUpperCase()}`
      const serialized = serializeJsonValue(value)
      lines.push(`${envKey}=${serialized}`)
    }
  }

  await writeFile(ENV_FILE_PATH, lines.join('\n'), 'utf-8')
}

export async function POST(req: Request) {
  try {
    const body = await req.json()

    // Directly overwrite .env.local with the new values only
    await writeEnvFileFromObject(body)

    return new Response(JSON.stringify({ success: true }), { status: 200 })
  } catch (error: any) {
    console.error('Error writing .env.local:', error)
    return new Response(JSON.stringify({ error: error.message }), { status: 500 })
  }
}
