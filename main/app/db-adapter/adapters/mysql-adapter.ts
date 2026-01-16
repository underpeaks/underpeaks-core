// db-adapter/adapters/mysql-adapter.ts
import mysql from "mysql2/promise";
import bcrypt from "bcrypt";
import crypto from "crypto";
import { DBConfig, DBAdapter, ColumnDef, DBType } from "../types";
import { CreateDataModels } from "../utils/create-data-models";

// -----------------------
// MySQL Adapter
// -----------------------
export class MySQLAdapter implements DBAdapter {
  private pool: mysql.Pool;
  public config: DBConfig;

  constructor(config: DBConfig) {
    if (!config) throw new Error("DBConfig must be provided via Zustand store");
    this.config = config;

    this.pool = mysql.createPool({
  host: this.config.host,
  user: this.config.user,
  password: this.config.password,
  database: this.config.database,
  port: this.config.port ? Number(this.config.port) : undefined, // <-- cast to number
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
    const placeholders = keys.map(() => "?").join(",");

    const sql = `INSERT INTO \`${table}\` (${keys.join(",")}) VALUES (${placeholders})`;
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

  // -----------------------
  // TABLE MANAGEMENT
  // -----------------------
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
  // Users / Auth
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

  async findUserByEmailWithRetry(config: DBConfig, email: string, retries = 5, delay = 300) {
    for (let i = 0; i < retries; i++) {
      const user = await this.findUserByEmail(config, email);
      if (user) return user;
      await new Promise((r) => setTimeout(r, delay));
    }
    return null;
  }

  // -----------------------
  // Installer config
  // -----------------------
  async saveInstallerConfig(config: DBConfig, data: any): Promise<string> {
    const config_id = crypto.randomUUID();
    await this.create(config, "nxf_system_config", {
      config_id,
      ...data,
      created_at: new Date(),
      updated_at: new Date(),
    });
    return config_id;
  }

  // -----------------------
  // Data Models
  // -----------------------
  async CreateDataModels(projectId: string) {
    if (!this.config || !projectId) throw new Error("Missing DB config or projectId");
    return CreateDataModels(this, projectId);
  }

  async createDataModelsFromUserEmail(userEmail: string) {
    const user = await this.findUserByEmailWithRetry(this.config, userEmail);
    if (!user?.user_id) throw new Error(`User not found: ${userEmail}`);

    const project = await this.findProjectByOwnerId(this.config, user.user_id);
    if (!project?.project_id) throw new Error(`No project found for user ${userEmail}`);
    return this.CreateDataModels(project.project_id);
  }

  // -----------------------
  // Storage
  // -----------------------
  async setupStorageBuckets(): Promise<{ success: boolean; buckets: string[] }> {
    const DEFAULT_BUCKETS = [
      "system",
      "themes",
      "extensions",
      "projects",
      "avatars",
      "logos",
      "uploads",
    ];

    for (const folder of DEFAULT_BUCKETS) {
      const existing = await this.read(this.config, "nxf_storage", { folder });
      if (!existing || existing.length === 0) {
        await this.create(this.config, "nxf_storage", {
          storage_id: crypto.randomUUID(),
          folder,
          file_name: "",
          file_path: folder,
          created_at: new Date(),
        });
      }
    }

    return { success: true, buckets: DEFAULT_BUCKETS };
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
export function getMySQLAdapter(config: DBConfig) {
  return new MySQLAdapter(config);
}
