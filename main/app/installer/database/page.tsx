'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  SiFirebase,
  SiSupabase,
  SiPostgresql,
  SiMysql,
  SiMongodb,
} from 'react-icons/si';
import { Loader2, CheckCircle2, XCircle } from 'lucide-react';
import { useInstallerStore } from '../../store/useInstallerStore';
import { DBType } from '@/app/db-adapter/types';

const DATABASES = [
  {
    value: 'supabase',
    name: 'Supabase',
    description: 'Postgres-based with built-in Auth, Storage, Realtime.',
    icon: <SiSupabase className="w-5 h-5 text-blue-600" />,
    fields: [
      { key: 'url', label: 'Supabase URL', placeholder: 'https://xyzcompany.supabase.co' },
      { key: 'anonKey', label: 'Supabase Anon Key', placeholder: 'eyJhbGciOiJIUzI1NiIsInR...' },
      {
        key: 'storageUrl',
        label: 'Supabase Storage URL',
        placeholder: 'https://<project>.supabase.co/storage/v1/object/public/nxt_storage',
      },
    ],
  },
  {
    value: 'firebase',
    name: 'Firebase',
    description: 'Mobile-first apps, real-time DB & auth.',
    icon: <SiFirebase className="w-5 h-5 text-yellow-600" />,
    fields: [
      {
        key: 'firebaseConfigJson',
        label: 'Firebase Service Account JSON',
        placeholder: 'Paste full Firebase service account JSON here',
        isJson: true,
      },
      {
        key: 'storageUrl',
        label: 'Firebase Storage URL',
        placeholder: 'https://firebasestorage.googleapis.com/v0/b/<project>.appspot.com/o',
      },
    ],
  },
  {
    value: 'postgres',
    name: 'PostgreSQL',
    description: 'Open source, full control.',
    icon: <SiPostgresql className="w-5 h-5 text-blue-700" />,
    fields: [
      { key: 'host', label: 'Host', placeholder: 'localhost' },
      { key: 'port', label: 'Port', placeholder: '5432' },
      { key: 'database', label: 'Database Name', placeholder: 'mydb' },
      { key: 'user', label: 'User', placeholder: 'postgres' },
      { key: 'password', label: 'Password', placeholder: 'yourpassword' },
    ],
  },
  {
    value: 'mysql',
    name: 'MySQL',
    description: 'Common, stable.',
    icon: <SiMysql className="w-5 h-5 text-purple-600" />,
    fields: [
      { key: 'host', label: 'Host', placeholder: 'localhost' },
      { key: 'port', label: 'Port', placeholder: '3306' },
      { key: 'database', label: 'Database Name', placeholder: 'mydb' },
      { key: 'user', label: 'User', placeholder: 'root' },
      { key: 'password', label: 'Password', placeholder: 'yourpassword' },
    ],
  },
  {
    value: 'mongodb',
    name: 'MongoDB',
    description: 'NoSQL, great for unstructured data.',
    icon: <SiMongodb className="w-5 h-5 text-green-600" />,
    fields: [
      {
        key: 'connectionString',
        label: 'Connection String',
        placeholder: 'mongodb+srv://user:<password>@cluster.mongodb.net/mydb',
      },
    ],
  },
];

type TestStep = {
  label: string;
  status: 'pending' | 'success' | 'error';
  errorMessage?: string;
};

