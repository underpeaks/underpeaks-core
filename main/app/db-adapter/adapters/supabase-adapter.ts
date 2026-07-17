/**
 * SupabaseAdapter
 *
 * This class is the Supabase implementation of the DBAdapter interface.
 * It acts as the single point of contact between the rest of the application
 * and Supabase's two main services:
 *
 *   - Supabase Database — A hosted PostgreSQL database accessed via the
 *                         Supabase client SDK. Used to store all application
 *                         data (users, projects, config, tokens, etc.).
 *   - Supabase Storage  — Supabase's file storage service, used to store
 *                         uploaded files organised into buckets and folders.
 *
 * What this adapter provides:
 * - Initialising two Supabase clients (public and admin) from config.
 * - Full CRUD operations (create, read, update, delete) against Supabase tables.
 * - User management: register, login, find, hash passwords, verify email.
 * - Authentication: validate session tokens, reset passwords.
 * - Project and tenant management.
 * - System config read/write operations.
 * - Storage bucket setup and folder creation.
 * - Data model creation from project type.
 * - Demo content installation from local JSON files.
 *
 * DDL operations (CREATE TABLE, ALTER TABLE, DROP TABLE, RENAME TABLE):
 * - Uses a direct pg Pool via the Session pooler connection string when
 *   available. This bypasses PostgREST entirely and requires no custom
 *   functions on the Supabase project.
 * - Falls back to rpc('pg_execute_sql') if no connection string is provided.
 *
 * Two Supabase clients are maintained:
 *   - client      — Used for standard database and auth operations.
 *   - adminClient — Used for admin-level operations (creating users, storage
 *                   bucket management) that require elevated permissions.
 */

import { createClient, SupabaseClient }  from '@supabase/supabase-js'
import bcrypt                            from 'bcrypt'
import { Pool }                          from 'pg'
import { ColumnDef, DBAdapter, DBConfig } from '../types'
import { randomBytes }                   from 'crypto'
import nodemailer                        from 'nodemailer'
import { loadAllModels }                 from '../utils/load-model'
import { CreateUserDataModels }          from '../utils/create-data-models'

interface StorageFile {
  id:         string
  name:       string
  url:        string
  size:       string
  mimeType:   string
  folder:     string
  folderPath: string
  uploaded:   string
}

const DEFAULT_BUCKETS = [
  'system', 'themes', 'extensions', 'projects',
  'avatars', 'logos', 'uploads',
]

export class SupabaseAdapter implements DBAdapter {
  supportsBuiltInAuth = true

  private _config:     DBConfig
  private client:      SupabaseClient
  private adminClient: SupabaseClient

  /**
   * pgPool — optional direct Postgres connection pool.
   * Created when a connectionString is present in the config.
   * Used exclusively for DDL operations to bypass PostgREST.
   */
  private pgPool?: Pool

  // ─── Constructor ──────────────────────────────────────────────────────────

  constructor(config: DBConfig) {
    console.log('[SupabaseAdapter] Constructor started')

    this._config = config

    if (!config.supabaseUrl || !config.serviceRoleKey || !config.anonKey) {
      throw new Error('SupabaseAdapter requires supabaseUrl, serviceRoleKey and anonKey in config')
    }

    this.client      = createClient(config.supabaseUrl, config.anonKey)
    console.log('[SupabaseAdapter] Public client created')

    this.adminClient = createClient(config.supabaseUrl, config.serviceRoleKey)
    console.log('[SupabaseAdapter] Admin client created')

    /**
     * Create a direct Postgres pool if a connection string was provided.
     * This is the Session pooler string from the Supabase dashboard:
     * postgresql://postgres.[ref]:[password]@aws-0-[region].pooler.supabase.com:5432/postgres
     *
     * ssl: rejectUnauthorized: false is required for Supabase pooler connections.
     */
 if (config.connectionString) {
  const safeConnectionString = this.sanitizeConnectionString(config.connectionString)
  
  this.pgPool = new Pool({
    connectionString:        safeConnectionString,
    ssl:                     { rejectUnauthorized: false },
    max:                     3,
    connectionTimeoutMillis: 10000,
  })
  console.log('[SupabaseAdapter] Direct Postgres pool created')
}
  }

  get config(): DBConfig {
    return this._config
  }

  // ─── Connection ───────────────────────────────────────────────────────────
/**
 * sanitizeConnectionString
 *
 * URL-encodes special characters in the password portion of a Postgres
 * connection string. Characters like !, #, @, $ etc. break URL parsing
 * if not encoded.
 */
private sanitizeConnectionString(connectionString: string): string {
  try {
    // Match: protocol://username:PASSWORD@host:port/db
    const match = connectionString.match(
      /^(postgresql|postgres):\/\/([^:]+):(.+)@([^:]+):(\d+)\/(.+)$/
    )

    if (!match) return connectionString

    const [, protocol, username, password, host, port, db] = match
    const encodedPassword = encodeURIComponent(password)

    return `${protocol}://${username}:${encodedPassword}@${host}:${port}/${db}`
  } catch {
    return connectionString
  }
}
  async testConnection() {
    console.log('[SupabaseAdapter] testConnection started')

    try {
      const response = await fetch(`${this.config.supabaseUrl}/auth/v1/settings`, {
        headers: { apikey: this.config.anonKey! },
      })

      console.log(`[SupabaseAdapter] testConnection response status: ${response.status}`)

      if (!response.ok) {
        throw new Error(`Supabase responded with status ${response.status}`)
      }

      console.log('[SupabaseAdapter] testConnection succeeded')
      return { success: true, message: 'Connected to Supabase successfully.' }

    } catch (error: any) {
      console.error('[SupabaseAdapter] testConnection failed')
      return {
        success: false,
        message: error.message || 'Failed to connect to Supabase.',
      }
    }
  }

  // ─── CRUD ──────────────────────────────────────────────────────────────────

  async create(config: DBConfig, table: string, data: any) {
  console.log(`[SupabaseAdapter] create — table: ${table}`)
  const { data: inserted, error } = await this.adminClient
    .from(table)
    .insert(data)
    .select()
  if (error) {
    console.error(`[SupabaseAdapter] create failed — table: ${table}`)
    throw error
  }
  return inserted
}

  async read(config: DBConfig, table: string, query?: any) {
  console.log(`[SupabaseAdapter] read — table: ${table}`)
  let qb = this.adminClient.from(table).select('*')
  if (query) {
    Object.entries(query).forEach(([key, value]) => (qb = qb.eq(key, value as string)))
  }
  const { data, error } = await qb
  if (error) {
    console.error(`[SupabaseAdapter] read failed — table: ${table}`)
    throw error
  }
  return data
}

async readAll(config: DBConfig, table: string): Promise<any[]> {
  console.log(`[SupabaseAdapter] readAll — table: ${table}`)
  const { data, error } = await this.adminClient.from(table).select('*')
  if (error) {
    console.error(`[SupabaseAdapter] readAll failed — table: ${table}`)
    throw error
  }
  return data ?? []
}
  async update(
    config: DBConfig,
    table: string,
    id: string,
    data: any,
    idColumn: string = 'id'
  ) {
    console.log(`[SupabaseAdapter] update — table: ${table}`)
    const { data: updated, error } = await this.client
      .from(table)
      .update(data)
      .eq(idColumn, id)
      .select()
    if (error) {
      console.error(`[SupabaseAdapter] update failed — table: ${table}`)
      throw error
    }
    return updated
  }

  async delete(config: DBConfig, table: string, id: string) {
    console.log(`[SupabaseAdapter] delete — table: ${table}`)
    const { data: deleted, error } = await this.client.from(table).delete().eq('id', id).select()
    if (error) {
      console.error(`[SupabaseAdapter] delete failed — table: ${table}`)
      throw error
    }
    return deleted
  }


