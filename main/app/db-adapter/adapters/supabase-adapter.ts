import { createClient, SupabaseClient } from '@supabase/supabase-js';
import bcrypt from 'bcrypt';
import { ColumnDef, DBAdapter, DBConfig } from '../types';
import { CreateDataModels } from '../utils/create-data-models';

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
      const response = await fetch(`${this.config.url}/rest/v1/?limit=1`, {
        headers: {
          apikey: this.config.anonKey,
          Authorization: `Bearer ${this.config.anonKey}`,
        },
      });

      console.log('📡 Response status:', response.status);
      if (!response.ok) throw new Error(`Supabase responded with status ${response.status}`);

      console.log('✅ Supabase connection OK');
      return { success: true, message: 'Connected to Supabase successfully.' };
    } catch (error: any) {
      console.error('❌ Connection failed:', error.message);
      return { success: false, message: error.message || 'Failed to connect to Supabase.' };
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

  async update(config: DBConfig, table: string, id: string, data: any) {
    console.log(`✏️ [UPDATE] Table: ${table}, ID: ${id}`, data);
    const { data: updated, error } = await this.client.from(table).update(data).eq('id', id).select();
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
    console.log('🔐 [LOGIN] Attempt:', email);

    try {
      const { data, error } = await this.client.auth.signInWithPassword({ email, password });

      if (error) {
        console.error('❌ Supabase login error:', error.message);
        throw error;
      }

      console.log('✅ LOGIN SUCCESS');
      return {
        token: data.session?.access_token,
        refreshToken: data.session?.refresh_token,
        user: data.user,
      };
    } catch (err: any) {
      console.error('🔥 LOGIN FAILED:', err.message);
      return { error: err.message || 'Login failed' };
    }
  }

  async validateBuiltInSession(config: DBConfig, token: string) {
    console.log('🔍 [Session Validation]');
    try {
      const { data, error } = await this.client.auth.getUser(token);
      if (error) throw error;
      console.log('✅ Session valid');
      return data.user;
    } catch (err: any) {
      console.error('❌ Session invalid:', err.message);
      return null;
    }
  }

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

    // 1️⃣ Create Supabase Auth user
    const { data: authData, error: authError } = await this.adminClient.auth.admin.createUser({
      email: data.email,
      password: data.password,
      email_confirm: true,
      user_metadata: { full_name: data.full_name },
    });

    if (authError || !authData.user) {
      console.error('❌ Supabase auth creation failed:', authError?.message);
      throw new Error(authError?.message || 'Failed to create auth user');
    }

    const userId = authData.user.id;
    console.log('✅ Auth user created:', userId);

    // 2️⃣ Hash password before inserting into nxf_users
    const hashedPassword = await bcrypt.hash(data.password, 10);

    // 3️⃣ Insert user profile into nxf_users
    const { error: profileError } = await this.adminClient.from('nxf_users').insert({
      user_id: userId,
      user_email: data.email,
      full_name: data.full_name,
      password_hash: hashedPassword,
      role: 'user',
      status: 'active', // DEFAULT ACTIVE
      notes: data.notes || '',
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

  /* -----------------------------
     DATA MODELS
  ----------------------------- */
  async CreateDataModels(projectId: string) {
    console.log('🧩 Creating models for project:', projectId);
    return CreateDataModels(this as any, projectId);
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
    }));
  }

  async createTable(tableName: string, schema: { columns: ColumnDef[]; schema?: string }) {
    console.log('🗄️ Creating table:', tableName);
    const columnsArray = this.normalizeColumns(schema.columns);

    const columnsSql = columnsArray
      .map((col) => {
        let typeSql = '';
        const constraints: string[] = [];

        switch (col.type) {
          case 'uuid':
            typeSql = 'UUID';
            break;
          case 'string':
          case 'text':
            typeSql = 'TEXT';
            break;
          case 'jsonb':
            typeSql = 'JSONB';
            break;
          case 'timestamptz':
            typeSql = 'TIMESTAMPTZ';
            break;
          case 'integer':
            typeSql = 'INTEGER';
            break;
          case 'boolean':
            typeSql = 'BOOLEAN';
            break;
          default:
            throw new Error(`Unsupported column type: ${col.type}`);
        }

        if (col.is_primary) constraints.push('PRIMARY KEY');
        if (col.nullable === false) constraints.push('NOT NULL');
        if (col.unique) constraints.push('UNIQUE');

        return `"${col.name}" ${typeSql} ${constraints.join(' ')}`.trim();
      })
      .join(', ');

    const sql = `CREATE TABLE IF NOT EXISTS "${schema.schema || 'public'}"."${tableName}" (${columnsSql});`;
    console.log('🧱 SQL:', sql);

    const { error } = await this.adminClient.rpc('pg_execute_sql', { sql } as any);
    if (error) {
      console.error('❌ Table creation failed:', error.message);
      throw new Error(`Failed to create table: ${error.message}`);
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
