'use server'

import { supabase } from '../../../../nxf-ui/lib/supabase/client'
import bcrypt from 'bcryptjs'

interface SignupInput {
  full_name: string
  email: string
  password: string
  tenant_id?: string | null
}

export async function signup({
  full_name,
  email,
  password,
  tenant_id = null,
}: SignupInput) {
  // 1. Create user in Supabase Auth
  const { data: authData, error: authError } = await supabase.auth.signUp({
    email,
    password,
  })

  if (authError) {
    return { error: authError.message }
  }

  if (!authData.user?.id) {
    return { error: 'Failed to get user ID from Supabase Auth.' }
  }

  // 2. Hash password
  const password_hash = await bcrypt.hash(password, 12)

  // 3. Fetch the first available project_id
  const { data: projectData, error: projectError } = await supabase
    .from('projects')
    .select('id')
    .limit(1)
    .single()

  if (projectError || !projectData?.id) {
    return { error: 'Failed to fetch project ID.' }
  }

  const project_id = projectData.id

  // 4. Insert user into your users table
  const { error: dbError } = await supabase.from('users').insert([
    {
      id: authData.user.id,
      full_name,
      email,
      password_hash,
      tenant_id,
      project_id, // 👈 assigned here
    },
  ])

  if (dbError) {
    return { error: dbError.message }
  }

  return { data: authData }
}
