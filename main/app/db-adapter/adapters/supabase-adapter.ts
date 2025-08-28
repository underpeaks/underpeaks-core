import { createClient, SupabaseClient } from '@supabase/supabase-js';
import bcrypt from 'bcrypt';
import { ColumnDef, DBAdapter, DBConfig } from '../types';
import crypto from 'crypto';

export class SupabaseAdapter implements DBAdapter {
  private client: SupabaseClient;
  private adminClient: SupabaseClient;

  constructor(private config: DBConfig) {
    if (!config.url || !config.anonKey) {
      throw new Error('SupabaseAdapter requires both url and anonKey in config');
    }

    this.client = createClient(config.url, config.anonKey);

    const serviceRoleKey = process.env.DB_ANONKEY;
    if (!serviceRoleKey) throw new Error('Supabase service key (DB_ANONKEY) is required');
    this.adminClient = createClient(config.url, serviceRoleKey);
  }

  /** Normalize columns */
  private normalizeColumns(columns: ColumnDef[] | Record<string, Omit<ColumnDef, 'name'>>): ColumnDef[] {
    if (Array.isArray(columns)) return columns;

    return Object.entries(columns).map(([name, def]: [string, any]) => ({
      name,
      type: def.type,
      is_primary: def.is_primary ?? def.primary_key ?? false,
      unique: def.unique ?? false,
      nullable: def.nullable ?? true,
      default: def.default,
      foreign_key: def.foreign_key
    }));
  }

  /** Test connection */
  async testConnection(): Promise<{ success: boolean; message: string }> {
    try {
      const response = await fetch(`${this.config.url}/rest/v1/?limit=1`, {
        headers: {
          apikey: this.config.anonKey,
          Authorization: `Bearer ${this.config.anonKey}`,
        },
      });
      if (!response.ok) throw new Error(`Supabase responded with status ${response.status}`);
      return { success: true, message: 'Connected to Supabase successfully.' };
    } catch (error: any) {
      return { success: false, message: error.message || 'Failed to connect to Supabase.' };
    }
  }

  /** Basic CRUD */
  async create(config: DBConfig, table: string, data: any): Promise<any> {
    const { data: inserted, error } = await this.client.from(table).insert(data).select();
    if (error) throw error;
    return inserted;
  }

  async read(config: DBConfig, table: string, query?: any): Promise<any> {
    let qb = this.client.from(table).select('*');
    if (query) Object.entries(query).forEach(([key, value]) => qb = qb.eq(key, value as string));
    const { data, error } = await qb;
    if (error) throw error;
    return data;
  }

  async update(config: DBConfig, table: string, id: string, data: any): Promise<any> {
    const { data: updated, error } = await this.client.from(table).update(data).eq('id', id).select();
    if (error) throw error;
    return updated;
  }

  async delete(config: DBConfig, table: string, id: string): Promise<any> {
    const { data: deleted, error } = await this.client.from(table).delete().eq('id', id).select();
    if (error) throw error;
    return deleted;
  }

  /** Create table with foreign keys */
  async createTable(tableName: string, schema: { columns: ColumnDef[]; schema?: string }) {
  const columnsArray = this.normalizeColumns(schema.columns);

  const columnsSql = columnsArray
    .map(col => {
      let typeSql = '', defaultValue = '';
      const constraints: string[] = [];

      switch (col.type) {
        case 'uuid': typeSql = 'UUID'; if (col.default === 'gen_random_uuid()') defaultValue = ' DEFAULT gen_random_uuid()'; break;
        case 'string':
        case 'text': typeSql = 'TEXT'; break;
        case 'jsonb': typeSql = 'JSONB'; break;
        case 'datetime':
        case 'timestamp with time zone': typeSql = 'TIMESTAMPTZ'; if (col.default === 'now()') defaultValue = ' DEFAULT now()'; break;
        case 'integer': typeSql = 'INTEGER'; break;
        case 'bigint': typeSql = 'BIGINT'; break;
        case 'boolean': typeSql = 'BOOLEAN'; break;
        case 'float': typeSql = 'REAL'; break;
        case 'double': typeSql = 'DOUBLE PRECISION'; break;
        case 'array': typeSql = 'TEXT[]'; break;
        default: throw new Error(`Unsupported column type: ${col.type}`);
      }

      if (col.default && !['UUID', 'TIMESTAMPTZ'].includes(typeSql)) {
        defaultValue = typeof col.default === 'string' ? ` DEFAULT '${col.default.replace(/'/g, "''")}'` : ` DEFAULT ${col.default}`;
      }
      if (col.is_primary) constraints.push('PRIMARY KEY');
      if (col.nullable === false) constraints.push('NOT NULL');
      if (col.unique) constraints.push('UNIQUE');
      if (col.foreign_key) {
        const fk = col.foreign_key;
        constraints.push(`REFERENCES ${fk.references} ON DELETE ${fk.on_delete || 'NO ACTION'}`);
      }
      return `"${col.name}" ${typeSql}${defaultValue} ${constraints.join(' ')}`.trim();
    })
    .join(', ');

  const sql = `CREATE TABLE IF NOT EXISTS "${schema.schema || 'public'}"."${tableName}" (${columnsSql});`;
  const { error } = await this.adminClient.rpc('pg_execute_sql', { sql } as any);
  if (error) throw new Error(`Failed to create table: ${error.message}`);
}

