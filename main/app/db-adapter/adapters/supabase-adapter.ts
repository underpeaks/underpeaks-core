import { createClient, SupabaseClient } from '@supabase/supabase-js';
import bcrypt from 'bcrypt';
import { ColumnDef, DBAdapter, DBConfig } from '../types';
//import { CreateDataModels } from '../utils/create-data-models';
import { randomBytes } from 'crypto';
import nodemailer from 'nodemailer';
import { loadAllModels } from '../utils/load-model';
import { CreateUserDataModels } from '../utils/create-data-models';


const DEFAULT_BUCKETS = ['system', 'themes', 'extensions', 'projects', 'avatars', 'logos', 'uploads'];

export class SupabaseAdapter implements DBAdapter {
  supportsBuiltInAuth = true;

  private _config: DBConfig;
  private client: SupabaseClient;
  private adminClient: SupabaseClient;

  constructor(config: DBConfig) {
    console.log('🟡 [Adapter Init] Starting SupabaseAdapter');
    console.log('🟡 Config URL:', config.supabaseUrl);
    console.log('🟡 Anon Key exists:', !!config.anonKey);

    this._config = config;

    if (!config.supabaseUrl || !config.anonKey) {
      console.error('❌ Missing Supabase config values');
      throw new Error('SupabaseAdapter requires both supabaseUrl and anonKey in config');
    }

    this.client = createClient(config.supabaseUrl, config.anonKey);
    console.log('✅ Public Supabase client created');

    this.adminClient = createClient(config.supabaseUrl, config.anonKey);
    console.log('✅ Admin Supabase client created');
  }

  get config(): DBConfig {
    return this._config;
  }

  /* -----------------------------
     CONNECTION
  ----------------------------- */
 async testConnection() {
  console.log('🔌 [testConnection] Checking Supabase...');

  try {
    // FIX: use supabaseUrl instead of url
    const response = await fetch(`${this.config.supabaseUrl}/auth/v1/settings`, {
      headers: {
        apikey: this.config.anonKey,
      },
    });

    console.log('📡 Response status:', response.status);

    if (!response.ok) {
      throw new Error(`Supabase responded with status ${response.status}`);
    }

    console.log('✅ Supabase connection OK');

    return {
      success: true,
      message: 'Connected to Supabase successfully.',
    };
  } catch (error: any) {
    console.error('❌ Connection failed:', error.message);

    return {
      success: false,
      message: error.message || 'Failed to connect to Supabase.',
    };
  }
}



  /* -----------------------------
     CRUD
  ----------------------------- */
  async create(config: DBConfig, table: string, data: any) {
    console.log(`📝 [CREATE] Table: ${table}`, data);
    const { data: inserted, error } = await this.client.from(table).insert(data).select();
    if (error) {
      console.error('❌ CREATE failed:', error.message);
      throw error;
    }
    return inserted;
  }

  async read(config: DBConfig, table: string, query?: any) {
    console.log(`📖 [READ] Table: ${table}`, query);
    let qb = this.client.from(table).select('*');
    if (query) Object.entries(query).forEach(([key, value]) => (qb = qb.eq(key, value as string)));
    const { data, error } = await qb;
    if (error) {
      console.error('❌ READ failed:', error.message);
      throw error;
    }
    return data;
  }

  async update(
  config: DBConfig,
  table: string,
  id: string,
  data: any,
  idColumn: string = 'id' // default to 'id'
) {
  console.log(`✏️ [UPDATE] Table: ${table}, ID: ${id}`, data);
  const { data: updated, error } = await this.client
    .from(table)
    .update(data)
    .eq(idColumn, id)
    .select();
  if (error) {
    console.error('❌ UPDATE failed:', error.message);
    throw error;
  }
  return updated;
}


  async delete(config: DBConfig, table: string, id: string) {
    console.log(`🗑️ [DELETE] Table: ${table}, ID: ${id}`);
    const { data: deleted, error } = await this.client.from(table).delete().eq('id', id).select();
    if (error) {
      console.error('❌ DELETE failed:', error.message);
      throw error;
    }
    return deleted;
  }

