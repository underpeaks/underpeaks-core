import { NextRequest, NextResponse } from 'next/server'
import { getAdapter } from '@/app/db-adapter'
import type { DBType, DBConfig } from '@/app/db-adapter/types'

export async function POST(req: NextRequest) {
  const { token } = await req.json()
  const dbType = process.env.NEXT_DB_TYPE as DBType
  const serviceAccount = JSON.parse(process.env.NEXT_DB_FIREBASE_SERVICE_ACCOUNT!)

  const dbConfig: DBConfig = {
    type: dbType,
    firebaseConfigJson: JSON.stringify(serviceAccount),
    storageBucket: 'gs://' + serviceAccount.storageBucket,
  }

  const adapter = getAdapter(dbType, dbConfig)
  const user = await adapter.validateBuiltInSession!(dbConfig, token)
  return NextResponse.json({ user })
}
