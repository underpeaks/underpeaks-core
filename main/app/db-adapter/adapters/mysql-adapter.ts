// db-adapter/adapters/mysql-adapter.ts
import mysql from "mysql2/promise";
import bcrypt from "bcrypt";
import crypto from "crypto";
import { DBConfig, DBAdapter, ColumnDef } from "../types";
import { CreateDataModels } from "../utils/create-data-models";

export class MySQLAdapter implements DBAdapter {
  private pool: mysql.Pool;
  public config: DBConfig;
  private pools: Record<string, mysql.Pool> = {};

  private readonly DEFAULT_BUCKETS = [
    "system", "themes", "extensions", "projects", "avatars", "logos", "uploads"
  ];

  constructor(config: DBConfig) {
    if (!config) throw new Error("DBConfig must be provided via adapter");
    if (!config.user) throw new Error("MySQLAdapter: config.user is required");
    if (!config.password) throw new Error("MySQLAdapter: config.password is required");
    if (!config.database) throw new Error("MySQLAdapter: config.database is required");

    this.config = config;

    this.pool = mysql.createPool({
      host: config.host || "localhost",
      user: config.user,
      password: config.password,
      database: config.database,
      port: config.port ? Number(config.port) : 3306,
      waitForConnections: true,
      connectionLimit: 10,
    });
  }

  private async getPool(config: DBConfig) {
    const key = `${config.host}_${config.database}_${config.user}`;
    if (!this.pools[key]) {
      if (!config.user || !config.password || !config.database)
        throw new Error("MySQLAdapter.getPool: Missing DB credentials");

      this.pools[key] = mysql.createPool({
        host: config.host || "localhost",
        port: Number(config.port) || 3306,
        user: config.user,
        password: config.password,
        database: config.database,
        waitForConnections: true,
        connectionLimit: 10,
      });
    }
    return this.pools[key];
  }

  async connect() {
    const conn = await this.pool.getConnection();
    conn.release();
  }

  async testConnection() {
    try {
      await this.connect();
      return { success: true, message: "Connected to MySQL successfully." };
    } catch (err: any) {
      return { success: false, message: err.message || "Failed to connect to MySQL" };
    }
  }

  async hashPassword(password: string) {
    return bcrypt.hash(password, 10);
  }

  async comparePassword(password: string, hash: string) {
    return bcrypt.compare(password, hash);
  }

  // ---------------- BASIC CRUD ----------------
  async create(config: DBConfig, table: string, data: Record<string, any>): Promise<any> {
    const pool = await this.getPool(config);
    const cleaned: Record<string, any> = {};

    for (const key in data) {
      let value = data[key];
      if (value === undefined && key.toLowerCase().includes("id")) value = crypto.randomUUID();
      if (value instanceof Date) cleaned[key] = value.toISOString().slice(0, 19).replace("T", " ");
      else if (typeof value === "object" && value !== null) cleaned[key] = JSON.stringify(value);
      else cleaned[key] = value;
    }

    const keys = Object.keys(cleaned);
    const placeholders = keys.map(() => "?").join(",");
    const values = Object.values(cleaned);

    const sql = `INSERT INTO \`${table}\` (${keys.join(",")}) VALUES (${placeholders})`;
    const [result] = await pool.query(sql, values);
    return result;
  }

  async read(config: DBConfig, table: string, query?: any): Promise<any> {
    const pool = await this.getPool(config);
    let sql = `SELECT * FROM \`${table}\``;
    const values: any[] = [];

    if (query && Object.keys(query).length) {
      const where = Object.keys(query)
        .map((k) => {
          values.push(query[k]);
          return `\`${k}\` = ?`;
        })
        .join(" AND ");
      sql += ` WHERE ${where}`;
    }

    const [rows]: any = await pool.query(sql, values);

    return rows.map((row: any) => {
      for (const key in row) {
        const val = row[key];
        if (typeof val === "string" && (val.startsWith("{") || val.startsWith("["))) {
          try { row[key] = JSON.parse(val); } catch {}
        }
      }
      return row;
    });
  }