  async findSystemConfigByUserId(config: DBConfig, userId: string) {
  try {
    console.log("SUPABASE ADAPTER - [findSystemConfigByUserId] START")

    if (!userId) {
      console.warn("SUPABASE ADAPTER - [findSystemConfigByUserId] No userId provided")
      return null
    }

    const { data, error } = await this.client
      .from('nxf_system_config')
      .select('*')
      .eq('user_id', userId)
      .limit(1)
      .single()

    if (error) {
      // PGRST116 = no rows found — not a real error
      if (error.code === 'PGRST116') {
        console.log("SUPABASE ADAPTER - [findSystemConfigByUserId] No config found")
        return null
      }
      throw error
    }

    console.log("SUPABASE ADAPTER - [findSystemConfigByUserId] SUCCESS")
    return data

  } catch (error) {
    console.error("SUPABASE ADAPTER - [findSystemConfigByUserId] FAILED", error)
    throw new Error(`SupabaseAdapter.findSystemConfigByUserId failed: ${error instanceof Error ? error.message : String(error)}`)
  }
}

  async createProject(_config: DBConfig, data: { name: string; user_id: string }): Promise<string> {
    const project_id = crypto.randomUUID();
    const { data: inserted, error } = await this.client
      .from('nxf_system_projects')
      .insert({ project_id, name: data.name, user_id: data.user_id, created_at: new Date().toISOString() })
      .select()
      .single();
    if (error) throw error;
    return inserted.project_id;
  }

  async findProjectByOwnerId(config: DBConfig, ownerId: string) {
    const { data, error } = await this.client.from('nxf_system_projects').select('*').eq('user_id', ownerId).maybeSingle();
    if (error) throw error;
    return data || null;
  }

  /* -----------------------------
     AUTH
  ----------------------------- */
  async login(config: DBConfig, email: string, password: string) {
  console.log('🔐 [ADMIN LOGIN] Attempt:', email);

  try {
    // 1️⃣ Sign in with Supabase built-in auth
    const { data, error } = await this.client.auth.signInWithPassword({ email, password });

    if (error || !data.user) {
      console.error('❌ Supabase login failed:', error?.message || 'No user returned');
      return { success: false, error: error?.message || 'Login failed' };
    }

    const user = data.user;

    // 2️⃣ Fetch the role from nxf_users table
    const { data: userProfile, error: profileError } = await this.client
      .from('nxf_users')
      .select('role')
      .eq('user_id', user.id)
      .limit(1)
      .single();

    if (profileError || !userProfile) {
      console.error('❌ Could not fetch user profile:', profileError?.message);
      return { success: false, error: 'Could not fetch user profile' };
    }

    // 3️⃣ Check if the user is an admin
    if (userProfile.role !== 'admin') {
      console.warn('⚠️ Non-admin attempted login:', email);
      return {
        success: false,
        error: 'You do not have admin rights to access the console',
        user: { id: user.id, email: user.email, role: userProfile.role },
      };
    }

    console.log('✅ Admin login success');

    // 4️⃣ Return login info
    return {
      success: true,
      user: { id: user.id, email: user.email, role: userProfile.role },
      token: data.session?.access_token,
      refreshToken: data.session?.refresh_token,
    };
  } catch (err: any) {
    console.error('🔥 LOGIN FAILED:', err.message);
    return { success: false, error: err.message || 'Login failed' };
  }
}


  // async validateBuiltInSession(config: DBConfig, token: string) {
  //   console.log('🔍 [Session Validation]');
  //   try {
  //     const { data, error } = await this.client.auth.getUser(token);
  //     if (error) throw error;
  //     console.log('✅ Session valid');
  //     return data.user;
  //   } catch (err: any) {
  //     console.error('❌ Session invalid:', err.message);
  //     return null;
  //   }
  // }