export default function DatabaseConfigPage() {
  const router = useRouter();
  const [selectedDb, setSelectedDb] = useState<DBType>('supabase');
  const [formData, setFormData] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [testSteps, setTestSteps] = useState<TestStep[]>([]);
  const [connectionSucceeded, setConnectionSucceeded] = useState(false);
  const [firebaseDbType, setFirebaseDbType] = useState<'firestore' | 'realtime'>('firestore');
  const installerState = useInstallerStore((state) => state);
  const setInstallerValue = useInstallerStore((s) => s.setInstallerValue);
  const selectedDbConfig = DATABASES.find((db) => db.value === selectedDb);

  function handleSelect(value: string) {
    setSelectedDb(value as DBType);
    setFormData({});
    setTestSteps([]);
    setConnectionSucceeded(false);
  }

  function handleInputChange(key: string, value: string) {
    setFormData((prev) => ({ ...prev, [key]: value }));
    setTestSteps([]);
    setConnectionSucceeded(false);
  }

  async function handleTestConnection() {
  console.log('[DEBUG] handleTestConnection START');
  setLoading(true);
  setConnectionSucceeded(false);

  setTestSteps([
    { label: 'Validating configuration...', status: 'pending' },
    { label: 'Sending config to server...', status: 'pending' },
    { label: 'Testing database connection...', status: 'pending' },
    { label: 'Finalizing connection check...', status: 'pending' },
  ]);

  try {
    console.log('[DEBUG] Step 0: Validating configuration');
    setTestSteps((s) => s.map((x, i) => (i === 0 ? { ...x, status: 'success' } : x)));

    const dbConfigToSend = {
      type: selectedDb,
      ...formData,
      ...(selectedDb === 'firebase'
        ? { firebaseDbType, storageBucket: formData['storageUrl'] }
        : {}),
    };

    console.log('[DEBUG] Step 1: Config to send:', dbConfigToSend);

    const response = await fetch('/api/test-db-connection', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(dbConfigToSend),
    });

    console.log('[DEBUG] Step 2: Response received', response);

    if (!response.ok) {
      console.error('[DEBUG] Response not OK', response.status, await response.text());
      throw new Error(`Server rejected connection with status ${response.status}`);
    }

    const result = await response.json();
    console.log('[DEBUG] Step 3: Parsed result:', result);

    if (!result.success) {
      throw new Error(result.message || 'Connection failed');
    }

    setTestSteps((s) => s.map((x, i) => (i >= 1 ? { ...x, status: 'success' } : x)));
    setConnectionSucceeded(true);
    console.log('[DEBUG] Step 4: Connection succeeded');
  } catch (err: any) {
    console.error('[DEBUG] Step ERROR', err);
    setTestSteps((s) =>
      s.map((x, i) =>
        i === 2 ? { ...x, status: 'error', errorMessage: err.message } : x
      )
    );
  } finally {
    setLoading(false);
    console.log('[DEBUG] handleTestConnection END');
  }
}


  async function handleContinue() {
    const dbConfigToSave = {
      type: selectedDb,
      ...formData,
      ...(selectedDb === 'firebase'
        ? { firebaseDbType, storageBucket: formData['storageUrl'] }
        : {}),
    };


    

// Whenever you want to debug:
     console.log('[DEBUG] Full Installer State:', installerState);
    setInstallerValue('selectedDb', selectedDb);
    setInstallerValue('dbConfig', dbConfigToSave);

    router.push('/installer/demo');
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-white px-6 py-12">
      <header className="mb-8 text-center">
        <h1 className="text-3xl font-extrabold text-black tracking-tight">🚀 NXT_Flutter</h1>
        <p className="text-sm text-gray-500">Build once. Run anywhere.</p>
      </header>

      <div className="w-full max-w-xl p-8 bg-gray-50 rounded-2xl shadow-xl border space-y-6">
        <h2 className="text-2xl font-bold text-gray-900">Database Configuration</h2>
        <p className="text-sm text-gray-600 mb-6">
          Select your database and provide the necessary connection details. You can test your
          connection before continuing.
        </p>

        <div className="mb-6">
          <Select value={selectedDb} onValueChange={handleSelect}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select database" />
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

        {/* Firebase Instructions and DB type selector */}
        {selectedDb === 'firebase' && (
          <>
            <div className="mb-4 p-4 bg-yellow-50 border-l-4 border-yellow-400 text-yellow-700">
              <h3 className="font-semibold mb-2">How to get Firebase Service Account JSON</h3>
              <ol className="list-decimal list-inside space-y-1 text-sm">
                <li>
                  Go to{' '}
                  <a
                    href="https://console.firebase.google.com/"
                    target="_blank"
                    rel="noreferrer"
                    className="underline"
                  >
                    Firebase Console
                  </a>{' '}
                  and open your project.
                </li>
                <li>
                  Navigate to <strong>Project Settings</strong> → <strong>Service Accounts</strong>.
                </li>
                <li>Click <strong>Generate new private key</strong> to download the JSON file.</li>
                <li>Open it and paste its full contents below.</li>
              </ol>
              <p className="mt-2 italic text-xs text-yellow-700">
                ⚠️ Keep this file secure and never share it publicly.
              </p>
            </div>

            <fieldset className="mb-6">
              <legend className="font-semibold mb-2 text-gray-700">Firebase Database Type</legend>
              <label className="inline-flex items-center mr-6 cursor-pointer">
                <input
                  type="radio"
                  name="firebaseDbType"
                  value="firestore"
                  checked={firebaseDbType === 'firestore'}
                  onChange={() => setFirebaseDbType('firestore')}
                  className="form-radio text-yellow-600"
                />
                <span className="ml-2">Firestore (recommended)</span>
              </label>
              <label className="inline-flex items-center cursor-pointer">
                <input
                  type="radio"
                  name="firebaseDbType"
                  value="realtime"
                  checked={firebaseDbType === 'realtime'}
                  onChange={() => setFirebaseDbType('realtime')}
                  className="form-radio text-yellow-600"
                />
                <span className="ml-2">Realtime Database</span>
              </label>
            </fieldset>
          </>
        )}

        <form className="space-y-4">
          {selectedDbConfig?.fields.map((field: any) => (
            <div key={field.key}>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {field.label}{' '}
                <span className="text-gray-400 italic text-xs">(e.g. {field.placeholder})</span>
              </label>

              {'isJson' in field && field.isJson ? (
                <Textarea
                  rows={8}
                  placeholder={field.placeholder}
                  value={formData[field.key] || ''}
                  onChange={(e) => handleInputChange(field.key, e.target.value)}
                  className="w-full border border-gray-300 rounded p-2 text-sm font-mono"
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
        </form>

        {/* Test steps list */}
        {testSteps.length > 0 && (
          <ul className="mt-4 space-y-2">
            {testSteps.map((step, idx) => (
              <li key={idx} className="flex items-center gap-2 text-sm">
                {step.status === 'pending' && <Loader2 className="w-4 h-4 animate-spin text-gray-500" />}
                {step.status === 'success' && <CheckCircle2 className="w-5 h-5 text-green-600" />}
                {step.status === 'error' && <XCircle className="w-5 h-5 text-red-600" />}
                <span className={step.status === 'error' ? 'text-red-600' : 'text-gray-800'}>
                  {step.label}
                </span>
                {step.status === 'error' && step.errorMessage && (
                  <span className="ml-2 italic text-red-500 text-xs">— {step.errorMessage}</span>
                )}
              </li>
            ))}
          </ul>
        )}

        <div className="flex space-x-4 pt-4">
          <Button
            onClick={handleTestConnection}
            variant="outline"
            className="bg-green-600 text-white hover:bg-green-700"
            disabled={loading}
          >
            {loading ? (
              <span className="flex items-center gap-2 justify-center">
                <Loader2 className="w-4 h-4 animate-spin" />
                Testing...
              </span>
            ) : (
              'Test Connection'
            )}
          </Button>
          <Button
            onClick={handleContinue}
            className="flex-1"
            disabled={!connectionSucceeded || loading}
          >
            {loading && connectionSucceeded ? (
              <span className="flex items-center gap-2 justify-center">
                <Loader2 className="w-4 h-4 animate-spin" />
                Saving...
              </span>
            ) : (
              'Continue'
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
