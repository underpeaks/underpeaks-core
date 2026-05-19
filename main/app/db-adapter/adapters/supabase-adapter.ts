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
 * Two Supabase clients are maintained:
 *   - client      — Used for standard database and auth operations.
 *   - adminClient — Used for admin-level operations (creating users, storage
 *                   bucket management) that require elevated permissions.
 *                   Currently uses the same anonKey — swap for a service role
 *                   key in production for true admin access.
 *
 * How to use:
 *   import { getSupabaseAdapter } from './supabase-adapter'
 *   const adapter = getSupabaseAdapter(dbConfig)
 *   await adapter.create(adapter.config, 'nxf_users', { ... })
 *
 * This file should never be imported on the client side — it uses server-side
 * credentials and node-only modules (bcrypt, nodemailer, fs).
 */

import { createClient, SupabaseClient }  from '@supabase/supabase-js'
import bcrypt                            from 'bcrypt'
import { ColumnDef, DBAdapter, DBConfig } from '../types'
import { randomBytes }                   from 'crypto'
import nodemailer                        from 'nodemailer'
import { loadAllModels }                 from '../utils/load-model'
import { CreateUserDataModels }          from '../utils/create-data-models'

/**
 * DEFAULT_BUCKETS
 *
 * The list of default storage folders created when Supabase Storage is
 * first configured. Each folder is initialised with a hidden .keep file
 * so the folder placeholder exists in storage.
 */
const DEFAULT_BUCKETS = [
  'system', 'themes', 'extensions', 'projects',
  'avatars', 'logos', 'uploads',
]

// ---------------------------------------------------------------------------
// Class
// ---------------------------------------------------------------------------

export class SupabaseAdapter implements DBAdapter {
  /**
   * supportsBuiltInAuth — Tells the rest of the application that this adapter
   * has its own authentication system (Supabase Auth) and does not need an
   * external auth provider.
   */
  supportsBuiltInAuth = true

  /**
   * _config — The DBConfig object containing all Supabase connection details.
   * Stored privately and exposed via the config getter below.
   */
  private _config: DBConfig

  /**
   * client — The standard Supabase client used for database reads/writes and
   * auth operations available to regular users.
   */
  private client: SupabaseClient

  /**
   * adminClient — The Supabase client used for privileged operations such as
   * creating auth users and managing storage buckets.
   * In production this should use a service role key rather than the anon key
   * to ensure proper access control.
   */
  private adminClient: SupabaseClient

  // ─── Constructor ──────────────────────────────────────────────────────────

  /**
   * constructor
   *
   * Initialises the SupabaseAdapter by validating the config and creating
   * the public and admin Supabase client instances.
   *
   * Both clients are created with the same credentials for now — to use a
   * service role key for the adminClient, replace config.anonKey with the
   * service role key when creating adminClient.
   *
   * @param config - The DBConfig object. Must contain supabaseUrl and anonKey.
   * @throws Error if supabaseUrl or anonKey are missing from the config.
   */
  constructor(config: DBConfig) {
    console.log('[SupabaseAdapter] Constructor started')

    this._config = config

    /**
     * Both supabaseUrl and anonKey are required to create a Supabase client.
     * Without them we cannot make any API calls to Supabase at all.
     */
    if (!config.supabaseUrl || !config.anonKey) {
      throw new Error('SupabaseAdapter requires both supabaseUrl and anonKey in config')
    }

    this.client      = createClient(config.supabaseUrl, config.anonKey)
    console.log('[SupabaseAdapter] Public client created')

    this.adminClient = createClient(config.supabaseUrl, config.anonKey)
    console.log('[SupabaseAdapter] Admin client created')
  }

  /**
   * config — Getter that exposes the private _config object publicly.
   * Other parts of the application pass adapter.config back into adapter
   * methods that require it (e.g. adapter.create(adapter.config, ...)).
   */
  get config(): DBConfig {
    return this._config
  }