  async update(
  config: DBConfig,
  table: string,
  id: string,
  data: Record<string, any>,
  idColumn: string = "id" // default fallback
): Promise<any> {
  const pool = await this.getPool(config);

  // Prepare SET clause
  const keys = Object.keys(data);
  const values = keys.map((k) => {
    const value = data[k];
    if (value instanceof Date) return value.toISOString().slice(0, 19).replace("T", " ");
    return value;
  });

  const setClause = keys.map((k) => `\`${k}\` = ?`).join(", ");

  // Add the ID for the WHERE clause
  values.push(id);

  // Execute query with dynamic primary key column
  const sql = `UPDATE \`${table}\` SET ${setClause} WHERE \`${idColumn}\` = ?`;

  const [result] = await pool.query(sql, values);
  return result;
}


  async delete(config: DBConfig, table: string, id: string): Promise<any> {
    const pool = await this.getPool(config);
    const sql = `DELETE FROM \`${table}\` WHERE id = ?`;
    const [result] = await pool.query(sql, [id]);
    return result;
  }

  // ---------------- TABLE CREATION ----------------
  async createTable(tableName: string, schema: { columns: ColumnDef[] | Record<string, ColumnDef> }) {
    let columnsArray: ColumnDef[] = [];

    if (Array.isArray(schema.columns)) columnsArray = schema.columns;
    else if (schema.columns && typeof schema.columns === "object")
      columnsArray = Object.entries(schema.columns).map(([name, col]) => ({ ...col, name }));
    else throw new Error(`MySQLAdapter.createTable: "columns" must be an array or object`);

    if (!columnsArray.length) throw new Error(`MySQLAdapter.createTable: "columns" cannot be empty`);

    const columnsSql = columnsArray
      .map(col => {
        let typeSql = "";
        switch (col.type.toLowerCase()) {
          case "uuid": typeSql = "CHAR(36)"; break;
          case "string":
          case "text": typeSql = col.is_primary || col.unique ? "VARCHAR(255)" : "TEXT"; break;
          case "jsonb":
          case "json":
          case "array": typeSql = "JSON"; break;
          case "datetime":
          case "timestamp":
          case "timestamp with time zone": typeSql = "DATETIME"; break;
          case "integer":
          case "int": typeSql = "INT"; break;
          case "bigint": typeSql = "BIGINT"; break;
          case "boolean": typeSql = "TINYINT(1)"; break;
          case "float":
          case "double": typeSql = "FLOAT"; break;
          default: throw new Error(`Unsupported MySQL column type: ${col.type}`);
        }

        const constraints: string[] = [];
        if (col.is_primary) constraints.push("PRIMARY KEY");
        if (col.unique) constraints.push("UNIQUE");
        if (col.nullable === false) constraints.push("NOT NULL");

        return `\`${col.name}\` ${typeSql} ${constraints.join(" ")}`.trim();
      })
      .join(", ");

    const sql = `CREATE TABLE IF NOT EXISTS \`${tableName}\` (${columnsSql})`;
    await this.pool.query(sql);
  }

