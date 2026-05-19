/**
 * Installer Steps Utility
 *
 * This file is the engine of the installation wizard. It defines every step
 * that must be completed to fully set up a new project, and provides the
 * runInstallerSteps() function that executes them in order.
 *
 * What "installation" means here:
 * ────────────────────────────────
 * When a user completes the setup wizard and clicks "Install", the app needs
 * to perform a sequence of backend operations — creating a database, setting
 * up an admin account, scaffolding a code project, writing config files, etc.
 * Each of these operations is an "installer step". This file owns that entire
 * sequence.
 *
 * How the step runner works:
 * ──────────────────────────
 * 1. INSTALL_STEPS is an array of step name strings that defines the order.
 * 2. runInstallerSteps() iterates over that array and uses a switch statement
 *    to call the correct async function for each step name.
 * 3. After each step completes successfully, it calls onProgress(stepIndex)
 *    so the installer UI can update its progress bar.
 * 4. If any step throws an error, runInstallerSteps() re-throws it with the
 *    step name included, so the UI can show the user exactly which step failed.
 *
 * All state (database config, admin user details, project name, etc.) is read
 * from the global Zustand installer store via useInstallerStore.getState().
 * This keeps the function signatures clean — callers don't need to pass
 * configuration down through every layer.
 *
 * Exports:
 *   - INSTALL_STEPS      : ordered array of step name strings.
 *   - runInstallerSteps  : runs all steps in sequence, reporting progress.
 *   - writeConfigFile    : exported separately so the UI can call it on demand.
 */

import { getTranslations }        from 'next-intl/server'
import { useInstallerStore }      from '../../../store/useInstallerStore'
import { createFlutterProject }   from './createFlutterProject'
import { createNextJSProject }    from './createNextProject'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * delay
 *
 * Returns a promise that resolves after the given number of milliseconds.
 * Used by stub/placeholder step functions (e.g. createApiEndpoints) to
 * simulate async work while those steps are not yet fully implemented.
 *
 * @param ms — Number of milliseconds to wait.
 *
 * Example:
 *   await delay(1000) // pauses execution for 1 second
 */
function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

// ---------------------------------------------------------------------------
// Individual installer step functions
// ---------------------------------------------------------------------------

/**
 * createDatabaseSchemaAndTables
 *
 * Calls the backend to create all required database tables for the project.
 * Reads the database configuration and selected project type from the
 * installer store and POSTs them to /api/create-system-tables.
 *
 * @throws If dbConfig is missing from the store, or if the API call fails.
 */
async function createDatabaseSchemaAndTables(): Promise<void> {
  //const t = await getTranslations('installerSteps')
  const { dbConfig, selectedProjectType } = useInstallerStore.getState()

  if (!dbConfig) throw new Error(('errors.dbConfigNotFound'))

  const response = await fetch('/api/create-system-tables', {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify({ config: dbConfig, selectedProjectType }),
  })

  if (!response.ok) {
    const err = await response.json()
    throw new Error('errors.createTablesFailed',  )
  }

  const data = await response.json()
  console.log(('logs.tablesCreated'), data)
  return data
}

/**
 * createAdminUser
 *
 * Creates the initial administrator account for the project by calling
 * /api/create-admin-user. The admin's credentials come from the installer
 * wizard and are stored in the installer store.
 *
 * @param dbConfig    — The database connection configuration object.
 * @param adminUser   — The admin user details (email, full name, password).
 * @param projectName — The name of the project being installed.
 * @param subdomain   — The subdomain assigned to this project.
 *
 * @throws If dbConfig or the admin email is missing, or if the API call fails.
 */
async function createAdminUser(
  dbConfig:    any,
  adminUser:   any,
  projectName: string,
  subdomain:   string,
): Promise<void> {
  //const t = await getTranslations('installerSteps')

  if (!dbConfig)          throw new Error(('errors.dbConfigMissing'))
  if (!adminUser?.email)  throw new Error(('errors.adminEmailMissing'))

  const response = await fetch('/api/create-admin-user', {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify({ config: dbConfig, adminUser, projectName, subdomain }),
  })

  if (!response.ok) {
    const err = await response.json()
    throw new Error(('errors.createAdminFailed'))
  }

  const data = await response.json()
  console.log(('logs.adminCreated'), data)
  return data
}