  async hashPassword(password: string) {
    console.log('🔒 Hashing password');
    return bcrypt.hash(password, 10);
  }

  async findUserByEmail(config: DBConfig, email: string) {
    console.log('👤 findUserByEmail:', email);
    const { data, error } = await this.client.from('nxf_users').select('*').eq('user_email', email).limit(1);
    if (error) throw error;
    return data?.[0] || null;
  }

  /* -----------------------------
     REGISTER USER (AUTH + DB PROFILE)
  ----------------------------- */
 async registerUserInAuth(
  config: DBConfig,
  data: { email: string; password: string; full_name: string; notes?: string }
) {
  console.log('🆕 [SUPABASE SIGNUP] Creating auth user for:', data.email);

  if (!data.email || !data.password || !data.full_name) {
    throw new Error('Email, password, and full name are required');
  }

  // Ensure adminClient is correctly initialized
  if (!this.adminClient) {
    throw new Error('Supabase adminClient not initialized with service role key');
  }

  // 1️⃣ Create Supabase Auth user (use built-in email verification)
  console.log("AUTH REACHED")
  const { data: authData, error: authError } = await this.adminClient.auth.admin.createUser({
    email: data.email,
    password: data.password,
    email_confirm: true,
    user_metadata: { full_name: data.full_name },
  
  });


  console.log('📝 Supabase createUser response:', { authData, authError });

  if (authError || !authData?.user) {
    console.error('❌ Supabase auth creation failed:', authError?.message);
    throw new Error(authError?.message || 'Failed to create auth user');
  }

  const userId = authData.user.id;
  console.log('✅ Auth user created (awaiting email verification):', userId);

  // 2️⃣ Hash password for internal nxf_users table
  const hashedPassword = await bcrypt.hash(data.password, 10);

  // 3️⃣ Insert into nxf_users with role = "admin" for installer/admin
  const { error: profileError } = await this.adminClient.from('nxf_users').insert({
    user_id: userId,
    user_email: data.email,
    full_name: data.full_name,
    password_hash: hashedPassword,
    role: 'admin', 
    status: 'Active', 
    notes: data.notes || '',
    is_logged_in: false,
    email_verified: true,
    last_login: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  });

  if (profileError) {
    console.error('❌ Failed inserting user profile:', profileError.message);
    throw new Error(profileError.message);
  }

  console.log('✅ User profile row created in nxf_users (admin role)');

  return { id: userId };
}

// async registerSupabaseUser(
//   config: DBConfig,
//   data: { email: string; password: string; full_name: string;}
// ) {
//   console.log('🆕 [SUPABASE SIGNUP] Creating auth user for:', data.email);

//   if (!data.email || !data.password || !data.full_name) {
//     throw new Error('Email, password, and full name are required');
//   }

//   // Ensure adminClient is correctly initialized
//   if (!this.adminClient) {
//     throw new Error('Supabase adminClient not initialized with service role key');
//   }

//   // 1️⃣ Create Supabase Auth user (use built-in email verification)
//   console.log("AUTH REACHED")
//   const { data: authData, error: authError } = await this.adminClient.auth.admin.createUser({
//     email: data.email,
//     password: data.password,
//     email_confirm: false,
//     user_metadata: { full_name: data.full_name },
  
//   });


//   console.log('📝 Supabase createUser response:', { authData, authError });

//   if (authError || !authData?.user) {
//     console.error('❌ Supabase auth creation failed:', authError?.message);
//     throw new Error(authError?.message || 'Failed to create auth user');
//   }

//   const userId = authData.user.id;
//   console.log('✅ Auth user created (awaiting email verification):', userId);

//   // 2️⃣ Hash password for internal nxf_users table
//   const hashedPassword = await bcrypt.hash(data.password, 10);

//   // 3️⃣ Insert into nxf_users with role = "admin" for installer/admin
//   const { error: profileError } = await this.adminClient.from('nxf_users').insert({
//     user_id: userId,
//     user_email: data.email,
//     full_name: data.full_name,
//     password_hash: hashedPassword,
//     role: 'user', 
//     status: 'Active', 
//     notes:  '',
//     is_logged_in: false,
//     email_verified: false,
//     last_login: null,
//     created_at: new Date().toISOString(),
//     updated_at: new Date().toISOString(),
//   });

//   if (profileError) {
//     console.error('❌ Failed inserting user profile:', profileError.message);
//     throw new Error(profileError.message);
//   }

//   console.log('✅ User profile row created in nxf_users (admin role)');

//   return { id: userId };
// }

async registerSupabaseUser(
  config: DBConfig,
  data: { email: string; password: string; full_name: string; }
) {
  console.log('🆕 [SUPABASE SIGNUP] Creating auth user for:', data.email);

  if (!data.email || !data.password || !data.full_name) {
    throw new Error('Email, password, and full name are required');
  }

  // Ensure adminClient is correctly initialized
  if (!this.adminClient) {
    throw new Error('Supabase adminClient not initialized with service role key');
  }

  // 1️⃣ Create Supabase Auth user (THIS sends the verification email)
  console.log("AUTH REACHED")
  const { data: authData, error: authError } = await this.adminClient.auth.admin.createUser({
    email: data.email,
    password: data.password,
    email_confirm: false, // ✅ Supabase handles email verification
    user_metadata: { full_name: data.full_name },
  });

  console.log('📝 Supabase createUser response:', { authData, authError });

  if (authError || !authData?.user) {
    console.error('❌ Supabase auth creation failed:', authError?.message);
    throw new Error(authError?.message || 'Failed to create auth user');
  }

  const userId = authData.user.id;
  console.log('✅ Auth user created (awaiting email verification):', userId);

  // 2️⃣ Hash password for internal nxf_users table
  const hashedPassword = await bcrypt.hash(data.password, 10);

  // 3️⃣ Insert into nxf_users (NO TOKEN SYSTEM)
  const { error: profileError } = await this.adminClient.from('nxf_users').insert({
    user_id: userId,
    user_email: data.email,
    full_name: data.full_name,
    password_hash: hashedPassword,
    role: 'user', 
    status: 'Active', 
    notes: '',
    is_logged_in: false,
    email_verified: true, // ✅ Will be updated after Supabase verifies
    last_login: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  });

  if (profileError) {
    console.error('❌ Failed inserting user profile:', profileError.message);
    throw new Error(profileError.message);
  }

  console.log('✅ User profile row created in nxf_users');

  

  return { id: userId };
}

async resetPassword(
  config: DBConfig,
  email: string,
  redirectUrl?: string
): Promise<{ success: boolean; error?: string }> {
  const { error } = await this.client.auth.resetPasswordForEmail(email, {
   redirectTo: redirectUrl || `${process.env.NEXT_PUBLIC_APP_DOMAIN}/reset-password`,
  });

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true };
}





  // ---------------- USER HELPERS ----------------
