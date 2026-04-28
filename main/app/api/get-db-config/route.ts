// /api/system-config/route.ts
import { getAdapter } from '@/app/db-adapter'
import { getFirebaseAdapter } from '@/app/db-adapter/adapters/firebase-adapter'
import { DBConfig, DBType } from '@/app/db-adapter/types'
import { parseFirebaseServiceAccount, parseFirebaseWebConfig } from '@/app/lib/firebaseConfig'
import { NextResponse } from 'next/server'
import { NextRequest } from 'next/server'


export async function GET(req: NextRequest) {
  try {
    console.log("[API REQUEST] - GET INIT")
    const dbType = process.env.NEXT_PUBLIC_DB_TYPE as DBType
    const userId = req.nextUrl.searchParams.get('user_id')
    let dbConfig: DBConfig
   
    if (!userId) {
      return NextResponse.json({ config: null }, { status: 400 })
    }
    console.log("[API REQUEST] - SETTING DB")
    if (dbType === 'firebase') {
        
          console.log('🚪 Preparing Firebase config')
          const serviceAccount = process.env.NEXT_DB_FIREBASE_SERVICE_ACCOUNT
          const configAccount = process.env.NEXT_PUBLIC_FIREBASE_CONFIG
          if (!serviceAccount) throw new Error('Firebase service account missing')
          const parsedAccount =  parseFirebaseServiceAccount(serviceAccount) //JSON.parse(serviceAccount)
        const parsedconfig = parseFirebaseWebConfig(configAccount);
  console.log("[API REQUEST] - SETTING DB CONFIG")
          dbConfig = {
            type: 'firebase',
            firebaseConfigJson: JSON.stringify(parsedAccount),
            storageBucket: 'gs://' + parsedconfig.storageBucket,
          }
    
        // ======================= SUPABASE =======================
        }else {
      throw new Error(`Unsupported DB type: ${dbType}`)
    }

   console.log("[API REQUEST] - GETTING ADAPTER")
     const adapter = getAdapter(dbType, dbConfig)
console.log("[API REQUEST] - PASSING TO FUCNTION")
    const config = await adapter.findSystemConfigByUserId!(adapter.config, userId)

    console.log('CONFIG RESULT:', JSON.stringify(config))
console.log("[API REQUEST] - RETURNING DATA")
    return NextResponse.json({ config: config ?? null })
  } catch (err: any) {
    console.error('[SYSTEM CONFIG ERROR]', err)
    return NextResponse.json({ config: null }, { status: 500 })
  }
}