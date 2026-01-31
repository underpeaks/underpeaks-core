// app/api/signin/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getAdapter } from '@/app/db-adapter'
import type { DBType, DBConfig } from '@/app/db-adapter/types'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => null)
    if (!body) return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })

    const { email, password, token } = body

    const dbTypeEnv = process.env.NEXT_DB_TYPE
    if (!dbTypeEnv)
      return NextResponse.json({ error: 'NEXT_DB_TYPE not defined' }, { status: 500 })

    const dbType = dbTypeEnv as DBType

    // ✅ Get full service account for Firebase Admin SDK
    const serviceAccountJson = process.env.NEXT_DB_FIREBASE_SERVICE_ACCOUNT
    if (!serviceAccountJson)
      return NextResponse.json({ error: 'Firebase service account not found' }, { status: 500 })

    let serviceAccount
    try {
      serviceAccount = JSON.parse(serviceAccountJson)
    } catch (err) {
      return NextResponse.json({ error: 'Invalid Firebase service account JSON' }, { status: 500 })
    }

    // ✅ Build dbConfig object
    const dbConfig: DBConfig = {
      type: dbType,
      firebaseConfigJson: serviceAccountJson, // pass full service account to adapter
      storageBucket: 'gs://'+serviceAccount.storageBucket, // can override if needed
    }

    const adapter = getAdapter(dbType, dbConfig)

    let user
    if (token) {
      if (!adapter.validateBuiltInSession)
        return NextResponse.json({ error: 'DB adapter does not support token login' }, { status: 400 })
      user = await adapter.validateBuiltInSession(dbConfig, token)
    } else if (email && password) {
      if (!adapter.signIn)
        return NextResponse.json({ error: `Email/password login not supported for DB type: ${dbType}` }, { status: 400 })
      user = await adapter.signIn(email, password)
    } else {
      return NextResponse.json({ error: 'Missing credentials' }, { status: 400 })
    }

    if (!user) return NextResponse.json({ error: 'Invalid credentials' }, { status: 400 })

    return NextResponse.json({ user })
  } catch (err: any) {
    console.error('Signin API error:', err)
    return NextResponse.json({ error: err.message || 'Server error' }, { status: 500 })
  }
}