async createAdminUser(config: DBConfig, data: any) {
  const { user_id, user_email, password, role = 'admin', ...rest } = data;
  const hashed = await this.hashPassword(password);

  return this.create(config, 'nxf_users', {
    user_id: user_id || crypto.randomUUID(),
    user_email,
    password_hash: hashed,
    full_name: rest.full_name || null,
    role,
    status: 'active',
    email_verified: true,
    token: null,
    token_ttl: null,
    notes: rest.notes || null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    is_logged_in: false,
    last_login: new Date().toISOString(),
  });
}

async findUserByToken(token: string) {
  const { data, error } = await this.client
    .from('nxf_users')
    .select('*')
    .eq('token', token)
    .gt('token_ttl', new Date().toISOString())
    .limit(1)
    .single();
  if (error) throw error;
  return data || null;
}

async verifyEmail?(
  config: DBConfig,
  data: { token: string; email?: string }
) {
  const user = await this.findUserByToken(data.token);
  if (!user) throw new Error('Invalid or expired verification token');

  await this.update(this.config, 'nxf_users', user.user_id, {
    email_verified: true,
    token: null,
    token_ttl: null,
    updated_at: new Date().toISOString(),
  });

  return { success: true };
}

async resendVerificationEmail(config: DBConfig, email: string) {
  const user = await this.findUserByEmail(config, email);
  if (!user) throw new Error('User not found');

  const token = randomBytes(32).toString('hex'); // ✅ use imported function
  const ttl = new Date(Date.now() + 24 * 60 * 60 * 1000);

  await this.update(config, 'nxf_users', user.user_id, {
    token,
    token_ttl: ttl,
    updated_at: new Date().toISOString(),
  });

  return { success: true, token };
}
async findUserByEmailWithRetry(
  config: DBConfig,
  email: string,
  retries = 5,
  delay = 300
) {
  if (!this.findUserByEmail) {
    throw new Error('findUserByEmail is not implemented in this adapter');
  }

  for (let i = 0; i < retries; i++) {
    const user = await this.findUserByEmail(config, email);
    if (user) return user;
    await new Promise((resolve) => setTimeout(resolve, delay));
  }

  return null;
}


