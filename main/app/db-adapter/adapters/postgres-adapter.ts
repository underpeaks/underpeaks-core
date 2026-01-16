// db-adapter/adapters/postgres-adapter.ts
import { Client, ClientConfig } from "pg";
import bcrypt from "bcrypt";
import crypto from "crypto";
import { DBAdapter, DBConfig, ColumnDef } from "../types";
import { CreateDataModels } from "../utils/create-data-models";

// -----------------------
// Postgres Adapter
// -----------------------
export class PostgresAdapter implements DBAdapter {
  private client: Client;
  private isConnected = false;
  public config: DBConfig;

  constructor(config: DBConfig) {
    if (!config) throw new Error("DBConfig must be provided via Zustand store");
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

  // -----------------------
  // Connection
  // -----------------------
  async connect() {
    if (this.isConnected) return;
    await this.client.connect();
    this.isConnected = true;
  }

  async testConnection(): Promise<{ success: boolean; message: string }> {
    try {
      await this.connect();
      await this.client.query("SELECT 1");
      return { success: true, message: "Connected to Postgres successfully." };
    } catch (err: any) {
      return { success: false, message: err.message || "Failed to connect to Postgres." };
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
    await this.connect();
    const keys = Object.keys(data);
    const values = Object.values(data).map((v) =>
      typeof v === "object" && v !== null ? JSON.stringify(v) : v
    );
    const placeholders = keys.map((_, i) => `$${i + 1}`).join(", ");
    const sql = `INSERT INTO "${table}" (${keys.join(",")}) VALUES (${placeholders}) RETURNING *`;
    const res = await this.client.query(sql, values);
    return res.rows[0];
  }

  async read(_config: DBConfig, table: string, query?: any): Promise<any[]> {
    await this.connect();
    let sql = `SELECT * FROM "${table}"`;
    const values: any[] = [];
    if (query && Object.keys(query).length > 0) {
      const where = Object.entries(query)
        .map(([k, v], i) => {
          values.push(v);
          return `"${k}" = $${i + 1}`;
        })
        .join(" AND ");
      sql += ` WHERE ${where}`;
    }
    const res = await this.client.query(sql, values);
    return res.rows;
  }

  async update(_config: DBConfig, table: string, id: string, data: any): Promise<any> {
    await this.connect();
    const keys = Object.keys(data);
    const values = Object.values(data).map((v) =>
      typeof v === "object" && v !== null ? JSON.stringify(v) : v
    );
    const setClause = keys.map((k, i) => `"${k}" = $${i + 1}`).join(", ");
    const sql = `UPDATE "${table}" SET ${setClause} WHERE id = $${keys.length + 1} RETURNING *`;
    const res = await this.client.query(sql, [...values, id]);
    return res.rows[0];
  }

  async delete(_config: DBConfig, table: string, id: string): Promise<any> {
    await this.connect();
    const sql = `DELETE FROM "${table}" WHERE id = $1 RETURNING *`;
    const res = await this.client.query(sql, [id]);
    return res.rows[0];
  }

  // -----------------------
  // TABLE MANAGEMENT
  // -----------------------
  async createTable(
    tableName: string,
    schema: { columns: ColumnDef[] | Record<string, ColumnDef>; schema?: string }
  ) {
    await this.connect();
    await this.client.query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp";`);
    await this.client.query(`CREATE EXTENSION IF NOT EXISTS "pgcrypto";`);

    let columnsArray: ColumnDef[] = [];
    if (Array.isArray(schema.columns)) columnsArray = schema.columns;
    else if (typeof schema.columns === "object" && schema.columns !== null)
      columnsArray = Object.entries(schema.columns).map(([name, col]) => ({ ...col, name }));
    else throw new Error(`PostgresAdapter.createTable: "columns" must be array or object`);

    if (!columnsArray.length) throw new Error(`PostgresAdapter.createTable: "columns" cannot be empty`);

    const colsSQL = columnsArray
      .map((col) => {
        let typeSql = "";
        let defaultValue = "";
        const constraints: string[] = [];

        switch (col.type) {
          case "uuid":
            typeSql = "UUID";
            if (!col.default) defaultValue = " DEFAULT gen_random_uuid()";
            break;
          case "string":
          case "text":
            typeSql = "TEXT";
            break;
          case "json":
          case "jsonb":
            typeSql = "JSONB";
            break;
          case "timestamp":
          case "datetime":
          case "timestamp with time zone":
            typeSql = "TIMESTAMPTZ";
            break;
          case "integer":
            typeSql = "INTEGER";
            break;
          case "bigint":
            typeSql = "BIGINT";
            break;
          case "boolean":
            typeSql = "BOOLEAN";
            break;
          case "float":
            typeSql = "REAL";
            break;
          case "double":
            typeSql = "DOUBLE PRECISION";
            break;
          case "array":
            typeSql = "TEXT[]";
            break;
          default:
            throw new Error(`Unsupported Postgres column type: ${col.type}`);
        }

        if (col.default) {
          if (typeof col.default === "string" && /\(\)$/.test(col.default)) {
            defaultValue = ` DEFAULT ${col.default.replace(/^extensions\./i, "")}`;
          } else if (typeof col.default === "string") {
            defaultValue = ` DEFAULT '${col.default.replace(/'/g, "''")}'`;
          } else {
            defaultValue = ` DEFAULT ${col.default}`;
          }
        }

        if (col.is_primary || col.primary_key) constraints.push("PRIMARY KEY");
        if (col.nullable === false) constraints.push("NOT NULL");
        if (col.unique) constraints.push("UNIQUE");
        if (col.foreign_key) {
          const fk = col.foreign_key;
          constraints.push(`REFERENCES ${fk.references} ON DELETE ${fk.on_delete || "NO ACTION"}`);
        }

        return `"${col.name}" ${typeSql}${defaultValue} ${constraints.join(" ")}`.trim();
      })
      .join(", ");

    const sql = `CREATE TABLE IF NOT EXISTS "${schema.schema || "public"}"."${tableName}" (${colsSQL});`;
    await this.client.query(sql);
  }

  async runSQL(_config: DBConfig, sql: string): Promise<any> {
    await this.connect();
    const res = await this.client.query(sql);
    return res.rows;
  }

  // -----------------------
  // TENANTS & PROJECTS
  // -----------------------
  async createTenant(_config: DBConfig, data: { subdomain: string; user_email: string }) {
    await this.connect();
    const ten_id = crypto.randomUUID();
    const sql = `INSERT INTO nxf_system_tenants (ten_id, subdomain, user_email, created_at)
                 VALUES ($1, $2, $3, now()) RETURNING ten_id`;
    const res = await this.client.query(sql, [ten_id, data.subdomain, data.user_email]);
    return res.rows[0].ten_id;
  }

  async createProject(_config: DBConfig, data: { name: string; user_id: string }) {
    await this.connect();
    const project_id = crypto.randomUUID();
    const sql = `INSERT INTO nxf_system_projects (project_id, name, user_id, created_at, updated_at)
                 VALUES ($1, $2, $3, now(), now()) RETURNING project_id`;
    const res = await this.client.query(sql, [project_id, data.name, data.user_id]);
    return res.rows[0].project_id;
  }

  async findProjectByOwnerId(_config: DBConfig, ownerId: string) {
    await this.connect();
    const res = await this.client.query(
      `SELECT * FROM nxf_system_projects WHERE user_id = $1 LIMIT 1`,
      [ownerId]
    );
    return res.rows[0] || null;
  }

  async findTenantByUserEmail(_config: DBConfig, email: string) {
    await this.connect();
    const res = await this.client.query(
      `SELECT * FROM nxf_system_tenants WHERE user_email = $1 LIMIT 1`,
      [email]
    );
    return res.rows[0] || null;
  }

  // -----------------------
  // USERS / AUTH
  // -----------------------
  async createAdminUser(_config: DBConfig, data: any) {
    await this.connect();
    const hashed = data.password ? await this.hashPassword(data.password) : null;
    const sql = `INSERT INTO nxf_users (user_id, user_email, full_name, role, password_hash, created_at, updated_at)
                 VALUES ($1, $2, $3, $4, $5, now(), now())
                 ON CONFLICT (user_id) DO UPDATE SET
                   user_email = EXCLUDED.user_email,
                   full_name = EXCLUDED.full_name,
                   role = EXCLUDED.role,
                   password_hash = EXCLUDED.password_hash,
                   updated_at = now()
                 RETURNING user_id`;
    const res = await this.client.query(sql, [
      data.user_id || crypto.randomUUID(),
      data.user_email,
      data.full_name || "",
      data.role || "admin",
      hashed,
    ]);
    return res.rows[0].user_id;
  }

  async findUserByEmail(_config: DBConfig, email: string) {
    await this.connect();
    const res = await this.client.query(`SELECT * FROM nxf_users WHERE user_email = $1 LIMIT 1`, [email]);
    return res.rows[0] || null;
  }

  async findUserByEmailWithRetry(_config: DBConfig, email: string, retries = 5, delay = 300) {
    for (let i = 0; i < retries; i++) {
      const user = await this.findUserByEmail(_config, email);
      if (user) return user;
      await new Promise((r) => setTimeout(r, delay));
    }
    return null;
  }

  // -----------------------
  // INSTALLER CONFIG
  // -----------------------
  async saveInstallerConfig(_config: DBConfig, data: any) {
    const config_id = crypto.randomUUID();
    await this.create(_config, "nxf_system_config", {
      config_id,
      ...data,
      created_at: new Date(),
      updated_at: new Date(),
    });
    return config_id;
  }

  // -----------------------
  // DATA MODELS
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
  // STORAGE
  // -----------------------
  async setupStorageBuckets(): Promise<{ success: boolean; buckets: string[] }> {
    const DEFAULT_BUCKETS = ["system", "themes", "extensions", "projects", "avatars", "logos", "uploads"];
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
    const rows = await this.read(this.config, "nxf_storage");
    return rows.map((r: any) => r.folder);
  }

  async deleteBucket(bucketName: string) {
    const rows = await this.read(this.config, "nxf_storage", { folder: bucketName });
    if (!rows.length) return;
    return this.delete(this.config, "nxf_storage", rows[0].storage_id);
  }
}

// -----------------------
// Factory
// -----------------------
export function getPostgresAdapter(config: DBConfig) {
  if (!config) throw new Error("Postgres config is undefined");
  return new PostgresAdapter(config);
}
