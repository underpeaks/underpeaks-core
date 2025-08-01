'use client'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { Database } from '../types/supabase'

const supabase = createClientComponentClient<Database>()

export async function getProjectIdForUser(userId: string): Promise<string | null> {
  // 1. Check users table
  const { data: userData, error: userError } = await supabase
    .from('users')
    .select('project_id')
    .eq('id', userId)
    .single()

  if (userError) {
    console.error('Error fetching user:', userError)
    return null
  }

  if (userData?.project_id) {
    return userData.project_id
  }

  // 2. Get first owned project
  const { data: project, error: projectError } = await supabase
    .from('projects')
    .select('id')
    .eq('owner_id', userId)
    .limit(1)
    .single()

  if (projectError || !project) {
    console.error('No project found:', projectError)
    return null
  }

  // 3. Update user with this project_id
  const { error: updateError } = await supabase
    .from('users')
    .update({ project_id: project.id })
    .eq('id', userId)

  if (updateError) {
    console.error('Failed to update user with project ID:', updateError)
  }

  return project.id
}
