/**
 * writeConfigFromStore.ts
 *
 * A server-side utility that serialises the current installer wizard state
 * into a JSON configuration file on disk.
 *
 * ─── What it does ─────────────────────────────────────────────────────────
 *
 * When a user completes the installation wizard, all their choices (project
 * name, database type, enabled features, admin details, etc.) live in the
 * installer Zustand store. This function takes that store snapshot and writes
 * it to `nxt_flutter.config.json` in the project root so that:
 *
 * - The application can read its own configuration on startup.
 * - Other setup steps (table creation, seeding, etc.) know which options
 *   were selected without having to re-ask the user.
 *
 * ─── Config file location ─────────────────────────────────────────────────
 *
 * The file is always written to:
 *   <project root>/nxt_flutter.config.json
 *
 * `process.cwd()` returns the directory from which the Node.js process was
 * started, which in a Next.js project is always the project root.
 *
 * ─── Environment variable precedence ─────────────────────────────────────
 *
 * For database configuration, environment variables take priority over the
 * store values. This allows deployment environments (e.g. Docker, CI) to
 * override whatever the user selected in the wizard:
 *
 *   DB_TYPE    → overrides store.selectedDb for the `type` field.
 *   DB_URL     → reserved for future use (read but not yet written to config).
 *   DB_ANON_KEY → reserved for future use (read but not yet written to config).
 *
 * ─── Security note ────────────────────────────────────────────────────────
 *
 * The admin user's password is intentionally excluded from the config file.
 * Only `fullName` and `email` are written. Sensitive credentials must never
 * be stored in plain-text config files.
 *
 * ─── Exports ──────────────────────────────────────────────────────────────
 *
 * writeConfigFromStore(store)
 *   Writes the config file and returns the file path on success.
 */

import { InstallerState } from "@/app/store/useInstallerStore";
import fs from "fs";
import path from "path";

// ---------------------------------------------------------------------------
// Environment variables
// ---------------------------------------------------------------------------

/**
 * Pull database-related environment variables at module load time.
 *
 * - DB_TYPE     — The database adapter type (e.g. 'supabase', 'postgres').
 *                 When set, this overrides the user's selection from the wizard.
 * - DB_URL      — The database connection URL. Read here for future use.
 * - DB_ANON_KEY — The anonymous/public API key for services like Supabase.
 *                 Read here for future use.
 */
const { DB_TYPE, DB_URL, DB_ANON_KEY } = process.env;

// ---------------------------------------------------------------------------
// writeConfigFromStore
// ---------------------------------------------------------------------------

/**
 * writeConfigFromStore
 *
 * Serialises the installer store state into `nxt_flutter.config.json` and
 * writes it to the project root directory.
 *
 * ─── What gets written ────────────────────────────────────────────────────
 *
 * | Config field          | Source                                          |
 * |-----------------------|-------------------------------------------------|
 * | projectName           | store.projectName                               |
 * | subdomain             | store.subdomain                                 |
 * | selectedStack         | store.selectedStack                             |
 * | selectedDb            | store.selectedDb                                |
 * | deploymentType        | hardcoded to 'self-hosted'                      |
 * | dbConfig.type         | DB_TYPE env var → store.selectedDb → 'supabase' |
 * | faviconUrl            | hardcoded to the default favicon path           |
 * | ecommerceEnabled      | store.ecommerceEnabled                          |
 * | demoContentEnabled    | store.demoContentEnabled                        |
 * | selectedPages         | store.selectedPages                             |
 * | models                | store.models                                    |
 * | adminUser.fullName    | store.adminUser.fullName                        |
 * | adminUser.email       | store.adminUser.email                           |
 * | featureFlags          | mirrors ecommerce + demoContent enabled flags   |
 * | selectedProjectType   | store.selectedProjectType                       |
 *
 * Note: adminUser.password is deliberately omitted for security.
 *
 * @param store - A snapshot of the installer Zustand store containing all
 *                user selections made during the setup wizard.
 *
 * @returns An object containing:
 *   - success  {boolean} — Always true if no error is thrown.
 *   - filePath {string}  — The absolute path to the written config file.
 *
 * @throws If the file cannot be written (e.g. permission error, disk full).
 */
export async function writeConfigFromStore(store: InstallerState) {
  // -------------------------------------------------------------------------
  // Step 1: Resolve the output file path
  // -------------------------------------------------------------------------

  /**
   * Always write to the project root. `process.cwd()` in a Next.js app
   * reliably returns the directory containing `package.json`.
   */
  const rootDir  = process.cwd();
  const filePath = path.join(rootDir, "nxt_flutter.config.json");

  // -------------------------------------------------------------------------
  // Step 2: Build the config object
  // -------------------------------------------------------------------------

  /**
   * Assemble the configuration from the store and environment variables.
   *
   * dbConfig.type uses a fallback chain:
   *   1. DB_TYPE environment variable (deployment override).
   *   2. store.selectedDb (user's choice from the wizard).
   *   3. 'supabase' (safe default if neither is set).
   */
  const config = {
    projectName:         store.projectName,
    subdomain:           store.subdomain,
    selectedStack:       store.selectedStack,
    selectedDb:          store.selectedDb,
    deploymentType:      "self-hosted",
    dbConfig: {
      type: DB_TYPE || store.selectedDb || "supabase",
    },
    faviconUrl:          '/images/favicon/NXT_Flutter_favicon.png',
    ecommerceEnabled:    store.ecommerceEnabled,
    demoContentEnabled:  store.demoContentEnabled,
    selectedPages:       store.selectedPages,
    models:              store.models,

    /**
     * adminUser — Only non-sensitive fields are persisted to disk.
     * The password is intentionally excluded and must never be written here.
     */
    adminUser: {
      fullName: store.adminUser.fullName,
      email:    store.adminUser.email,
    },

    /**
     * featureFlags — A convenience mirror of the boolean feature toggles.
     * Stored separately so consumers can check flags without knowing the
     * full store shape.
     */
    featureFlags: {
      ecommerce:   store.ecommerceEnabled,
      demoContent: store.demoContentEnabled,
    },

    selectedProjectType: store.selectedProjectType,
    installed:store.installed
  };

  // -------------------------------------------------------------------------
  // Step 3: Write to disk
  // -------------------------------------------------------------------------

  /**
   * `JSON.stringify` with `null, 2` produces human-readable indented JSON,
   * making it easy to inspect the file manually during development.
   * `utf-8` encoding ensures consistent file handling across platforms.
   */
  fs.writeFileSync(filePath, JSON.stringify(config, null, 2), "utf-8");

  // -------------------------------------------------------------------------
  // Step 4: Return result
  // -------------------------------------------------------------------------

  /**
   * Return the file path alongside the success flag so the caller can log
   * or display where the config was written without re-computing the path.
   */
  return { success: true, filePath };
}