  async findSystemConfigByUserId(config: DBConfig, userId: string) {
    try {
      console.log('[SupabaseAdapter] findSystemConfigByUserId started')

      if (!userId) {
        console.warn('[SupabaseAdapter] findSystemConfigByUserId — no userId provided')
        return null
      }

      const { data, error } = await this.client
        .from('nxf_system_config')
        .select('*')
        .eq('user_id', userId)
        .limit(1)
        .single()

      if (error) {
        if (error.code === 'PGRST116') {
          console.log('[SupabaseAdapter] findSystemConfigByUserId — no config found')
          return null
        }
        throw error
      }

      console.log('[SupabaseAdapter] findSystemConfigByUserId completed successfully')
      return data

    } catch (error) {
      console.error('[SupabaseAdapter] findSystemConfigByUserId failed')
      throw new Error(
        `SupabaseAdapter.findSystemConfigByUserId failed: ${
          error instanceof Error ? error.message : String(error)
        }`
      )
    }
  }

 async createProject(_config: DBConfig, data: { name: string; user_id: string; tenant_ID: string }): Promise<string> {
  const project_id = crypto.randomUUID()

  const { error } = await this.adminClient
    .from('nxf_system_projects')
    .insert({
      project_id,
      name:       data.name,
      user_id:    data.user_id,
      tenant_id:  data.tenant_ID,
      created_at: new Date().toISOString(),
    })

  if (error) throw error
  return project_id
}

 async findProjectByOwnerId(config: DBConfig, ownerId: string) {
  const { data, error } = await this.adminClient
    .from('nxf_system_projects')
    .select('*')
    .eq('user_id', ownerId)
    .maybeSingle()

  if (error) throw error
  return data || null
}

  // ─── Auth ──────────────────────────────────────────────────────────────────

  async login(config: DBConfig, email: string, password: string) {
    console.log('[SupabaseAdapter] login attempt started')

    try {
      const { data, error } = await this.client.auth.signInWithPassword({ email, password })

      if (error || !data.user) {
        console.error('[SupabaseAdapter] Supabase login failed')
        return { success: false, error: error?.message || 'Login failed' }
      }

      const user = data.user

      const { data: userProfile, error: profileError } = await this.client
        .from('nxf_users')
        .select('role')
        .eq('user_id', user.id)
        .limit(1)
        .single()

      if (profileError || !userProfile) {
        console.error('[SupabaseAdapter] Could not fetch user profile')
        return { success: false, error: 'Could not fetch user profile' }
      }

      if (userProfile.role !== 'admin') {
        console.warn('[SupabaseAdapter] Non-admin login attempt rejected')
        return {
          success: false,
          error:   'You do not have admin rights to access the console',
          user:    { id: user.id, email: user.email, role: userProfile.role },
        }
      }

      console.log('[SupabaseAdapter] Admin login successful')

      return {
        success:      true,
        user:         { id: user.id, email: user.email, role: userProfile.role },
        token:        data.session?.access_token,
        refreshToken: data.session?.refresh_token,
      }

    } catch {
      console.error('[SupabaseAdapter] login failed unexpectedly')
      return { success: false, error: 'Login failed' }
    }
  }

  async hashPassword(password: string) {
    return bcrypt.hash(password, 10)
  }

 async findUserByEmail(config: DBConfig, email: string) {
  const { data, error } = await this.adminClient
    .from('nxf_users')
    .select('*')
    .eq('user_email', email)
    .limit(1)

  if (error) throw error
  return data?.[0] || null
}

  // ─── Register ─────────────────────────────────────────────────────────────

  async registerUserInAuth(
    config: DBConfig,
    data: { email: string; password: string; full_name: string; notes?: string }
  ) {
    console.log('[SupabaseAdapter] registerUserInAuth started')

    if (!data.email || !data.password || !data.full_name) {
      throw new Error('Email, password, and full name are required')
    }

    if (!this.adminClient) {
      throw new Error('Supabase adminClient not initialized with service role key')
    }

    const { data: authData, error: authError } = await this.adminClient.auth.admin.createUser({
      email:         data.email,
      password:      data.password,
      email_confirm: true,
      user_metadata: { full_name: data.full_name },
    })

    if (authError || !authData?.user) {
      console.error('[SupabaseAdapter] Auth user creation failed')
      throw new Error(authError?.message || 'Failed to create auth user')
    }

    const userId = authData.user.id
    console.log('[SupabaseAdapter] Auth user created successfully')

    const hashedPassword = await bcrypt.hash(data.password, 10)

    const { error: profileError } = await this.adminClient.from('nxf_users').insert({
      user_id:        userId,
      user_email:     data.email,
      full_name:      data.full_name,
      password_hash:  hashedPassword,
      role:           'admin',
      status:         'Active',
      notes:          data.notes || '',
      is_logged_in:   false,
      email_verified: true,
      last_login:     null,
      created_at:     new Date().toISOString(),
      updated_at:     new Date().toISOString(),
    })

    if (profileError) {
      console.error('[SupabaseAdapter] User profile insert failed')
      throw new Error(profileError.message)
    }

    console.log('[SupabaseAdapter] Admin user profile created in nxf_users')
    return { id: userId }
  }

  async registerSupabaseUser(
    config: DBConfig,
    data: { email: string; password: string; full_name: string }
  ) {
    console.log('[SupabaseAdapter] registerSupabaseUser started')

    if (!data.email || !data.password || !data.full_name) {
      throw new Error('Email, password, and full name are required')
    }

    if (!this.adminClient) {
      throw new Error('Supabase adminClient not initialized with service role key')
    }

    const { data: authData, error: authError } = await this.adminClient.auth.admin.createUser({
      email:         data.email,
      password:      data.password,
      email_confirm: false,
      user_metadata: { full_name: data.full_name },
    })

    if (authError || !authData?.user) {
      console.error('[SupabaseAdapter] Auth user creation failed')
      throw new Error(authError?.message || 'Failed to create auth user')
    }

    const userId = authData.user.id
    console.log('[SupabaseAdapter] Auth user created, awaiting email verification')

    const hashedPassword = await bcrypt.hash(data.password, 10)

    const { error: profileError } = await this.adminClient.from('nxf_users').insert({
      user_id:        userId,
      user_email:     data.email,
      full_name:      data.full_name,
      password_hash:  hashedPassword,
      role:           'user',
      status:         'Active',
      notes:          '',
      is_logged_in:   false,
      email_verified: true,
      last_login:     null,
      created_at:     new Date().toISOString(),
      updated_at:     new Date().toISOString(),
    })

    if (profileError) {
      console.error('[SupabaseAdapter] User profile insert failed')
      throw new Error(profileError.message)
    }

    console.log('[SupabaseAdapter] User profile created in nxf_users')
    return { id: userId }
  }

  async resetPassword(
    config: DBConfig,
    email: string,
    redirectUrl?: string
  ): Promise<{ success: boolean; error?: string }> {
    const { error } = await this.client.auth.resetPasswordForEmail(email, {
      redirectTo: redirectUrl || `${process.env.NEXT_PUBLIC_APP_DOMAIN}/reset-password`,
    })

    if (error) return { success: false, error: error.message }
    return { success: true }
  }

  // ─── User helpers ──────────────────────────────────────────────────────────

 async createAdminUser(config: DBConfig, data: any) {
  const { user_id, user_email, password, role = 'admin', ...rest } = data

  // Check if user already exists — if so skip creation entirely
  const existing = await this.findUserByEmail(config, user_email)
  if (existing) {
    console.log('[SupabaseAdapter] createAdminUser — user already exists, skipping')
    return existing
  }

  const hashed = await this.hashPassword(password)

  const { data: inserted, error } = await this.adminClient
    .from('nxf_users')
    .upsert({
      user_id:        user_id || crypto.randomUUID(),
      user_email,
      password_hash:  hashed,
      full_name:      rest.full_name || null,
      role,
      status:         'active',
      email_verified: true,
      token:          null,
      token_ttl:      null,
      notes:          rest.notes || null,
      created_at:     new Date().toISOString(),
      updated_at:     new Date().toISOString(),
      is_logged_in:   false,
      last_login:     new Date().toISOString(),
    }, { onConflict: 'user_email' })
    .select()

  if (error) throw error
  return inserted
}

