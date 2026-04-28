

import { readFileSync } from 'fs'
import { join } from 'path'

export function getSystemConfig() {
  try {
    // This assumes the config is in project root (same level as package.json)
    const filePath = join(process.cwd(), 'nxt_flutter.config.json')

    const config = JSON.parse(readFileSync(filePath, 'utf-8'))

    return {
      faviconUrl: config?.faviconUrl || '/images/favicon/NXT_Flutter_favicon.png',
      logoUrl: config?.logoUrl || '/images/logo/NXT_Flutter_logo.png',
      projectName: config?.projectName || '',
    }
  } catch (err) {
    return {
      faviconUrl: '/images/favicon/NXT_Flutter_favicon.png',
      logoUrl: '/images/logo/NXT_Flutter_logo.png',
      projectName: '',
    }
  }
}