  async runSQL(config: DBConfig, sql: string): Promise<any> {
    const { data, error } = await this.adminClient.rpc('pg_execute_sql', { sql } as any);
    if (error) throw new Error(`Failed to execute SQL: ${error.message}`);
    return data;
  }

  /** Finders */
  async findUserByEmail(config: DBConfig, email: string) {
    console.log('findUserByEmail querying:', email);
    const { data, error } = await this.client.from('nxf_users').select('*').eq('user_email', email).maybeSingle();
    if (error) console.error(error);
    console.log('findUserByEmail result:', data);
    return data || null;
  }

  async findUserByEmailinAuth(config: DBConfig, email: string) {
  try {
    console.log('findUserByEmail querying auth for:', email);

    const { data, error } = await this.adminClient.auth.admin.listUsers({ 
      page: 1, 
      perPage: 1000 
    });

    if (error) {
      console.error('findUserByEmail auth listUsers error:', error);
      return null;
    }

    // Supabase returns data.users
    const usersArray = data?.users || [];

    const foundUser = usersArray.find(u => (u.email || '').toLowerCase() === email.toLowerCase());

    console.log('findUserByEmail result:', foundUser);
    return foundUser || null;
  } catch (err: any) {
    console.error('findUserByEmail caught error:', err);
    return null;
  }
}


  async findProjectByOwnerId(config: DBConfig, ownerId: string) {
    const { data, error } = await this.client.from('nxf_system_projects').select('*').eq('user_id', ownerId).maybeSingle();
    if (error) throw error;
    return data || null;
  }

  async findTenantByUserEmail(config: DBConfig, email: string) {
    const { data, error } = await this.client.from('nxf_system_tenants').select('*').eq('user_email', email).maybeSingle();
    if (error) throw error;
    return data || null;
  }

  /** Creators */
  async createTenant(_config: DBConfig, data: { subdomain: string; user_email: string }): Promise<string> {
  const ten_id = crypto.randomUUID(); // generate a UUID for the tenant
  const { data: inserted, error } = await this.client
    .from('nxf_system_tenants')
    .insert({
      ten_id,                       // <-- ensure ID is set
      subdomain: data.subdomain,
      user_email: data.user_email,
      created_at: new Date().toISOString(),
    })
    .select()
    .single();

  if (error) throw error;
  return inserted.id as string;
}

  

async createProject(_config: DBConfig, data: { name: string; user_id: string }): Promise<string> {
  const project_id = crypto.randomUUID(); // generate UUID in code
  const { data: inserted, error } = await this.client
    .from('nxf_system_projects')
    .insert({
      project_id,
      name: data.name,
      user_id: data.user_id,
      created_at: new Date().toISOString(),
    })
    .select()
    .single();
  if (error) throw error;
  return inserted.id as string;
}

 // inside your SupabaseAdapter

async createAdminUser(config: DBConfig, data: any) {
  const {
    user_id,
    user_email,
    password,
    tenant_id,
    project_id,
    role = 'admin',
    ...rest
  } = data;

  if (!user_email) {
    throw new Error("Admin user must have an email");
  }
  if (!password) {
    throw new Error("Admin user must have a password");
  }

  // Always hash password
  const hashed = await this.hashPassword(password);

  const payload: any = {
    user_id,
    user_email,
    role,
    password_hash: hashed, // never null
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    ...rest,
  };

  const { error } = await this.client
    .from("nxf_users")
    .upsert(payload, { onConflict: "user_id" });

  if (error) {
    throw new Error(`Failed to create admin user: ${error.message}`);
  }

  return user_id;
}




  /** Auth */
  async registerUserInAuth(config: DBConfig, data: { email: string; password: string }) {
    try {
      const anyAdmin: any = this.adminClient;
      const { data: userData, error } = await anyAdmin.auth.admin.createUser({
        email: data.email,
        password: data.password,
        email_confirm: true,
      });
      if (error) throw error;
      const userId = (userData?.user?.id ?? userData?.id) as string;
      if (!userId) throw new Error('Failed to get user ID from Supabase response');
      return { id: userId };
    } catch (e: any) {
      if (e?.message?.includes('already exists')) {
        const existing = await this.findUserByEmail(config, data.email);
        if (!existing) throw e;
        return { id: existing.id };
      }
      throw e;
    }
  }



  /** Password hashing */
  async hashPassword(password: string) {
    return bcrypt.hash(password, 10);
  }
}

/** Factory */
export function getSupabaseAdapter(config: DBConfig) {
  if (!config?.url || !config?.anonKey) throw new Error('Supabase config is undefined');
  return new SupabaseAdapter(config);
}