  async findUserByToken(token: string) {
    const { data, error } = await this.client
      .from('nxf_users')
      .select('*')
      .eq('token', token)
      .gt('token_ttl', new Date().toISOString())
      .limit(1)
      .single()
    if (error) throw error
    return data || null
  }

  async verifyEmail?(
    config: DBConfig,
    data: { token: string; email?: string }
  ) {
    const user = await this.findUserByToken(data.token)
    if (!user) throw new Error('Invalid or expired verification token')

    await this.update(this.config, 'nxf_users', user.user_id, {
      email_verified: true,
      token:          null,
      token_ttl:      null,
      updated_at:     new Date().toISOString(),
    })

    return { success: true }
  }

  async resendVerificationEmail(config: DBConfig, email: string) {
    const user = await this.findUserByEmail(config, email)
    if (!user) throw new Error('User not found')

    const token = randomBytes(32).toString('hex')
    const ttl   = new Date(Date.now() + 24 * 60 * 60 * 1000)

    await this.update(config, 'nxf_users', user.user_id, {
      token,
      token_ttl:  ttl,
      updated_at: new Date().toISOString(),
    })

    return { success: true, token }
  }

  async findUserByEmailWithRetry(
    config: DBConfig,
    email: string,
    retries = 5,
    delay   = 300
  ) {
    if (!this.findUserByEmail) {
      throw new Error('findUserByEmail is not implemented in this adapter')
    }

    for (let i = 0; i < retries; i++) {
      const user = await this.findUserByEmail(config, email)
      if (user) return user
      await new Promise((resolve) => setTimeout(resolve, delay))
    }

    return null
  }

  async comparePassword(password: string, hash: string) {
    return bcrypt.compare(password, hash)
  }

  async findTokenByAccessToken(accessToken: string) {
    const { data, error } = await this.client
      .from('nxf_system_tokens')
      .select('*')
      .eq('access_token', accessToken)
      .limit(1)
      .single()
    if (error) throw error
    return data || null
  }

  async findTokenByRefreshToken(refreshToken: string) {
    const { data, error } = await this.client
      .from('nxf_system_tokens')
      .select('*')
      .eq('refresh_token', refreshToken)
      .limit(1)
      .single()
    if (error) throw error
    return data || null
  }

  async extendToken(
    tokenId: string,
    updates: Partial<{ revoked: boolean; updated_at: string }>
  ) {
    const updateData = { ...updates, updated_at: new Date().toISOString() }
    const { data, error } = await this.client
      .from('nxf_system_tokens')
      .update(updateData)
      .eq('token_id', tokenId)
      .select()
      .single()
    if (error) throw error
    return data || null
  }

  async createPasswordResetToken(email: string): Promise<string> {
    const user = await this.findUserByEmail(this.config, email)
    if (!user) throw new Error('User not found')

    const token = randomBytes(32).toString('hex')
    const ttl   = new Date(Date.now() + 24 * 60 * 60 * 1000)

    await this.update(this.config, 'nxf_users', user.user_id, {
      token,
      token_ttl:  ttl,
      updated_at: new Date().toISOString(),
    })

    return token
  }

  async updatePasswordByToken(token: string, newPassword: string) {
    const user = await this.findUserByToken(token)
    if (!user) throw new Error('Invalid or expired token')

    const hashed = await this.hashPassword(newPassword)

    await this.update(this.config, 'nxf_users', user.user_id, {
      password_hash: hashed,
      token:         null,
      token_ttl:     null,
      updated_at:    new Date().toISOString(),
    })

    return { success: true }
  }

  // ─── Login variants ────────────────────────────────────────────────────────

  async loginBasic(
    config: DBConfig,
    email: string,
    password: string,
    emailVerifiedRequired = true
  ) {
    const user = await this.findUserByEmail(config, email)
    if (!user)               return { success: false, error: 'User not found.' }
    if (!user.password_hash) return { success: false, error: 'Invalid password' }

    const valid = await bcrypt.compare(password.trim(), user.password_hash.trim())
    if (!valid) return { success: false, error: 'Invalid email or password' }

    return { success: true, user }
  }

  async loginWithSupabase(config: DBConfig, email: string, password: string) {
    const basic = await this.loginBasic(config, email, password, false)
    if (!basic.success || !basic.user) return { success: false, error: basic.error }

    if (basic.user.role !== 'admin') {
      return {
        success: false,
        error:   'You do not have admin rights to access the console',
        user:    basic.user,
      }
    }

    const project = await this.findProjectByOwnerId(config, basic.user.user_id)
    if (!project) return { success: false, error: 'No project found for user' }

    const accessToken  = crypto.randomUUID()
    const refreshToken = crypto.randomUUID()

    await this.create(config, 'nxf_system_tokens', {
      token_id:           crypto.randomUUID(),
      user_id:            basic.user.user_id,
      project_id:         project.project_id,
      access_token:       accessToken,
      refresh_token:      refreshToken,
      token_type:         'bearer',
      expires_at:         new Date(Date.now() + 3600 * 1000),
      refresh_expires_at: new Date(Date.now() + 7 * 86400 * 1000),
      revoked:            false,
      created_at:         new Date().toISOString(),
      updated_at:         new Date().toISOString(),
    })

    return {
      success:      true,
      user:         basic.user,
      accessToken,
      refreshToken,
      projectId:    project.project_id,
    }
  }

  async validateBuiltInSession(config: DBConfig, token: string) {
    console.log('[SupabaseAdapter] validateBuiltInSession started')
    try {
      const { data, error } = await this.client.auth.getUser(token)
      if (error) throw error
      return data.user
    } catch (err: any) {
      console.error('[SupabaseAdapter] Session validation failed:', err.message, err.cause ?? '')
      return null
    }
  }

  // ─── Tenants ───────────────────────────────────────────────────────────────

 async createTenant(config: DBConfig, data: { subdomain: string; user_email: string; user_id: string }) {
  const ten_id = crypto.randomUUID()

  // Check if tenant already exists for this email
  const existing = await this.findTenantByUserEmail(config, data.user_email)
  if (existing) {
    console.log('[SupabaseAdapter] createTenant — tenant already exists, skipping')
    return existing.ten_id ?? existing.id
  }

  const { error } = await this.adminClient
    .from('nxf_system_tenants')
    .insert({
      ten_id,
      subdomain:  data.subdomain,
      user_email: data.user_email,
      user_id:    data.user_id,
      created_at: new Date().toISOString(),
    })

  if (error) throw error
  return ten_id
}

  async findTenantByUserEmail(config: DBConfig, email: string) {
  const { data, error } = await this.adminClient
    .from('nxf_system_tenants')
    .select('*')
    .eq('user_email', email)
    .maybeSingle()

  if (error) throw error
  return data || null
}

  async findTenantByUserID(config: DBConfig, userID: string) {
  const { data, error } = await this.adminClient
    .from('nxf_system_tenants')
    .select('*')
    .eq('user_id', userID)
    .maybeSingle()

  if (error) throw error
  return data || null
}

  async sendResetEmail(
    config: DBConfig,
    email: string,
    redirectUrl?: string
  ): Promise<{ success: boolean; error?: string }> {
    console.log('[SupabaseAdapter] sendResetEmail started')

    if (!email) return { success: false, error: 'Email is required' }

    try {
      const { error } = await this.client.auth.resetPasswordForEmail(email, {
        redirectTo: redirectUrl || `${process.env.NEXT_PUBLIC_APP_URL}/signin`,
      })

      if (error) {
        console.error('[SupabaseAdapter] Reset email failed')
        return { success: false, error: error.message }
      }

      console.log('[SupabaseAdapter] Reset email sent successfully')
      return { success: true }

    } catch {
      console.error('[SupabaseAdapter] sendResetEmail failed unexpectedly')
      return { success: false, error: 'Failed to send reset email' }
    }
  }

  // ─── Storage ───────────────────────────────────────────────────────────────