  // ---------------- DATA MODELS ----------------
  async CreateDataModels(projectId: string) {
    const result = await CreateDataModels(this, projectId);
    if (!result || !Array.isArray(result)) throw new Error("Failed to create models: invalid schema returned");

    for (const table of result) {
      if (!table.name) throw new Error("Invalid table definition: missing name");

      if (!table.columns) table.columns = [];
      else if (typeof table.columns === "object" && !Array.isArray(table.columns))
        table.columns = Object.entries(table.columns).map(([name, col]: any) => ({ ...col, name }));

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
    if (!user?.user_id) throw new Error("User not found");

    const project = await this.findProjectByOwnerId(this.config, user.user_id);
    if (!project?.project_id) throw new Error("Project not found");

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
      email_verified: 1,
      token: null,
      token_ttl: null,
      notes: rest.notes || null,
      created_at: new Date(),
      updated_at: new Date(),
    });
  }

  async findUserByEmail(config: DBConfig, email: string) {
    const rows: any = await this.read(config, "nxf_users", { user_email: email });
    return rows?.length ? rows[0] : null;
  }

  async loginBasic(config: DBConfig, email: string, password: string) {
    const user = await this.findUserByEmail(config, email);
    if (!user) return { success: false, error: "Invalid email or password" };
    if (!user.email_verified) return { success: false, error: "Please verify your email before logging in" };

    const valid = await this.comparePassword(password, user.password_hash);
    if (!valid) return { success: false, error: "Invalid email or password" };

    return {
      success: true,
      user: {
        user_id: user.user_id,
        email: user.user_email,
        full_name: user.full_name,
        role: user.role || "user",
        status: user.status || "active",
      },
    };
  }

  async loginWithMySQL(config: DBConfig, email: string, password: string, ipAddress?: string, userAgent?: string) {
    const basicLogin = await this.loginBasic(config, email, password);
    if (!basicLogin.success || !basicLogin.user)
      return { success: false, error: basicLogin.error };

    const projectRows: any = await this.read(config, "nxf_system_projects", { user_id: basicLogin.user.user_id });
    const project = projectRows?.length ? projectRows[0] : null;
    if (!project) return { success: false, error: "No project found for user" };

    const now = new Date();
    const expiresAt = new Date(now.getTime() + 60 * 60 * 1000);
    const refreshExpiresAt = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

    const accessToken = crypto.randomUUID();
    const refreshToken = crypto.randomUUID();

    await this.create(config, "nxf_system_tokens", {
      token_id: crypto.randomUUID(),
      user_id: basicLogin.user.user_id,
      project_id: project.project_id,
      access_token: accessToken,
      refresh_token: refreshToken,
      token_type: "bearer",
      expires_at: expiresAt,
      refresh_expires_at: refreshExpiresAt,
      ip_address: ipAddress || null,
      user_agent: userAgent || null,
      revoked: 0,
      created_at: now,
      updated_at: now,
    });

    return { success: true, user: basicLogin.user, accessToken, refreshToken, projectId: project.project_id };
  }

  // ---------------- PASSWORD RESET ----------------
  async createPasswordResetToken(email: string) {
    const token = crypto.randomBytes(32).toString("hex");
    const ttl = new Date(Date.now() + 60 * 60 * 1000);

    const [rows]: any = await this.pool.query(
      `SELECT user_id FROM nxf_users WHERE LOWER(user_email) = LOWER(?)`, [email]
    );
    if (!rows.length) throw new Error("User not found");

    await this.pool.query(
      `UPDATE nxf_users SET token=?, token_ttl=?, updated_at=? WHERE user_id=?`,
      [token, ttl, new Date(), rows[0].user_id]
    );

    return token;
  }

 // ---------------- USER HELPERS FIXED ----------------

/**
 * Find a user by their verification token
 * Works for MySQL/Postgres
 */
// async findUserByToken(token: string) {
//   const [rows]: any = await this.pool.query(
//     `SELECT * FROM nxf_users WHERE token=? AND token_ttl > NOW()`,
//     [token]
//   );
//   return rows[0] || null;
// }
/**
 * Verify user email by token
 */
async verifyEmail(token: string) {
  const user = await this.findUserByToken(token);
  if (!user) throw new Error("Invalid or expired verification token");

  await this.pool.query(
    `UPDATE nxf_users 
     SET email_verified=1, token=NULL, token_ttl=NULL, updated_at=? 
     WHERE user_id=?`,
    [new Date().toISOString().slice(0, 19).replace("T", " "), user.user_id]
  );

  return { success: true, message: "Email verified successfully" };
}

/**
 * Resend verification email with new token
 */
async resendVerificationEmail(config: DBConfig, email: string) {
  const user = await this.findUserByEmail(config, email);
  if (!user) throw new Error("User not found");
  if (user.email_verified) throw new Error("Email already verified");

  const newToken = crypto.randomBytes(32).toString("hex");
  const newTTL = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24h

  await this.pool.query(
    `UPDATE nxf_users 
     SET token=?, token_ttl=?, updated_at=? 
     WHERE user_id=?`,
    [newToken, newTTL.toISOString().slice(0, 19).replace("T", " "), new Date().toISOString().slice(0, 19).replace("T", " "), user.user_id]
  );

  return { success: true, token: newToken };
}


  // async updatePasswordByToken(token: string, newPassword: string) {
  //   const user = await this.findUserByToken(token);
  //   if (!user) throw new Error("Invalid or expired token");

  //   const hashed = await this.hashPassword(newPassword);
  //   await this.pool.query(
  //     `UPDATE nxf_users SET password_hash=?, token=NULL, token_ttl=NULL, updated_at=? WHERE user_id=?`,
  //     [hashed, new Date(), user.user_id]
  //   );

  //   return { success: true };
  // }

  // ---------------- PASSWORD RESET HELPERS ----------------
