import { NextRequest, NextResponse } from 'next/server'
import { getAdapter } from '@/app/db-adapter'
import { DBType } from '@/app/db-adapter/types'
import bcrypt from 'bcrypt'

export async function POST(req: NextRequest) {
  try {
    const { token, password } = await req.json()
    if (!token || !password)
      return NextResponse.json({ error: 'Token and password are required' }, { status: 400 })

    const envDbType = process.env.NEXT_DB_TYPE
    if (!envDbType) throw new Error('NEXT_DB_TYPE not set')

    const dbType: DBType =
      envDbType === 'firebase' ||
      envDbType === 'supabase' ||
      envDbType === 'mongodb' ||
      envDbType === 'mysql' ||
      envDbType === 'postgres'
        ? envDbType
        : (() => { throw new Error(`Unsupported NEXT_DB_TYPE: ${envDbType}`) })()

    let dbConfig: any

    // ---------------- FIREBASE ----------------
    if (dbType === 'firebase') {
      throw new Error('Firebase handled separately')
    }

    // ---------------- SUPABASE ----------------
    if (dbType === 'supabase') {
      dbConfig = {
        type: 'supabase',
        supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL!,
        supabaseKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      }
    }

    // ---------------- MONGODB ----------------
    else if (dbType === 'mongodb') {
      dbConfig = {
        type: 'mongodb',
        connectionString: process.env.NEXT_DB_MONGO_URI!,
        database: process.env.NEXT_DB_MONGO_DB_NAME!,
      }
    }

    // ---------------- MYSQL ----------------
    else if (dbType === 'mysql') {
      dbConfig = {
        type: 'mysql',
        host: process.env.NEXT_DB_MYSQL_HOST!,
        user: process.env.NEXT_DB_MYSQL_USER!,
        password: process.env.NEXT_DB_MYSQL_PASSWORD!,
        database: process.env.NEXT_DB_MYSQL_DATABASE!,
        port: Number(process.env.NEXT_DB_MYSQL_PORT || 3306),
      }
    }

    // ---------------- POSTGRES ----------------
    else if (dbType === 'postgres') {
      dbConfig = {
        type: 'postgres',
        host: process.env.NEXT_DB_POSTGRES_HOST!,
        user: process.env.NEXT_DB_POSTGRES_USER!,
        password: process.env.NEXT_DB_POSTGRES_PASSWORD!,
        database: process.env.NEXT_DB_POSTGRES_DB!,
        port: Number(process.env.NEXT_DB_POSTGRES_PORT || 5432),
      }
    }

    else {
      throw new Error(`Unsupported NEXT_DB_TYPE: ${dbType}`)
    }

    const adapter = getAdapter(dbType, dbConfig)
    if (!adapter.findUserByToken || !adapter.updatePasswordByToken)
      throw new Error(`${dbType} adapter missing required methods`)

    const user = await adapter.findUserByToken(token)
    if (!user)
      return NextResponse.json({ error: 'Invalid or expired token' }, { status: 400 })

    // Optional: hash password before saving, if adapter expects raw hash
    const hashedPassword = await bcrypt.hash(password, 10)

    await adapter.updatePasswordByToken(token, hashedPassword)
    return NextResponse.json({ success: true })
  } catch (err: any) {
    console.error('Reset password error:', err)
    return NextResponse.json(
      { error: err.message || 'Failed to reset password' },
      { status: 500 }
    )
  }
}
