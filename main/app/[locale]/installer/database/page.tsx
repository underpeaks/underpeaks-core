// DatabaseConfigPage.tsx  (installer step 5: database connection)
'use client';

import { useState, useRef }      from 'react';
import { useRouter }             from 'next/navigation';
import { useTranslations }       from 'next-intl';
import { Button }                from '@/components/ui/button';
import { Input }                 from '@/components/ui/input';
import { Textarea }              from '@/components/ui/textarea';
import { Label }                 from '@/components/ui/label';
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
import { Loader2, CheckCircle2, XCircle, Info } from 'lucide-react';
import { useInstallerStore }     from '../../../store/useInstallerStore';
import { DBType }                from '@/app/db-adapter/types';
import InstallerShell, {
  CARD,
  PRIMARY_BUTTON,
  OUTLINE_BUTTON,
  INPUT_CLASS,
}                                from '@/core/InstallerShell';

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
    <div className="mb-2 flex gap-2 rounded-lg border border-neutral-200 bg-neutral-50 p-3 text-sm">
      <Info className="mt-0.5 h-4 w-4 shrink-0 text-neutral-500" />
      <div>
        <p className="font-medium text-neutral-900">{title}</p>
        <p className="text-neutral-600">{description}</p>
        <p className="mt-1 text-xs text-neutral-500">
          <span className="font-medium">{t('infoBlock.whereLabel')}</span> {where}
        </p>
      </div>
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
    icon:        <SiSupabase className="h-5 w-5" />,
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
    icon:        <SiFirebase className="h-5 w-5" />,
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
    icon:        <SiPostgresql className="h-5 w-5" />,
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
    icon:        <SiMysql className="h-5 w-5" />,
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
    icon:        <SiMongodb className="h-5 w-5" />,
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
    <InstallerShell step={5} width="md" logoAlt={t('logoAlt')} tagline={t('tagline')}>
      <div className={CARD}>

        <h1 className="text-2xl font-semibold tracking-tight">{t('heading')}</h1>

        {/* Database type selector */}
        <div className="mt-6">
          <Select value={selectedDb} onValueChange={handleSelect}>
            <SelectTrigger className="h-12 w-full rounded-lg">
              <SelectValue placeholder={t('selectPlaceholder')} />
            </SelectTrigger>
            <SelectContent>
              {DATABASES.map((db) => (
                <SelectItem key={db.value} value={db.value}>
                  <div className="flex items-center gap-3">
                    {db.icon}
                    <div>
                      <div className="font-medium">{db.name}</div>
                      <div className="text-xs text-neutral-500">{db.description}</div>
                    </div>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Dynamic field list */}
        <div className="mt-6 space-y-5">
          {selectedDbConfig?.fields.map((field: DatabaseField) => (
            <div key={field.key}>
              {field.info && <InfoBlock {...field.info} />}

              <Label className="mb-1.5 block text-sm font-medium text-neutral-800">
                {field.label}{' '}
                <span className="text-xs font-normal italic text-neutral-400">
                  {t('fieldExample', { placeholder: field.placeholder })}
                </span>
              </Label>

              {field.isJson ? (
                <Textarea
                  rows={8}
                  placeholder={field.placeholder}
                  value={formData[field.key] || ''}
                  onChange={(e) => handleInputChange(field.key, e.target.value)}
                  className="w-full rounded-lg font-mono text-xs"
                />
              ) : (
                <Input
                  placeholder={field.placeholder}
                  value={formData[field.key] || ''}
                  onChange={(e) => handleInputChange(field.key, e.target.value)}
                  className={`${INPUT_CLASS} w-full`}
                />
              )}
            </div>
          ))}
        </div>

        {/* Connection test progress list */}
        {testSteps.length > 0 && (
          <ul className="mt-6 space-y-2 rounded-lg border border-neutral-200 bg-neutral-50 p-4">
            {testSteps.map((step, idx) => (
              <li key={idx} className="flex items-center gap-2 text-sm text-neutral-800">
                {step.status === 'pending' && (
                  <Loader2 className="h-4 w-4 animate-spin text-neutral-500" />
                )}
                {step.status === 'success' && (
                  <CheckCircle2 className="h-5 w-5 text-black" />
                )}
                {step.status === 'error' && (
                  <XCircle className="h-5 w-5 text-red-600" />
                )}
                <span>{step.label}</span>
              </li>
            ))}
          </ul>
        )}

        {errorMessage && (
          <p className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm font-medium text-red-700">
            {t('errors.connectionFailed', { message: errorMessage })}
          </p>
        )}

        {showSavingWarning && (
          <div className="mt-4 rounded-lg border border-neutral-300 bg-neutral-100 p-4 font-mono text-sm text-neutral-800">
            {t('savingWarning')}
          </div>
        )}

        {/* Action buttons */}
        <div className="mt-8 flex gap-3">

          <Button
            onClick={handleTestConnection}
            className={OUTLINE_BUTTON}
            disabled={loading || loadingRef.current}
          >
            {loading && !connectionSucceeded && !showSavingWarning ? (
              <span className="flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                {t('buttons.testing')}
              </span>
            ) : (
              t('buttons.testConnection')
            )}
          </Button>

          <Button
            onClick={handleContinue}
            className={`${PRIMARY_BUTTON} flex-1`}
            disabled={!connectionSucceeded || loading || loadingRef.current}
          >
            {loading && connectionSucceeded ? (
              <span className="flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                {t('buttons.saving')}
              </span>
            ) : (
              t('buttons.continue')
            )}
          </Button>

        </div>
      </div>
    </InstallerShell>
  );
}