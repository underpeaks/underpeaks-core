// db-adapter/adapters/mysql-adapter.ts
import mysql from "mysql2/promise";
import bcrypt from "bcrypt";
import crypto from "crypto";
import { DBConfig, DBAdapter, ColumnDef, DBType } from "../types";
import { config as loadEnv } from "dotenv";
import { CreateDataModels } from "../utils/create-data-models";

// Load .env variables
loadEnv();

export class MySQLAdapter implements DBAdapter {
  private pool: mysql.Pool;
  public config: DBConfig;

  constructor(config?: DBConfig) {
    this.config = config || {
      type: (process.env.DB_TYPE as DBType) || "mysql",
      host: process.env.DB_HOST!,
      user: process.env.DB_USER!,
      password: process.env.DB_PASSWORD!,
      database: process.env.DB_DATABASE!,
      port: process.env.DB_PORT ? Number(process.env.DB_PORT) : 3306,
    };

    this.pool = mysql.createPool({
      host: this.config.host,
      user: this.config.user,
      password: this.config.password,
      database: this.config.database,
      port: this.config.port ? Number(this.config.port) : undefined,
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0,
    });
  }

  // -----------------------
  // Connection
  // -----------------------
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

  // -----------------------
  // Password helpers
  // -----------------------
  async hashPassword(password: string) {
    return bcrypt.hash(password, 10);
  }

  async comparePassword(password: string, hash: string) {
    return bcrypt.compare(password, hash);
  }

  // -----------------------
  // CRUD
  // -----------------------
  async create(_config: DBConfig, table: string, data: Record<string, any>): Promise<any> {
    const formatDateForMySQL = (date: Date) => {
      const pad = (n: number) => (n < 10 ? "0" + n : n);
      return (
        date.getFullYear() +
        "-" +
        pad(date.getMonth() + 1) +
        "-" +
        pad(date.getDate()) +
        " " +
        pad(date.getHours()) +
        ":" +
        pad(date.getMinutes()) +
        ":" +
        pad(date.getSeconds())
      );
    };

    const preparedData: Record<string, any> = {};
    Object.entries(data).forEach(([key, value]) => {
      if (value instanceof Date) preparedData[key] = formatDateForMySQL(value);
      else if (typeof value === "object" && value !== null) preparedData[key] = JSON.stringify(value);
      else preparedData[key] = value;
    });

    const keys = Object.keys(preparedData);
    const values = keys.map((k) => preparedData[k]);
    const placeholders = keys.map(() => "?").join(", ");

    const sql = `INSERT INTO \`${table}\` (${keys.join(", ")}) VALUES (${placeholders})`;
    const [result] = await this.pool.query(sql, values);
    return result;
  }

  async read(config: DBConfig, table: string, query?: any): Promise<any> {
    let sql = `SELECT * FROM \`${table}\``;
    const values: any[] = [];
    if (query && Object.keys(query).length > 0) {
      const where = Object.keys(query)
        .map((k) => {
          values.push(query[k]);
          return `\`${k}\` = ?`;
        })
        .join(" AND ");
      sql += ` WHERE ${where}`;
    }
    const [rows] = await this.pool.query(sql, values);
    return rows;
  }

  async update(config: DBConfig, table: string, id: string, data: any): Promise<any> {
    const keys = Object.keys(data);
    const values = keys.map((k) => data[k]);
    const setClause = keys.map((k) => `\`${k}\` = ?`).join(", ");
    const sql = `UPDATE \`${table}\` SET ${setClause} WHERE id = ?`;
    values.push(id);
    const [result] = await this.pool.query(sql, values);
    return result;
  }

  async delete(config: DBConfig, table: string, id: string): Promise<any> {
    const sql = `DELETE FROM \`${table}\` WHERE id = ?`;
    const [result] = await this.pool.query(sql, [id]);
    return result;
  }

