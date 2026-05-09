'use server'

import { DBAdapter, DBConfig } from '@/app/db-adapter/types'
import { AuthService } from '@/app/[locale]/(auth)/auth-service'

interface SignupInput {
  full_name: string
  email: string
  password: string
  tenant_id?: string | null
}

// ❗ Pass adapter and config when calling this function
export async function signup(
  input: SignupInput,
  adapter: DBAdapter,
  config: DBConfig
) {
  const { full_name, email, password, tenant_id = null } = input

  const authService = new AuthService(adapter, config)

  // 1. Check if user already exists
  const existingUser = await adapter.findUserByEmail?.(config, email)
  if (existingUser) {
    return { error: 'User with this email already exists.' }
  }

  // 2. Create tenant if tenant_id not provided
  let finalTenantId = tenant_id
  if (!finalTenantId && adapter.createTenant) {
    finalTenantId = await adapter.createTenant(config, {
      subdomain: email.split('@')[0],
      user_email: email,
    })
  }

  // 3. Create project for the new user
  const projectId = adapter.createProject
    ? await adapter.createProject(config, {
        name: 'Default Project',
        user_id: '', // no user yet, will assign later if needed
      })
    : null

  // 4. Create user in nxf_users table
  const userId = adapter.createAdminUser
    ? await adapter.createAdminUser(config, {
        user_email: email,
        full_name,
        role: 'admin',
        password, // adapter handles hashing
        tenant_id: finalTenantId,
      })
    : null

  if (!userId) {
    return { error: 'Failed to create user.' }
  }

  // 5. Issue access & refresh tokens
  const tokens = await authService.issueTokens({
    userId,
    projectId,
  })

  return {
    data: {
      userId,
      projectId,
      tenantId: finalTenantId,
      tokens,
    },
  }
}