  async setupStorageBuckets() {
    console.log('[SupabaseAdapter] setupStorageBuckets started')
    try {
      const bucketName = 'underpeaks_storage'
      const { error: bucketError } = await this.adminClient.storage.createBucket(
        bucketName,
        { public: false }
      )

      if (bucketError && !bucketError.message.includes('duplicate key')) {
        throw bucketError
      }

      for (const folder of DEFAULT_BUCKETS) {
        console.log(`[SupabaseAdapter] Creating folder: ${folder}`)
        await this.adminClient.storage
          .from(bucketName)
          .upload(`${folder}/.keep`, new Blob(['']), { upsert: true })
      }

      console.log('[SupabaseAdapter] Storage setup completed')
      return { success: true, buckets: DEFAULT_BUCKETS }

    } catch {
      console.error('[SupabaseAdapter] Storage setup failed')
      return { success: false, buckets: [] }
    }
  }

  // ─── Data Models ──────────────────────────────────────────────────────────

  async CreateDataModels(projectId: string, selectedProjectType: string, tenant_id: string) {
    if (!projectId) throw new Error('Project ID is required')
    console.log('[SupabaseAdapter] CreateDataModels started')
    return await CreateUserDataModels(this, projectId, tenant_id, selectedProjectType, [])
  }

async createDataModelsFromUserEmail(email: string, selectedProjectType: string) {
  const user = await this.findUserByEmail(this.config, email)
  console.log('[SupabaseAdapter] createDataModelsFromUserEmail — user:', JSON.stringify(user))
  if (!user?.user_id) throw new Error('User not found')

  const project = await this.findProjectByOwnerId(this.config, user.user_id)
  console.log('[SupabaseAdapter] createDataModelsFromUserEmail — project:', JSON.stringify(project))
  if (!project?.project_id) throw new Error('Project not found')

  // Try by user_id first, fall back to email, then create if missing
  let tenant = await this.findTenantByUserID(this.config, user.user_id)
  console.log('[SupabaseAdapter] createDataModelsFromUserEmail — tenant by user_id:', JSON.stringify(tenant))

  if (!tenant) {
    tenant = await this.findTenantByUserEmail(this.config, email)
    console.log('[SupabaseAdapter] createDataModelsFromUserEmail — tenant by email:', JSON.stringify(tenant))
  }

  if (!tenant) {
    console.log('[SupabaseAdapter] createDataModelsFromUserEmail — no tenant found, creating one')
    const ten_id = await this.createTenant(this.config, {
      subdomain:  email.split('@')[0],
      user_email: email,
      user_id:    user.user_id,
    })
    tenant = { ten_id }
  }

  const tenantId = tenant.ten_id ?? tenant.id
  console.log('[SupabaseAdapter] createDataModelsFromUserEmail — tenantId resolved:', tenantId)
  if (!tenantId) throw new Error('Tenant ID could not be resolved')

  return this.CreateDataModels(project.project_id, selectedProjectType, tenantId)
}

