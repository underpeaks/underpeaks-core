import { useInstallerStore } from '../../store/useInstallerStore';
import { createFlutterProject } from './createFlutterProject';
import { createNextJSProject } from './createNextProject';

// Helper delay (keep as is)
function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Your existing dummy implementations
async function runDatabaseMigrations() { console.log('Running database migrations...'); await delay(1000); }
async function seedInitialData() { console.log('Seeding initial data...'); await delay(1000); }
async function createApiEndpoints() { console.log('Creating API endpoints...'); await delay(1000); }
async function createDataModels() { console.log('Creating data models...'); await delay(1000); }
async function installEcommerceTables() { console.log('Installing e-commerce tables...'); await delay(1000); }
async function installDemoContent() { console.log('Installing demo content...'); await delay(1000); }
async function writeConfigFile() { console.log('Writing config.json...'); await delay(1000); }
async function writeEnvFile() { console.log('Writing .env.local...'); await delay(1000); }
async function setupAuthSystem() { console.log('Setting up authentication...'); await delay(1000); }
async function configureSession() { console.log('Configuring session management...'); await delay(1000); }
async function setupStorage() { console.log('Setting up storage...'); await delay(1000); }
async function runTests() { console.log('Running tests...'); await delay(1000); }
async function finalizeInstaller() { console.log('Finalizing installer...'); await delay(1000); }

// Replace only this function to call the API route:
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

// NEW: call admin user creation API route
async function createAdminUser(dbConfig: any, adminUser: any, projectName: string, subdomain: string) {
  const response = await fetch('/api/create-admin-user', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ config: dbConfig, adminUser, projectName, subdomain }), // <-- add these here
  });

  if (!response.ok) {
    const err = await response.json();
    throw new Error(`Failed to create admin user: ${err.message || response.statusText}`);
  }

  const data = await response.json();
  console.log('Admin user created:', data);
  return data;
}

export const INSTALL_STEPS = [
  'Installing Flutter project',
  'Installing Next.js project',
  'Creating database schema and tables',
  'Creating admin user',
  'Running database migrations',
  'Seeding initial data (admin user, roles, settings)',
  'Creating API endpoints',
  'Creating data models',
  'Installing e-commerce related tables',
  'Installing demo content',
  'Writing config.json file',
  'Writing .env.local file (if required)',
  'Setting up authentication system',
  'Configuring session management',
  'Setting up storage (e.g., Supabase storage buckets)',
  'Running tests to verify installation',
  'Finalizing installer and cleanup',
];

export async function runInstallerSteps(onProgress: (stepIndex: number) => void): Promise<void> {
  const { dbConfig, adminUser, selectedStack, projectName,subdomain } = useInstallerStore.getState();

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
          await createAdminUser(dbConfig, adminUser,subdomain,projectName);
          break;

        case 'Running database migrations':
          await runDatabaseMigrations();
          break;

        case 'Seeding initial data (admin user, roles, settings)':
          await seedInitialData();
          break;

        case 'Creating API endpoints':
          await createApiEndpoints();
          break;

        case 'Creating data models':
          await createDataModels();
          break;

        case 'Installing e-commerce related tables':
          await installEcommerceTables();
          break;

        case 'Installing demo content':
          await installDemoContent();
          break;

        case 'Writing config.json file':
          await writeConfigFile();
          break;

        case 'Writing .env.local file (if required)':
          await writeEnvFile();
          break;

        case 'Setting up authentication system':
          await setupAuthSystem();
          break;

        case 'Configuring session management':
          await configureSession();
          break;

        case 'Setting up storage (e.g., Supabase storage buckets)':
          await setupStorage();
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