async comparePassword(password: string, hash: string) {
  return bcrypt.compare(password, hash);
}
async findTokenByAccessToken(accessToken: string) {
  const { data, error } = await this.client
    .from('nxf_system_tokens')
    .select('*')
    .eq('access_token', accessToken)
    .limit(1)
    .single();
  if (error) throw error;
  return data || null;
}

async findTokenByRefreshToken(refreshToken: string) {
  const { data, error } = await this.client
    .from('nxf_system_tokens')
    .select('*')
    .eq('refresh_token', refreshToken)
    .limit(1)
    .single();
  if (error) throw error;
  return data || null;
}
async extendToken(tokenId: string, updates: Partial<{ revoked: boolean; updated_at: string }>) {
  const updateData = { ...updates, updated_at: new Date().toISOString() };
  const { data, error } = await this.client
    .from('nxf_system_tokens')
    .update(updateData)
    .eq('token_id', tokenId)
    .select()
    .single();
  if (error) throw error;
  return data || null;
}
async createPasswordResetToken(email: string): Promise<string> {
  const user = await this.findUserByEmail(this.config, email);
  if (!user) throw new Error('User not found');

  const token = randomBytes(32).toString('hex');
  const ttl = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

  await this.update(this.config, 'nxf_users', user.user_id, {
    token,
    token_ttl: ttl,
    updated_at: new Date().toISOString(),
  });

  return token; // ✅ just return the string
}



async updatePasswordByToken(token: string, newPassword: string) {
  const user = await this.findUserByToken(token);
  if (!user) throw new Error('Invalid or expired token');

  const hashed = await this.hashPassword(newPassword);

  await this.update(this.config, 'nxf_users', user.user_id, {
    password_hash: hashed,
    token: null,
    token_ttl: null,
    updated_at: new Date().toISOString(),
  });

  return { success: true };
}

