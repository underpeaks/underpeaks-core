// lib/db-adapter/adapters/postgres-adapter.ts
import { Client } from 'pg';
import { DBAdapter, DBConfig } from '../types';

export class PostgresAdapter implements DBAdapter {
  constructor(private config: DBConfig) {}

  async testConnection(): Promise<{ success: boolean; message: string }> {
    const client = new Client({
      host: this.config.host,
      port: this.config.port ? Number(this.config.port) : 5432,
      user: this.config.user,
      password: this.config.password,
      database: this.config.database,
    });

    try {
      await client.connect();
      await client.end();
      return { success: true, message: 'Connected to PostgreSQL successfully.' };
    } catch (err: any) {
      return { success: false, message: err.message || 'Failed to connect to PostgreSQL.' };
    }
  }

  async create(config: DBConfig, table: string, data: any): Promise<any> {
    const client = new Client({
      host: config.host,
      port: config.port ? Number(config.port) : 5432,
      user: config.user,
      password: config.password,
      database: config.database,
    });

    const keys = Object.keys(data);
    const values = Object.values(data);
    const placeholders = keys.map((_, i) => `$${i + 1}`).join(', ');

    const query = `INSERT INTO ${table} (${keys.join(', ')}) VALUES (${placeholders}) RETURNING *`;

    try {
      await client.connect();
      const result = await client.query(query, values);
      return result.rows[0];
    } finally {
      await client.end();
    }
  }

  async read(config: DBConfig, table: string, query?: string): Promise<any> {
    const client = new Client({
      host: config.host,
      port: config.port ? Number(config.port) : 5432,
      user: config.user,
      password: config.password,
      database: config.database,
    });

    try {
      await client.connect();
      const result = await client.query(query || `SELECT * FROM ${table}`);
      return result.rows;
    } finally {
      await client.end();
    }
  }

  async update(config: DBConfig, table: string, id: string, data: any): Promise<any> {
    const client = new Client({
      host: config.host,
      port: config.port ? Number(config.port) : 5432,
      user: config.user,
      password: config.password,
      database: config.database,
    });

    const keys = Object.keys(data);
    const values = Object.values(data);
    const setClause = keys.map((key, i) => `${key} = $${i + 1}`).join(', ');

    const query = `UPDATE ${table} SET ${setClause} WHERE id = $${keys.length + 1} RETURNING *`;

    try {
      await client.connect();
      const result = await client.query(query, [...values, id]);
      return result.rows[0];
    } finally {
      await client.end();
    }
  }

  async delete(config: DBConfig, table: string, id: string): Promise<any> {
    const client = new Client({
      host: config.host,
      port: config.port ? Number(config.port) : 5432,
      user: config.user,
      password: config.password,
      database: config.database,
    });

    const query = `DELETE FROM ${table} WHERE id = $1 RETURNING *`;

    try {
      await client.connect();
      const result = await client.query(query, [id]);
      return result.rows[0];
    } finally {
      await client.end();
    }
  }
}