/**
 * createModels
 *
 * Calls the backend to generate the data models for the project based on the
 * selected project type and admin user. Reads all required values from the
 * installer store.
 *
 * Note: The admin user's password is included in the request body (defaulting
 * to an empty string if not set). Ensure this API route is called over HTTPS.
 *
 * @throws If dbConfig or the admin email is missing from the store, or if the
 *         API call fails.
 */
async function createModels(): Promise<any> {
  //const t = await getTranslations('installerSteps')
  const { adminUser, dbConfig, selectedProjectType } = useInstallerStore.getState()

  if (!dbConfig)         throw new Error(('errors.dbConfigMissingStore'))
  if (!adminUser?.email) throw new Error(('errors.adminEmailMissingStore'))

  const response = await fetch('/api/models/create-models', {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify({
      config:    dbConfig,
      adminUser: {
        email:    adminUser.email,
        fullName: adminUser.fullName,
        password: adminUser.password || '',
      },
      selectedProjectType,
    }),
  })

  if (!response.ok) {
    const err = await response.json()
    throw new Error(('errors.createModelsFailed'))
  }

  const data = await response.json()
  console.log(('logs.modelsCreated'), data)
  return data
}

/**
 * writeConfigFile
 *
 * Serialises the current installer store state into a config.json file on the
 * server by calling /api/write-config. This file is used by the generated app
 * at runtime to know its database, stack, and feature settings.
 *
 * Note: The admin password is intentionally excluded from the config payload —
 * only the email and full name are written, to avoid persisting credentials.
 *
 * Exported so the installer UI can also trigger a config write independently
 * of the full step sequence (e.g. for a "re-save config" action).
 *
 * @throws If the API call fails.
 */
export async function writeConfigFile(): Promise<any> {
 // const t     = await getTranslations('installerSteps')
  const store = useInstallerStore.getState()

  const response = await fetch('/api/write-config', {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify({
      projectName:         store.projectName,
      subdomain:           store.subdomain,
      selectedStack:       store.selectedStack,
      selectedDb:          store.selectedDb,
      dbConfig:            store.dbConfig,
      ecommerceEnabled:    store.ecommerceEnabled,
      demoContentEnabled:  store.demoContentEnabled,
      selectedProjectType: store.selectedProjectType,
      selectedPages:       store.selectedPages,
      models:              store.models,
      adminUser: {
        // Password deliberately omitted — never write credentials to config
        email:    store.adminUser.email,
        fullName: store.adminUser.fullName,
      },
    }),
  })

  if (!response.ok) {
    const err = await response.json()
    throw new Error(('errors.writeConfigFailed'))
  }

  const data = await response.json()
  console.log(('logs.configWritten'), data)
  return data
}

/**
 * setupStorage
 *
 * Calls the backend to create the required storage buckets (e.g. for file
 * uploads, media, and attachments) for the project. Reads the database
 * configuration from the installer store.
 *
 * @throws If dbConfig is missing from the store, or if the API call fails.
 */
async function setupStorage(): Promise<any> {
  //const t = await getTranslations('installerSteps')
  const { dbConfig } = useInstallerStore.getState()

  if (!dbConfig) throw new Error(('errors.dbConfigMissingStore'))

  const response = await fetch('/api/create-storage-buckets', {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify({ dbConfig }),
  })

  if (!response.ok) {
    const err = await response.json()
    throw new Error(('errors.setupStorageFailed'))
  }

  const data = await response.json()
  console.log(('logs.storageCreated'), data)
  return data
}

/**
 * installDemoContent
 *
 * Optionally installs demo/seed content into the project's database. This step
 * is skipped entirely if the user did not enable demo content in the installer
 * wizard (demoContentEnabled = false in the store).
 *
 * @throws If selectedProjectType is missing (required to know which demo data
 *         to install), or if the API call fails.
 *
 * @returns { skipped: true } if demo content was not enabled, otherwise the
 *          API response data.
 */
