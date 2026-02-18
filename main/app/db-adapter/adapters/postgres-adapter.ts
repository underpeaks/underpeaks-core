// db-adapter/adapters/postgres-adapter.ts
import { Client, ClientConfig } from "pg";
import bcrypt from "bcrypt";
import crypto from "crypto";
import { DBAdapter, DBConfig, ColumnDef } from "../types";
import { CreateDataModels } from "../utils/create-data-models";
import { Client as PgClient } from 'pg'

export class PostgresAdapter implements DBAdapter {
  private client: Client;
  private isConnected = false;
  public config: DBConfig;

  private readonly DEFAULT_BUCKETS = [
    "system",
    "themes",
    "extensions",
    "projects",
    "avatars",
    "logos",
    "uploads",
  ];

  constructor(config: DBConfig) {
    if (!config) throw new Error("DBConfig must be provided via adapter");
    this.config = config;

    const pgConfig: ClientConfig = {
      host: config.host,
      user: config.user,
      password: config.password,
      database: config.database,
      port: config.port ? Number(config.port) : undefined,
    };

    this.client = new Client(pgConfig);
  }

  // ---------------- CONNECTION ----------------
  async connect() {
    if (this.isConnected) return;
    console.log("🟢 Connecting to Postgres...");
    await this.client.connect();
    this.isConnected = true;
    console.log("🟢 Postgres connected");
  }

  async testConnection() {
    try {
      await this.connect();
      await this.client.query("SELECT 1");
      return { success: true, message: "Connected to Postgres successfully." };
    } catch (err: any) {
      return { success: false, message: err.message || "Failed to connect" };
    }
  }

  // ---------------- PASSWORD ----------------
  async hashPassword(password: string) {
    console.log("🔑 Hashing password...");
    const hashed = await bcrypt.hash(password, 10);
    console.log("🔑 Password hashed:", hashed);
    return hashed;
  }

 async comparePassword(password: string, hash: string) {
  
  // Trim just in case
  const valid = await bcrypt.compare(password.trim(), hash.trim());

  console.log("✅ Password match result:", valid);
  return valid;
}


  // ---------------- BASIC CRUD ----------------
  async create(_config: DBConfig, table: string, data: Record<string, any>) {
    await this.connect();

    const cleaned: Record<string, any> = {};
    for (const key in data) {
      let value = data[key];
      if (value === undefined && key.toLowerCase().includes("id"))
        value = crypto.randomUUID();
      if (value instanceof Date) cleaned[key] = value.toISOString();
      else if (typeof value === "object" && value !== null)
        cleaned[key] = JSON.stringify(value);
      else cleaned[key] = value;
    }

    const keys = Object.keys(cleaned);
    const values = Object.values(cleaned);
    const placeholders = keys.map((_, i) => `$${i + 1}`).join(",");

    const sql = `INSERT INTO "${table}" (${keys.join(
      ","
    )}) VALUES (${placeholders}) RETURNING *`;

    const res = await this.client.query(sql, values);
    return res.rows[0];
  }

  async read(_config: DBConfig, table: string, query?: any) {
    await this.connect();

    let sql = `SELECT * FROM "${table}"`;
    const values: any[] = [];

    if (query && Object.keys(query).length) {
      const where = Object.keys(query)
        .map((k, i) => {
          values.push(query[k]);
          return `"${k}" = $${i + 1}`;
        })
        .join(" AND ");
      sql += ` WHERE ${where}`;
    }

    const res = await this.client.query(sql, values);
    return res.rows;
  }

  async update(
    _config: DBConfig,
    table: string,
    id: string,
    data: any,
    idColumn: string = "id"
  ) {
    await this.connect();

    const keys = Object.keys(data);
    const values = Object.values(data).map((v) =>
      v instanceof Date ? v.toISOString() : v
    );

    const setClause = keys
      .map((k, i) => `"${k}" = $${i + 1}`)
      .join(", ");

    const sql = `UPDATE "${table}" SET ${setClause} WHERE "${idColumn}" = $${
      keys.length + 1
    } RETURNING *`;

    const res = await this.client.query(sql, [...values, id]);
    return res.rows[0];
  }

  async delete(_config: DBConfig, table: string, id: string) {
    await this.connect();
    const res = await this.client.query(
      `DELETE FROM "${table}" WHERE id=$1 RETURNING *`,
      [id]
    );
    return res.rows[0];
  }

