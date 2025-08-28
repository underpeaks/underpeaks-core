// db-adapter/adapters/mysql-adapter.ts
import mysql from "mysql2/promise";
import bcrypt from "bcrypt";
import crypto from "crypto";
import { DBConfig, DBAdapter, ColumnDef, DBType } from "../types";
import { config as loadEnv } from "dotenv";

// Load .env variables
loadEnv();

export class MySQLAdapter implements DBAdapter {
  private pool: mysql.Pool;
  private config: DBConfig;

  constructor(config?: DBConfig) {
    // Use provided config or fallback to .env
    this.config = config || {
  type: (process.env.DB_TYPE as DBType) || 'mysql',
  host: process.env.DB_HOST!,
  user: process.env.DB_USER!,
  password: process.env.DB_PASSWORD!,
  database: process.env.DB_DATABASE!,
  port: process.env.DB_PORT ? Number(process.env.DB_PORT) : 3306, // default MySQL port
};

console.log(process.env.DB_PASSWORD);
console.log(this.config.password);

    if (!this.config.host || !this.config.user || !this.config.password || !this.config.database) {
      throw new Error("MySQLAdapter requires host, user, password, and database in config");
    }

    console.log(this.config.password);

    this.pool = mysql.createPool({
      host: this.config.host,
      user: this.config.user,
      password: this.config.password,
      database: this.config.database,
      port: this.config.port as number | undefined,
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0,
    });
  }

  async connect() {
    // test connection by getting a connection from pool
    const conn = await this.pool.getConnection();
    conn.release();
  }

  /** Test connection */
  async testConnection() {
    try {
      await this.connect();
      return { success: true, message: "Connected to MySQL successfully." };
    } catch (err: any) {
      return { success: false, message: err.message || "Failed to connect to MySQL" };
    }
  }

  /** CRUD operations */
  async create(_config: DBConfig, table: string, data: any): Promise<any> {
    const keys = Object.keys(data);
    const values = keys.map(k => data[k]);
    const placeholders = keys.map(() => "?").join(", ");
    const sql = `INSERT INTO \`${table}\` (${keys.join(", ")}) VALUES (${placeholders})`;
    const [result] = await this.pool.query(sql, values);
    return result;
  }

  async read(_config: DBConfig, table: string, query?: any): Promise<any> {
    let sql = `SELECT * FROM \`${table}\``;
    const values: any[] = [];
    if (query && Object.keys(query).length > 0) {
      const where = Object.keys(query)
        .map(k => {
          values.push(query[k]);
          return `\`${k}\` = ?`;
        })
        .join(" AND ");
      sql += ` WHERE ${where}`;
    }
    const [rows] = await this.pool.query(sql, values);
    return rows;
  }

  async update(_config: DBConfig, table: string, id: string, data: any): Promise<any> {
    const keys = Object.keys(data);
    const values = keys.map(k => data[k]);
    const setClause = keys.map(k => `\`${k}\` = ?`).join(", ");
    const sql = `UPDATE \`${table}\` SET ${setClause} WHERE id = ?`;
    values.push(id);
    const [result] = await this.pool.query(sql, values);
    return result;
  }

  async delete(_config: DBConfig, table: string, id: string): Promise<any> {
    const sql = `DELETE FROM \`${table}\` WHERE id = ?`;
    const [result] = await this.pool.query(sql, [id]);
    return result;
  }

  /** Create table dynamically */
  /** Create table dynamically */
async createTable(tableName: string, schema: { columns: ColumnDef[] }) {
  const columnsSql = schema.columns
    .map(col => {
      let typeSql = "";
      switch (col.type.toLowerCase()) {
        case "uuid":
          typeSql = "CHAR(36)";
          break;

        case "string":
        case "text":
          // Use VARCHAR for keys, TEXT otherwise
          typeSql = (col.is_primary || col.unique) ? "VARCHAR(255)" : "TEXT";
          break;

        case "jsonb":
        case "json":
        case "array": // store arrays as JSON
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

/** Create tenant in MySQL */
async createTenant(_config: DBConfig, data: { subdomain: string; user_email: string }) {
  const ten_id = crypto.randomUUID();
  const result = await this.create(_config, "nxf_system_tenants", {
    ten_id,
    subdomain: data.subdomain,
    user_email: data.user_email,
    created_at: new Date(),
  });
  return ten_id; // return the UUID for consistency
}

/** Create project in MySQL */
async createProject(_config: DBConfig, data: { name: string; user_id: string }) {
  const project_id = crypto.randomUUID();
  const result = await this.create(_config, "nxf_system_projects", {
    project_id,
    name: data.name,
    user_id: data.user_id,
    created_at: new Date(),
    updated_at: new Date(),
  });
  return project_id;
}



  /** Password hashing */
  async hashPassword(password: string) {
    return bcrypt.hash(password, 10);
  }

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
}

/** Factory function */
export function getMySQLAdapter(config?: DBConfig) {
  return new MySQLAdapter(config);
}

// ================================
// Example usage
// ================================
(async () => {
  const adapter = getMySQLAdapter();
  const result = await adapter.testConnection();
  console.log(result);
})();