// async createPasswordResetToken(email: string) {
//   if (!email) throw new Error("Email is required");

//   const pool = await this.getPool(this.config);
//   const normalizedEmail = email.trim().toLowerCase();

//   // Find user case-insensitive
//   const [rows]: any = await pool.query(
//     `SELECT * FROM nxf_users WHERE LOWER(user_email) = ? LIMIT 1`,
//     [normalizedEmail]
//   );

//   const user = rows?.[0];
//   if (!user) {
//     const [all]: any = await pool.query(`SELECT user_email FROM nxf_users`);
//     console.log(
//       "User not found for forgot password. Emails in DB:",
//       all.map((u: any) => u.user_email)
//     );
//     throw new Error("User not found");
//   }

//   const token = crypto.randomBytes(32).toString("hex");
//   const ttl = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

//   await pool.query(
//     `UPDATE nxf_users
//      SET token = ?, token_ttl = ?, updated_at = ?
//      WHERE user_id = ?`,
//     [
//       token,
//       ttl.toISOString().slice(0, 19).replace("T", " "),
//       new Date().toISOString().slice(0, 19).replace("T", " "),
//       user.user_id,
//     ]
//   );

//   return token;
// }

async findUserByToken(token: string) {
  if (!token) return null;

  const pool = await this.getPool(this.config);
  const now = new Date().toISOString().slice(0, 19).replace("T", " ");

  const [rows]: any = await pool.query(
    `SELECT * FROM nxf_users
     WHERE token = ?
       AND token_ttl > ?
     LIMIT 1`,
    [token, now]
  );

  return rows?.[0] || null;
}