  // ---------------- TABLE CREATION ----------------
  async createTable(
    tableName: string,
    schema: { columns: ColumnDef[] | Record<string, ColumnDef> }
  ) {
    await this.connect();

    let columnsArray: ColumnDef[] = [];

    if (Array.isArray(schema.columns)) columnsArray = schema.columns;
    else if (typeof schema.columns === "object")
      columnsArray = Object.entries(schema.columns).map(([name, col]) => ({
        ...col,
        name,
      }));

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
          case "array":
            typeSql = "JSONB";
            break;
          case "datetime":
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
          case "double":
            typeSql = "DOUBLE PRECISION";
            break;
          default:
            throw new Error(`Unsupported Postgres column type: ${col.type}`);
        }

        const constraints: string[] = [];
        if (col.is_primary) constraints.push("PRIMARY KEY");
        if (col.unique) constraints.push("UNIQUE");
        if (col.nullable === false) constraints.push("NOT NULL");

        return `"${col.name}" ${typeSql} ${constraints.join(" ")}`;
      })
      .join(",");

    await this.client.query(
      `CREATE TABLE IF NOT EXISTS "${tableName}" (${columnsSql})`
    );
  }

  // ---------------- DATA MODELS ----------------
  async CreateDataModels(projectId: string) {
    const result = await CreateDataModels(this, projectId);

    for (const table of result) {
      await this.create(this.config, "nxf_system_models", {
        sm_id: crypto.randomUUID(),
        project_id: projectId,
        name: table.name,
        schema: JSON.stringify(table.columns),
        created_at: new Date(),
        updated_at: new Date(),
      });
    }

    return result;
  }

  async createDataModelsFromUserEmail(email: string) {
    const user = await this.findUserByEmail(this.config, email);
    const project = await this.findProjectByOwnerId(
      this.config,
      user.user_id
    );
    return this.CreateDataModels(project.project_id);
  }

  // ---------------- USER HELPERS ----------------
  async createAdminUser(config: DBConfig, data: any) {
    const { user_id, user_email, password, role = "admin", ...rest } = data;
    const hashed = await this.hashPassword(password);

    return this.create(config, "nxf_users", {
      user_id: user_id || crypto.randomUUID(),
      user_email,
      password_hash: hashed,
      full_name: rest.full_name || null,
      role,
      status: "active",
      email_verified: true,
      token: null,
      token_ttl: null,
      notes: rest.notes || null,
      created_at: new Date(),
      updated_at: new Date(),
    });
  }

  async findUserByEmail(config: DBConfig, email: string) {
    console.log("🔍 Finding user by email:", email);
    const rows = await this.read(config, "nxf_users", {
      user_email: email,
    });
    console.log("🔍 Found user rows:", rows.length);
    return rows?.[0] || null;
  }

  async findUserByToken(token: string) {
    await this.connect();

    const res = await this.client.query(
      `SELECT * FROM nxf_users WHERE token=$1 AND token_ttl > NOW() LIMIT 1`,
      [token]
    );
    return res.rows[0] || null;
  }

  async verifyEmail(token: string) {
    const user = await this.findUserByToken(token);
    if (!user) throw new Error("Invalid or expired verification token");

    await this.client.query(
      `UPDATE nxf_users 
       SET email_verified=true, token=NULL, token_ttl=NULL, updated_at=NOW()
       WHERE user_id=$1`,
      [user.user_id]
    );

    return { success: true };
  }

  async resendVerificationEmail(config: DBConfig, email: string) {
    console.log("RESEND VERIFICATION EMAIL")
    const user = await this.findUserByEmail(config, email);
    console.log(user);

    if (!user) throw new Error("User not found");

    const token = crypto.randomBytes(32).toString("hex");
    const ttl = new Date(Date.now() + 24 * 60 * 60 * 1000);

    console.log(token);
    console.log(ttl);

    await this.client.query(
      `UPDATE nxf_users 
       SET token=$1, token_ttl=$2, updated_at=NOW()
       WHERE user_id=$3`,
      [token, ttl, user.user_id]
    );

    console.log("END OF VERFICATION")

    return { success: true, token };
  }

  async updatePasswordByToken(token: string, newPassword: string) {
    const user = await this.findUserByToken(token);
    if (!user) throw new Error("Invalid or expired token");

    //const hashed = await this.hashPassword(newPassword);

    console.log(newPassword);

    await this.client.query(
      `UPDATE nxf_users
       SET password_hash=$1, token=NULL, token_ttl=NULL, updated_at=NOW()
       WHERE user_id=$2`,
      [newPassword, user.user_id]
    );

    return { success: true };
  }

  // ---------------- LOGIN ----------------
  async loginBasic(
  config: DBConfig,
  email: string,
  password: string,
  emailVerifiedRequired: boolean = true
) {
 

  // 1️⃣ Find the user by email
  const user = await this.findUserByEmail(config, email);
  if (!user) {
    console.log("❌ User not found");
    return { success: false, error: "User not found." };
  }
  console.log("🔍 User found:", user.user_email);

  // // 2️⃣ Make sure the password hash exists
  if (!user.password_hash) {
    console.log("❌ Incorrect password - ");
    return { success: false, error: "Invalid password" };
  }

 

  // 4️⃣ Compare password using bcrypt
  // Note: NEVER hash the input password here — just compare
  let valid = false;
  //try {
 try{
    valid = await bcrypt.compare(password.trim(), user.password_hash.trim());
  } catch (err) {
    console.error("❌ bcrypt.compare error:", err);
    return { success: false, error: "Invalid email or password - Could not validate password" };
  }

  console.log("✅ Password match result:", valid);
  if (!valid) {
    console.log("❌ Password invalid for user:", user.user_email);
    return { success: false, error: "Invalid email or password - password do not match" };
  }

  // 5️⃣ Optional: check email verification
  if (emailVerifiedRequired && !user.email_verified) {
    console.log("⚠️ Email not verified for user:", user.user_email);
    return { success: false, error: "Please verify your email", user };
  }

  // 6️⃣ Success: return user object
  console.log("🎉 Login successful for user:", user.user_email);
  return {
    success: true,
    user: {
      user_id: user.user_id,
      user_email: user.user_email,
      full_name: user.full_name,
      role: user.role,
      status: user.status,
      email_verified: user.email_verified,
      emailVerifiedRequired: emailVerifiedRequired,
    },
  };
}


  async loginWithPostgres(
    config: DBConfig,
    email: string,
    password: string,
    ip?: string,
    ua?: string
  ) {
    console.log("REACHED LOGIN WITH POSTGRES");
    const basic = await this.loginBasic(config, email, password);

    console.log("💻 loginBasic result:", basic);

    if (!basic.success || !basic.user) {
      console.log("❌ Basic login failed");
      return { success: false, error: basic.error };
    }

    if (basic.user.emailVerifiedRequired && !basic.user.email_verified) {
      console.log("VERIFICATION REQUIRED");
      return { success: false, error: "Please verify your email", user: basic.user };
    }

    const project = await this.findProjectByOwnerId(config, basic.user.user_id);
    if (!project) return { success: false, error: "No project found for user" };

    const accessToken = crypto.randomUUID();
    const refreshToken = crypto.randomUUID();

    await this.create(config, "nxf_system_tokens", {
      token_id: crypto.randomUUID(),
      user_id: basic.user.user_id,
      project_id: project.project_id,
      access_token: accessToken,
      refresh_token: refreshToken,
      token_type: "bearer",
      expires_at: new Date(Date.now() + 3600 * 1000),
      refresh_expires_at: new Date(Date.now() + 7 * 86400 * 1000),
      ip_address: ip || null,
      user_agent: ua || null,
      revoked: false,
      created_at: new Date(),
      updated_at: new Date(),
    });

    return {
      success: true,
      user: basic.user,
      accessToken,
      refreshToken,
      projectId: project.project_id,
    };
  }

  // ---------------- REGISTRATION ----------------
  async registerUser(
    config: DBConfig,
    data: {
      email: string
      password: string
      full_name?: string
      token: string
      token_ttl: Date
    }
  ) {
    const existing = await this.findUserByEmail(config, data.email)
    if (existing) throw new Error('User exists')

    const user_id = crypto.randomUUID()
    const password_hash = await this.hashPassword(data.password)

    await this.create(config, 'nxf_users', {
      user_id,
      user_email: data.email,
      password_hash,
      full_name: data.full_name || null,
      role: 'user',
      status: 'active',
      email_verified: false,
      token: data.token,
      token_ttl: data.token_ttl,
      created_at: new Date(),
      updated_at: new Date(),
    })

    const project_id = await this.createProject(config, {
      name: `Default Project`,
      user_id,
    })

    return { success: true, user_id, project_id, token: data.token, token_ttl: data.token_ttl }
  }

  // ---------------- TOKENS ----------------
  async findTokenByAccessToken(accessToken: string) {
    console.log('🐘 [PG] findTokenByAccessToken called')
    console.log('🐘 token:', accessToken)

    const client = new PgClient({
      host: this.config.host,
      port: Number(this.config.port),
      database: this.config.database,
      user: this.config.user,
      password: this.config.password,
    })

    try {
      console.log('🐘 connecting to postgres...')
      await client.connect()
      console.log('🐘 connected')

      const query = `SELECT * FROM nxf_system_tokens WHERE access_token=$1 LIMIT 1`
      console.log('🐘 running query:', query)

      const res = await client.query(query, [accessToken])

      console.log('🐘 query result rows:', res.rows.length)
      console.log('🐘 row data:', res.rows[0])

      return res.rows[0] || null
    } catch (err) {
      console.error('❌ [PG] findTokenByAccessToken error:', err)
      return null
    } finally {
      console.log('🐘 closing postgres connection')
      await client.end().catch(() => {})
    }
  }

  async findTokenByRefreshToken(refreshToken: string) {
    const res = await this.client.query(
      `SELECT * FROM nxf_system_tokens WHERE refresh_token=$1`,
      [refreshToken]
    );
    return res.rows[0] || null;
  }

  async extendToken(tokenId: string, updates: Partial<{ revoked: boolean; updated_at: string }>) {
    console.log('🐘 [PG] extendToken called for:', tokenId)
    const client = new PgClient({
      host: this.config.host,
      port: Number(this.config.port),
      database: this.config.database,
      user: this.config.user,
      password: this.config.password,
    })

    try {
      await client.connect()
      console.log('🐘 connected for extendToken')

      const setClauses: string[] = []
      const values: any[] = []

      let i = 1
      if (updates.revoked !== undefined) {
        setClauses.push(`revoked = $${i++}`)
        values.push(updates.revoked)
      }
      if (updates.updated_at) {
        setClauses.push(`updated_at = $${i++}`)
        values.push(updates.updated_at)
      }

      if (setClauses.length === 0) return

      const query = `UPDATE nxf_system_tokens SET ${setClauses.join(', ')} WHERE token_id = $${i}`
      values.push(tokenId)

      console.log('🐘 running query:', query, 'with values:', values)
      await client.query(query, values)
      console.log('🐘 token updated successfully')

    } finally {
      await client.end()
      console.log('🐘 closed connection for extendToken')
    }
  }

  async createPasswordResetToken(email: string) {
    await this.connect();

    const user = await this.findUserByEmail(this.config, email);
    if (!user) throw new Error("User not found");

    const token = crypto.randomBytes(32).toString("hex");
    const ttl = new Date(Date.now() + 60 * 60 * 1000);

    await this.client.query(
      `UPDATE nxf_users 
       SET token=$1, token_ttl=$2, updated_at=NOW()
       WHERE user_id=$3`,
      [token, ttl, user.user_id]
    );

    return token;
  }

  // ---------------- PROJECTS ----------------
  async createProject(config: DBConfig, data: { name: string; user_id: string }) {
    const project_id = crypto.randomUUID();
    await this.create(config, "nxf_system_projects", {
      project_id,
      name: data.name,
      user_id: data.user_id,
      created_at: new Date(),
      updated_at: new Date(),
    });
    return project_id;
  }

  async findProjectByOwnerId(config: DBConfig, ownerId: string) {
    const rows = await this.read(config, "nxf_system_projects", {
      user_id: ownerId,
    });
    return rows?.[0] || null;
  }

  // ---------------- TENANTS ----------------
  async createTenant(config: DBConfig, data: { subdomain: string; user_email: string }) {
    const ten_id = crypto.randomUUID();
    await this.create(config, "nxf_system_tenants", {
      ten_id,
      subdomain: data.subdomain,
      user_email: data.user_email,
      created_at: new Date(),
    });
    return ten_id;
  }

  async findTenantByUserEmail(config: DBConfig, email: string) {
    const rows = await this.read(config, "nxf_system_tenants", {
      user_email: email,
    });
    return rows?.[0] || null;
  }

  async saveInstallerConfig(config: DBConfig, data: any) {
    const config_id = crypto.randomUUID();
    await this.create(config, "nxf_system_config", {
      config_id,
      ...data,
      created_at: new Date(),
      updated_at: new Date(),
    });
    return config_id;
  }

  // ---------------- STORAGE ----------------
  async setupStorageBuckets() {
    for (const folder of this.DEFAULT_BUCKETS) {
      const existing = await this.read(this.config, "nxf_storage", {
        folder,
      });
      if (!existing?.length) {
        await this.create(this.config, "nxf_storage", {
          storage_id: crypto.randomUUID(),
          folder,
          file_name: "",
          file_path: folder,
          created_at: new Date(),
        });
      }
    }
    return { success: true, buckets: this.DEFAULT_BUCKETS };
  }

  async createBucket(folder: string) {
    return this.create(this.config, "nxf_storage", {
      storage_id: crypto.randomUUID(),
      folder,
      file_name: "",
      file_path: folder,
      created_at: new Date(),
    });
  }
}

// factory
export function getPostgresAdapter(config: DBConfig) {
  return new PostgresAdapter(config);
}
