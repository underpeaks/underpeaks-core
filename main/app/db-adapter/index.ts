/**
 * index.ts — Database Adapter Factory
 *
 * This module is the single entry point for obtaining a database adapter
 * instance. It follows the Factory pattern: the caller says which database
 * type they need, and this function returns the correct adapter object —
 * without the caller needing to know which class to import or how to
 * instantiate it.
 *
 * ─── What is an adapter? ──────────────────────────────────────────────────
 *
 * An adapter is a class that wraps a specific database driver (e.g. the
 * Supabase JS client, the MongoDB Node.js driver) and exposes a consistent
 * interface defined by the DBAdapter type. This means the rest of the
 * application can call methods like `adapter.create()` or
 * `adapter.createTable()` without caring whether the underlying database
 * is Postgres, MongoDB, or anything else.
 *
 * ─── Supported database types ─────────────────────────────────────────────
 *
 * | DBType     | Adapter class      |
 * |------------|--------------------|
 * | postgres   | PostgresAdapter    |
 * | mysql      | MySQLAdapter       |
 * | mongodb    | MongoDBAdapter     |
 * | firebase   | FirebaseAdapter    |
 * | supabase   | SupabaseAdapter    |
 *
 * ─── How to add a new adapter ─────────────────────────────────────────────
 *
 * 1. Create a new adapter class in `./adapters/` that implements DBAdapter.
 * 2. Import it at the top of this file.
 * 3. Add a new `case` to the switch statement below.
 * 4. Add the new type string to the DBType union in `./types`.
 *
 * ─── Exports ──────────────────────────────────────────────────────────────
 *
 * getAdapter(type, config)
 *   Returns the correct DBAdapter instance for the given database type.
 */

import { DBConfig, DBAdapter, DBType } from './types';
import { PostgresAdapter }             from './adapters/postgres-adapter';
import { MongoDBAdapter }              from './adapters/mongodb-adapter';
import { FirebaseAdapter }             from './adapters/firebase-adapter';
import { SupabaseAdapter }             from './adapters/supabase-adapter';
import { MySQLAdapter }                from './adapters/mysql-adapter';

/**
 * getAdapter
 *
 * Factory function that instantiates and returns the correct database adapter
 * for the given `type`. The returned adapter implements the shared DBAdapter
 * interface, so all callers can use it the same way regardless of the
 * underlying database technology.
 *
 * ─── Usage example ────────────────────────────────────────────────────────
 *
 *   const adapter = getAdapter('supabase', config);
 *   await adapter.create(config, 'nxf_users', { email: '...' });
 *
 * ─── Error handling ───────────────────────────────────────────────────────
 *
 * If an unrecognised `type` is passed, the function throws immediately with
 * a descriptive error. This is intentional — an unknown DB type means
 * something is misconfigured and should be caught as early as possible
 * rather than failing silently later during a database call.
 *
 * @param type   - The database type identifier. Must match one of the
 *                 supported DBType values: 'postgres', 'mysql', 'mongodb',
 *                 'firebase', or 'supabase'.
 * @param config - The database connection configuration object. Passed
 *                 directly to the adapter's constructor so it can establish
 *                 a connection when needed.
 *
 * @returns A DBAdapter instance ready to use for database operations.
 *
 * @throws If `type` does not match any supported database type.
 */
export function getAdapter(type: DBType, config: DBConfig): DBAdapter {
  switch (type) {

    /**
     * PostgreSQL — A powerful open-source relational database.
     * Adapter handles connection pooling and raw SQL via the `pg` driver.
     */
    case 'postgres':
      return new PostgresAdapter(config);

    /**
     * MySQL — A widely-used open-source relational database.
     * Adapter uses the `mysql2` driver under the hood.
     */
    case 'mysql':
      return new MySQLAdapter(config);

    /**
     * MongoDB — A document-oriented NoSQL database.
     * Adapter uses the official `mongodb` Node.js driver.
     */
    case 'mongodb':
      return new MongoDBAdapter(config);

    /**
     * Firebase — Google's cloud-hosted NoSQL database (Firestore).
     * Adapter wraps the Firebase Admin SDK.
     */
    case 'firebase':
      return new FirebaseAdapter(config);

    /**
     * Supabase — An open-source Firebase alternative built on PostgreSQL.
     * Adapter uses the `@supabase/supabase-js` client library.
     */
    case 'supabase':
      return new SupabaseAdapter(config);

    /**
     * Unrecognised type — throw immediately.
     * The `type` value is included in the error message so the developer
     * can see exactly what was passed in and fix the configuration.
     */
    default:
      throw new Error(`Unsupported DB type: ${type}`);
  }
}