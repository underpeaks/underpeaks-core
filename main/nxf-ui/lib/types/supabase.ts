// // types/supabase.ts
// export type Json = string | number | boolean | null | { [key: string]: Json } | Json[]

// export interface Database {
//   public: {
//     Tables: {
//       shared_models: {
//         Row: {
//           id: string
//           project_id: string
//           name: string
//           schema: Json
//           created_at: string
//           updated_at: string
//         }
//         Insert: {
//           id?: string
//           project_id: string
//           name: string
//           schema: Json
//           created_at?: string
//           updated_at?: string
//         }
//         Update: {
//           id?: string
//           project_id?: string
//           name?: string
//           schema?: Json
//           created_at?: string
//           updated_at?: string
//         }
//         Relationships: []
//       },
//       users: {
//         Row: {
//           id: string
//           email: string
//           project_id: string // ✅ HERE
//           created_at: string
//           updated_at: string
//         }
//         Insert: {
//           id?: string
//           email: string
//           project_id: string // ✅ HERE
//           created_at?: string
//           updated_at?: string
//         }
//         Update: {
//           id?: string
//           email?: string
//           project_id?: string // ✅ HERE
//           created_at?: string
//           updated_at?: string
//         }
//         Relationships: []
//       }
//       projects: {
//   Row: {
//     id: string
//     name: string
//     created_at: string
//     updated_at: string
//   }
//   Insert: {
//     id?: string
//     name: string
//     created_at?: string
//     updated_at?: string
//   }
//   Update: {
//     id?: string
//     name?: string
//     created_at?: string
//     updated_at?: string
//   }
//   Relationships: []
// }

//     },
//     Views: {}
//     Functions: {}
//   }
// }
