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

interface InfoBlockProps {
  title:       string;
  description: string;
  where:       string;
}

function InfoBlock({ title, description, where }: InfoBlockProps) {
  const t = useTranslations('databaseConfigPage');

  return (
    <div className="mb-2 p-3 rounded-lg bg-blue-50 border border-blue-200 text-sm">
      <p className="font-semibold text-blue-900">{title}</p>
      <p className="text-gray-700">{description}</p>
      <p className="text-xs text-gray-500 mt-1">
        <span className="font-medium">{t('infoBlock.whereLabel')}</span> {where}
      </p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// parseFirebaseConfig
// ---------------------------------------------------------------------------

function parseFirebaseConfig(input: string): Record<string, any> {
  if (!input) return {};

  try {
    return JSON.parse(input);
  } catch {}

  try {
    const cleaned = input
      .replace(/const\s+\w+\s*=\s*/, '')
      .replace(/;$/, '')
      .replace(/([{,]\s*)([a-zA-Z0-9_]+)\s*:/g, '$1"$2":');

    return JSON.parse(cleaned);
  } catch (err) {
    console.error('logs.firebaseParseError', err);
    return {};
  }
}

// ---------------------------------------------------------------------------
// Database definitions
// ---------------------------------------------------------------------------

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

interface DatabaseDefinition {
  value:       string;
  name:        string;
  description: string;
  icon:        React.ReactNode;
  fields:      DatabaseField[];
}

const DATABASES: DatabaseDefinition[] = [
  {
    value:       'supabase',
    name:        'Supabase',
    description: 'Postgres-based with built-in Auth, Storage, Realtime.',
    icon:        <SiSupabase className="w-5 h-5 text-blue-600" />,
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
          description: 'Server-side key with full database access.',
          where:       'Supabase Dashboard → Settings → API',
        },
      },
      {
        key:         'connectionString',
        label:       'Database Connection String',
        placeholder: 'postgresql://postgres.[project-ref]:[password]@aws-0-[region].pooler.supabase.com:5432/postgres',
        info: {
          title:       'Session Pooler Connection String',
          description: 'Used to create your database tables during installation. Required for Supabase — without this the installer cannot create tables.',
          where:       'Supabase Dashboard → click the "Connect" button at the top of the page → Session pooler tab',
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
    value:       'firebase',
    name:        'Firebase',
    description: 'Mobile-first apps, real-time DB & auth.',
    icon:        <SiFirebase className="w-5 h-5 text-yellow-600" />,
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
    value:       'postgres',
    name:        'PostgreSQL',
    description: 'Open source, full control.',
    icon:        <SiPostgresql className="w-5 h-5 text-blue-700" />,
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
    value:       'mysql',
    name:        'MySQL',
    description: 'Common, stable.',
    icon:        <SiMysql className="w-5 h-5 text-purple-600" />,
    fields: [
      { key: 'host',     label: 'Host',          placeholder: 'localhost'    },
      { key: 'port',     label: 'Port',          placeholder: '3306'         },
      { key: 'database', label: 'Database Name', placeholder: 'mydb'         },
      { key: 'user',     label: 'User',          placeholder: 'root'         },
      { key: 'password', label: 'Password',      placeholder: 'yourpassword' },
    ],
  },
  {
    value:       'mongodb',
    name:        'MongoDB',
    description: 'NoSQL, great for unstructured data.',
    icon:        <SiMongodb className="w-5 h-5 text-green-600" />,
    fields: [
      {
        key:         'connectionString',
        label:       'Connection String',
        placeholder: 'mongodb+srv://user:<password>@cluster.mongodb.net',
      },
      {
        key:         'databaseName',
        label:       'Database Name',
        placeholder: 'underpeaks',
      },
    ],
  },
];

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type TestStep = {
  label:         string;
  status:        'pending' | 'success' | 'error';
  errorMessage?: string;
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function DatabaseConfigPage() {
  const t      = useTranslations('databaseConfigPage');
  const router = useRouter();

  const [selectedDb,           setSelectedDb]           = useState<DBType>('supabase');
  const [formData,             setFormData]             = useState<Record<string, string>>({});
  const [loading,              setLoading]              = useState(false);
  const [testSteps,            setTestSteps]            = useState<TestStep[]>([]);
  const [connectionSucceeded,  setConnectionSucceeded]  = useState(false);
  const [firebaseDbType,       setFirebaseDbType]       = useState<'firestore' | 'realtime'>('firestore');
  const [showSavingWarning,    setShowSavingWarning]    = useState(false);

  const setInstallerValue = useInstallerStore((s) => s.setInstallerValue);
  const selectedDbConfig  = DATABASES.find((db) => db.value === selectedDb);
  const loadingRef        = useRef(false);

  // -------------------------------------------------------------------------
  // Handlers
  // -------------------------------------------------------------------------

  function handleSelect(value: string): void {
    const dbType = value as DBType;
    setSelectedDb(dbType);
    setFormData({});
    setTestSteps([]);
    setConnectionSucceeded(false);
    setInstallerValue('selectedDb', dbType);
  }

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

    setTestSteps([]);
    setConnectionSucceeded(false);
  }

  async function handleTestConnection(): Promise<void> {
    setLoading(true);
    loadingRef.current = true;
    setConnectionSucceeded(false);

    setTestSteps([
      { label: t('testSteps.validating'), status: 'pending' },
      { label: t('testSteps.sending'),    status: 'pending' },
      { label: t('testSteps.testing'),    status: 'pending' },
      { label: t('testSteps.finalizing'), status: 'pending' },
    ]);

    try {
      setTestSteps((s) =>
        s.map((x, i) => (i === 0 ? { ...x, status: 'success' } : x))
      );

      let dbConfigToSend: any;

      if (selectedDb === 'firebase') {
        const webConfig = parseFirebaseConfig(formData['firebaseWebConfig'] || '');
        dbConfigToSend = {
          type:               'firebase',
          firebaseConfigJson: formData['firebaseConfigJson'],
          firebaseDbType,
          storageBucket:      webConfig.storageBucket || undefined,
          firebaseWebConfig:  webConfig,
        };
      } else {
        dbConfigToSend = { type: selectedDb, ...formData };
      }

      const response = await fetch('/api/test-db-connection', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(dbConfigToSend),
      });

      if (!response.ok) throw new Error(t('errors.serverRejected'));

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || result.message || 'Connection failed')
      }

      setTestSteps((s) =>
        s.map((x, i) => (i >= 1 ? { ...x, status: 'success' } : x))
      );
      setConnectionSucceeded(true);

    } catch (err: any) {
      setTestSteps((s) =>
        s.map((x, i) =>
          i === 2 ? { ...x, status: 'error', errorMessage: err.message } : x
        )
      );
    } finally {
      setLoading(false);
      loadingRef.current = false;
    }
  }

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

      setInstallerValue('selectedDb', selectedDb);
      setInstallerValue('dbConfig',   envPayload);

      const res = await fetch('/api/save-db-config', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(envPayload),
      });

      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error);

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

  const errorMessage = testSteps.find((s) => s.status === 'error')?.errorMessage;

  // -------------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------------

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-white px-6 py-12">

      <div className="fixed top-4 right-4 z-50">
        <LocaleSwitcher />
      </div>

      <header className="mb-8 text-center flex flex-col items-center">
        <img
          src="/images/logo/underpeaks_logo.png"
          alt={t('logoAlt')}
          className="h-16 w-auto mb-4"
        />
        <p className="text-xl text-gray-700">{t('tagline')}</p>
      </header>

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

        {/* Dynamic field list */}
        {selectedDbConfig?.fields.map((field: DatabaseField) => (
          <div key={field.key}>
            {field.info && <InfoBlock {...field.info} />}

            <label className="block text-sm font-medium text-gray-700 mb-1">
              {field.label}{' '}
              <span className="text-gray-400 italic text-xs">
                {t('fieldExample', { placeholder: field.placeholder })}
              </span>
            </label>

            {field.isJson ? (
              <Textarea
                rows={8}
                placeholder={field.placeholder}
                value={formData[field.key] || ''}
                onChange={(e) => handleInputChange(field.key, e.target.value)}
                className="w-full"
              />
            ) : (
              <Input
                placeholder={field.placeholder}
                value={formData[field.key] || ''}
                onChange={(e) => handleInputChange(field.key, e.target.value)}
                className="w-full"
              />
            )}
          </div>
        ))}

        {/* Connection test progress list */}
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

        {errorMessage && (
          <p className="text-red-600 text-sm font-medium">
            {t('errors.connectionFailed', { message: errorMessage })}
          </p>
        )}

        <div className="flex flex-col space-y-2 pt-4">
          {showSavingWarning && (
            <div className="p-4 bg-yellow-100 text-yellow-800 rounded text-sm font-mono">
              {t('savingWarning')}
            </div>
          )}
        </div>

        {/* Action buttons */}
        <div className="flex space-x-4 pt-4">

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