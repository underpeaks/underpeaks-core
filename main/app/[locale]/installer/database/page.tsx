'use client';

/**
 * DatabaseConfigPage Component
 *
 * This is the installer wizard step where the user configures their database
 * connection. It appears after the stack selection step and before the demo
 * content step (/installer/demo).
 *
 * What this page does:
 * ────────────────────
 * - Renders a database-type selector (Supabase, Firebase, PostgreSQL, MySQL,
 *   MongoDB). Switching the selector clears the form and resets test state.
 * - Dynamically renders the correct input fields for the selected database
 *   type. Each field optionally shows an InfoBlock explaining what the value
 *   is and where to find it.
 * - Firebase JSON fields use a <Textarea> instead of an <Input> because they
 *   accept multi-line JSON pastes.
 * - Provides a "Test Connection" button that sends the current config to
 *   /api/test-db-connection and shows a step-by-step progress list so the
 *   user can see exactly where a failure occurred.
 * - Provides a "Continue" button (only enabled after a successful connection
 *   test) that saves the config to /api/save-db-config and navigates to
 *   /installer/demo.
 * - Writes the final config to the Zustand installer store so subsequent
 *   install steps can read it.
 *
 * State managed here:
 *   - selectedDb          : which database type is currently selected.
 *   - formData            : key/value map of the current field inputs.
 *   - loading             : true during both test and save operations.
 *   - testSteps           : array of step objects shown in the progress list.
 *   - connectionSucceeded : true after a successful test; enables "Continue".
 *   - firebaseDbType      : 'firestore' or 'realtime' (Firebase-specific).
 *   - showSavingWarning   : true after "Continue" is clicked, shows a patience
 *                           notice while the save operation runs.
 *
 * Component hierarchy (within this file):
 *   DatabaseConfigPage
 *   └── InfoBlock   ← small blue info card shown above certain input fields
 */

import { useState, useRef }      from 'react';
import { useRouter }             from 'next/navigation';
import { useTranslations }       from 'next-intl';
import { Button }                from '@/components/ui/button';
import { Input }                 from '@/components/ui/input';
import { Textarea }              from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
}                                from '@/components/ui/select';
import {
  SiFirebase,
  SiSupabase,
  SiPostgresql,
  SiMysql,
  SiMongodb,
}                                from 'react-icons/si';
import { Loader2, CheckCircle2, XCircle } from 'lucide-react';
import { useInstallerStore }     from '../../../store/useInstallerStore';
import { DBType }                from '@/app/db-adapter/types';
import LocaleSwitcher            from '@/core/LocaleSwitcher';

// ---------------------------------------------------------------------------
// InfoBlock
// ---------------------------------------------------------------------------

/**
 * InfoBlockProps
 *
 * Props accepted by the InfoBlock component.
 *
 * Fields:
 *   - title       {string} — Bold heading, e.g. "Supabase Project URL".
 *   - description {string} — One-sentence explanation of what the value is.
 *   - where       {string} — Where in the relevant dashboard to find the value.
 */
interface InfoBlockProps {
  title:       string;
  description: string;
  where:       string;
}

/**
 * InfoBlock
 *
 * A small blue information card rendered above certain input fields to help
 * the user understand what value is expected and where to find it.
 * This is especially helpful for less technical users who may not know their
 * way around a database dashboard.
 *
 * @param title       — Short bold label for the field being explained.
 * @param description — What the value is used for.
 * @param where       — Where in the provider's dashboard to locate the value.
 */
