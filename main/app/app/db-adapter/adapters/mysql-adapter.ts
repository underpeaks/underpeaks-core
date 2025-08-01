// lib/db-adapter/adapters/mysql-adapter.ts
import mysql from 'mysql2/promise';
import { DBAdapter, DBConfig } from '../types';

export class MySQLAdapter implements DBAdapter {
  constructor(private config: DBConfig) {}

  async testConnection(): Promise<{ success: boolean; message: string }> {
    try {
      const connection = await mysql.createConnection({
        host: this.config.host,
        port: this.config.port ? Number(this.config.port) : 3306,
        user: this.config.user,
        password: this.config.password,
        database: this.config.database,
      });
      await connection.end();
      return { success: true, message: 'Connected to MySQL successfully.' };
    } catch (err: any) {
      return { success: false, message: err.message || 'Failed to connect to MySQL.' };
    }
  }

  async create(config: DBConfig, table: string, data: any): Promise<any> {
    const connection = await mysql.createConnection({
      host: config.host,
      port: config.port ? Number(config.port) : 3306,
      user: config.user,
      password: config.password,
      database: config.database,
    });

    const keys = Object.keys(data);
    const values = Object.values(data);
    const placeholders = keys.map(() => '?').join(', ');
    const query = `INSERT INTO \`${table}\` (${keys.join(', ')}) VALUES (${placeholders})`;

    try {
      const [result] = await connection.execute(query, values);
      return result;
    } finally {
      await connection.end();
    }
  }

  async read(config: DBConfig, table: string, customQuery?: string): Promise<any> {
    const connection = await mysql.createConnection({
      host: config.host,
      port: config.port ? Number(config.port) : 3306,
      user: config.user,
      password: config.password,
      database: config.database,
    });

    const query = customQuery || `SELECT * FROM \`${table}\``;

    try {
      const [rows] = await connection.execute(query);
      return rows;
    } finally {
      await connection.end();
    }
  }

  async update(config: DBConfig, table: string, id: string, data: any): Promise<any> {
    const connection = await mysql.createConnection({
      host: config.host,
      port: config.port ? Number(config.port) : 3306,
      user: config.user,
      password: config.password,
      database: config.database,
    });

    const keys = Object.keys(data);
    const values = Object.values(data);
    const setClause = keys.map(key => `\`${key}\` = ?`).join(', ');
    const query = `UPDATE \`${table}\` SET ${setClause} WHERE id = ?`;

    try {
      const [result] = await connection.execute(query, [...values, id]);
      return result;
    } finally {
      await connection.end();
    }
  }

  async delete(config: DBConfig, table: string, id: string): Promise<any> {
    const connection = await mysql.createConnection({
      host: config.host,
      port: config.port ? Number(config.port) : 3306,
      user: config.user,
      password: config.password,
      database: config.database,
    });

    const query = `DELETE FROM \`${table}\` WHERE id = ?`;

    try {
      const [result] = await connection.execute(query, [id]);
      return result;
    } finally {
      await connection.end();
    }
  }
}