// ---------------- LOGIN ----------------
 async loginBasic(config: DBConfig, email: string, password: string, emailVerifiedRequired = true) {
    const user = await this.findUserByEmail(config, email)
    if (!user) return { success: false, error: 'User not found.' }
    if (!user.password_hash) return { success: false, error: 'Invalid password' }

    const valid = await bcrypt.compare(password.trim(), user.password_hash.trim())
    if (!valid) return { success: false, error: 'Invalid email or password' }

    // optional email verification (commented for now)
    // if (emailVerifiedRequired && !user.email_verified)
    //   return { success: false, error: 'Please verify your email', user }

    return { success: true, user }
  }

  // ------------------ SUPABASE LOGIN ------------------
  async loginWithSupabase(config: DBConfig, email: string, password: string) {
    // 1️⃣ Basic DB login
    const basic = await this.loginBasic(config, email, password, false)
    if (!basic.success || !basic.user) return { success: false, error: basic.error }

    // 2️⃣ Role check
    if (basic.user.role !== 'admin') {
      return { success: false, error: 'You do not have admin rights to access the console', user: basic.user }
    }

    // 3️⃣ Find project
    const project = await this.findProjectByOwnerId(config, basic.user.user_id)
    if (!project) return { success: false, error: 'No project found for user' }

    // 4️⃣ Generate platform tokens
    const accessToken = crypto.randomUUID()
    const refreshToken = crypto.randomUUID()

    await this.create(config, 'nxf_system_tokens', {
      token_id: crypto.randomUUID(),
      user_id: basic.user.user_id,
      project_id: project.project_id,
      access_token: accessToken,
      refresh_token: refreshToken,
      token_type: 'bearer',
      expires_at: new Date(Date.now() + 3600 * 1000), // 1h
      refresh_expires_at: new Date(Date.now() + 7 * 86400 * 1000), // 7d
      revoked: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })

    return {
      success: true,
      user: basic.user,
      accessToken,
      refreshToken,
      projectId: project.project_id,
    }
  }

  // ------------------ VALIDATE SESSION ------------------
  async validateBuiltInSession(config: DBConfig, token: string) {
    console.log('🔍 [Session Validation]')
    try {
      // Use Supabase auth to verify token
      const { data, error } = await this.client.auth.getUser(token)
      if (error) throw error
      console.log('✅ Session valid')
      return data.user
    } catch (err: any) {
      console.error('❌ Session invalid:', err.message)
      return null
    }
  }






// ---------------- TENANT ----------------
async createTenant(config: DBConfig, data: { subdomain: string; user_email: string }) {
  const ten_id = crypto.randomUUID();
  await this.create(config, 'nxf_system_tenants', {
    ten_id,
    subdomain: data.subdomain,
    user_email: data.user_email,
    created_at: new Date().toISOString(),
  });
  return ten_id;
}

async findTenantByUserEmail(config: DBConfig, email: string) {
  const tenants = await this.read(config, 'nxf_system_tenants', { user_email: email });
  return tenants?.[0] || null;
}


  async sendResetEmail(config: DBConfig, email: string, redirectUrl?: string): Promise<{ success: boolean; error?: string }> {
    console.log('📧 [SUPABASE RESET EMAIL] Sending reset link to:', email);

    if (!email) {
      return { success: false, error: 'Email is required' };
    }

    try {
      const { error } = await this.client.auth.resetPasswordForEmail(email, {
        redirectTo: redirectUrl || `${process.env.NEXT_PUBLIC_APP_URL}/signin`,
      });

      if (error) {
        console.error('❌ Supabase reset email failed:', error.message);
        return { success: false, error: error.message };
      }

      console.log('✅ Supabase reset email sent');
      return { success: true };
    } catch (err: any) {
      console.error('❌ Supabase reset email error:', err.message);
      return { success: false, error: err.message };
    }
  }

  /* -----------------------------
     STORAGE
  ----------------------------- */
  async setupStorageBuckets() {
    console.log('📦 [Storage Setup]');
    try {
      const bucketName = 'NXT_Flutter_storage';
      const { error: bucketError } = await this.adminClient.storage.createBucket(bucketName, { public: false });
      if (bucketError && !bucketError.message.includes('duplicate key')) throw bucketError;

      for (const folder of DEFAULT_BUCKETS) {
        console.log('📁 Creating folder:', folder);
        await this.adminClient.storage.from(bucketName).upload(`${folder}/.keep`, new Blob(['']), { upsert: true });
      }

      console.log('✅ Storage ready');
      return { success: true, buckets: DEFAULT_BUCKETS };
    } catch (e: any) {
      console.error('❌ Storage setup failed:', e.message);
      return { success: false, buckets: [] };
    }
  }




