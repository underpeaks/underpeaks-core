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

    // if (!this.config.host || !this.config.user || !this.config.password || !this.config.database) {
    //   throw new Error("MySQLAdapter requires host, user, password, and database in config");
    // }

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
  // CRUD
  // -----------------------
  async create(_config: DBConfig, table: string, data: Record<string, any>): Promise<any> {
  // Helper to format Date objects
  const formatDateForMySQL = (date: Date) => {
    const pad = (n: number) => (n < 10 ? '0' + n : n);
    return (
      date.getFullYear() +
      '-' +
      pad(date.getMonth() + 1) +
      '-' +
      pad(date.getDate()) +
      ' ' +
      pad(date.getHours()) +
      ':' +
      pad(date.getMinutes()) +
      ':' +
      pad(date.getSeconds())
    );
  };

  // Prepare data: convert Date -> string, Object -> JSON
  const preparedData: Record<string, any> = {};
  Object.entries(data).forEach(([key, value]) => {
    if (value instanceof Date) {
      preparedData[key] = formatDateForMySQL(value);
    } else if (typeof value === 'object' && value !== null) {
      // For objects/arrays
      preparedData[key] = JSON.stringify(value);
    } else {
      preparedData[key] = value;
    }
  });

  const keys = Object.keys(preparedData);
  const values = keys.map(k => preparedData[k]);
  const placeholders = keys.map(() => '?').join(', ');

  const sql = `INSERT INTO \`${table}\` (${keys.join(', ')}) VALUES (${placeholders})`;

  const [result] = await this.pool.query(sql, values);
  return result;
}



  async read(config: DBConfig, table: string, query?: any): Promise<any> {
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

  async update(config: DBConfig, table: string, id: string, data: any): Promise<any> {
    const keys = Object.keys(data);
    const values = keys.map(k => data[k]);
    const setClause = keys.map(k => `\`${k}\` = ?`).join(", ");
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
  // Table creation
  // -----------------------
async createTable(
  tableName: string,
  schema: { columns: ColumnDef[] | Record<string, Omit<ColumnDef, 'name'>> }
) {
  // Normalize object to array if needed
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

  // -----------------------
  // User helpers
  // -----------------------
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

  // -----------------------
  // DBAdapter-required methods
  // -----------------------
  async findUserByEmail(config: DBConfig, email: string) {
    const rows: any = await this.read(config, "nxf_users", { user_email: email });
    return rows && rows.length ? rows[0] : null;
  }

  async findProjectByOwnerId(config: DBConfig, ownerId: string) {
    const rows: any = await this.read(config, "nxf_system_projects", { user_id: ownerId });
    return rows && rows.length ? rows[0] : null;
  }

  async CreateDataModels(projectId: string) {
    if (!this.config || !projectId) throw new Error("Missing DB config or projectId");
    return CreateDataModels(this, projectId);
  }

async createDataModelsFromUserEmail(userEmail: string) {
  if (!userEmail) throw new Error("Missing userEmail");

  // Find the user by email
  const users: any = await this.read(this.config, "nxf_users", { user_email: userEmail });
  if (!users || users.length === 0) throw new Error(`User not found: ${userEmail}`);
  const user = users[0];

  // Find the project for this user
  const projects: any = await this.read(this.config, "nxf_system_projects", { user_id: user.user_id });
  if (!projects || projects.length === 0) throw new Error(`No project found for user ${userEmail}`);
  const projectId = projects[0].project_id;

  return this.CreateDataModels(projectId);
}

///STORAGE ADAPTER
async setupStorageBuckets(): Promise<string[] | { success: boolean; buckets: string[] }> {
  try {
    const DEFAULT_BUCKETS = ["uploads", "avatars", "products", "reports"]; // adjust as needed

    for (const folder of DEFAULT_BUCKETS) {
      const storage_id = crypto.randomUUID();

      // Insert into nxf_storage if not exists
      const existing = await this.read(this.config, "nxf_storage", { folder });
      if (!existing || existing.length === 0) {
        await this.create(this.config, "nxf_storage", {
          storage_id,
          folder,
          file_name: "",   // placeholder
          file_path: folder, // just the folder path
          created_at: new Date()
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
