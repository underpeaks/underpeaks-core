// lib/db-adapter/adapters/planetscale-adapter.ts
import { DBAdapter, DBConfig } from '../types';
import { connect, Connection } from '@planetscale/database';

export class PlanetScaleAdapter implements DBAdapter {
  private connection: Connection;

  constructor(private config: DBConfig) {
    this.connection = connect({
      host: config.host,
      username: config.user,
      password: config.password,
    });
  }

  async testConnection(): Promise<{ success: boolean; message: string }> {
    try {
      const result = await this.connection.execute('SELECT 1');
      return {
        success: true,
        message: 'Successfully connected to PlanetScale.',
      };
    } catch (error: any) {
      return {
        success: false,
        message: error.message || 'Failed to connect to PlanetScale.',
      };
    }
  }

  async create(config: DBConfig, table: string, data: any): Promise<any> {
    const keys = Object.keys(data).join(', ');
    const placeholders = Object.keys(data)
      .map(() => '?')
      .join(', ');
    const values = Object.values(data);

    const query = `INSERT INTO ${table} (${keys}) VALUES (${placeholders})`;
    const result = await this.connection.execute(query, values);
    return result;
  }

  async read(config: DBConfig, table: string, query?: string): Promise<any> {
    const sql = query || `SELECT * FROM ${table}`;
    const result = await this.connection.execute(sql);
    return result.rows;
  }

  async update(config: DBConfig, table: string, id: string, data: any): Promise<any> {
    const setClause = Object.keys(data)
      .map(key => `${key} = ?`)
      .join(', ');
    const values = [...Object.values(data), id];
    const query = `UPDATE ${table} SET ${setClause} WHERE id = ?`;
    const result = await this.connection.execute(query, values);
    return result;
  }

  async delete(config: DBConfig, table: string, id: string): Promise<any> {
    const query = `DELETE FROM ${table} WHERE id = ?`;
    const result = await this.connection.execute(query, [id]);
    return result;
  }
}