  async saveInstallerConfig(config: DBConfig, data: any): Promise<string> {
  if (!data.project_id) throw new Error('project_id is required')

  const { data: inserted, error } = await this.adminClient
    .from('nxf_system_config')
    .insert({
      ...data,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .select()
    .single()

  if (error) throw new Error(`Failed to save installer config: ${error.message}`)
  return inserted.id
}

  // ─── Table management ──────────────────────────────────────────────────────

  private normalizeColumns(
    columns: ColumnDef[] | Record<string, Omit<ColumnDef, 'name'>>
  ) {
    if (Array.isArray(columns)) return columns
    return Object.entries(columns).map(([name, def]: [string, any]) => ({
      name,
      type:        def.type,
      is_primary:  def.is_primary ?? def.primary_key ?? false,
      unique:      def.unique      ?? false,
      nullable:    def.nullable    ?? true,
      default:     def.default,
      foreign_key: def.foreign_key,
      arrayType:   def.arrayType,
    }))
  }

  // ─── Direct SQL execution ──────────────────────────────────────────────────

  /**
   * executeDdl
   *
   * Runs raw DDL SQL against the database. Uses the direct pg Pool when a
   * connectionString is available, bypassing PostgREST entirely. Falls back
   * to rpc('pg_execute_sql') if no connection string was provided.
   *
   * @param sql - The DDL statement to execute.
   */
  private async executeDdl(sql: string): Promise<void> {
  if (this.pgPool) {
    console.log('[SupabaseAdapter] executeDdl — using direct Postgres pool')
    const client = await this.pgPool.connect()
    try {
      await client.query(sql)
    } finally {
      client.release()
    }
    return
  }

  console.log('[SupabaseAdapter] executeDdl — falling back to rpc pg_execute_sql')
  const { error } = await this.adminClient.rpc('pg_execute_sql', { sql } as any)
  if (error) throw new Error(`SQL execution failed: ${error.message}`)
}

  // ─── DDL methods ───────────────────────────────────────────────────────────

 async createTable(
  tableName: string,
  schema: { columns: ColumnDef[] | Record<string, ColumnDef>; schema?: string }
) {
  console.log(`[SupabaseAdapter] createTable: ${tableName}`)

  let columnsArray: ColumnDef[] = []
  if (Array.isArray(schema.columns)) {
    columnsArray = schema.columns
  } else if (typeof schema.columns === 'object') {
    columnsArray = Object.entries(schema.columns).map(([name, col]) => ({
      ...col,
      name,
    }))
  }

  const columnsSql = columnsArray
    .map((col) => {
      let typeSql = ''
      switch (col.type.toLowerCase()) {
        case 'uuid':                      typeSql = 'UUID';             break
        case 'string':
        case 'text':                      typeSql = 'TEXT';             break
        case 'json':
        case 'jsonb':
        case 'array':                     typeSql = 'JSONB';            break
        case 'datetime':
        case 'date':
        case 'timestamp':
        case 'timestamp with time zone':  typeSql = 'TIMESTAMP';        break
        case 'integer':
        case 'int':                       typeSql = 'INTEGER';          break
        case 'bigint':                    typeSql = 'BIGINT';           break
        case 'boolean':                   typeSql = 'BOOLEAN';          break
        case 'float':
        case 'number':
        case 'decimal':
        case 'double':                    typeSql = 'DOUBLE PRECISION'; break
        default:
          throw new Error(`Unsupported column type: ${col.type}`)
      }

      // ── DEFAULT clause ───────────────────────────────────────────────────
      // Build a DEFAULT clause when the column definition includes a default.
      // Raw SQL expressions (functions, booleans, numbers) are written as-is.
      // Plain string values are quoted.
      let defaultClause = ''
      if (col.default !== undefined && col.default !== null) {
        if (
          typeof col.default === 'boolean' ||
          typeof col.default === 'number'
        ) {
          defaultClause = ` DEFAULT ${col.default}`
        } else if (typeof col.default === 'string') {
          // Raw SQL functions or keywords — write unquoted
          if (
            col.default.includes('(')  ||
            col.default === 'true'     ||
            col.default === 'false'    ||
            col.default === 'null'
          ) {
            defaultClause = ` DEFAULT ${col.default}`
          } else {
            defaultClause = ` DEFAULT '${col.default}'`
          }
        }
      }

      // ── Constraints ───────────────────────────────────────────────────────
      // Only add NOT NULL when the column has no default — a column with
      // DEFAULT false is effectively non-null without needing the constraint.
      const constraints: string[] = []
      if (col.is_primary)         constraints.push('PRIMARY KEY')
      if (col.unique)             constraints.push('UNIQUE')
      if (col.nullable === false && (col.default === undefined || col.default === null)) {
        constraints.push('NOT NULL')
      }

      return `"${col.name}" ${typeSql}${defaultClause} ${constraints.join(' ')}`.trim()
    })
    .join(', ')

  const sql = `CREATE TABLE IF NOT EXISTS "${schema.schema || 'public'}"."${tableName}" (${columnsSql});`

  console.log(`[SupabaseAdapter] Executing SQL for table: ${tableName}`)
  await this.executeDdl(sql)
  console.log(`[SupabaseAdapter] Table created successfully: ${tableName}`)
}

  async alterTable(
    tableName: string,
    changes: { add?: ColumnDef[]; drop?: string[]; rename?: { from: string; to: string } }
  ): Promise<any> {
    console.log(`[SupabaseAdapter] alterTable — ${tableName}`)

    const statements: string[] = []

    if (changes.add?.length) {
      for (const col of changes.add) {
        let typeSql = ''
        switch (col.type.toLowerCase()) {
          case 'uuid':                      typeSql = 'UUID';             break
          case 'string':
          case 'text':                      typeSql = 'TEXT';             break
          case 'json':
          case 'jsonb':
          case 'array':                     typeSql = 'JSONB';            break
          case 'datetime':
          case 'date':
          case 'timestamp':                 typeSql = 'TIMESTAMP';        break
          case 'integer':
          case 'int':                       typeSql = 'INTEGER';          break
          case 'bigint':                    typeSql = 'BIGINT';           break
          case 'boolean':                   typeSql = 'BOOLEAN';          break
          case 'float':
          case 'number':
          case 'decimal':
          case 'double':                    typeSql = 'DOUBLE PRECISION'; break
          default:
            throw new Error(`Unsupported column type: ${col.type}`)
        }
        const notNull = col.nullable === false ? ' NOT NULL' : ''
        statements.push(
          `ALTER TABLE "${tableName}" ADD COLUMN IF NOT EXISTS "${col.name}" ${typeSql}${notNull};`
        )
      }
    }

    if (changes.drop?.length) {
      for (const colName of changes.drop) {
        statements.push(`ALTER TABLE "${tableName}" DROP COLUMN IF EXISTS "${colName}";`)
      }
    }

    if (changes.rename) {
      statements.push(
        `ALTER TABLE "${tableName}" RENAME COLUMN "${changes.rename.from}" TO "${changes.rename.to}";`
      )
    }

    for (const sql of statements) {
      console.log(`[SupabaseAdapter] alterTable executing: ${sql}`)
      await this.executeDdl(sql)
    }

    console.log(`[SupabaseAdapter] alterTable completed for ${tableName}`)
    return true
  }

  async dropTable(tableName: string): Promise<any> {
    console.log(`[SupabaseAdapter] dropTable — ${tableName}`)
    await this.executeDdl(`DROP TABLE IF EXISTS "${tableName}";`)
    console.log(`[SupabaseAdapter] dropTable completed — ${tableName}`)
    return true
  }

  async renameTable(oldName: string, newName: string): Promise<any> {
    console.log(`[SupabaseAdapter] renameTable — ${oldName} → ${newName}`)
    await this.executeDdl(`ALTER TABLE "${oldName}" RENAME TO "${newName}";`)
    console.log(`[SupabaseAdapter] renameTable completed — ${oldName} → ${newName}`)
    return true
  }

  // ─── Demo content ──────────────────────────────────────────────────────────

  async installDemoContent(
  config: DBConfig,
  selectedProjectType: string,
  adminEmail?: string
): Promise<{
  success:   boolean
  message?:  string
  inserted?: number
  skipped?:  boolean
}> {
  try {
    if (!selectedProjectType) throw new Error('selectedProjectType is required')

    const fs   = await import('fs')
    const path = await import('path')

    const DEMO_ROOT = path.resolve(process.cwd(), '..', 'demo_content')

    console.log('[SupabaseAdapter] installDemoContent — DEMO_ROOT:', DEMO_ROOT)
    console.log('[SupabaseAdapter] installDemoContent — DEMO_ROOT exists:', fs.existsSync(DEMO_ROOT))
    console.log('[SupabaseAdapter] installDemoContent — selectedProjectType:', selectedProjectType)
    console.log('[SupabaseAdapter] installDemoContent — adminEmail:', adminEmail ?? 'not provided')

    let adminUserId: string | null = null
    let projectId:   string | null = null
    let tenantId:    string | null = null

    if (!adminEmail) {
      console.log('[SupabaseAdapter] installDemoContent — adminEmail missing, attempting nxf_users lookup')
      try {
        const { data: allUsers } = await this.adminClient
          .from('nxf_users')
          .select('*')
          .eq('role', 'admin')
          .limit(1)
          .single()

        if (allUsers?.user_email || allUsers?.email) {
          adminEmail = allUsers.user_email ?? allUsers.email
        }
      } catch (err: any) {
        console.warn('[SupabaseAdapter] installDemoContent — nxf_users admin lookup failed:', err.message)
      }
    }

    if (adminEmail) {
      try {
        const user = await this.findUserByEmail(config, adminEmail)
        adminUserId = user?.user_id ?? null
        console.log('[SupabaseAdapter] installDemoContent — adminUserId:', adminUserId)

        if (adminUserId) {
          const project = await this.findProjectByOwnerId(config, adminUserId)
          projectId = project?.project_id ?? project?.id ?? null
          console.log('[SupabaseAdapter] installDemoContent — projectId:', projectId)

          // Try by user_id first, fall back to email
          let tenant = await this.findTenantByUserID(config, adminUserId)
          if (!tenant) {
            console.log('[SupabaseAdapter] installDemoContent — tenant not found by user_id, trying email')
            tenant = await this.findTenantByUserEmail(config, adminEmail)
          }
          tenantId = tenant?.ten_id ?? tenant?.id ?? null
          console.log('[SupabaseAdapter] installDemoContent — tenantId:', tenantId)
        }
      } catch (err: any) {
        console.warn('[SupabaseAdapter] installDemoContent — could not resolve ownership IDs:', err.message)
      }
    } else {
      console.warn('[SupabaseAdapter] installDemoContent — no adminEmail resolved, ownership IDs will be empty')
    }

    if (!tenantId) {
      console.warn('[SupabaseAdapter] installDemoContent — tenantId still null, demo content with tenant_id NOT NULL will fail')
    }

    const modelNameToId = new Map<string, string>()
    if (projectId) {
      try {
        const { data: models } = await this.adminClient
          .from('nxf_system_models')
          .select('sm_id, name')
          .eq('project_id', projectId)

        for (const m of models ?? []) {
          if (m.name && m.sm_id) modelNameToId.set(m.name, m.sm_id)
        }

        console.log(`[SupabaseAdapter] Built model resolver map — ${modelNameToId.size} models indexed`)
      } catch (err: any) {
        console.warn('[SupabaseAdapter] Failed to build model resolver map:', err.message)
      }
    }

    const modelFolders = [
      'system_models',
      'users_models',
      `${selectedProjectType}_models`,
    ]

    const basePaths   = modelFolders.map((folder) => path.join(DEMO_ROOT, folder))
    let totalInserted = 0

    for (const basePath of basePaths) {
      console.log(`[SupabaseAdapter] Checking demo content path: ${basePath}`)

      if (!fs.existsSync(basePath)) {
        console.log(`[SupabaseAdapter] Demo content folder not found, skipping: ${basePath}`)
        continue
      }

      const files = fs.readdirSync(basePath).filter((f: string) => f.endsWith('.json'))

      if (!files.length) {
        console.log(`[SupabaseAdapter] No JSON files found in: ${basePath}`)
        continue
      }

      for (const file of files) {
        const filePath = path.join(basePath, file)
        const raw      = fs.readFileSync(filePath, 'utf-8')

        let jsonData: any
        try {
          jsonData = JSON.parse(raw)
        } catch (parseErr: any) {
          console.warn(`[SupabaseAdapter] Skipping invalid JSON file: ${file} — ${parseErr.message}`)
          continue
        }

        const tableName = file.replace('.json', '')
        const rows      = Array.isArray(jsonData) ? jsonData : jsonData?.demo_data

        if (!rows || !Array.isArray(rows)) {
          console.log(`[SupabaseAdapter] Skipping ${file} — no valid data array found`)
          continue
        }

        console.log(`[SupabaseAdapter] Inserting into ${tableName} — ${rows.length} rows`)

        const chunkSize = 200

        for (let i = 0; i < rows.length; i += chunkSize) {
          const chunk = rows.slice(i, i + chunkSize)

          const cleanedChunk = chunk.map((row: any) => {
            const cleaned: any = {}
            for (const key in row) {
              if (row[key] !== undefined) cleaned[key] = row[key]
            }

            // Resolve model name → model_id for nxf_pages rows
            if (tableName === 'nxf_pages' && cleaned.model) {
              const resolvedId = modelNameToId.get(cleaned.model)
              if (resolvedId) {
                cleaned.model_id = resolvedId
              } else {
                console.warn(
                  `[SupabaseAdapter] Page "${cleaned.slug}" references model "${cleaned.model}" which does not exist — model_id left null`
                )
              }
            }

            // Inject ownership IDs
            if (projectId) {
              cleaned.project_id = (
                cleaned.project_id === '{{project_id}}' || !cleaned.project_id
              ) ? projectId : cleaned.project_id
            }

            if (tenantId) {
              cleaned.tenant_id = (
                cleaned.tenant_id === '{{tenant_id}}' || !cleaned.tenant_id
              ) ? tenantId : cleaned.tenant_id
            }

            if (adminUserId && 'user_id' in cleaned) {
              cleaned.user_id = (
                cleaned.user_id === '{{user_id}}' || !cleaned.user_id
              ) ? adminUserId : cleaned.user_id
            }

            return cleaned
          })

          // Skip chunk if tenant_id is still null and any row requires it
          const missingTenant = cleanedChunk.some(
            (row: any) => 'tenant_id' in row && !row.tenant_id
          )
          if (missingTenant && !tenantId) {
            console.warn(
              `[SupabaseAdapter] Skipping ${tableName} — tenant_id is null and rows require it`
            )
            break
          }

          const { error } = await this.adminClient.from(tableName).insert(cleanedChunk)

          if (error) {
            console.error(`[SupabaseAdapter] Insert failed for table: ${tableName} — ${error.message}`)
            break
          }

          totalInserted += cleanedChunk.length
          console.log(`[SupabaseAdapter] Inserted ${cleanedChunk.length} rows into ${tableName}`)
        }
      }
    }

    console.log(`[SupabaseAdapter] installDemoContent complete — total inserted: ${totalInserted}`)

    return {
      success:  true,
      message:  'Demo content installed successfully',
      inserted: totalInserted,
    }

  } catch (err: any) {
    console.error('[SupabaseAdapter] installDemoContent failed:', err.message, err.stack)
    return {
      success:  false,
      message:  err.message ?? 'Failed to install demo content',
      inserted: 0,
    }
  }
}

  // ─── User status & activity ────────────────────────────────────────────────

  async getUserById(uid: string): Promise<{ user?: any; error?: string }> {
    try {
      if (!uid) return { error: 'UID is required' }

      const { data, error } = await this.client
        .from('nxf_users')
        .select('*')
        .eq('user_id', uid)
        .limit(1)
        .single()

      if (error) {
        if (error.code === 'PGRST116') return { error: 'User not found' }
        throw error
      }

      return { user: data }
    } catch (err: any) {
      return { error: err.message || 'Failed to fetch user' }
    }
  }

  async checkUserStatus(
    config: DBConfig,
    userId: string
  ): Promise<{ allowed: boolean; user?: any; reason?: string }> {
    try {
      if (!userId) return { allowed: false, reason: 'No user ID provided' }

      const { data, error } = await this.client
        .from('nxf_users')
        .select('*')
        .eq('user_id', userId)
        .limit(1)
        .single()

      if (error) {
        if (error.code === 'PGRST116') return { allowed: false, reason: 'User not found' }
        throw error
      }

      if (!data) return { allowed: false, reason: 'User not found' }

      if (data.status === 'suspended') return { allowed: false, user: data, reason: 'Account suspended' }
      if (data.status === 'inactive')  return { allowed: false, user: data, reason: 'Account inactive' }

      return { allowed: true, user: data }

    } catch (err: any) {
      console.error('[SupabaseAdapter] checkUserStatus failed')
      return { allowed: false, reason: err.message || 'Status check failed' }
    }
  }

  async writeActivityLog(
    config: DBConfig,
    entry: { user_id: string; action: string; context?: string }
  ): Promise<void> {
    try {
      const projects   = await this.readAll(config, 'nxf_system_projects')
      const project_id = projects[0]?.project_id ?? projects[0]?.id ?? null

      const tenants   = await this.readAll(config, 'nxf_system_tenants')
      const tenant_id = tenants[0]?.ten_id ?? tenants[0]?.id ?? null

      const { error } = await this.client.from('nxf_system_activity_logs').insert({
        log_id:     crypto.randomUUID(),
        project_id,
        tenant_id,
        user_id:    entry.user_id,
        action:     entry.action,
        context:    entry.context ?? null,
        created_at: new Date().toISOString(),
      })

      if (error) {
        console.error('[SupabaseAdapter] writeActivityLog insert failed:', error.message)
      }

    } catch (err: any) {
      console.error('[SupabaseAdapter] writeActivityLog failed:', err.message)
    }
  }

  // ─── Messages ─────────────────────────────────────────────────────────────

  async listConversations(
    config:     DBConfig,
    project_id: string,
    uid:        string,
    limit       = 10
  ): Promise<Array<Record<string, any>>> {
    const { data: conversations, error } = await this.client
      .from('nxf_system_conversations')
      .select('*')
      .eq('project_id', project_id)
      .order('last_message_at', { ascending: false })
      .limit(limit)

    if (error) {
      console.error('[SupabaseAdapter] listConversations failed')
      throw error
    }

    if (!conversations?.length) return []

    const seen    = new Set<string>()
    const deduped = conversations.filter((conv) => {
      const con_id = conv.con_id ?? conv.id
      if (seen.has(con_id)) return false
      seen.add(con_id)
      return true
    })

    const withUnread = await Promise.all(
      deduped.map(async (conv) => {
        const con_id = conv.con_id ?? conv.id

        const { count } = await this.client
          .from('nxf_system_messages')
          .select('*', { count: 'exact', head: true })
          .eq('conversation_id', con_id)
          .eq('recipient_id', uid)
          .eq('is_read', false)

        return { ...conv, con_id, id: con_id, unread_count: count ?? 0 }
      })
    )

    return withUnread
  }

  async getConversationThread(
    config:         DBConfig,
    conversationId: string
  ): Promise<Array<Record<string, any>>> {
    const { data, error } = await this.client
      .from('nxf_system_messages')
      .select('*')
      .eq('conversation_id', conversationId)
      .order('sent_at', { ascending: true })

    if (error) {
      console.error('[SupabaseAdapter] getConversationThread failed')
      throw error
    }

    if (!data?.length) return []

    const seen = new Set<string>()
    return data.filter((msg) => {
      const mes_id = msg.mes_id ?? msg.id
      if (seen.has(mes_id)) return false
      seen.add(mes_id)
      return true
    })
  }

  async sendMessage(
    config:         DBConfig,
    conversationId: string,
    senderId:       string,
    content:        string
  ): Promise<Record<string, any>> {
    const now    = new Date().toISOString()
    const mes_id = crypto.randomUUID()

    const projects   = await this.readAll(config, 'nxf_system_projects')
    const project_id = projects[0]?.project_id ?? projects[0]?.id ?? null

    const tenants   = await this.readAll(config, 'nxf_system_tenants')
    const tenant_id = tenants[0]?.ten_id ?? tenants[0]?.id ?? null

    const message = {
      mes_id,
      project_id,
      tenant_id,
      conversation_id: conversationId,
      sender_id:       senderId,
      recipient_id:    null,
      content,
      is_read:         false,
      sent_at:         now,
      created_at:      now,
      updated_at:      now,
    }

    const { error: msgError } = await this.client
      .from('nxf_system_messages')
      .insert(message)

    if (msgError) {
      console.error('[SupabaseAdapter] sendMessage insert failed')
      throw msgError
    }

    const { error: convError } = await this.client
      .from('nxf_system_conversations')
      .update({
        last_message_preview: content.slice(0, 100),
        last_message_at:      now,
        updated_at:           now,
      })
      .eq('con_id', conversationId)

    if (convError) {
      console.warn('[SupabaseAdapter] sendMessage — conversation preview update failed')
    }

    return message
  }

  async markConversationRead(
    config:         DBConfig,
    uid:            string,
    conversationId: string
  ): Promise<{ success: boolean }> {
    const { error } = await this.client
      .from('nxf_system_messages')
      .update({
        is_read:    true,
        updated_at: new Date().toISOString(),
      })
      .eq('conversation_id', conversationId)
      .eq('recipient_id', uid)
      .eq('is_read', false)

    if (error) {
      console.error('[SupabaseAdapter] markConversationRead failed')
      throw error
    }

    return { success: true }
  }

  async markAllMessagesRead(
    config: DBConfig,
    uid:    string
  ): Promise<{ success: boolean }> {
    const { error } = await this.client
      .from('nxf_system_messages')
      .update({
        is_read:    true,
        updated_at: new Date().toISOString(),
      })
      .eq('recipient_id', uid)
      .eq('is_read', false)

    if (error) {
      console.error('[SupabaseAdapter] markAllMessagesRead failed')
      throw error
    }

    return { success: true }
  }

  async deleteConversation(
    config:         DBConfig,
    conversationId: string
  ): Promise<{ success: boolean }> {
    const { error: msgError } = await this.client
      .from('nxf_system_messages')
      .delete()
      .eq('conversation_id', conversationId)

    if (msgError) {
      console.error('[SupabaseAdapter] deleteConversation — messages delete failed')
      throw new Error(`Failed to delete messages: ${msgError.message}`)
    }

    const { error: convError } = await this.client
      .from('nxf_system_conversations')
      .delete()
      .eq('con_id', conversationId)

    if (convError) {
      console.error('[SupabaseAdapter] deleteConversation — conversation delete failed')
      throw new Error(`Failed to delete conversation: ${convError.message}`)
    }

    return { success: true }
  }

  // ─── Notifications ────────────────────────────────────────────────────────

  async listNotifications(
    config:     DBConfig,
    uid:        string,
    project_id: string,
    limit       = 20
  ): Promise<Array<Record<string, any>>> {
    const { data, error } = await this.client
      .from('nxf_system_notifications')
      .select('*')
      .eq('project_id', project_id)
      .eq('user_id', uid)
      .neq('status', 'deleted')
      .order('created_at', { ascending: false })
      .limit(limit)

    if (error) {
      console.error('[SupabaseAdapter] listNotifications failed')
      throw error
    }

    return data ?? []
  }

  async markNotificationRead(
    config:         DBConfig,
    notificationId: string,
    uid:            string
  ): Promise<{ success: boolean }> {
    const { data, error: fetchError } = await this.client
      .from('nxf_system_notifications')
      .select('*')
      .eq('id', notificationId)
      .single()

    if (fetchError || !data) throw new Error('Notification not found')
    if (data.user_id !== uid) throw new Error('Forbidden — notification does not belong to this user')

    const now = new Date().toISOString()

    const { error: updateError } = await this.client
      .from('nxf_system_notifications')
      .update({
        status:     'read',
        is_read:    true,
        read_at:    now,
        updated_at: now,
      })
      .eq('id', notificationId)

    if (updateError) {
      console.error('[SupabaseAdapter] markNotificationRead failed')
      throw updateError
    }

    return { success: true }
  }

  async markAllNotificationsRead(
    config:     DBConfig,
    uid:        string,
    project_id: string
  ): Promise<{ success: boolean; updated: number }> {
    const now = new Date().toISOString()

    const { data, error } = await this.client
      .from('nxf_system_notifications')
      .update({
        status:     'read',
        is_read:    true,
        read_at:    now,
        updated_at: now,
      })
      .eq('project_id', project_id)
      .eq('user_id', uid)
      .eq('status', 'unread')
      .select()

    if (error) {
      console.error('[SupabaseAdapter] markAllNotificationsRead failed')
      throw error
    }

    return { success: true, updated: data?.length ?? 0 }
  }

  // ─── API Keys ─────────────────────────────────────────────────────────────

  async listApiKeys(
    config: DBConfig,
    project_id: string
  ): Promise<Array<{
    api_id:       string
    name:         string
    key_prefix:   string
    status:       string
    last_used_at: string | null
    created_at:   string
  }>> {
    const { data, error } = await this.client
      .from('nxf_system_apis')
      .select('api_id, name, key_prefix, status, last_used_at, created_at')
      .eq('project_id', project_id)
      .eq('status', 'active')
      .order('created_at', { ascending: false })

    if (error) {
      console.error('[SupabaseAdapter] listApiKeys failed', error)
      throw error
    }

    return (data as Array<{
      api_id:       string
      name:         string
      key_prefix:   string
      status:       string
      last_used_at: string | null
      created_at:   string
    }>) ?? []
  }

  async getApiKey(
    config: DBConfig,
    api_id: string
  ): Promise<Record<string, any> | null> {
    const { data, error } = await this.client
      .from('nxf_system_apis')
      .select('*')
      .eq('api_id', api_id)
      .single()

    if (error) {
      if (error.code === 'PGRST116') return null
      console.error('[SupabaseAdapter] getApiKey failed')
      throw error
    }

    return data ?? null
  }

  async revokeApiKey(
    config:     DBConfig,
    api_id:     string,
    project_id: string
  ): Promise<{ success: boolean }> {
    const { data, error: fetchError } = await this.client
      .from('nxf_system_apis')
      .select('*')
      .eq('api_id', api_id)
      .single()

    if (fetchError || !data) throw new Error('API key not found')
    if (data.project_id !== project_id) throw new Error('Forbidden')

    const now = new Date().toISOString()

    const { error: updateError } = await this.client
      .from('nxf_system_apis')
      .update({
        status:     'revoked',
        revoked_at: now,
        updated_at: now,
      })
      .eq('api_id', api_id)

    if (updateError) {
      console.error('[SupabaseAdapter] revokeApiKey failed')
      throw updateError
    }

    console.log(`[SupabaseAdapter] revokeApiKey — key ${api_id} revoked`)
    return { success: true }
  }

  // ─── Storage file operations ───────────────────────────────────────────────

  async listFolders(): Promise<string[]> {
    try {
      const bucketName  = 'underpeaks_storage'
      const { data, error } = await this.adminClient.storage
        .from(bucketName)
        .list('', { limit: 1000 })

      if (error) {
        console.error('[SupabaseAdapter] listFolders failed')
        return []
      }

      const folders = (data ?? [])
        .filter((item) => item.id === null)
        .map((item) => item.name)

      console.log(`[SupabaseAdapter] listFolders — ${folders.length} folders found`)
      return folders

    } catch {
      console.error('[SupabaseAdapter] listFolders failed unexpectedly')
      return []
    }
  }

  async listFiles(folder: string): Promise<StorageFile[]> {
    try {
      const bucketName = 'underpeaks_storage'
      const { data, error } = await this.adminClient.storage
        .from(bucketName)
        .list(folder, { limit: 1000 })

      if (error) {
        console.error('[SupabaseAdapter] listFiles failed')
        return []
      }

      const results: StorageFile[] = []

      for (const item of data ?? []) {
        if (item.id === null)            continue
        if (item.name.endsWith('.keep')) continue

        const filePath = `${folder}/${item.name}`

        const { data: signedData, error: signedError } = await this.adminClient.storage
          .from(bucketName)
          .createSignedUrl(filePath, 7 * 24 * 60 * 60)

        if (signedError) {
          console.warn(`[SupabaseAdapter] listFiles — could not sign URL for ${filePath}`)
          continue
        }

        const sizeBytes = item.metadata?.size ?? 0
        const sizeLabel = sizeBytes > 1024 * 1024
          ? `${(sizeBytes / (1024 * 1024)).toFixed(1)} MB`
          : `${Math.round(sizeBytes / 1024)} KB`

        results.push({
          id:         item.id ?? filePath,
          name:       item.name,
          url:        signedData.signedUrl,
          size:       sizeLabel,
          mimeType:   item.metadata?.mimetype ?? 'application/octet-stream',
          folder,
          folderPath: filePath,
          uploaded:   item.created_at
            ? new Date(item.created_at).toLocaleDateString('en-GB', {
                day:   '2-digit',
                month: 'short',
                year:  'numeric',
              })
            : '—',
        })
      }

      return results

    } catch {
      console.error('[SupabaseAdapter] listFiles failed unexpectedly')
      return []
    }
  }

  async uploadFile(
    folder:   string,
    fileName: string,
    buffer:   Buffer,
    mimeType: string
  ): Promise<string> {
    console.log('[SupabaseAdapter] uploadFile started')

    const bucketName = 'underpeaks_storage'
    const filePath   = `${folder}/${fileName}`

    const { error: uploadError } = await this.adminClient.storage
      .from(bucketName)
      .upload(filePath, buffer, {
        contentType: mimeType,
        upsert:      false,
      })

    if (uploadError) {
      console.error('[SupabaseAdapter] uploadFile failed')
      throw new Error(`Upload failed: ${uploadError.message}`)
    }

    const { data: signedData, error: signedError } = await this.adminClient.storage
      .from(bucketName)
      .createSignedUrl(filePath, 7 * 24 * 60 * 60)

    if (signedError) {
      throw new Error(`Upload succeeded but could not generate signed URL: ${signedError.message}`)
    }

    return signedData.signedUrl
  }

  async deleteFile(folder: string, fileName: string): Promise<void> {
    const bucketName = 'underpeaks_storage'
    const filePath   = `${folder}/${fileName}`

    const { error } = await this.adminClient.storage
      .from(bucketName)
      .remove([filePath])

    if (error) {
      console.error('[SupabaseAdapter] deleteFile failed')
      throw new Error(`Delete failed: ${error.message}`)
    }
  }

  async deleteFolder(folder: string): Promise<void> {
    const bucketName = 'underpeaks_storage'

    const { data, error: listError } = await this.adminClient.storage
      .from(bucketName)
      .list(folder, { limit: 1000 })

    if (listError) {
      console.error('[SupabaseAdapter] deleteFolder — list failed')
      throw new Error(`Could not list folder: ${listError.message}`)
    }

    if (!data?.length) return

    const paths = data.map((item) => `${folder}/${item.name}`)

    const { error: removeError } = await this.adminClient.storage
      .from(bucketName)
      .remove(paths)

    if (removeError) {
      console.error('[SupabaseAdapter] deleteFolder — remove failed')
      throw new Error(`Delete folder failed: ${removeError.message}`)
    }
  }

  async createFolder(folder: string): Promise<void> {
    const bucketName = 'underpeaks_storage'

    const { error } = await this.adminClient.storage
      .from(bucketName)
      .upload(`${folder}/.keep`, new Blob(['']), {
        contentType: 'text/plain',
        upsert:      true,
      })

    if (error) {
      console.error('[SupabaseAdapter] createFolder failed')
      throw new Error(`Create folder failed: ${error.message}`)
    }
  }

  async renameFile(folder: string, oldName: string, newName: string): Promise<void> {
    const bucketName = 'underpeaks_storage'
    const oldPath    = `${folder}/${oldName}`
    const newPath    = `${folder}/${newName}`

    const { error } = await this.adminClient.storage
      .from(bucketName)
      .move(oldPath, newPath)

    if (error) {
      console.error('[SupabaseAdapter] renameFile failed')
      throw new Error(`Rename failed: ${error.message}`)
    }

    try {
      await this.client
        .from('nxf_storage')
        .update({ file_name: newName, file_path: newPath })
        .eq('file_path', oldPath)
    } catch {
      console.warn('[SupabaseAdapter] renameFile — nxf_storage update failed')
    }
  }

  async moveFile(fromFolder: string, toFolder: string, fileName: string): Promise<void> {
    const bucketName = 'underpeaks_storage'
    const oldPath    = `${fromFolder}/${fileName}`
    const newPath    = `${toFolder}/${fileName}`

    const { error } = await this.adminClient.storage
      .from(bucketName)
      .move(oldPath, newPath)

    if (error) {
      console.error('[SupabaseAdapter] moveFile failed')
      throw new Error(`Move failed: ${error.message}`)
    }

    try {
      await this.client
        .from('nxf_storage')
        .update({ folder: toFolder, file_path: newPath })
        .eq('file_path', oldPath)
    } catch {
      console.warn('[SupabaseAdapter] moveFile — nxf_storage update failed')
    }
  }

  async importFromUrl(folder: string, url: string): Promise<StorageFile> {
    const response = await fetch(url)
    if (!response.ok) throw new Error(`Failed to fetch URL: ${url}`)

    const buffer   = Buffer.from(await response.arrayBuffer())
    const mimeType = response.headers.get('content-type') ?? 'application/octet-stream'
    const ext      = mimeType.split('/')[1]?.split(';')[0] ?? 'bin'
    const fileName = `imported_${Date.now()}.${ext}`

    const signedUrl = await this.uploadFile(folder, fileName, buffer, mimeType)

    return {
      id:         `${folder}/${fileName}`,
      name:       fileName,
      url:        signedUrl,
      size:       `${Math.round(buffer.length / 1024)} KB`,
      mimeType,
      folder,
      folderPath: `${folder}/${fileName}`,
      uploaded:   new Date().toLocaleDateString('en-GB', {
        day:   '2-digit',
        month: 'short',
        year:  'numeric',
      }),
    }
  }

  async deleteStorageRecordByFilePath(filePath: string): Promise<void> {
    try {
      console.log('[SupabaseAdapter] deleteStorageRecordByFilePath started')

      const { error } = await this.client
        .from('nxf_storage')
        .delete()
        .eq('file_path', filePath)

      if (error) {
        console.error('[SupabaseAdapter] deleteStorageRecordByFilePath failed')
        throw new Error(`Failed to delete storage record: ${error.message}`)
      }

      console.log('[SupabaseAdapter] deleteStorageRecordByFilePath completed')

    } catch {
      console.error('[SupabaseAdapter] deleteStorageRecordByFilePath failed unexpectedly')
      throw new Error('Failed to delete storage record')
    }
  }

  // ─── Sync ─────────────────────────────────────────────────────────────────

  async syncAuthUserToDatabase(
    config: DBConfig,
    user: { uid: string; email: string; full_name: string; notes?: string }
  ): Promise<string> {
    if (!user?.uid)      throw new Error('User UID is required')
    if (!user.full_name) throw new Error('Full name is required')

    const { data: existing } = await this.client
      .from('nxf_users')
      .select('user_id')
      .eq('user_id', user.uid)
      .limit(1)
      .single()

    if (!existing) {
      const { error } = await this.client.from('nxf_users').insert({
        user_id:    user.uid,
        user_email: user.email || '',
        full_name:  user.full_name,
        role:       'user',
        status:     'active',
        notes:      user.notes || '',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      if (error) throw new Error(`syncAuthUserToDatabase insert failed: ${error.message}`)
    } else {
      const { error } = await this.client
        .from('nxf_users')
        .update({
          user_email: user.email || '',
          full_name:  user.full_name,
          updated_at: new Date().toISOString(),
        })
        .eq('user_id', user.uid)
      if (error) throw new Error(`syncAuthUserToDatabase update failed: ${error.message}`)
    }

    return user.uid
  }
}

// ---------------------------------------------------------------------------
// Factory function
// ---------------------------------------------------------------------------

export function getSupabaseAdapter(config: DBConfig) {
  console.log('[SupabaseAdapter] getSupabaseAdapter called')
  return new SupabaseAdapter(config)
}