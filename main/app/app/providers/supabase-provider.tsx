'use client'

import { createClient } from '@supabase/supabase-js'
import { SessionContextProvider } from '@supabase/auth-helpers-react'
import { useState } from 'react'

interface SupabaseProviderProps {
  children: React.ReactNode
  supabaseUrl: string
  supabaseAnonKey: string
}

export default function SupabaseProvider({
  children,
  supabaseUrl,
  supabaseAnonKey,
}: SupabaseProviderProps) {
  const [supabaseClient] = useState(() => createClient(supabaseUrl, supabaseAnonKey))

  return (
    <SessionContextProvider supabaseClient={supabaseClient}>
      {children}
    </SessionContextProvider>
  )
}
