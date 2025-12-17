'use server'

import { DBAdapter, DBConfig } from '@/app/db-adapter/types'
import { AuthService } from '@/app/(auth)/auth-service'
import bcrypt from 'bcryptjs'

interface SigninInput {
  email: string
  password: string
}

// ❗ Pass adapter and config when calling this function
export async function signin(
  input: SigninInput,
  adapter: DBAdapter,
  config: DBConfig
) {
  const { email, password } = input
  const authService = new AuthService(adapter, config)

  // 1. Find user by email
  const user = await adapter.findUserByEmail?.(config, email)
  if (!user) {
    return { error: 'Invalid email or password.' }
  }

  // 2. Verify password
  const isValidPassword = await bcrypt.compare(password, user.password_hash)
  if (!isValidPassword) {
    return { error: 'Invalid email or password.' }
  }

  // 3. Find a project for the user (if needed)
  const project = await adapter.findProjectByOwnerId?.(config, user.user_id)
  const projectId = project?.project_id || null

  // 4. Issue access & refresh tokens
  const tokens = await authService.issueTokens({
    userId: user.user_id,
    projectId,
  })

  return {
    success: true,
    data: {
      userId: user.user_id,
      projectId,
      tokens,
    },
  }
}