async function installDemoContent(): Promise<any> {
  //const t = await getTranslations('installerSteps')
  const { dbConfig, selectedProjectType, demoContentEnabled } = useInstallerStore.getState()

  // If the user did not opt in to demo content, skip this step gracefully
  if (!demoContentEnabled) {
    console.log(('logs.demoContentSkipped'))
    return { skipped: true }
  }

  if (!selectedProjectType) {
    throw new Error(('errors.projectTypeMissing'))
  }

  const response = await fetch('/api/install-demo-content', {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify({ config: dbConfig, selectedProjectType }),
  })

  if (!response.ok) {
    const err = await response.json()
    throw new Error(('errors.installDemoFailed'))
  }

  const data = await response.json()
  console.log(('logs.demoContentInstalled'), data)
  return data
}

// ---------------------------------------------------------------------------
// Stub / placeholder step functions
// ---------------------------------------------------------------------------

/**
 * The following functions are placeholder implementations for installer steps
 * that have not yet been fully built out. Each one logs its name and waits
 * 1 second to simulate async work, so the progress bar in the UI advances
 * naturally during development and testing.
 *
 * Replace the body of each function with a real API call when the backend
 * endpoint for that step is ready.
 */

/** Placeholder — will call the backend to register all project API endpoints. */
async function createApiEndpoints(): Promise<void> {
  //const t = await getTranslations('installerSteps')
  console.log(('logs.creatingApiEndpoints'))
  await delay(1000)
}

/** Placeholder — will configure authentication providers and settings. */
async function setupAuthSystem(): Promise<void> {
 // const t = await getTranslations('installerSteps')
  console.log(('logs.settingUpAuth'))
  await delay(1000)
}

/** Placeholder — will configure session management (timeouts, storage, etc.). */
async function configureSession(): Promise<void> {
  //const t = await getTranslations('installerSteps')
  console.log(('logs.configuringSession'))
  await delay(1000)
}

/** Placeholder — will run automated checks to verify the installation. */
async function runTests(): Promise<void> {
  //const t = await getTranslations('installerSteps')
  console.log(('logs.runningTests'))
  await delay(1000)
}

/** Placeholder — will perform final cleanup and mark the install as complete. */
async function finalizeInstaller(): Promise<void> {
  //const t = await getTranslations('installerSteps')
  console.log(('logs.finalizing'))
  await delay(1000)
}

// ---------------------------------------------------------------------------
// Installer step sequence
// ---------------------------------------------------------------------------

/**
 * INSTALL_STEPS
 *
 * The ordered list of installer step names. Each string is both the human-
 * readable label shown in the installer UI progress list AND the key used by
 * the switch statement inside runInstallerSteps() to dispatch to the correct
 * function.
 *
 * IMPORTANT: If you rename a step here, you must also update the matching
 * case label in the switch statement inside runInstallerSteps() below,
 * otherwise that step will fall through to the default branch and be skipped.
 *
 * To add a new step:
 *   1. Add the step name string to this array at the desired position.
 *   2. Write the async step function above.
 *   3. Add a matching case in the switch statement below.
 */
export const INSTALL_STEPS: string[] = [
  'Installing Flutter project',
  'Installing Next.js project',
  'Creating database schema and tables',
  'Creating admin user',
  'Creating data models',
  'Writing config.json file',
  'Setting up storage',
  'Setting up authentication system',
  'Configuring session management',
  'Creating API endpoints',
  'Installing demo content',
  'Running tests to verify installation',
  'Finalizing installer and cleanup',
]

// ---------------------------------------------------------------------------
// Step runner
// ---------------------------------------------------------------------------