function InfoBlock({ title, description, where }: InfoBlockProps) {
  const t = useTranslations('databaseConfigPage');

  return (
    <div className="mb-2 p-3 rounded-lg bg-blue-50 border border-blue-200 text-sm">
      <p className="font-semibold text-blue-900">{title}</p>
      <p className="text-gray-700">{description}</p>
      <p className="text-xs text-gray-500 mt-1">
        {/* "Where to find it:" label followed by the location string */}
        <span className="font-medium">{t('infoBlock.whereLabel')}</span> {where}
      </p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// parseFirebaseConfig
// ---------------------------------------------------------------------------

/**
 * parseFirebaseConfig
 *
 * Parses a Firebase web config string into a plain JavaScript object.
 * Firebase config can be pasted in two formats:
 *   1. Pure JSON  : `{ "apiKey": "...", ... }`
 *   2. JS object  : `const firebaseConfig = { apiKey: "...", ... };`
 *
 * This function tries JSON.parse first. If that fails (because it is a JS
 * object literal with unquoted keys), it applies a regex to:
 *   - Strip the variable declaration (`const firebaseConfig = ...`).
 *   - Remove the trailing semicolon.
 *   - Quote all unquoted object keys so it becomes valid JSON.
 * Then it tries JSON.parse again on the cleaned string.
 *
 * If both attempts fail, it logs an error and returns an empty object so the
 * rest of the flow can continue gracefully without crashing.
 *
 * @param input — Raw string pasted by the user into the Firebase web config field.
 * @returns     A plain object with the Firebase config values, or {} on failure.
 */
function parseFirebaseConfig(input: string): Record<string, any> {
  if (!input) return {};

  // Attempt 1 — try parsing as-is (valid JSON)
  try {
    return JSON.parse(input);
  } catch {}

  // Attempt 2 — strip JS syntax and re-parse
  try {
    const cleaned = input
      .replace(/const\s+\w+\s*=\s*/, '') // remove "const firebaseConfig = "
      .replace(/;$/, '')                  // remove trailing semicolon
      .replace(/([{,]\s*)([a-zA-Z0-9_]+)\s*:/g, '$1"$2":'); // quote keys

    return JSON.parse(cleaned);
  } catch (err) {
    console.error('logs.firebaseParseError', err);
    return {};
  }
}

// ---------------------------------------------------------------------------
// Database definitions
// ---------------------------------------------------------------------------

/**
 * DatabaseField
 *
 * Describes a single input field rendered for a given database type.
 *
 * Fields:
 *   - key         : the formData key this input maps to.
 *   - label       : human-readable field name shown above the input.
 *   - placeholder : example value shown inside the empty input.
 *   - isJson      : if true, renders a <Textarea> instead of <Input> because
 *                   the value is a multi-line JSON paste.
 *   - info        : optional InfoBlock data shown above the input.
 */
interface DatabaseField {
  key:         string;
  label:       string;
  placeholder: string;
  isJson?:     boolean;
  info?: {
    title:       string;
    description: string;
    where:       string;
  };
}

/**
 * DatabaseDefinition
 *
 * Describes one of the selectable database options in the dropdown.
 *
 * Fields:
 *   - value       : the DBType string used in the store and API payloads.
 *   - name        : display name shown in the dropdown.
 *   - description : short tagline shown beneath the name in the dropdown.
 *   - icon        : React icon element rendered beside the name.
 *   - fields      : ordered list of input fields to render for this DB type.
 */
interface DatabaseDefinition {
  value:       string;
  name:        string;
  description: string;
  icon:        React.ReactNode;
  fields:      DatabaseField[];
}

/**
 * DATABASES
 *
 * The full list of supported database options, each with their display
 * metadata and the ordered set of input fields the user must fill in.
 *
 * To add a new database type:
 *   1. Add an entry to this array.
 *   2. Ensure the DBType union in db-adapter/types includes the new value.
 *   3. Implement the connection test and schema creation on the server.
 */
const DATABASES: DatabaseDefinition[] = [
  {
    value: 'supabase',
    name:  'Supabase',
    description: 'Postgres-based with built-in Auth, Storage, Realtime.',
    icon: <SiSupabase className="w-5 h-5 text-blue-600" />,
    fields: [
      {
        key:         'supabaseUrl',
        label:       'Supabase URL',
        placeholder: 'https://xyzcompany.supabase.co',
        info: {
          title:       'Supabase Project URL',
          description: 'Your Supabase project endpoint used for API access.',
          where:       'Supabase Dashboard → Settings → API',
        },
      },
      {
        key:         'anonKey',
        label:       'Supabase Anon Key',
        placeholder: 'eyJhbGciOiJIUzI1NiIsInR...',
        info: {
          title:       'Anon Public Key',
          description: 'Client-side key with restricted access rules.',
          where:       'Supabase Dashboard → Settings → API',
        },
      },
      {
        key:         'serviceRoleKey',
        label:       'Supabase Service Key',
        placeholder: 'eyJhbGciOiJIUzI1NiIsInR...',
        info: {
          title:       'Service Key',
          description: 'Server-side key.',
          where:       'Supabase Dashboard → Settings → API',
        },
      },
      {
        key:         'storageUrl',
        label:       'Supabase Storage URL',
        placeholder: 'https://<project>.supabase.co/storage/v1/object/public/nxt_storage',
        info: {
          title:       'Storage URL',
          description: 'Public file storage endpoint for assets.',
          where:       'Supabase Dashboard → Storage → Buckets',
        },
      },
    ],
  },
  {
    value: 'firebase',
    name:  'Firebase',
    description: 'Mobile-first apps, real-time DB & auth.',
    icon: <SiFirebase className="w-5 h-5 text-yellow-600" />,
    fields: [
      {
        key:         'firebaseConfigJson',
        label:       'Firebase Service Account JSON',
        placeholder: 'Paste full Firebase service account JSON here',
        isJson:      true,
        info: {
          title:       'Service Account JSON',
          description: 'Used for backend/admin Firebase access.',
          where:       'Firebase Console → Project Settings → Service Accounts',
        },
      },
      {
        key:         'firebaseWebConfig',
        label:       'Firebase Web Config (firebaseConfig)',
        placeholder: 'Paste the firebaseConfig object here',
        isJson:      true,
        info: {
          title:       'Firebase Web Config',
          description: 'Frontend configuration for Firebase SDK.',
          where:       'Firebase Console → Project Settings → General → Your Apps',
        },
      },
    ],
  },
  {
    value: 'postgres',
    name:  'PostgreSQL',
    description: 'Open source, full control.',
    icon: <SiPostgresql className="w-5 h-5 text-blue-700" />,
    fields: [
      {
        key: 'host', label: 'Host', placeholder: 'localhost',
        info: { title: 'PostgreSQL Host', description: 'The server address where PostgreSQL is running.', where: 'Your VPS / Local machine / Cloud DB provider' },
      },
      {
        key: 'port', label: 'Port', placeholder: '5432',
        info: { title: 'PostgreSQL Port', description: 'Default PostgreSQL port used for connections.', where: 'Default: 5432 unless changed in config' },
      },
      {
        key: 'database', label: 'Database Name', placeholder: 'mydb',
        info: { title: 'Database Name', description: 'The specific PostgreSQL database to connect to.', where: 'Created via psql or cloud dashboard' },
      },
      {
        key: 'user', label: 'User', placeholder: 'postgres',
        info: { title: 'Database User', description: 'Username with access to the PostgreSQL database.', where: 'Postgres user setup or hosting provider panel' },
      },
      {
        key: 'password', label: 'Password', placeholder: 'yourpassword',
        info: { title: 'Database Password', description: 'Password for the PostgreSQL user.', where: 'Set during DB creation or user setup' },
      },
    ],
  },
  {
    value: 'mysql',
    name:  'MySQL',
    description: 'Common, stable.',
    icon: <SiMysql className="w-5 h-5 text-purple-600" />,
    fields: [
      { key: 'host',     label: 'Host',          placeholder: 'localhost'    },
      { key: 'port',     label: 'Port',          placeholder: '3306'         },
      { key: 'database', label: 'Database Name', placeholder: 'mydb'         },
      { key: 'user',     label: 'User',          placeholder: 'root'         },
      { key: 'password', label: 'Password',      placeholder: 'yourpassword' },
    ],
  },
  {
    value: 'mongodb',
    name:  'MongoDB',
    description: 'NoSQL, great for unstructured data.',
    icon: <SiMongodb className="w-5 h-5 text-green-600" />,
    fields: [
      {
        key:         'connectionString',
        label:       'Connection String',
        placeholder: 'mongodb+srv://user:<password>@cluster.mongodb.net',
      },
      {
        key:         'databaseName',
        label:       'Database Name',
        placeholder: 'nxt_flutter',
      },
    ],
  },
];

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/**
 * TestStep
 *
 * Represents a single row in the connection-test progress list.
 *
 * Fields:
 *   - label        : human-readable description of the step.
 *   - status       : 'pending' (spinner) | 'success' (green tick) |
 *                    'error' (red cross).
 *   - errorMessage : optional detail shown in red beneath the list when
 *                    status is 'error'.
 */
type TestStep = {
  label:         string;
  status:        'pending' | 'success' | 'error';
  errorMessage?: string;
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

/**
 * DatabaseConfigPage
 *
 * The installer wizard step for configuring the project database.
 * See the file-level JSDoc above for a full description.
 */
export default function DatabaseConfigPage() {
  /**
   * t — Translation function scoped to the 'databaseConfigPage' namespace.
   * Call t('some.key') to get the translated string for that key.
   */
  const t = useTranslations('databaseConfigPage');

  /** Next.js router — used to navigate to /installer/demo after saving. */
  const router = useRouter();

  // -------------------------------------------------------------------------
  // State
  // -------------------------------------------------------------------------

  /** The currently selected database type. Defaults to Supabase. */
  const [selectedDb, setSelectedDb] = useState<DBType>('supabase');

  /** Key/value map of all current field inputs for the selected database. */
  const [formData,   setFormData]   = useState<Record<string, string>>({});

  /**
   * True during both the test-connection and save-config operations.
   * Disables both action buttons to prevent concurrent requests.
   */
  const [loading,    setLoading]    = useState(false);

  /**
   * The ordered list of steps shown in the connection-test progress list.
   * Empty until the user clicks "Test Connection".
   */
  const [testSteps,  setTestSteps]  = useState<TestStep[]>([]);

  /**
   * True after a successful connection test. Required to enable the
   * "Continue" button — the user must verify the connection before saving.
   */
  const [connectionSucceeded, setConnectionSucceeded] = useState(false);

  /**
   * Firebase-specific: which Firestore mode to use.
   * 'firestore' — Cloud Firestore (document/collection model).
   * 'realtime'  — Firebase Realtime Database (JSON tree model).
   */
  const [firebaseDbType, setFirebaseDbType] =
    useState<'firestore' | 'realtime'>('firestore');

  /**
   * True after the user clicks "Continue". Shows a patience notice while
   * the config is being saved to the server (can take several seconds).
   */
  const [showSavingWarning, setShowSavingWarning] = useState(false);

  /** Zustand action to write a single key into the installer store. */
  const setInstallerValue = useInstallerStore((s) => s.setInstallerValue);

  /**
   * The full definition object for the currently selected database.
   * Used to render the correct set of input fields and the DB description.
   */
  const selectedDbConfig = DATABASES.find((db) => db.value === selectedDb);

  /**
   * loadingRef
   * A ref mirror of the `loading` state. Refs are used alongside state here
   * because button onClick handlers sometimes read stale closure values —
   * the ref always reflects the current loading value without needing to be
   * in a dependency array.
   */
  const loadingRef = useRef(false);

  // -------------------------------------------------------------------------
  // Handlers
  // -------------------------------------------------------------------------

  /**
   * handleSelect
   *
   * Called when the user picks a different database from the dropdown.
   * Resets all form data, test steps, and connection status so the user
   * starts fresh for the newly selected database type.
   * Also immediately writes the new selection to the installer store.
   *
   * @param value — The selected database type string (cast to DBType).
   */
  function handleSelect(value: string): void {
    const dbType = value as DBType;
    setSelectedDb(dbType);
    setFormData({});
    setTestSteps([]);
    setConnectionSucceeded(false);
    setInstallerValue('selectedDb', dbType);
  }

  /**
   * handleInputChange
   *
   * Called on every keystroke in any database config input field.
   * Updates the formData map for the changed key and immediately syncs
   * the full config (type + all fields) to the installer store so it is
   * always up to date. Also resets the test steps and success flag so
   * the user must re-test if they change a value after a successful test.
   *
   * @param key   — The field key being changed (e.g. 'supabaseUrl').
   * @param value — The new string value typed by the user.
   */
  function handleInputChange(key: string, value: string): void {
    setFormData((prev) => {
      const updated = { ...prev, [key]: value };
      setInstallerValue('dbConfig', {
        type: selectedDb,
        ...updated,
        ...(selectedDb === 'firebase' ? { firebaseDbType } : {}),
      });
      return updated;
    });

    // Any change to the form invalidates the previous test result
    setTestSteps([]);
    setConnectionSucceeded(false);
  }

  /**
   * handleTestConnection
   *
   * Sends the current database configuration to /api/test-db-connection
   * and displays a step-by-step progress list as the test proceeds.
   *
   * Steps shown to the user:
   *   0. Validating configuration  — marked success immediately client-side.
   *   1. Sending config to server  — marked success when the response is OK.
   *   2. Testing DB connection     — marked success on result.success, or
   *                                  error (with message) on failure.
   *   3. Finalizing connection check — marked success alongside steps 1–2.
   *
   * Firebase config is pre-processed through parseFirebaseConfig() before
   * being sent, because the user may paste a JS object literal rather than
   * valid JSON.
   *
   * Sets connectionSucceeded = true on full success, enabling "Continue".
   */
  async function handleTestConnection(): Promise<void> {
  setLoading(true)
  loadingRef.current = true
  setConnectionSucceeded(false)

  setTestSteps([
    { label: t('testSteps.validating'), status: 'pending' },
    { label: t('testSteps.sending'),    status: 'pending' },
    { label: t('testSteps.testing'),    status: 'pending' },
    { label: t('testSteps.finalizing'), status: 'pending' },
  ])

  try {
    setTestSteps((s) =>
      s.map((x, i) => (i === 0 ? { ...x, status: 'success' } : x))
    )

    let dbConfigToSend: any

    if (selectedDb === 'firebase') {
      const webConfig = parseFirebaseConfig(formData['firebaseWebConfig'] || '')
      dbConfigToSend = {
        type:               'firebase',
        firebaseConfigJson: formData['firebaseConfigJson'],
        firebaseDbType,
        storageBucket:      webConfig.storageBucket || undefined,
        firebaseWebConfig:  webConfig,
      }
    } else {
      dbConfigToSend = { type: selectedDb, ...formData }
    }

    const response = await fetch('/api/test-db-connection', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify(dbConfigToSend),
    })

    if (!response.ok) throw new Error(t('errors.serverRejected'))

    const result = await response.json()

    // Read error or message — adapters may return either key
    if (!result.success) {
      throw new Error(result.error || result.message || 'Connection failed')
    }

    setTestSteps((s) =>
      s.map((x, i) => (i >= 1 ? { ...x, status: 'success' } : x))
    )
    setConnectionSucceeded(true)

  } catch (err: any) {
    setTestSteps((s) =>
      s.map((x, i) =>
        i === 2 ? { ...x, status: 'error', errorMessage: err.message } : x
      )
    )
  } finally {
    setLoading(false)
    loadingRef.current = false
  }
}
  /**
   * handleContinue
   *
   * Called when the user clicks "Continue" after a successful connection test.
   * Saves the full database config to the server and navigates to the next step.
   *
   * Steps:
   * 1. Shows the saving patience warning and sets loading = true.
   * 2. Reads the current installer store state to get the domain.
   * 3. Builds the env payload (Firebase is handled separately for the same
   *    reason as in handleTestConnection).
   * 4. Writes the selected DB and config to the installer store.
   * 5. POSTs the config to /api/save-db-config.
   * 6. On success, marks the DB as configured in localStorage and navigates
   *    to /installer/demo.
   * 7. On failure, shows an alert with the error message and re-enables the
   *    buttons.
   */
  async function handleContinue(): Promise<void> {
    setShowSavingWarning(true);
    setLoading(true);
    loadingRef.current = true;

    try {
      const installerStore = useInstallerStore.getState();

      let envPayload: any;

      if (selectedDb === 'firebase') {
        const webConfig = parseFirebaseConfig(formData['firebaseWebConfig'] || '');
        envPayload = {
          type:               'firebase',
          domain:             installerStore.domain,
          firebaseConfigJson: formData['firebaseConfigJson'],
          firebaseWebConfig:  webConfig,
          firebaseDbType,
          storageBucket:      webConfig.storageBucket || undefined,
        };
      } else {
        envPayload = { type: selectedDb, domain: installerStore.domain, ...formData };
      }

      // Persist to the installer store before the API call
      setInstallerValue('selectedDb', selectedDb);
      setInstallerValue('dbConfig',   envPayload);

      const res = await fetch('/api/save-db-config', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(envPayload),
      });

      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error);

      // Mark the database as configured in localStorage for the installer flow
      localStorage.setItem('dbConfigured', 'true');
      router.push('/installer/demo');

    } catch (err: any) {
      alert(err.message);
      setLoading(false);
      loadingRef.current = false;
    }
  }

  // -------------------------------------------------------------------------
  // Derived values
  // -------------------------------------------------------------------------

  /**
   * errorMessage
   * The error message from the first failed test step, if any.
   * Displayed in red beneath the progress list to give the user actionable
   * information about why their connection test failed.
   */
  const errorMessage = testSteps.find((s) => s.status === 'error')?.errorMessage;

  // -------------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------------

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-white px-6 py-12">

      {/* ----------------------------------------------------------------
        * Locale Switcher — fixed top-right
        * ---------------------------------------------------------------- */}
      <div className="fixed top-4 right-4 z-50">
        <LocaleSwitcher />
      </div>

      {/* ----------------------------------------------------------------
        * Page Header — Logo and tagline
        * ---------------------------------------------------------------- */}
      <header className="mb-8 text-center flex flex-col items-center">
        <img
          src="/images/logo/NXT_Flutter_logo.png"
          alt={t('logoAlt')}
          className="h-16 w-auto mb-4"
        />
        <p className="text-xl text-gray-700">{t('tagline')}</p>
      </header>

      {/* ----------------------------------------------------------------
        * Configuration Card
        * ---------------------------------------------------------------- */}
      <div className="w-full max-w-xl p-8 bg-gray-50 rounded-2xl shadow-xl border space-y-6">

        <h2 className="text-2xl font-bold text-gray-900">{t('heading')}</h2>

        {/* Database type selector */}
        <div className="mb-6">
          <Select value={selectedDb} onValueChange={handleSelect}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder={t('selectPlaceholder')} />
            </SelectTrigger>
            <SelectContent>
              {DATABASES.map((db) => (
                <SelectItem key={db.value} value={db.value}>
                  <div className="flex items-center gap-2">
                    {db.icon}
                    <div>
                      <div className="font-semibold">{db.name}</div>
                      <div className="text-xs text-gray-400">{db.description}</div>
                    </div>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* ----------------------------------------------------------------
          * Dynamic field list — renders the correct inputs for the selected DB.
          * Fields with `isJson: true` use a Textarea for multi-line JSON input.
          * Fields with an `info` object show an InfoBlock above the input.
          * ---------------------------------------------------------------- */}
        {selectedDbConfig?.fields.map((field: DatabaseField) => (
          <div key={field.key}>
            {/* InfoBlock — only rendered when the field has info metadata */}
            {field.info && <InfoBlock {...field.info} />}

            <label className="block text-sm font-medium text-gray-700 mb-1">
              {field.label}{' '}
              <span className="text-gray-400 italic text-xs">
                {t('fieldExample', { placeholder: field.placeholder })}
              </span>
            </label>

            {field.isJson ? (
              /* JSON fields — multi-line textarea for pasting config objects */
              <Textarea
                rows={8}
                placeholder={field.placeholder}
                value={formData[field.key] || ''}
                onChange={(e) => handleInputChange(field.key, e.target.value)}
                className="w-full"
              />
            ) : (
              /* Standard fields — single-line text input */
              <Input
                placeholder={field.placeholder}
                value={formData[field.key] || ''}
                onChange={(e) => handleInputChange(field.key, e.target.value)}
                className="w-full"
              />
            )}
          </div>
        ))}

        {/* ----------------------------------------------------------------
          * Connection test progress list
          * Only rendered after the user clicks "Test Connection".
          * Each step shows a spinner (pending), green tick (success), or
          * red cross (error) based on its current status.
          * ---------------------------------------------------------------- */}
        {testSteps.length > 0 && (
          <ul className="mt-4 space-y-2">
            {testSteps.map((step, idx) => (
              <li key={idx} className="flex items-center gap-2 text-sm">
                {step.status === 'pending' && (
                  <Loader2 className="w-4 h-4 animate-spin text-gray-500" />
                )}
                {step.status === 'success' && (
                  <CheckCircle2 className="w-5 h-5 text-green-600" />
                )}
                {step.status === 'error' && (
                  <XCircle className="w-5 h-5 text-red-600" />
                )}
                <span>{step.label}</span>
              </li>
            ))}
          </ul>
        )}

        {/* Connection failure message — shown beneath the step list on error */}
        {errorMessage && (
          <p className="text-red-600 text-sm font-medium">
            {t('errors.connectionFailed', { message: errorMessage })}
          </p>
        )}

        {/* Patience notice — shown while the save operation is running */}
        <div className="flex flex-col space-y-2 pt-4">
          {showSavingWarning && (
            <div className="p-4 bg-yellow-100 text-yellow-800 rounded text-sm font-mono">
              {t('savingWarning')}
            </div>
          )}
        </div>

        {/* ----------------------------------------------------------------
          * Action buttons
          * "Test Connection" — always available (unless loading).
          * "Continue"        — only enabled after a successful test.
          * ---------------------------------------------------------------- */}
        <div className="flex space-x-4 pt-4">

          {/* Test Connection button */}
          <Button
            onClick={handleTestConnection}
            className="bg-green-600 hover:bg-green-700 text-white"
            disabled={loading || loadingRef.current}
          >
            {loading ? (
              <span className="flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin" />
                {t('buttons.testing')}
              </span>
            ) : (
              t('buttons.testConnection')
            )}
          </Button>

          {/* Continue button — disabled until connection test passes */}
          <Button
            onClick={handleContinue}
            className="flex-1"
            disabled={!connectionSucceeded || loading || loadingRef.current}
          >
            {loading && connectionSucceeded ? (
              <span className="flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin" />
                {t('buttons.saving')}
              </span>
            ) : (
              t('buttons.continue')
            )}
          </Button>

        </div>
      </div>
    </div>
  );
}