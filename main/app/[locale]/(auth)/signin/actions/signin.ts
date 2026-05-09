// 'use server'

// import { DBAdapter, DBConfig } from '@/app/db-adapter/types'
// import { FirebaseAdapter } from '@/app/db-adapter/adapters/firebase-adapter'
// import { PostgresAdapter } from '@/app/db-adapter/adapters/postgres-adapter'
// import { MongoDBAdapter } from '@/app/db-adapter/adapters/mongodb-adapter'
// import { SupabaseAdapter } from '@/app/db-adapter/adapters/supabase-adapter'
// import { MySQLAdapter } from '@/app/db-adapter/adapters/mysql-adapter'

// import { loadDbFromEnv } from '@/app/lib/loadDbFromEnv'
// import { getFirebaseAdminAuth } from '@/app/lib/firebase-service'

// interface SigninInput {
//   email?: string
//   password?: string
//   token?: string
// }

// // DB adapter factory
// function getAdapter(config: DBConfig): DBAdapter {
//   switch (config.type) {
//     case 'firebase':
//       return new FirebaseAdapter(config)
//     case 'postgres':
//       return new PostgresAdapter(config)
//     case 'mongodb':
//       return new MongoDBAdapter(config)
//     case 'supabase':
//       return new SupabaseAdapter(config)
//     case 'mysql':
//       return new MySQLAdapter(config)
//     default:
//       throw new Error(`Unsupported DB type: ${config.type}`)
//   }
// }

// // Unified signin
// export async function signin(input: SigninInput) {
//   if (!input.token) return { error: 'Missing authentication token' }

//   // ✅ Load DB config from env
//   const config: DBConfig = loadDbFromEnv()  // <- named import

//   // Get adapter
//   const adapter: DBAdapter = getAdapter(config)

//   let session = null
//   if (adapter.validateBuiltInSession) {
//     session = await adapter.validateBuiltInSession(config, input.token)
//   } else {
//     if (config.type !== 'firebase') {
//       return { error: `Built-in session not supported for DB type: ${config.type}` }
//     }
//     try {
//       const adminAuth = getFirebaseAdminAuth(JSON.parse(config.firebaseConfigJson!))
//       session = await adminAuth.verifyIdToken(input.token)
//     } catch (err: any) {
//       return { error: err.message || 'Invalid token' }
//     }
//   }

//   if (!session) return { error: 'Invalid session' }

//   return {
//     success: true,
//     data: {
//       uid: session.uid,
//       email: session.email,
//     },
//   }
// }
