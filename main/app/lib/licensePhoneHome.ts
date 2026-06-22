// app/lib/licensePhoneHome.ts (Core)
const PHONE_HOME_INTERVAL = 24 * 60 * 60 * 1000
const LICENSE_KEY         = process.env.NXF_LICENSE_KEY

let started = false

function readConfig(): { projectName: string; studioUrl: string } {
  try {
    const fs         = require('fs')
    const path       = require('path')
    const configPath = path.resolve(process.cwd(), 'nxt_flutter.config.json')
    console.log('[phone-home] config path:', configPath)
    if (fs.existsSync(configPath)) {
      const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'))
      console.log('[phone-home] project name from config:', config.projectName)
      console.log('[phone-home] studio url from config:', config.studioUrl)
      return {
        projectName: config.projectName ?? 'NXTFlutter Core',
        studioUrl:   config.studioUrl   ?? process.env.NEXT_PUBLIC_STUDIO_URL ?? 'https://app.nxtflutter.com',
      }
    } else {
      console.warn('[phone-home] config file not found at:', configPath)
    }
  } catch (err: any) {
    console.error('[phone-home] readConfig error:', err.message)
  }
  return {
    projectName: 'NXTFlutter Core',
    studioUrl:   process.env.NEXT_PUBLIC_STUDIO_URL ?? 'https://app.nxtflutter.com',
  }
}

function writeGraceUntil(graceUntil: string): void {
  try {
    const fs      = require('fs')
    const path    = require('path')
    const envPath = path.resolve(process.cwd(), '.env.local')
    let content   = fs.existsSync(envPath) ? fs.readFileSync(envPath, 'utf-8') : ''
    const line    = `NXF_LICENSE_GRACE_UNTIL="${graceUntil}"`
    const regex   = /^NXF_LICENSE_GRACE_UNTIL=.*$/m
    content       = regex.test(content) ? content.replace(regex, line) : content + `\n${line}`
    fs.writeFileSync(envPath, content, 'utf-8')
  } catch (err: any) {
    console.warn('[phone-home] Could not write grace_until to .env.local:', err.message)
  }
}

function writeRevocationFlag(revoked: boolean): void {
  try {
    const fs      = require('fs')
    const path    = require('path')
    const envPath = path.resolve(process.cwd(), '.env.local')
    let content   = fs.existsSync(envPath) ? fs.readFileSync(envPath, 'utf-8') : ''
    const line    = `NXF_LICENSE_REVOKED="${revoked ? 'true' : 'false'}"`
    const regex   = /^NXF_LICENSE_REVOKED=.*$/m
    content       = regex.test(content) ? content.replace(regex, line) : content + `\n${line}`
    fs.writeFileSync(envPath, content, 'utf-8')
  } catch (err: any) {
    console.warn('[phone-home] Could not write revocation flag to .env.local:', err.message)
  }
}

async function checkGracePeriod(): Promise<void> {
  const graceUntil = process.env.NXF_LICENSE_GRACE_UNTIL
  if (!graceUntil) return
  const graceDate = new Date(graceUntil)
  if (graceDate < new Date()) {
    console.error('[phone-home] Grace period expired — license enforcement active')
  }
}

export async function pingStudio(): Promise<{
  success:     boolean
  revoked:     boolean
  expired:     boolean
  grace_until: string | null
  plan_id:     string | null
}> {
  try {
    if (!LICENSE_KEY) {
      console.warn('[phone-home] NXF_LICENSE_KEY not set — skipping ping')
      return { success: false, revoked: false, expired: false, grace_until: null, plan_id: null }
    }

    const { projectName, studioUrl } = readConfig()

    console.log('[phone-home] pinging studio at:', studioUrl)
    console.log('[phone-home] using project name:', projectName)

    const res = await fetch(`${studioUrl}/api/license/ping`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({
        license_key:  LICENSE_KEY,
        instance_url: process.env.NEXT_PUBLIC_APP_DOMAIN ?? 'unknown',
        db_type:      process.env.NEXT_PUBLIC_DB_TYPE    ?? 'unknown',
        project_name: projectName,
      }),
    })

    const data = await res.json()

    if (!res.ok) {
      console.error('[phone-home] Ping failed:', data.error)
      return { success: false, revoked: data.revoked ?? false, expired: data.expired ?? false, grace_until: null, plan_id: null }
    }

    console.log('[phone-home] Ping successful — plan:', data.plan_id, '| grace_until:', data.grace_until)

    if (data.revoked) {
      console.error('[phone-home] License has been revoked — instance will degrade at grace period expiry')
      writeRevocationFlag(true)
    } else {
      // Clear revocation flag if previously set
      writeRevocationFlag(false)
    }

    return {
      success:     true,
      revoked:     data.revoked     ?? false,
      expired:     data.expired     ?? false,
      grace_until: data.grace_until ?? null,
      plan_id:     data.plan_id     ?? null,
    }

  } catch (err: any) {
    console.error('[phone-home] Network error — Studio unreachable:', err.message)
    return { success: false, revoked: false, expired: false, grace_until: null, plan_id: null }
  }
}

export async function startPhoneHome(): Promise<void> {
  if (started) return
  started = true

  console.log('[phone-home] Starting license phone-home service')

  const result = await pingStudio()

  if (result.success && result.grace_until) {
    writeGraceUntil(result.grace_until)
  }

  await checkGracePeriod()

  setInterval(async () => {
    const r = await pingStudio()
    if (r.success && r.grace_until) {
      writeGraceUntil(r.grace_until)
    }
    await checkGracePeriod()
  }, PHONE_HOME_INTERVAL)
}