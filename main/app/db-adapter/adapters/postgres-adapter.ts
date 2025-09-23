import { Client, ClientConfig } from "pg";
import bcrypt from "bcrypt";
import { ColumnDef, DBAdapter, DBConfig } from "../types";
import crypto from "crypto";
import { CreateDataModels } from "../utils/create-data-models";

export class PostgresAdapter implements DBAdapter {
  private client: Client;
  private isConnected = false;

  constructor(public config: DBConfig) {
    const pgConfig: ClientConfig = {
      host: config.host,
      user: config.user,
      password: config.password,
      database: config.database,
      port: config.port ? Number(config.port) : undefined,
    };
    this.client = new Client(pgConfig);
  }

  /** Connect once */
  async connect() {
    if (this.isConnected) return;
    await this.client.connect();
    this.isConnected = true;
  }

  /** Test connection */
  async testConnection(): Promise<{ success: boolean; message: string }> {
    try {
      await this.connect();
      await this.client.query("SELECT 1");
      return { success: true, message: "Connected to Postgres successfully." };
    } catch (error: any) {
      return { success: false, message: error.message || "Failed to connect to Postgres." };
    }
  }

  /** Basic CRUD with JSON serialization */
  async create(_config: DBConfig, table: string, data: any): Promise<any> {
    await this.connect();
    const keys = Object.keys(data);
    const values = Object.values(data).map(v => (typeof v === "object" && v !== null ? JSON.stringify(v) : v));
    const placeholders = keys.map((_, i) => `$${i + 1}`).join(", ");
    const sql = `INSERT INTO ${table} (${keys.join(", ")}) VALUES (${placeholders}) RETURNING *`;
    const res = await this.client.query(sql, values);
    return res.rows[0];
  }

  async read(_config: DBConfig, table: string, query?: any): Promise<any> {
    await this.connect();
    let sql = `SELECT * FROM ${table}`;
    const values: any[] = [];
    if (query && Object.keys(query).length) {
      const where = Object.entries(query)
        .map(([k, v], i) => {
          values.push(v);
          return `${k} = $${i + 1}`;
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
    const values = Object.values(data).map(v => (typeof v === "object" && v !== null ? JSON.stringify(v) : v));
    const set = keys.map((k, i) => `${k} = $${i + 1}`).join(", ");
    const sql = `UPDATE ${table} SET ${set} WHERE id = $${keys.length + 1} RETURNING *`;
    const res = await this.client.query(sql, [...values, id]);
    return res.rows[0];
  }

  async delete(_config: DBConfig, table: string, id: string): Promise<any> {
    await this.connect();
    const sql = `DELETE FROM ${table} WHERE id = $1 RETURNING *`;
    const res = await this.client.query(sql, [id]);
    return res.rows[0];
  }

  /** Create table from schema */
  async createTable(tableName: string, schema: { columns: ColumnDef[] | Record<string, ColumnDef>; schema?: string }) {
    await this.connect();
    // Enable necessary extensions
    await this.client.query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp";`);
    await this.client.query(`CREATE EXTENSION IF NOT EXISTS "pgcrypto";`);

    // Normalize columns to array
    let columnsArray: ColumnDef[] = [];
    if (Array.isArray(schema.columns)) {
      columnsArray = schema.columns;
    } else if (typeof schema.columns === "object" && schema.columns !== null) {
      columnsArray = Object.entries(schema.columns).map(([name, col]) => ({ ...col, name }));
    } else {
      throw new Error(`PostgresAdapter.createTable: "columns" must be an array or object for table "${tableName}"`);
    }

    if (columnsArray.length === 0) {
      throw new Error(`PostgresAdapter.createTable: "columns" cannot be empty for table "${tableName}"`);
    }

    const colsSQL = columnsArray
      .map(col => {
        let typeSql = "";
        let defaultValue = "";
        const constraints: string[] = [];

        switch (col.type) {
          case "uuid":
            typeSql = "UUID";
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
          let def = col.default.toString().replace(/^extensions\./i, "");
          if (/\(\)$/.test(def)) {
            defaultValue = ` DEFAULT ${def}`;
          } else {
            defaultValue = typeof col.default === "string" ? ` DEFAULT '${def.replace(/'/g, "''")}'` : ` DEFAULT ${def}`;
          }
        }

        if (col.is_primary || (col.primary_key ?? false)) constraints.push("PRIMARY KEY");
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

  /** Finders */
  async findUserByEmail(_config: DBConfig, email: string) {
    await this.connect();
    const res = await this.client.query(`SELECT * FROM nxf_users WHERE user_email = $1 LIMIT 1`, [email]);
    return res.rows[0] || null;
  }

  async findProjectByOwnerId(_config: DBConfig, ownerId: string) {
    await this.connect();
    const res = await this.client.query(`SELECT * FROM nxf_system_projects WHERE user_id = $1 LIMIT 1`, [ownerId]);
    return res.rows[0] || null;
  }

  /** Creators */
  async createTenant(_config: DBConfig, data: { subdomain: string; user_email: string }): Promise<string> {
    await this.connect();
    const ten_id = crypto.randomUUID();
    const sql = `INSERT INTO nxf_system_tenants (ten_id, subdomain, user_email, created_at)
                 VALUES ($1, $2, $3, now()) RETURNING ten_id`;
    const res = await this.client.query(sql, [ten_id, data.subdomain, data.user_email]);
    return res.rows[0].ten_id;
  }

  async createProject(_config: DBConfig, data: { name: string; user_id: string }): Promise<string> {
    await this.connect();
    const project_id = crypto.randomUUID();
    const sql = `INSERT INTO nxf_system_projects (project_id, name, user_id, created_at)
                 VALUES ($1, $2, $3, now()) RETURNING project_id`;
    const res = await this.client.query(sql, [project_id, data.name, data.user_id]);
    return res.rows[0].project_id;
  }

  async createAdminUser(_config: DBConfig, data: any) {
    await this.connect();
    const hashed = await this.hashPassword(data.password);
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

  /** Auth */
  async registerUserInAuth(_config: DBConfig, data: { email: string; password: string }) {
    return { id: crypto.randomUUID() };
  }

  async hashPassword(password: string) {
    return bcrypt.hash(password, 10);
  }

  /** Create data models */
  async CreateDataModels(projectId: string) {
    if (!this.config || !projectId) throw new Error("Missing DB config or projectId");
    return CreateDataModels(this, projectId);
  }

  /** Create data models from user email */
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
}

/** Factory */
export function getPostgresAdapter(config: DBConfig) {
  if (!config) throw new Error("Postgres config is undefined");
  return new PostgresAdapter(config);
}
