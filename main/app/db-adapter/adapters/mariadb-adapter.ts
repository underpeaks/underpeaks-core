// lib/db-adapter/adapters/mariadb-adapter.ts


///NOT CURRENTLY IN PRODUCTION


import mariadb, { Pool, PoolConnection } from 'mariadb';
import { DBAdapter, DBConfig } from '../types';

export class MariaDBAdapter implements DBAdapter {
  private pool: Pool;

  constructor(private config: DBConfig) {
    this.pool = mariadb.createPool({
      host: config.host,
      port: typeof config.port === 'string' ? parseInt(config.port) : config.port,
      user: config.user,
      password: config.password,
      database: config.database,
      connectionLimit: 5,
    });
  }

  async testConnection(): Promise<{ success: boolean; message: string }> {
    let conn: PoolConnection | undefined;
    try {
      conn = await this.pool.getConnection();
      await conn.query('SELECT 1');
      return { success: true, message: 'Connected to MariaDB successfully.' };
    } catch (error: any) {
      return { success: false, message: error.message || 'Failed to connect to MariaDB.' };
    } finally {
      if (conn) conn.release();
    }
  }

  async create(config: DBConfig, table: string, data: any): Promise<any> {
    let conn: PoolConnection | undefined;
    try {
      conn = await this.pool.getConnection();
      const keys = Object.keys(data).join(', ');
      const placeholders = Object.keys(data).map(() => '?').join(', ');
      const values = Object.values(data);

      const query = `INSERT INTO ${table} (${keys}) VALUES (${placeholders})`;
      const res = await conn.query(query, values);
      return res;
    } finally {
      if (conn) conn.release();
    }
  }

  async read(config: DBConfig, table: string, query?: string): Promise<any> {
    let conn: PoolConnection | undefined;
    try {
      conn = await this.pool.getConnection();
      const sql = query || `SELECT * FROM ${table}`;
      const rows = await conn.query(sql);
      return rows;
    } finally {
      if (conn) conn.release();
    }
  }

  async update(config: DBConfig, table: string, id: string, data: any): Promise<any> {
    let conn: PoolConnection | undefined;
    try {
      conn = await this.pool.getConnection();
      const setClause = Object.keys(data)
        .map(key => `${key} = ?`)
        .join(', ');
      const values = [...Object.values(data), id];

      const query = `UPDATE ${table} SET ${setClause} WHERE id = ?`;
      const res = await conn.query(query, values);
      return res;
    } finally {
      if (conn) conn.release();
    }
  }

  async delete(config: DBConfig, table: string, id: string): Promise<any> {
    let conn: PoolConnection | undefined;
    try {
      conn = await this.pool.getConnection();
      const query = `DELETE FROM ${table} WHERE id = ?`;
      const res = await conn.query(query, [id]);
      return res;
    } finally {
      if (conn) conn.release();
    }
  }
}
