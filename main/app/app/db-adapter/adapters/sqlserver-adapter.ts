// lib/db-adapter/adapters/sqlserver-adapter.ts
import sql from 'mssql';
import { DBAdapter, DBConfig } from '../types';

export class SQLServerAdapter implements DBAdapter {
  constructor(private config: DBConfig) {}

  private getConnectionPool() {
    return new sql.ConnectionPool({
      user: this.config.user!,
      password: this.config.password!,
      server: this.config.host!,
      database: this.config.database!,
      port: this.config.port ? Number(this.config.port) : 1433,
      options: {
        encrypt: false, // set to true if you're using Azure
        trustServerCertificate: true,
      },
    });
  }

  async testConnection(): Promise<{ success: boolean; message: string }> {
    try {
      const pool = await this.getConnectionPool().connect();
      await pool.close();
      return { success: true, message: 'Connected to SQL Server successfully.' };
    } catch (err: any) {
      return { success: false, message: err.message || 'Failed to connect to SQL Server.' };
    }
  }

  async create(config: DBConfig, table: string, data: any): Promise<any> {
    const pool = await this.getConnectionPool().connect();
    const keys = Object.keys(data);
    const values = Object.values(data);
    const placeholders = keys.map((_, i) => `@param${i}`).join(', ');

    const request = pool.request();
    keys.forEach((key, i) => {
      request.input(`param${i}`, values[i]);
    });

    const query = `INSERT INTO [${table}] (${keys.join(', ')}) VALUES (${placeholders})`;
    const result = await request.query(query);
    await pool.close();
    return result;
  }

  async read(config: DBConfig, table: string, customQuery?: string): Promise<any> {
    const pool = await this.getConnectionPool().connect();
    const query = customQuery || `SELECT * FROM [${table}]`;
    const result = await pool.request().query(query);
    await pool.close();
    return result.recordset;
  }

  async update(config: DBConfig, table: string, id: string, data: any): Promise<any> {
    const pool = await this.getConnectionPool().connect();
    const keys = Object.keys(data);
    const values = Object.values(data);

    const setClause = keys.map((key, i) => `[${key}] = @param${i}`).join(', ');
    const request = pool.request();
    keys.forEach((key, i) => {
      request.input(`param${i}`, values[i]);
    });

    request.input('id', id);
    const query = `UPDATE [${table}] SET ${setClause} WHERE id = @id`;

    const result = await request.query(query);
    await pool.close();
    return result;
  }

  async delete(config: DBConfig, table: string, id: string): Promise<any> {
    const pool = await this.getConnectionPool().connect();
    const result = await pool
      .request()
      .input('id', id)
      .query(`DELETE FROM [${table}] WHERE id = @id`);
    await pool.close();
    return result;
  }
}
