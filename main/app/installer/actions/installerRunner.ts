import { useInstallerStore } from '../../store/useInstallerStore';
import { createFlutterProject } from './createFlutterProject';
import { createNextJSProject } from './createNextProject';

// Helper delay
function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// -----------------------------
// Installer Step Functions
// -----------------------------
async function createDatabaseSchemaAndTables() {
  const { dbConfig } = useInstallerStore.getState();
  if (!dbConfig) throw new Error('Database configuration not found.');

  const response = await fetch('/api/create-system-tables', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ config: dbConfig }),
  });

  if (!response.ok) {
    const err = await response.json();
    throw new Error(`Failed to create tables: ${err.message || response.statusText}`);
  }

  const data = await response.json();
  console.log('Tables created:', data);
  return data;
}

async function createAdminUser(dbConfig: any, adminUser: any, projectName: string, subdomain: string) {
  console.log(adminUser);
  if (!dbConfig) throw new Error('DB config is missing');
  if (!adminUser?.email) throw new Error('Admin user email is missing');

  const response = await fetch('/api/create-admin-user', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ config: dbConfig, adminUser, projectName, subdomain }),
  });

  if (!response.ok) {
    const err = await response.json();
    throw new Error(`Failed to create admin user: ${err.message || response.statusText}`);
  }

  const data = await response.json();
  console.log('Admin user created:', data);
  return data;
}

async function createModels() {
  const { adminUser, dbConfig } = useInstallerStore.getState();

  if (!dbConfig) throw new Error('DB config missing in store');
  if (!adminUser?.email) throw new Error('Admin user email missing in store');

  const response = await fetch('/api/create-models', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      config: dbConfig,
      adminUser: {
        email: adminUser.email,
        fullName: adminUser.fullName,
        password: adminUser.password || ''
      }
    }),
  });

  if (!response.ok) {
    const err = await response.json();
    throw new Error(`Failed to create models: ${err.message || response.statusText}`);
  }

  const data = await response.json();
  console.log('Create models response:', data);
  return data;
}

export async function writeConfigFile() {
  const store = useInstallerStore.getState();

  const response = await fetch('/api/write-config', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      projectName: store.projectName,
      subdomain: store.subdomain,
      selectedStack: store.selectedStack,
      selectedDb: store.selectedDb,
      dbConfig: store.dbConfig,
      ecommerceEnabled: store.ecommerceEnabled,
      demoContentEnabled: store.demoContentEnabled,
      selectedPages: store.selectedPages,
      models: store.models,
      adminUser: {
        email: store.adminUser.email,
        fullName: store.adminUser.fullName,
      },
    }),
  });

  if (!response.ok) {
    const err = await response.json();
    throw new Error(`Failed to write config file: ${err.message || response.statusText}`);
  }

  const data = await response.json();
  console.log('Config file written successfully:', data);
  return data;
}

async function setupStorage() {
  const { dbConfig } = useInstallerStore.getState();
  if (!dbConfig) throw new Error('DB config missing in store');

  const response = await fetch('/api/create-storage-buckets', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ dbConfig }),
  });

  if (!response.ok) {
    const err = await response.json();
    throw new Error(`Failed to setup storage: ${err.message || response.statusText}`);
  }

  const data = await response.json();
  console.log('Storage buckets created:', data);
  return data;
}

// Dummy implementations for other installer steps
async function createApiEndpoints() { console.log('Creating API endpoints...'); await delay(1000); }
async function setupAuthSystem() { console.log('Setting up authentication...'); await delay(1000); }
async function configureSession() { console.log('Configuring session management...'); await delay(1000); }
async function installDemoContent() { console.log('Installing demo content...'); await delay(1000); }
async function runTests() { console.log('Running tests...'); await delay(1000); }
async function finalizeInstaller() { console.log('Finalizing installer...'); await delay(1000); }

// -----------------------------
// Installer Step Sequence
// -----------------------------
export const INSTALL_STEPS = [
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
];

export async function runInstallerSteps(onProgress: (stepIndex: number) => void): Promise<void> {
  const { dbConfig, adminUser, selectedStack, projectName, subdomain } = useInstallerStore.getState();

  for (let i = 0; i < INSTALL_STEPS.length; i++) {
    const step = INSTALL_STEPS[i];

    try {
      switch (step) {
        case 'Installing Flutter project':
          if (selectedStack === 'flutter' || selectedStack === 'both') {
            await createFlutterProject(projectName);
          }
          break;

        case 'Installing Next.js project':
          if (selectedStack === 'next' || selectedStack === 'both') {
            await createNextJSProject(projectName);
          }
          break;

        case 'Creating database schema and tables':
          await createDatabaseSchemaAndTables();
          break;

        case 'Creating admin user':
          console.log(adminUser);
          await createAdminUser(dbConfig, adminUser, projectName, subdomain);
          break;

        case 'Creating data models':
          await createModels();
          break;

        case 'Writing config.json file':
          await writeConfigFile();
          break;

        case 'Setting up storage':
          await setupStorage();
          break;

        case 'Creating API endpoints':
          await createApiEndpoints();
          break;

        case 'Setting up authentication system':
          await setupAuthSystem();
          break;

        case 'Configuring session management':
          await configureSession();
          break;

        case 'Installing demo content':
          await installDemoContent();
          break;

        case 'Running tests to verify installation':
          await runTests();
          break;

        case 'Finalizing installer and cleanup':
          await finalizeInstaller();
          break;

        default:
          console.warn(`No implementation for step: ${step}`);
          await delay(500);
      }

      onProgress(i + 1);
    } catch (error: any) {
      throw new Error(`Step failed: ${step} - ${error.message || error}`);
    }
  }
}
