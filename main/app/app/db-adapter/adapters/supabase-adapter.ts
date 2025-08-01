// lib/db-adapter/adapters/supabase-adapter.ts

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { DBAdapter, DBConfig } from '../types';

export class SupabaseAdapter implements DBAdapter {
  private client: SupabaseClient;

  constructor(private config: DBConfig) {
    if (!config.url || !config.anonKey) {
      throw new Error('Supabase URL and anonKey are required');
    }

    this.client = createClient(config.url, config.anonKey);
  }

  async testConnection(): Promise<{ success: boolean; message: string }> {
    try {
      const response = await fetch(`${this.config.url}/rest/v1/?limit=1`, {
        headers: {
          apikey: this.config.anonKey,
          Authorization: `Bearer ${this.config.anonKey}`,
        },
      });

      if (!response.ok) {
        return {
          success: false,
          message: `Connection failed: Supabase responded with status ${response.status}`,
        };
      }

      return { success: true, message: 'Connected to Supabase successfully.' };
    } catch (error: any) {
      return {
        success: false,
        message: error.message || 'Failed to connect to Supabase.',
      };
    }
  }

  async create(config: DBConfig, table: string, data: any): Promise<any> {
    const { data: inserted, error } = await this.client.from(table).insert(data);
    if (error) throw error;
    return inserted;
  }

  async read(config: DBConfig, table: string, query?: any): Promise<any> {
    let qb = this.client.from(table).select('*');

    // You can expand this query logic if needed:
    if (query) {
      Object.entries(query).forEach(([key, value]) => {
        qb = qb.eq(key, value as string);
      });
    }

    const { data, error } = await qb;
    if (error) throw error;
    return data;
  }

  async update(config: DBConfig, table: string, id: string, data: any): Promise<any> {
    const { data: updated, error } = await this.client.from(table).update(data).eq('id', id);
    if (error) throw error;
    return updated;
  }

  async delete(config: DBConfig, table: string, id: string): Promise<any> {
    const { data: deleted, error } = await this.client.from(table).delete().eq('id', id);
    if (error) throw error;
    return deleted;
  }
}