/**
 * runInstallerSteps
 *
 * Executes every installer step in the order defined by INSTALL_STEPS,
 * reporting progress after each successful step.
 *
 * Steps:
 * 1. Reads the installer store once to get the values needed for step dispatch
 *    (stack selection, project name, subdomain, etc.).
 * 2. Iterates over INSTALL_STEPS by index.
 * 3. For each step, uses a switch statement to call the correct async function.
 * 4. Some steps are conditional (e.g. Flutter is only run if the selected stack
 *    includes Flutter) — these are handled with if-guards inside the case.
 * 5. After each step completes without error, calls onProgress(i + 1) so the
 *    UI can advance its progress bar.
 * 6. If any step throws, the error is caught and re-thrown with the failing
 *    step name prepended, giving the UI a clear failure message.
 *
 * @param onProgress — Callback invoked after each step completes successfully.
 *                     Receives the 1-based index of the step just completed
 *                     (e.g. 1 after step 0, 2 after step 1, etc.).
 *                     Use this to update a progress bar or step indicator.
 *
 * @throws An Error whose message includes the name of the step that failed
 *         and the underlying error message, e.g.:
 *         "Step failed: Creating admin user - Admin user email is missing"
 */
export async function runInstallerSteps(
  onProgress: (stepIndex: number) => void,
): Promise<void> {
 // const t = await getTranslations('installerSteps')
  const { dbConfig, adminUser, selectedStack, projectName, subdomain } =
    useInstallerStore.getState()

  for (let i = 0; i < INSTALL_STEPS.length; i++) {
    const step = INSTALL_STEPS[i]

    try {
      switch (step) {

        /**
         * Scaffold a Flutter project — only runs if the user selected Flutter
         * or the "both" stack option in the installer wizard.
         */
        case 'Installing Flutter project':
          console.log('INSTALLING FLUTTER')
          if (selectedStack === 'flutter' || selectedStack === 'both') {
            await createFlutterProject(projectName)
          }
          console.log('INSTALLING FLUTTER COMPLETED')
          break

        /**
         * Scaffold a Next.js project — only runs if the user selected Next.js
         * or the "both" stack option.
         */
        case 'Installing Next.js project':
           console.log('INSTALLING NEXTJS')
          if (selectedStack === 'next' || selectedStack === 'both') {
            await createNextJSProject(projectName)
          }
           console.log('INSTALLING NEXTJS COMPLETED')
          break

        /** Create all required database tables for the project. */
        case 'Creating database schema and tables':
          await createDatabaseSchemaAndTables()
          break

        /** Create the initial administrator account. */
        case 'Creating admin user':
          await createAdminUser(dbConfig, adminUser, projectName, subdomain)
          break

        /**
         * Generate data models. If the server reports the step was skipped
         * (e.g. models already exist), log it and continue — this is not
         * an error.
         */
        case 'Creating data models': {
          const modelsResult = await createModels()
          if (modelsResult.skipped) {
            console.log(('logs.modelsSkipped'))
          }
          break
        }

        /** Serialise and write the project config.json to disk on the server. */
        case 'Writing config.json file':
          await writeConfigFile()
          break

        /** Create storage buckets for file uploads and media. */
        case 'Setting up storage':
          await setupStorage()
          break

        /** Placeholder — register all project API endpoints. */
        case 'Creating API endpoints':
          await createApiEndpoints()
          break

        /** Placeholder — configure authentication providers and settings. */
        case 'Setting up authentication system':
          await setupAuthSystem()
          break

        /** Placeholder — configure session management. */
        case 'Configuring session management':
          await configureSession()
          break

        /**
         * Optionally install demo/seed content. If the user did not enable
         * demo content in the wizard, this step self-skips gracefully.
         */
        case 'Installing demo content':
          await installDemoContent()
          break

        /** Placeholder — run automated verification tests. */
        case 'Running tests to verify installation':
          await runTests()
          break

        /** Placeholder — final cleanup and install completion. */
        case 'Finalizing installer and cleanup':
          await finalizeInstaller()
          break

        /**
         * Safety net: if a step name exists in INSTALL_STEPS but has no
         * matching case, log a warning and wait briefly rather than silently
         * doing nothing or crashing.
         */
        default:
          console.warn(('logs.noImplementation'))
          await delay(500)
      }

      // Step completed successfully — advance the UI progress indicator
      onProgress(i + 1)

    } catch (error: any) {
      /**
       * Re-throw with the step name prepended so the installer UI can show
       * the user exactly which step failed, e.g.:
       * "Step failed: Creating admin user - Admin user email is missing"
       */
      throw new Error(('errors.stepFailed'))
    }
  }
}