async CreateDataModels(projectId: string, selectedProjectType: string) {
  if (!projectId) throw new Error('Project ID is required');

  console.log('🧩 Creating models (adapter-controlled)');
   return await CreateUserDataModels(this, projectId,selectedProjectType,[]);

  // const models = await loadAllModels(selectedProjectType);

  // const results = [];

  // for (const model of models) {
  //   console.log(`📦 Creating model: ${model.name}`);

  //   // ✅ 1. CREATE TABLE
  //   await this.createTable(model.name, {
  //     columns: model.columns,
  //   });

  //   // ✅ 2. INSERT METADATA (ONLY PLACE IT HAPPENS)
  //   const { error } = await this.client
  //     .from('nxf_system_models')
  //     .insert({
  //       sm_id: crypto.randomUUID(),
  //       project_id: projectId,
  //       name: model.name,
  //       schema: model.columns, // ✅ CORRECT
  //       created_at: new Date().toISOString(),
  //       updated_at: new Date().toISOString(),
  //     });

  //   if (error) {
  //     console.error('❌ Insert failed:', error.message);
  //     throw error;
  //   }

  //   results.push(model);
  // }

  // return {
  //   success: true,
  //   data: results,
  // };
}



// Helper to create models from user email (no change needed)
async createDataModelsFromUserEmail(email: string,selectedProjectType:string) {
  const user = await this.findUserByEmail(this.config, email);
  if (!user?.user_id) throw new Error("User not found");

  const project = await this.findProjectByOwnerId(this.config, user.user_id);
  if (!project?.project_id) throw new Error("Project not found");

  return this.CreateDataModels(project.project_id,selectedProjectType);
}


  async saveInstallerConfig(config: DBConfig, data: any): Promise<string> {
    if (!data.project_id) throw new Error('project_id is required');

    const { data: inserted, error } = await this.client
      .from('nxf_system_config')
      .insert({
        ...data,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) throw new Error(`Failed to save installer config: ${error.message}`);
    return inserted.id;
  }

  /* -----------------------------
     TABLE MANAGEMENT
  ----------------------------- */
  private normalizeColumns(columns: ColumnDef[] | Record<string, Omit<ColumnDef, 'name'>>) {
  if (Array.isArray(columns)) return columns;
  return Object.entries(columns).map(([name, def]: [string, any]) => ({
    name,
    type: def.type,
    is_primary: def.is_primary ?? def.primary_key ?? false,
    unique: def.unique ?? false,
    nullable: def.nullable ?? true,
    default: def.default,
    foreign_key: def.foreign_key,
    arrayType: def.arrayType, // <--- add this
  }));
}


 async createTable(
  tableName: string,
  schema: { columns: ColumnDef[] | Record<string, ColumnDef>; schema?: string }
) {
  console.log('🗄️ Creating table:', tableName);

  // Normalize columns to array
  let columnsArray: ColumnDef[] = [];
  if (Array.isArray(schema.columns)) {
    columnsArray = schema.columns;
  } else if (typeof schema.columns === "object") {
    columnsArray = Object.entries(schema.columns).map(([name, col]) => ({
      ...col,
      name,
    }));
  }

  // Build SQL
  const columnsSql = columnsArray
    .map((col) => {
      let typeSql = "";

      switch (col.type.toLowerCase()) {
        case "uuid":
          typeSql = "UUID";
          break;
        case "string":
        case "text":
          typeSql = "TEXT";
          break;
        case "json":
        case "jsonb":
        case "array": // Arrays stored as JSONB for Supabase compatibility
          typeSql = "JSONB";
          break;
        case "datetime":
          case "date":
        case "timestamp":
        case "timestamp with time zone":
          typeSql = "TIMESTAMP";
          break;
        case "integer":
        case "int":
          typeSql = "INTEGER";
          break;
        case "bigint":
          typeSql = "BIGINT";
          break;
        case "boolean":
          typeSql = "BOOLEAN";
          break;
        case "float":
          case "number":
            case "decimal":
        case "double":
          typeSql = "DOUBLE PRECISION";
          break;
        default:
          throw new Error(`Unsupported column type: ${col.type}`);
      }

      const constraints: string[] = [];
      if (col.is_primary) constraints.push("PRIMARY KEY");
      if (col.unique) constraints.push("UNIQUE");
      if (col.nullable === false) constraints.push("NOT NULL");

      return `"${col.name}" ${typeSql} ${constraints.join(" ")}`.trim();
    })
    .join(", ");

  const sql = `CREATE TABLE IF NOT EXISTS "${schema.schema || 'public'}"."${tableName}" (${columnsSql});`;
  console.log("🧱 Supabase SQL:", sql);

  const { error } = await this.adminClient.rpc('pg_execute_sql', { sql } as any);

  if (error) {
    console.error('❌ Table creation failed:', error.message);
    throw new Error(`Failed to create table: ${error.message}`);
  }

  console.log('✅ Table created successfully on Supabase:', tableName);
}

async installDemoContent(
  config: DBConfig,
  selectedProjectType: string
): Promise<{
  success: boolean;
  message?: string;
  inserted?: number;
  skipped?: boolean;
}> {
  try {
    if (!selectedProjectType) {
      throw new Error("selectedProjectType is required");
    }

    const fs = await import("fs");
    const path = await import("path");

    // --------------------------------------------------
    // FIX: correct demo_content root path (Windows-safe)
    // --------------------------------------------------
    const DEMO_ROOT = path.resolve(
      process.cwd(),
      "..",
      "demo_content"
    );

    const modelFolders = [
      `${selectedProjectType}_models`,
      "system_models",
      "users_models",
    ];

    const basePaths = modelFolders.map((folder) =>
      path.join(DEMO_ROOT, folder)
    );

    let totalInserted = 0;

    for (const basePath of basePaths) {
      console.log("CHECKING PATH =", basePath);

      if (!fs.existsSync(basePath)) {
        console.log("SKIP (missing folder):", basePath);
        continue;
      }

      const files = fs
        .readdirSync(basePath)
        .filter((f: string) => f.endsWith(".json"));

      if (!files.length) {
        console.log("NO FILES IN:", basePath);
        continue;
      }

      for (const file of files) {
        const filePath = path.join(basePath, file);

        console.log("Reading file:", filePath);

        const raw = fs.readFileSync(filePath, "utf-8");

        let jsonData: any;

        try {
          jsonData = JSON.parse(raw);
        } catch (e: any) {
          console.log(`INVALID JSON: ${file}`, e.message);
          continue;
        }

        const tableName = file.replace(".json", "");

        const rows = Array.isArray(jsonData)
          ? jsonData
          : jsonData?.demo_data;

        if (!rows || !Array.isArray(rows)) {
          console.log(`SKIPPING ${file} (no valid data array)`);
          continue;
        }

        console.log(`📦 Inserting into ${tableName} -> ${rows.length} rows`);

        const chunkSize = 200;

        for (let i = 0; i < rows.length; i += chunkSize) {
          const chunk = rows.slice(i, i + chunkSize);

          // clean undefined values (Supabase requirement)
          const cleanedChunk = chunk.map((row: any) => {
            const cleaned: any = {};
            for (const key in row) {
              if (row[key] !== undefined) {
                cleaned[key] = row[key];
              }
            }
            return cleaned;
          });

          const { error } = await this.client
            .from(tableName)
            .insert(cleanedChunk);

          if (error) {
            console.error(`❌ FAILED INSERT ${tableName}:`, error.message);
            throw new Error(
              `Insert failed for ${tableName}: ${error.message}`
            );
          }

          totalInserted += cleanedChunk.length;
        }
      }
    }

    return {
      success: true,
      message: "Demo content installed successfully",
      inserted: totalInserted,
    };
  } catch (err: any) {
    console.error("❌ installDemoContent (Supabase) failed:", err);

    return {
      success: false,
      message: err.message || "Failed to install demo content",
      inserted: 0,
    };
  }
}
}
/* -----------------------------
   FACTORY
----------------------------- */
export function getSupabaseAdapter(config: DBConfig) {
  console.log('🏗️ getSupabaseAdapter called');
  return new SupabaseAdapter(config);
}
