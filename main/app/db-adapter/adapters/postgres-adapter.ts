// db-adapter/adapters/postgres-adapter.ts
import { Client, ClientConfig } from "pg";
import bcrypt from "bcrypt";
import crypto from "crypto";
import { DBAdapter, DBConfig, ColumnDef } from "../types";
import { CreateUserDataModels } from "../utils/create-data-models";

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
  private connecting: Promise<void> | null = null;

async connect() {
  if (this.isConnected) return;

  if (!this.connecting) {
    console.log("🟢 Connecting to Postgres...");
    this.connecting = this.client.connect()
      .then(() => {
        this.isConnected = true;
        console.log("🟢 Postgres connected");
      })
      .catch(err => {
        this.connecting = null;
        throw err;
      });
  }

  return this.connecting;
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
    // Ignore non-column keys
    const ignoredKeys = ['limit', 'offset', 'order'];
    const where = Object.keys(query)
      .filter(k => !ignoredKeys.includes(k))
      .map((k, i) => {
        values.push(query[k]);
        return `"${k}" = $${i + 1}`;
      })
      .join(" AND ");

    if (where) sql += ` WHERE ${where}`;
  }

  // Apply limit/offset if present
  if (query?.limit) sql += ` LIMIT ${Number(query.limit)}`;
  if (query?.offset) sql += ` OFFSET ${Number(query.offset)}`;

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
    const setClause = keys.map((k, i) => `"${k}" = $${i + 1}`).join(", ");
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
 async CreateDataModels(projectId: string,selectedProjectType:string) {
  if (!projectId) throw new Error('Project ID is required');

  //const raw = 
  
  return await CreateUserDataModels(this, projectId,selectedProjectType,[]);

  // console.log('[DEBUG RAW MODELS]:', raw);

  // // ✅ Handle skipped
  // if (raw?.skipped) {
  //   console.log('⚡ Skipped:', raw.message);
  //   return [];
  // }

  // // ✅ Extract actual models
  // const result = raw?.data;

  // if (!Array.isArray(result)) {
  //   throw new Error(
  //     `Invalid models format: ${JSON.stringify(raw)}`
  //   );
  // }

  // const createdModels: any[] = [];

  // for (const table of result) {
  //   if (!table?.name) continue;

  //   await this.create(this.config, "nxf_system_models", {
  //     sm_id: crypto.randomUUID(),
  //     project_id: projectId,
  //     name: table.name,
  //     schema: JSON.stringify(table.schema || table.columns || []),
  //     created_at: new Date(),
  //     updated_at: new Date(),
  //   });

  //   createdModels.push(table);
  // }

  // return createdModels;
}


  async createDataModelsFromUserEmail(email: string,selectedProjectType:string) {
    const user = await this.findUserByEmail(this.config, email);
    if (!user?.user_id) throw new Error("User not found");

    const project = await this.findProjectByOwnerId(this.config, user.user_id);
    if (!project?.project_id) throw new Error("Project not found");

    return this.CreateDataModels(project.project_id,selectedProjectType);
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
      is_logged_in: false,
      last_login: new Date(),
    });
  }

  async findUserByEmail(config: DBConfig, email: string) {
    const rows = await this.read(config, "nxf_users", { user_email: email });
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

  async verifyEmail(
  config: DBConfig,
  data: { token: string; email?: string }
): Promise<{ success: boolean; message?: string }> {
    const user = await this.findUserByToken(data.token);
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
    const user = await this.findUserByEmail(config, email);
    if (!user) throw new Error("User not found");

    const token = crypto.randomBytes(32).toString("hex");
    const ttl = new Date(Date.now() + 24 * 60 * 60 * 1000);

    await this.client.query(
      `UPDATE nxf_users 
       SET token=$1, token_ttl=$2, updated_at=NOW()
       WHERE user_id=$3`,
      [token, ttl, user.user_id]
    );

    return { success: true, token };
  }

  async updatePasswordByToken(token: string, newPassword: string) {
    const user = await this.findUserByToken(token);
    if (!user) throw new Error("Invalid or expired token");

    //const hashed = await this.hashPassword(newPassword);

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
    const user = await this.findUserByEmail(config, email);
    if (!user) return { success: false, error: "User not found." };

    if (!user.password_hash) return { success: false, error: "Invalid password" };

    const valid = await bcrypt.compare(password.trim(), user.password_hash.trim());
    if (!valid) return { success: false, error: "Invalid email or password" };

    if (emailVerifiedRequired && !user.email_verified) {
      return { success: false, error: "Please verify your email", user };
    }

    return {
      success: true,
      user: {
        user_id: user.user_id,
        user_email: user.user_email,
        full_name: user.full_name,
        role: user.role,
        status: user.status,
        email_verified: user.email_verified,
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
  const basic = await this.loginBasic(config, email, password);
  if (!basic.success || !basic.user) return { success: false, error: basic.error };

  // Only admins can access the console
  if (basic.user.role !== "admin") {
    return { 
      success: false, 
      error: "You do not have admin rights to access the console", 
      user: basic.user 
    };
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
    projectId: project.project_id 
  };
}


  async registerUser(
    config: DBConfig,
    data: {
      email: string;
      password: string;
      full_name?: string;
      token: string;
      token_ttl: Date;
    }
  ) {
    const existing = await this.findUserByEmail(config, data.email);
    if (existing) throw new Error("User exists");

    const user_id = crypto.randomUUID();
    const password_hash = await this.hashPassword(data.password);

    await this.create(config, "nxf_users", {
      user_id,
      user_email: data.email,
      password_hash,
      full_name: data.full_name || null,
      role: "user",
      status: "active",
      email_verified: false,
      token: data.token,
      token_ttl: data.token_ttl,
      is_logged_in: false,
      created_at: new Date(),
      updated_at: new Date(),
    });

    const project_id = await this.createProject(config, {
      name: "Default Project",
      user_id,
    });

    return { success: true, user_id, project_id, token: data.token, token_ttl: data.token_ttl };
  }

  async findTokenByAccessToken(accessToken: string) {
  await this.connect();

  console.log("🔍 Looking for token:", accessToken);

  const res = await this.client.query(
    `SELECT * FROM nxf_system_tokens WHERE access_token=$1 LIMIT 1`,
    [accessToken]
  );

  console.log("🔍 Token result:", res.rows[0]);

  return res.rows?.[0] || null;
}

async findTokenByRefreshToken(refreshToken: string) {
  await this.connect(); // ✅ REQUIRED

  const res = await this.client.query(
    `SELECT * FROM nxf_system_tokens WHERE refresh_token=$1 LIMIT 1`,
    [refreshToken]
  );

  return res.rows?.[0] || null;
}

  async extendToken(
  tokenId: string,
  updates: Partial<{ revoked: boolean; updated_at: string; expires_at: string }>
) {
  const setClauses: string[] = [];
  const values: any[] = [];
  let i = 1;

  if (updates.revoked !== undefined) {
    setClauses.push(`revoked = $${i++}`);
    values.push(updates.revoked);
  }

  if (updates.expires_at) {
    setClauses.push(`expires_at = $${i++}`);
    values.push(updates.expires_at);
  }

  if (updates.updated_at) {
    setClauses.push(`updated_at = $${i++}`);
    values.push(updates.updated_at);
  }

  if (!setClauses.length) return;

  const query = `
    UPDATE nxf_system_tokens 
    SET ${setClauses.join(", ")} 
    WHERE token_id = $${i}
  `;

  values.push(tokenId);

  await this.client.query(query, values);
}

  async createPasswordResetToken(email: string) {
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
    const rows = await this.read(config, "nxf_system_projects", { user_id: ownerId });
    return rows?.[0] || null;
  }

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
  // ---------------- USER HELPERS ----------------
async findUserByEmailWithRetry(
  config: DBConfig,
  email: string,
  retries = 5,
  delay = 300
) {
  for (let i = 0; i < retries; i++) {
    const user = await this.findUserByEmail(config, email);
    if (user) return user;
    await new Promise((r) => setTimeout(r, delay));
  }
  return null;
}


  async findTenantByUserEmail(config: DBConfig, email: string) {
    const rows = await this.read(config, "nxf_system_tenants", { user_email: email });
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
    const fs = require("fs");
    const path = require("path");

    await this.connect();

    const modelFolders = [
      `${selectedProjectType}_models`,
      "system_models",
      "users_models",
    ];

    const basePaths = modelFolders.map((folder) =>
      path.resolve(process.cwd(), "..", "demo_content", folder)
    );

    let inserted = 0;

    for (const basePath of basePaths) {
      console.log("CHECKING PATH =", basePath);

      if (!fs.existsSync(basePath)) {
        console.log("SKIP (missing folder):", basePath);
        continue;
      }

      const files = fs
        .readdirSync(basePath)
        .filter((f: string) => f.endsWith(".json"));

      for (const file of files) {
        const fullPath = path.join(basePath, file);

        console.log("Reading file:", fullPath);

        const raw = fs.readFileSync(fullPath, "utf-8");

        let json: any;

        try {
          json = JSON.parse(raw);
        } catch (e: any) {
          console.log(`INVALID JSON: ${file}`, e.message);
          continue;
        }

        const tableName = file.replace(".json", "");

        const rows = Array.isArray(json) ? json : json?.demo_data;

        if (!rows || !Array.isArray(rows)) {
          console.log(`SKIPPING ${file} (no valid data array)`);
          continue;
        }

        console.log(`📦 Inserting into ${tableName} -> ${rows.length} rows`);

        for (const row of rows) {
          const keys = Object.keys(row);

          // ✅ FIX: convert values properly for Postgres
          const values = keys.map((key) => {
            const val = row[key];

            // 🔥 THIS IS THE IMPORTANT FIX
            if (val === null || val === undefined) return null;

            if (typeof val === "object") {
              return JSON.stringify(val); // convert JSONB
            }

            return val;
          });

          const columns = keys.map((k) => `"${k}"`).join(",");
          const placeholders = keys.map((_, i) => `$${i + 1}`).join(",");

          const sql = `
            INSERT INTO "${tableName}"
            (${columns})
            VALUES (${placeholders})
          `;

          try {
            await this.client.query(sql, values);
            inserted++;
          } catch (err: any) {
            console.log(`❌ FAILED INSERT ${tableName}:`, err.message);
          }
        }
      }
    }

    return {
      success: true,
      inserted,
      skipped: false,
      message: "Demo content installed successfully",
    };
  } catch (err: any) {
    return {
      success: false,
      inserted: 0,
      skipped: true,
      message: err.message || "Failed to install demo content",
    };
  }
}
}


// factory
export function getPostgresAdapter(config: DBConfig) {
  return new PostgresAdapter(config);
}
