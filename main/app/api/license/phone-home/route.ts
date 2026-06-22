// app/api/license/phone-home/route.ts (Core)
import { NextResponse }             from 'next/server'
import {pingStudio, startPhoneHome } from '@/app/lib/licensePhoneHome'

export async function GET() {
  try {
    const LICENSE_KEY = process.env.NXF_LICENSE_KEY
    if (!LICENSE_KEY) {
      return NextResponse.json({ success: false, error: 'NXF_LICENSE_KEY not set' }, { status: 400 })
    }

    const result = await pingStudio()

    return NextResponse.json({
      success:     result.success,
      revoked:     result.revoked,
      expired:     result.expired,
      grace_until: result.grace_until,
      plan_id:     result.plan_id,
    })

  } catch (err: any) {
    console.error('[phone-home route] Error:', err.message)
    return NextResponse.json({ success: false, error: err.message }, { status: 500 })
  }
}