async updatePasswordByToken(token: string, newPassword: string) {
  if (!token) throw new Error("Token is required");

  const pool = await this.getPool(this.config);
  const now = new Date().toISOString().slice(0, 19).replace("T", " ");

  // 1️⃣ find valid user
  const [rows]: any = await pool.query(
    `SELECT * FROM nxf_users
     WHERE token = ?
       AND token_ttl > ?
     LIMIT 1`,
    [token, now]
  );

  const user = rows?.[0];
  if (!user) throw new Error("Invalid or expired token");

  // 2️⃣ hash password
  const hashed = await this.hashPassword(newPassword);

  // 3️⃣ update + clear token
  await pool.query(
    `UPDATE nxf_users
     SET password_hash = ?,
         token = NULL,
         token_ttl = NULL,
         updated_at = ?
     WHERE user_id = ?`,
    [hashed, now, user.user_id]
  );

  return { success: true };
}


  // ---------------- REGISTRATION ----------------
  async registerUser(config: DBConfig, data: { email: string; password: string; full_name?: string; token?: string; token_ttl?: string }) {
  const { email, password, full_name, token, token_ttl } = data;

  const existing = await this.findUserByEmail(config, email);
  if (existing) throw new Error("User already exists");

  const user_id = crypto.randomUUID();
  const password_hash = await this.hashPassword(password);

  const emailToken = token || crypto.randomBytes(32).toString("hex");
  const emailTTL = token_ttl ? new Date(token_ttl) : new Date(Date.now() + 24 * 60 * 60 * 1000);

  await this.create(config, "nxf_users", {
    user_id,
    user_email: email,
    password_hash,
    full_name: full_name || null,
    role: "user",
    status: "active",
    email_verified: 0,
    token: emailToken,
    token_ttl: emailTTL.toISOString(),
    created_at: new Date(),
    updated_at: new Date(),
  });

  const project_id = await this.createProject(config, { name: `${full_name || email}'s Project`, user_id });
  return { success: true, user_id, project_id, token: emailToken, token_ttl: emailTTL.toISOString() };
}


  // async verifyEmail(token: string) {
  //   const user = await this.findUserByToken(token);
  //   if (!user) throw new Error("Invalid or expired verification token");

  //   await this.pool.query(
  //     `UPDATE nxf_users SET email_verified=1, token=NULL, token_ttl=NULL, updated_at=? WHERE user_id=?`,
  //     [new Date(), user.user_id]
  //   );

  //   return { success: true };
  // }

  // async resendVerificationEmail(config: DBConfig, email: string) {
  //   const user = await this.findUserByEmail(config, email);
  //   if (!user) throw new Error("User not found");
  //   if (user.email_verified) throw new Error("Email already verified");

  //   const newToken = crypto.randomBytes(32).toString("hex");
  //   const newTTL = new Date(Date.now() + 24 * 60 * 60 * 1000);

  //   await this.pool.query(
  //     `UPDATE nxf_users SET token=?, token_ttl=?, updated_at=? WHERE user_id=?`,
  //     [newToken, newTTL.toISOString(), new Date(), user.user_id]
  //   );

  //   return { success: true, token: newToken };
  // }

  // ---------------- SESSION / TOKEN ----------------
  async findTokenByAccessToken(accessToken: string) {
    const [rows]: any = await this.pool.query(`SELECT * FROM nxf_system_tokens WHERE access_token=?`, [accessToken]);
    return rows[0] || null;
  }

  async findTokenByRefreshToken(refreshToken: string) {
    const [rows]: any = await this.pool.query(`SELECT * FROM nxf_system_tokens WHERE refresh_token=?`, [refreshToken]);
    return rows[0] || null;
  }

  async extendToken(tokenId: string, data: any) {
    await this.pool.query(`UPDATE nxf_system_tokens SET ? WHERE token_id=?`, [data, tokenId]);
    return true;
  }

  // ---------------- PROJECTS & TENANTS ----------------
  async createProject(config: DBConfig, data: { name: string; user_id: string }) {
    const project_id = crypto.randomUUID();
    await this.create(config, "nxf_system_projects", {
      project_id, name: data.name, user_id: data.user_id, created_at: new Date(), updated_at: new Date()
    });
    return project_id;
  }

  async findProjectByOwnerId(config: DBConfig, ownerId: string) {
    const rows: any = await this.read(config, "nxf_system_projects", { user_id: ownerId });
    return rows?.[0] || null;
  }

  async createTenant(config: DBConfig, data: { subdomain: string; user_email: string }) {
    const ten_id = crypto.randomUUID();
    await this.create(config, "nxf_system_tenants", { ten_id, subdomain: data.subdomain, user_email: data.user_email, created_at: new Date() });
    return ten_id;
  }

  async findTenantByUserEmail(config: DBConfig, email: string) {
    const rows: any = await this.read(config, "nxf_system_tenants", { user_email: email });
    return rows?.[0] || null;
  }

  async saveInstallerConfig(config: DBConfig, data: any) {
    const config_id = crypto.randomUUID();
    await this.create(config, "nxf_system_config", { config_id, ...data, created_at: new Date(), updated_at: new Date() });
    return config_id;
  }

  // ---------------- STORAGE ----------------
  async setupStorageBuckets() {
    for (const folder of this.DEFAULT_BUCKETS) {
      const existing = await this.read(this.config, "nxf_storage", { folder });
      if (!existing || !existing.length) {
        await this.create(this.config, "nxf_storage", { storage_id: crypto.randomUUID(), folder, file_name: "", file_path: folder, created_at: new Date() });
      }
    }
    return { success: true, buckets: this.DEFAULT_BUCKETS };
  }

  async createBucket(folder: string) {
    return this.create(this.config, "nxf_storage", { storage_id: crypto.randomUUID(), folder, file_name: "", file_path: folder, created_at: new Date() });
  }
}

// ---------------- FACTORY ----------------
export function getMySQLAdapter(config: DBConfig) {
  return new MySQLAdapter(config);
}
