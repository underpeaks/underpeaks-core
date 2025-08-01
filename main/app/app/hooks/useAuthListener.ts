// hooks/useAuthListener.ts
'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createPagesBrowserClient } from '@supabase/auth-helpers-nextjs'

export default function useAuthListener() {
  const router = useRouter()

  useEffect(() => {
    const supabase = createPagesBrowserClient()
    
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_IN' || event === 'SIGNED_OUT') {
        router.refresh()
      }
    })

    return () => {
      subscription?.unsubscribe()
    }
  }, [router])
}