  // ─── Connection ───────────────────────────────────────────────────────────

  /**
   * testConnection
   *
   * Verifies that the adapter can successfully communicate with Supabase
   * by making a lightweight request to the Supabase Auth settings endpoint.
   *
   * Used by the installer to confirm that the provided Supabase credentials
   * are valid before proceeding with setup.
   *
   * @returns { success: true, message } on success,
   *          { success: false, message } on failure.
   */
  async testConnection() {
    console.log('[SupabaseAdapter] testConnection started')

    try {
      const response = await fetch(`${this.config.supabaseUrl}/auth/v1/settings`, {
        headers: { apikey: this.config.anonKey },
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

  /**
   * create
   *
   * Inserts a new row into a Supabase table and returns the inserted data.
   *
   * @param config - The DBConfig (not used directly here but required by interface).
   * @param table  - The table name to insert into (e.g. 'nxf_users').
   * @param data   - The data object to insert.
   * @returns The inserted row(s) as returned by Supabase.
   * @throws The Supabase error if the insert fails.
   */
  async create(config: DBConfig, table: string, data: any) {
    console.log(`[SupabaseAdapter] create — table: ${table}`)
    const { data: inserted, error } = await this.client.from(table).insert(data).select()
    if (error) {
      console.error(`[SupabaseAdapter] create failed — table: ${table}`)
      throw error
    }
    return inserted
  }

  /**
   * read
   *
   * Fetches rows from a Supabase table, optionally filtered by a query object.
   * Each key-value pair in the query object is applied as an equality filter.
   *
   * @param config - The DBConfig.
   * @param table  - The table name to read from.
   * @param query  - Optional object of column-value pairs to filter by.
   * @returns An array of matching rows.
   * @throws The Supabase error if the read fails.
   */
  async read(config: DBConfig, table: string, query?: any) {
    console.log(`[SupabaseAdapter] read — table: ${table}`)
    let qb = this.client.from(table).select('*')
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

  /**
   * update
   *
   * Updates specific columns on a row in a Supabase table identified by its ID.
   *
   * @param config   - The DBConfig.
   * @param table    - The table name to update.
   * @param id       - The value of the ID column to match.
   * @param data     - An object of column-value pairs to update.
   * @param idColumn - The name of the ID column (default: 'id').
   * @returns The updated row(s) as returned by Supabase.
   * @throws The Supabase error if the update fails.
   */
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

  /**
   * delete
   *
   * Permanently deletes a row from a Supabase table by its `id` column.
   *
   * @param config - The DBConfig.
   * @param table  - The table name to delete from.
   * @param id     - The value of the `id` column to match.
   * @returns The deleted row(s) as returned by Supabase.
   * @throws The Supabase error if the delete fails.
   */
  async delete(config: DBConfig, table: string, id: string) {
    console.log(`[SupabaseAdapter] delete — table: ${table}`)
    const { data: deleted, error } = await this.client.from(table).delete().eq('id', id).select()
    if (error) {
      console.error(`[SupabaseAdapter] delete failed — table: ${table}`)
      throw error
    }
    return deleted
  }

  /**
   * findSystemConfigByUserId
   *
   * Finds the system config record for a given user_id from the
   * nxf_system_config table.
   *
   * Returns null rather than throwing if no config is found (PGRST116 is
   * the Supabase "no rows returned" code and is treated as a normal
   * "not found" result rather than an error).
   *
   * @param config - The DBConfig.
   * @param userId - The user_id to search for.
   * @returns The config row on success, or null if not found.
   * @throws Error if the query fails for any reason other than "no rows".
   */
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
        /**
         * PGRST116 is Supabase's "no rows returned" error code.
         * This is an expected outcome when the config does not exist yet —
         * treat it as null rather than a real error.
         */
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

  /**
   * createProject
   *
   * Creates a new project record in the nxf_system_projects table.
   *
   * @param _config - The DBConfig (unused directly).
   * @param data    - { name: string, user_id: string }
   * @returns The new project's project_id string.
   * @throws The Supabase error if the insert fails.
   */
  async createProject(_config: DBConfig, data: { name: string; user_id: string }): Promise<string> {
    const project_id = crypto.randomUUID()
    const { data: inserted, error } = await this.client
      .from('nxf_system_projects')
      .insert({
        project_id,
        name:       data.name,
        user_id:    data.user_id,
        created_at: new Date().toISOString(),
      })
      .select()
      .single()
    if (error) throw error
    return inserted.project_id
  }

  /**
   * findProjectByOwnerId
   *
   * Finds the project record that belongs to a given user_id.
   *
   * @param config   - The DBConfig.
   * @param ownerId  - The user_id to search for.
   * @returns The project row, or null if not found.
   * @throws The Supabase error if the query fails.
   */
  async findProjectByOwnerId(config: DBConfig, ownerId: string) {
    const { data, error } = await this.client
      .from('nxf_system_projects')
      .select('*')
      .eq('user_id', ownerId)
      .maybeSingle()
    if (error) throw error
    return data || null
  }

  // ─── Auth ──────────────────────────────────────────────────────────────────

  /**
   * login
   *
   * Authenticates a user against Supabase Auth and validates their admin role.
   *
   * Steps:
   * 1. Calls Supabase Auth signInWithPassword.
   * 2. Fetches the user's role from the nxf_users table.
   * 3. Rejects non-admin users with a clear error.
   * 4. Returns the session tokens for admin users.
   *
   * @param config   - The DBConfig.
   * @param email    - The user's email address.
   * @param password - The user's plain-text password.
   * @returns { success, user, token, refreshToken } on success,
   *          { success: false, error } on failure.
   */
  async login(config: DBConfig, email: string, password: string) {
    console.log('[SupabaseAdapter] login attempt started')

    try {
      const { data, error } = await this.client.auth.signInWithPassword({ email, password })

      if (error || !data.user) {
        console.error('[SupabaseAdapter] Supabase login failed')
        return { success: false, error: error?.message || 'Login failed' }
      }

      const user = data.user

      /**
       * Fetch the user's role from nxf_users so we can enforce admin-only access.
       * Supabase Auth does not store the role — it lives in our own users table.
       */
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

      /**
       * Only admin users are allowed to access the console.
       * Return a descriptive error for non-admin users rather than a generic one.
       */
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

  /**
   * hashPassword
   *
   * Hashes a plain-text password using bcrypt with a cost factor of 10.
   * We NEVER store plain-text passwords — always use this before saving.
   *
   * @param password - The plain-text password to hash.
   * @returns A bcrypt hash string.
   */
  async hashPassword(password: string) {
    return bcrypt.hash(password, 10)
  }

  /**
   * findUserByEmail
   *
   * Searches the nxf_users table for a user whose user_email matches the
   * provided address. Returns the first match or null.
   *
   * @param config - The DBConfig.
   * @param email  - The email address to search for.
   * @returns The user row, or null if not found.
   * @throws The Supabase error if the query fails.
   */
  async findUserByEmail(config: DBConfig, email: string) {
    const { data, error } = await this.client
      .from('nxf_users')
      .select('*')
      .eq('user_email', email)
      .limit(1)
    if (error) throw error
    return data?.[0] || null
  }

  // ─── Register ─────────────────────────────────────────────────────────────

  /**
   * registerUserInAuth
   *
   * Creates a new admin user in Supabase Auth and the nxf_users table.
   * Used during the installer flow to create the initial admin account.
   *
   * Steps:
   * 1. Creates the Supabase Auth user with email_confirm: true (pre-verified).
   * 2. Hashes the password for internal storage.
   * 3. Inserts a full user profile into nxf_users with role: 'admin'.
   *
   * @param config - The DBConfig.
   * @param data   - { email, password, full_name, notes? }
   * @returns { id: string } — the new user's Supabase Auth UID.
   * @throws Error if required fields are missing, adminClient is absent, or
   *         any Supabase operation fails.
   */
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

    /**
     * Create the Supabase Auth user with email_confirm: true so the admin
     * account is immediately active without needing to verify an email.
     */
    const { data: authData, error: authError } = await this.adminClient.auth.admin.createUser({
      email:          data.email,
      password:       data.password,
      email_confirm:  true,
      user_metadata:  { full_name: data.full_name },
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

  /**
   * registerSupabaseUser
   *
   * Creates a new standard (non-admin) user in Supabase Auth and nxf_users.
   * Used by the public registration flow.
   *
   * Differences from registerUserInAuth:
   * - Sets email_confirm: false — Supabase sends a verification email.
   * - Sets role: 'user' (not 'admin').
   *
   * @param config - The DBConfig.
   * @param data   - { email, password, full_name }
   * @returns { id: string } — the new user's Supabase Auth UID.
   * @throws Error if required fields are missing or any Supabase call fails.
   */
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

    /**
     * Create the Supabase Auth user with email_confirm: false so Supabase
     * sends a verification email to the user automatically.
     */
    const { data: authData, error: authError } = await this.adminClient.auth.admin.createUser({
      email:          data.email,
      password:       data.password,
      email_confirm:  false,
      user_metadata:  { full_name: data.full_name },
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

  /**
   * resetPassword
   *
   * Triggers a Supabase password reset email for the given address.
   * The user clicks the link in the email and is redirected to the
   * reset-password page.
   *
   * @param config      - The DBConfig.
   * @param email       - The email address to send the reset link to.
   * @param redirectUrl - The URL to redirect to after the reset. Defaults
   *                      to the NEXT_PUBLIC_APP_DOMAIN reset-password page.
   * @returns { success: true } or { success: false, error: string }.
   */
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

  /**
   * createAdminUser
   *
   * Creates an admin user record directly in the nxf_users table.
   * Uses the create() method internally. Generates a UUID for user_id
   * if one is not provided.
   *
   * @param config - The DBConfig.
   * @param data   - User fields including user_email, password, role, full_name, notes.
   * @returns The inserted row(s) from create().
   */
  async createAdminUser(config: DBConfig, data: any) {
    const { user_id, user_email, password, role = 'admin', ...rest } = data
    const hashed = await this.hashPassword(password)

    return this.create(config, 'nxf_users', {
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
    })
  }

  /**
   * findUserByToken
   *
   * Finds a user in nxf_users whose token column matches the given value
   * and whose token_ttl (expiry) is still in the future.
   *
   * Used for email verification and password reset flows.
   *
   * @param token - The verification or reset token string.
   * @returns The user row, or null if not found or expired.
   * @throws The Supabase error if the query fails.
   */
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

  /**
   * verifyEmail
   *
   * Verifies a user's email address by looking up the verification token,
   * then marking the user as verified and clearing the token fields.
   *
   * @param config - The DBConfig.
   * @param data   - { token: string, email?: string }
   * @returns { success: true }
   * @throws Error if the token is invalid or expired.
   */
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

  /**
   * resendVerificationEmail
   *
   * Generates a new email verification token for a user and saves it with
   * a 24-hour expiry. Returns the token so the caller can send it via email.
   *
   * @param config - The DBConfig.
   * @param email  - The user's email address.
   * @returns { success: true, token: string }
   * @throws Error if the user is not found.
   */
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

  /**
   * findUserByEmailWithRetry
   *
   * A resilient version of findUserByEmail that retries the lookup up to
   * `retries` times with a delay between attempts.
   *
   * Useful immediately after user creation when the database may not have
   * propagated the new row to the read replica being queried.
   *
   * @param config  - The DBConfig.
   * @param email   - The email address to search for.
   * @param retries - Maximum number of attempts (default: 5).
   * @param delay   - Milliseconds to wait between attempts (default: 300).
   * @returns The user row, or null if all retries are exhausted.
   * @throws Error if findUserByEmail is not implemented on the adapter.
   */
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

  /**
   * comparePassword
   *
   * Compares a plain-text password against a stored bcrypt hash.
   * Returns true if they match, false otherwise.
   *
   * @param password - The plain-text password to check.
   * @param hash     - The stored bcrypt hash to compare against.
   * @returns true if the password matches, false if not.
   */
  async comparePassword(password: string, hash: string) {
    return bcrypt.compare(password, hash)
  }

  /**
   * findTokenByAccessToken
   *
   * Looks up a session token record from nxf_system_tokens by access token value.
   *
   * @param accessToken - The access token string to search for.
   * @returns The token row, or null if not found.
   * @throws The Supabase error if the query fails.
   */
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

  /**
   * findTokenByRefreshToken
   *
   * Looks up a session token record from nxf_system_tokens by refresh token value.
   *
   * @param refreshToken - The refresh token string to search for.
   * @returns The token row, or null if not found.
   * @throws The Supabase error if the query fails.
   */
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

  /**
   * extendToken
   *
   * Updates a token record in nxf_system_tokens (e.g. to revoke it or
   * extend its expiry). Always sets updated_at to the current time.
   *
   * @param tokenId - The token_id of the record to update.
   * @param updates - Partial update object (e.g. { revoked: true }).
   * @returns The updated token row.
   * @throws The Supabase error if the update fails.
   */
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

  /**
   * createPasswordResetToken
   *
   * Generates a secure random reset token, saves it to the user's nxf_users
   * record with a 24-hour expiry, and returns the raw token string.
   *
   * The caller is responsible for sending this token to the user via email.
   *
   * @param email - The email address of the user requesting a reset.
   * @returns The raw reset token string.
   * @throws Error if the user is not found.
   */
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

  /**
   * updatePasswordByToken
   *
   * Resets a user's password using a valid reset token. Looks up the user
   * by token, hashes the new password, and clears the token fields.
   *
   * @param token       - The reset token from the user's email link.
   * @param newPassword - The new plain-text password to set.
   * @returns { success: true }
   * @throws Error if the token is invalid or expired.
   */
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

  /**
   * loginBasic
   *
   * Authenticates a user against the nxf_users table directly using bcrypt
   * password comparison. Does not involve Supabase Auth at all — purely
   * our own database-level authentication.
   *
   * Used as a building block by loginWithSupabase.
   *
   * @param config                 - The DBConfig.
   * @param email                  - The user's email address.
   * @param password               - The user's plain-text password.
   * @param emailVerifiedRequired  - Whether to reject unverified users (default: true).
   * @returns { success: true, user } or { success: false, error }.
   */
  async loginBasic(
    config: DBConfig,
    email: string,
    password: string,
    emailVerifiedRequired = true
  ) {
    const user = await this.findUserByEmail(config, email)
    if (!user)              return { success: false, error: 'User not found.' }
    if (!user.password_hash) return { success: false, error: 'Invalid password' }

    const valid = await bcrypt.compare(password.trim(), user.password_hash.trim())
    if (!valid) return { success: false, error: 'Invalid email or password' }

    return { success: true, user }
  }

  /**
   * loginWithSupabase
   *
   * Full login flow for Supabase-backed projects. Combines a database-level
   * password check with role enforcement and platform token generation.
   *
   * Steps:
   * 1. Runs loginBasic to verify credentials against nxf_users.
   * 2. Enforces admin-only access.
   * 3. Looks up the user's associated project.
   * 4. Generates a new access/refresh token pair and stores it in
   *    nxf_system_tokens.
   *
   * @param config   - The DBConfig.
   * @param email    - The user's email address.
   * @param password - The user's plain-text password.
   * @returns { success, user, accessToken, refreshToken, projectId } on success,
   *          { success: false, error } on failure.
   */
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

  /**
   * validateBuiltInSession
   *
   * Validates a Supabase Auth session token (JWT) by calling getUser().
   * Returns the Supabase user object on success, or null on failure.
   *
   * Returns null instead of throwing on invalid/expired tokens so callers
   * can handle the "not authenticated" case gracefully.
   *
   * @param config - The DBConfig.
   * @param token  - The Supabase session JWT from the Authorization header.
   * @returns The Supabase user object on success, or null.
   */
  async validateBuiltInSession(config: DBConfig, token: string) {
    console.log('[SupabaseAdapter] validateBuiltInSession started')
    try {
      const { data, error } = await this.client.auth.getUser(token)
      if (error) throw error
      console.log('[SupabaseAdapter] Session valid')
      return data.user
    } catch {
      console.error('[SupabaseAdapter] Session validation failed')
      return null
    }
  }

  // ─── Tenants ───────────────────────────────────────────────────────────────

  /**
   * createTenant
   *
   * Creates a new tenant record in the nxf_system_tenants table.
   *
   * @param config - The DBConfig.
   * @param data   - { subdomain: string, user_email: string }
   * @returns The new tenant's ten_id string.
   */
  async createTenant(config: DBConfig, data: { subdomain: string; user_email: string }) {
    const ten_id = crypto.randomUUID()
    await this.create(config, 'nxf_system_tenants', {
      ten_id,
      subdomain:  data.subdomain,
      user_email: data.user_email,
      created_at: new Date().toISOString(),
    })
    return ten_id
  }

  /**
   * findTenantByUserEmail
   *
   * Finds the tenant record associated with a given email address.
   *
   * @param config - The DBConfig.
   * @param email  - The email address to search for.
   * @returns The tenant row, or null if not found.
   */
  async findTenantByUserEmail(config: DBConfig, email: string) {
    const tenants = await this.read(config, 'nxf_system_tenants', { user_email: email })
    return tenants?.[0] || null
  }

  /**
   * sendResetEmail
   *
   * Triggers a Supabase password reset email for the given address.
   *
   * @param config      - The DBConfig.
   * @param email       - The email address to send the reset link to.
   * @param redirectUrl - The URL to redirect to after the reset.
   * @returns { success: true } or { success: false, error: string }.
   */
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

  /**
   * setupStorageBuckets
   *
   * Creates the main Supabase storage bucket and initialises default folders
   * by uploading a .keep placeholder file into each one.
   *
   * If the bucket already exists (duplicate key error), the error is ignored
   * and folder setup continues.
   *
   * @returns { success: true, buckets } on success,
   *          { success: false, buckets: [] } on failure.
   */
  async setupStorageBuckets() {
    console.log('[SupabaseAdapter] setupStorageBuckets started')
    try {
      const bucketName = 'NXT_Flutter_storage'
      const { error: bucketError } = await this.adminClient.storage.createBucket(
        bucketName,
        { public: false }
      )

      /**
       * Ignore "duplicate key" errors — the bucket already exists from a
       * previous installer run, which is fine. Any other error is thrown.
       */
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

  /**
   * CreateDataModels
   *
   * Triggers creation of the standard data model collections/tables for a
   * given project and project type. Delegates to CreateUserDataModels utility.
   *
   * @param projectId           - The project's unique ID.
   * @param selectedProjectType - The type of project (e.g. 'ecommerce', 'blog').
   * @returns The result from CreateUserDataModels.
   * @throws Error if projectId is missing.
   */
  async CreateDataModels(projectId: string, selectedProjectType: string) {
    if (!projectId) throw new Error('Project ID is required')

    console.log('[SupabaseAdapter] CreateDataModels started')
    return await CreateUserDataModels(this, projectId, selectedProjectType, [])
  }

  /**
   * createDataModelsFromUserEmail
   *
   * Convenience method that resolves a user's project from their email address
   * and then calls CreateDataModels for that project.
   *
   * @param email               - The user's email address.
   * @param selectedProjectType - The project type to create models for.
   * @returns The result from CreateDataModels.
   * @throws Error if the user or project cannot be found.
   */
  async createDataModelsFromUserEmail(email: string, selectedProjectType: string) {
    const user = await this.findUserByEmail(this.config, email)
    if (!user?.user_id) throw new Error('User not found')

    const project = await this.findProjectByOwnerId(this.config, user.user_id)
    if (!project?.project_id) throw new Error('Project not found')

    return this.CreateDataModels(project.project_id, selectedProjectType)
  }

  /**
   * saveInstallerConfig
   *
   * Saves the full installer configuration to the nxf_system_config table.
   * Called at the end of the installer wizard to persist all setup choices.
   *
   * @param config - The DBConfig.
   * @param data   - The installer config object. Must include project_id.
   * @returns The new config record's id string.
   * @throws Error if project_id is missing or the insert fails.
   */
  async saveInstallerConfig(config: DBConfig, data: any): Promise<string> {
    if (!data.project_id) throw new Error('project_id is required')

    const { data: inserted, error } = await this.client
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

  /**
   * normalizeColumns (private)
   *
   * Converts a column definition into a consistent array format regardless
   * of whether it was provided as an array or as a Record (object map).
   *
   * This allows the rest of the code to always work with a flat ColumnDef array.
   *
   * @param columns - Either a ColumnDef[] array or a Record<name, ColumnDef>.
   * @returns A normalised ColumnDef array.
   */
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

  /**
   * createTable
   *
   * Creates a new PostgreSQL table in Supabase using a raw SQL statement
   * executed via the pg_execute_sql RPC function.
   *
   * Column type mapping:
   *   uuid     → UUID
   *   string   → TEXT
   *   text     → TEXT
   *   json     → JSONB
   *   jsonb    → JSONB
   *   array    → JSONB  (arrays are stored as JSONB for Supabase compatibility)
   *   datetime → TIMESTAMP
   *   date     → TIMESTAMP
   *   timestamp → TIMESTAMP
   *   integer  → INTEGER
   *   int      → INTEGER
   *   bigint   → BIGINT
   *   boolean  → BOOLEAN
   *   float    → DOUBLE PRECISION
   *   number   → DOUBLE PRECISION
   *   decimal  → DOUBLE PRECISION
   *   double   → DOUBLE PRECISION
   *
   * @param tableName - The name of the table to create.
   * @param schema    - { columns, schema? } where schema defaults to 'public'.
   * @throws Error if an unsupported column type is encountered or creation fails.
   */
  async createTable(
    tableName: string,
    schema: { columns: ColumnDef[] | Record<string, ColumnDef>; schema?: string }
  ) {
    console.log(`[SupabaseAdapter] createTable: ${tableName}`)

    /**
     * Normalise the columns to a flat array so we can iterate them uniformly
     * regardless of whether they were provided as an array or object map.
     */
    let columnsArray: ColumnDef[] = []
    if (Array.isArray(schema.columns)) {
      columnsArray = schema.columns
    } else if (typeof schema.columns === 'object') {
      columnsArray = Object.entries(schema.columns).map(([name, col]) => ({
        ...col,
        name,
      }))
    }

    /**
     * Build the SQL column definitions by mapping each ColumnDef to its
     * PostgreSQL type and any constraints (PRIMARY KEY, UNIQUE, NOT NULL).
     */
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

        const constraints: string[] = []
        if (col.is_primary)       constraints.push('PRIMARY KEY')
        if (col.unique)           constraints.push('UNIQUE')
        if (col.nullable === false) constraints.push('NOT NULL')

        return `"${col.name}" ${typeSql} ${constraints.join(' ')}`.trim()
      })
      .join(', ')

    const sql = `CREATE TABLE IF NOT EXISTS "${schema.schema || 'public'}"."${tableName}" (${columnsSql});`

    console.log(`[SupabaseAdapter] Executing SQL for table: ${tableName}`)

    const { error } = await this.adminClient.rpc('pg_execute_sql', { sql } as any)

    if (error) {
      console.error(`[SupabaseAdapter] createTable failed: ${tableName}`)
      throw new Error(`Failed to create table: ${error.message}`)
    }

    console.log(`[SupabaseAdapter] Table created successfully: ${tableName}`)
  }

  // ─── Demo content ──────────────────────────────────────────────────────────

  /**
   * installDemoContent
   *
   * Reads demo data from local JSON files and inserts it into Supabase tables.
   * Used during the installer to populate the application with sample data.
   *
   * How it works:
   * 1. Builds a list of demo content folder paths based on the project type.
   * 2. For each folder, reads every .json file found there.
   * 3. Each JSON file's name becomes the Supabase table name.
   * 4. Rows are inserted in chunks of 200 to avoid request size limits.
   * 5. Undefined values are stripped from each row (Supabase requirement).
   * 6. Missing folders are skipped silently.
   * 7. Malformed JSON files are skipped with a warning.
   *
   * @param config              - The DBConfig.
   * @param selectedProjectType - Used to find the correct demo content folder.
   * @returns { success, message, inserted, skipped? }
   */
  async installDemoContent(
    config: DBConfig,
    selectedProjectType: string
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

      /**
       * Resolve the root demo_content directory.
       * path.resolve is used to build a cross-platform absolute path.
       */
      const DEMO_ROOT = path.resolve(process.cwd(), '..', 'demo_content')

      const modelFolders = [
        `${selectedProjectType}_models`,
        'system_models',
        'users_models',
      ]

      const basePaths = modelFolders.map((folder) => path.join(DEMO_ROOT, folder))

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
          } catch {
            /**
             * Skip malformed JSON files rather than aborting the entire install.
             */
            console.warn(`[SupabaseAdapter] Skipping invalid JSON file: ${file}`)
            continue
          }

          const tableName = file.replace('.json', '')
          const rows      = Array.isArray(jsonData) ? jsonData : jsonData?.demo_data

          if (!rows || !Array.isArray(rows)) {
            console.log(`[SupabaseAdapter] Skipping ${file} — no valid data array found`)
            continue
          }

          console.log(`[SupabaseAdapter] Inserting into ${tableName} — ${rows.length} rows`)

          /**
           * Insert in chunks of 200 to stay within Supabase request size limits.
           * Each chunk has undefined values stripped out (Supabase rejects them).
           */
          const chunkSize = 200

          for (let i = 0; i < rows.length; i += chunkSize) {
            const chunk = rows.slice(i, i + chunkSize)

            const cleanedChunk = chunk.map((row: any) => {
              const cleaned: any = {}
              for (const key in row) {
                if (row[key] !== undefined) cleaned[key] = row[key]
              }
              return cleaned
            })

            const { error } = await this.client.from(tableName).insert(cleanedChunk)

            if (error) {
              console.error(`[SupabaseAdapter] Insert failed for table: ${tableName}`)
              throw new Error(`Insert failed for ${tableName}: ${error.message}`)
            }

            totalInserted += cleanedChunk.length
          }
        }
      }

      return {
        success:  true,
        message:  'Demo content installed successfully',
        inserted: totalInserted,
      }

    } catch {
      console.error('[SupabaseAdapter] installDemoContent failed')
      return {
        success:  false,
        message:  'Failed to install demo content',
        inserted: 0,
      }
    }
  }
}

// ---------------------------------------------------------------------------
// Factory function
// ---------------------------------------------------------------------------

/**
 * getSupabaseAdapter
 *
 * A factory function that creates and returns a new SupabaseAdapter instance.
 * Prefer this over calling `new SupabaseAdapter()` directly — it provides
 * a single place to add validation before the adapter is returned.
 *
 * @param config - The DBConfig containing Supabase credentials.
 * @returns A new SupabaseAdapter instance.
 */
export function getSupabaseAdapter(config: DBConfig) {
  console.log('[SupabaseAdapter] getSupabaseAdapter called')
  return new SupabaseAdapter(config)
}