  async createTable(
    tableName: string,
    schema: { columns: ColumnDef[] | Record<string, Omit<ColumnDef, "name">> }
  ) {
    const columnsArray: ColumnDef[] = Array.isArray(schema.columns)
      ? schema.columns
      : Object.entries(schema.columns).map(([name, def]: [string, any]) => ({
          name,
          type: def.type,
          is_primary: def.is_primary ?? def.primary_key ?? false,
          unique: def.unique ?? false,
          nullable: def.nullable ?? true,
          default: def.default,
          foreign_key: def.foreign_key,
        }));

    const columnsSql = columnsArray
      .map((col) => {
        let typeSql = "";
        switch (col.type.toLowerCase()) {
          case "uuid":
            typeSql = "CHAR(36)";
            break;
          case "string":
          case "text":
            typeSql = col.is_primary || col.unique ? "VARCHAR(255)" : "TEXT";
            break;
          case "jsonb":
          case "json":
          case "array":
            typeSql = "JSON";
            break;
          case "datetime":
          case "timestamp":
          case "timestamp with time zone":
            typeSql = "DATETIME";
            break;
          case "integer":
          case "int":
            typeSql = "INT";
            break;
          case "bigint":
            typeSql = "BIGINT";
            break;
          case "boolean":
            typeSql = "TINYINT(1)";
            break;
          case "float":
          case "double":
            typeSql = "FLOAT";
            break;
          default:
            throw new Error(`Unsupported MySQL column type: ${col.type}`);
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

  // -----------------------
  // Tenant & Project
  // -----------------------
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
    const rows: any = await this.read(config, "nxf_system_projects", { user_id: ownerId });
    return rows && rows.length ? rows[0] : null;
  }

  async findTenantByUserEmail(config: DBConfig, email: string) {
    const rows: any = await this.read(config, "nxf_system_tenants", { user_email: email });
    return rows && rows.length ? rows[0] : null;
  }

  // -----------------------
  // Auth methods
  // -----------------------
  async login(config: DBConfig, email: string, password: string) {
    const user = await this.findUserByEmail(config, email);
    if (!user) return { error: "User not found" };
    const isValid = await this.comparePassword(password, user.password_hash);
    if (!isValid) return { error: "Invalid password" };
    const { password_hash, ...userSafe } = user;
    return { user: userSafe };
  }

  async register(config: DBConfig, data: { email: string; password: string; full_name?: string }) {
    const hashed = await this.hashPassword(data.password);
    const userId = crypto.randomUUID();
    await this.create(config, "nxf_users", {
      user_id: userId,
      user_email: data.email,
      password_hash: hashed,
      full_name: data.full_name || null,
      created_at: new Date(),
      updated_at: new Date(),
    });
    return { userId };
  }

  async logout(_config: DBConfig, _token?: string) {
    // Token revocation handled in SQL token table if implemented
    return { success: true };
  }

  async getCurrentUser(config: DBConfig, token?: string) {
    if (!token) return null;
    const row: any = await this.read(config, "nxf_tokens", { access_token: token });
    if (!row || row.length === 0) return null;
    const user = await this.findUserByEmail(config, row[0].user_email);
    if (!user) return null;
    const { password_hash, ...userSafe } = user;
    return userSafe;
  }

  async sendResetEmail(config: DBConfig, email: string, redirectUrl: string) {
    // Placeholder: in production, integrate with email service
    const user = await this.findUserByEmail(config, email);
    if (!user) return { success: false, error: "User not found" };
    const resetToken = crypto.randomUUID();
    await this.create(config, "nxf_tokens", {
      token: resetToken,
      type: "password_reset",
      user_email: email,
      redirect_url: redirectUrl,
      created_at: new Date(),
      expires_at: new Date(Date.now() + 3600 * 1000), // 1 hour expiry
    });
    return { success: true };
  }

  async resetPassword(config: DBConfig, token: string, newPassword: string) {
    const rows: any = await this.read(config, "nxf_tokens", { token, type: "password_reset" });
    if (!rows || rows.length === 0) return { success: false, error: "Invalid token" };
    const email = rows[0].user_email;
    const hashed = await this.hashPassword(newPassword);
    await this.update(config, "nxf_users", rows[0].user_id, { password_hash: hashed });
    return { success: true };
  }

  async createToken(data: any) {
    const tokenId = crypto.randomUUID();
    const accessToken = crypto.randomUUID();
    const refreshToken = crypto.randomUUID();
    await this.create(this.config, "nxf_tokens", {
      token_id: tokenId,
      access_token: accessToken,
      refresh_token: refreshToken,
      user_email: data.user_email,
      created_at: new Date(),
      expires_at: new Date(Date.now() + 7 * 24 * 3600 * 1000), // 7 days
    });
    return { token_id: tokenId, access_token: accessToken, refresh_token: refreshToken };
  }

  async findTokenByAccessToken(hash: string) {
    const rows: any = await this.read(this.config, "nxf_tokens", { access_token: hash });
    return rows && rows.length ? rows[0] : null;
  }

  async findTokenByRefreshToken(hash: string) {
    const rows: any = await this.read(this.config, "nxf_tokens", { refresh_token: hash });
    return rows && rows.length ? rows[0] : null;
  }

  async extendToken(tokenId: string, data: any) {
    await this.update(this.config, "nxf_tokens", tokenId, data);
    return await this.read(this.config, "nxf_tokens", { token_id: tokenId });
  }

  async revokeToken(tokenId: string) {
    await this.delete(this.config, "nxf_tokens", tokenId);
  }

  // -----------------------
  // Admin & User helpers
  // -----------------------
  async createAdminUser(config: DBConfig, data: any) {
    const { user_id, user_email, password, role = "admin", ...rest } = data;
    if (!user_email || !password) throw new Error("Admin user must have email and password");
    const hashed = await this.hashPassword(password);
    return this.create(config, "nxf_users", {
      user_id: user_id || crypto.randomUUID(),
      user_email,
      password_hash: hashed,
      role,
      created_at: new Date(),
      updated_at: new Date(),
      ...rest,
    });
  }

  async findUserByEmail(config: DBConfig, email: string) {
    const rows: any = await this.read(config, "nxf_users", { user_email: email });
    return rows && rows.length ? rows[0] : null;
  }

  // -----------------------
  // Data Models
  // -----------------------
  async CreateDataModels(projectId: string) {
    if (!this.config || !projectId) throw new Error("Missing DB config or projectId");
    return CreateDataModels(this, projectId);
  }

  async createDataModelsFromUserEmail(userEmail: string) {
    if (!userEmail) throw new Error("Missing userEmail");

    const users: any = await this.read(this.config, "nxf_users", { user_email: userEmail });
    if (!users || users.length === 0) throw new Error(`User not found: ${userEmail}`);
    const user = users[0];

    const projects: any = await this.read(this.config, "nxf_system_projects", { user_id: user.user_id });
    if (!projects || projects.length === 0) throw new Error(`No project found for user ${userEmail}`);
    const projectId = projects[0].project_id;

    return this.CreateDataModels(projectId);
  }

  // -----------------------
  // Storage
  // -----------------------
  async setupStorageBuckets(): Promise<string[] | { success: boolean; buckets: string[] }> {
    try {
      const DEFAULT_BUCKETS = ["uploads", "avatars", "products", "reports"];

      for (const folder of DEFAULT_BUCKETS) {
        const storage_id = crypto.randomUUID();
        const existing = await this.read(this.config, "nxf_storage", { folder });
        if (!existing || existing.length === 0) {
          await this.create(this.config, "nxf_storage", {
            storage_id,
            folder,
            file_name: "",
            file_path: folder,
            created_at: new Date(),
          });
          console.log(`[MySQLAdapter] Created storage folder record: ${folder}`);
        }
      }

      return { success: true, buckets: DEFAULT_BUCKETS };
    } catch (err: any) {
      console.error("[MySQLAdapter] Failed to setup storage buckets:", err.message);
      return { success: false, buckets: [] };
    }
  }

  async createBucket(bucketName: string) {
    await this.create(this.config, "nxf_storage", {
      storage_id: crypto.randomUUID(),
      folder: bucketName,
      file_name: "",
      file_path: bucketName,
      created_at: new Date(),
    });
  }

  async listBuckets(): Promise<string[]> {
    const rows: any = await this.read(this.config, "nxf_storage");
    return rows.map((r: any) => r.folder);
  }

  async deleteBucket(bucketName: string) {
    await this.delete(this.config, "nxf_storage", bucketName);
  }
}

// -----------------------
// Factory
// -----------------------
export function getMySQLAdapter(config?: DBConfig) {
  return new MySQLAdapter(config);
}

// -----------------------
// Test connection
// -----------------------
(async () => {
  const adapter = getMySQLAdapter();
  const result = await adapter.testConnection();
  console.log(result);
})();
