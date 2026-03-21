'use client';

import { useState, useRef } from 'react';
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
      { key: 'supabaseUrl', label: 'Supabase URL', placeholder: 'https://xyzcompany.supabase.co' },
      { key: 'anonKey', label: 'Supabase Anon Key', placeholder: 'eyJhbGciOiJIUzI1NiIsInR...' },
      { key: 'storageUrl', label: 'Supabase Storage URL', placeholder: 'https://<project>.supabase.co/storage/v1/object/public/nxt_storage' },
    ],
  },
  {
    value: 'firebase',
    name: 'Firebase',
    description: 'Mobile-first apps, real-time DB & auth.',
    icon: <SiFirebase className="w-5 h-5 text-yellow-600" />,
    fields: [
      { key: 'firebaseConfigJson', label: 'Firebase Service Account JSON', placeholder: 'Paste full Firebase service account JSON here', isJson: true },
      { key: 'firebaseWebConfig', label: 'Firebase Web Config (firebaseConfig)', placeholder: 'Paste the firebaseConfig object here', isJson: true },
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
      { key: 'connectionString', label: 'Connection String', placeholder: 'mongodb+srv://user:<password>@cluster.mongodb.net' },
      { key: 'databaseName', label: 'Database Name', placeholder: 'nxt_flutter' },
    ],
  },
];

type TestStep = { label: string; status: 'pending' | 'success' | 'error'; errorMessage?: string };

export default function DatabaseConfigPage() {
  const router = useRouter();
  const [selectedDb, setSelectedDb] = useState<DBType>('supabase');
  const [formData, setFormData] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [testSteps, setTestSteps] = useState<TestStep[]>([]);
  const [connectionSucceeded, setConnectionSucceeded] = useState(false);
  const [firebaseDbType, setFirebaseDbType] = useState<'firestore' | 'realtime'>('firestore');
  const setInstallerValue = useInstallerStore((s) => s.setInstallerValue);
  const selectedDbConfig = DATABASES.find((db) => db.value === selectedDb);
  const [showSavingWarning, setShowSavingWarning] = useState(false);
  const loadingRef = useRef(false);

  function logStep(step: string, data?: any) {
    const time = new Date().toISOString();
    console.log(`⏱ [${time}] ${step}`, data ?? '');
  }

  function handleSelect(value: string) {
    const dbType = value as DBType;
    logStep('Database selected', dbType);
    setSelectedDb(dbType);
    setFormData({});
    setTestSteps([]);
    setConnectionSucceeded(false);
    setInstallerValue('selectedDb', dbType);
  }

  function handleInputChange(key: string, value: string) {
    logStep('Input changed', { key, value });
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

  async function handleTestConnection() {
    logStep('Starting test connection');
    setLoading(true);
    loadingRef.current = true;
    setConnectionSucceeded(false);
    setTestSteps([
      { label: 'Validating configuration...', status: 'pending' },
      { label: 'Sending config to server...', status: 'pending' },
      { label: 'Testing database connection...', status: 'pending' },
      { label: 'Finalizing connection check...', status: 'pending' },
    ]);

    try {
      setTestSteps((s) => s.map((x, i) => (i === 0 ? { ...x, status: 'success' } : x)));

      let dbConfigToSend: any;
      if (selectedDb === 'firebase') {
        let webConfigJson = formData['firebaseWebConfig'] || '';
        let webConfig: any = {};
        try {
          webConfig = JSON.parse(webConfigJson);
        } catch {
          webConfigJson = webConfigJson.replace(/const\s+\w+\s*=\s*/, '').replace(/;$/, '');
          webConfigJson = webConfigJson.replace(/([{,]\s*)([a-zA-Z0-9_]+)\s*:/g, '$1"$2":');
          webConfig = JSON.parse(webConfigJson);
        }
        dbConfigToSend = {
          type: 'firebase',
          firebaseConfigJson: formData['firebaseConfigJson'],
          firebaseDbType,
          storageBucket: webConfig.storageBucket || undefined,
          firebaseWebConfig: webConfig,
        };
      } else {
        dbConfigToSend = { type: selectedDb, ...formData };
      }

      logStep('Sending test connection request', dbConfigToSend);

      const response = await fetch('/api/test-db-connection', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(dbConfigToSend),
      });

      logStep('Server responded', { status: response.status });
      if (!response.ok) throw new Error(`Server rejected connection: ${response.status}`);

      const result = await response.json();
      logStep('Server result', result);
      if (!result.success) throw new Error(result.error || 'Connection failed');

      setTestSteps((s) => s.map((x, i) => (i >= 1 ? { ...x, status: 'success' } : x)));
      setConnectionSucceeded(true);
      logStep('Test connection succeeded');
    } catch (err: any) {
      setTestSteps((s) => s.map((x, i) => (i === 2 ? { ...x, status: 'error', errorMessage: err.message } : x)));
      console.error('❌ Test connection failed', err);
    } finally {
      setLoading(false);
      loadingRef.current = false;
    }
  }

  async function handleContinue() {
    logStep('Starting continue/save process');
    setShowSavingWarning(true);
    setLoading(true);
    loadingRef.current = true;

    try {
      const installerStore = useInstallerStore.getState();
      let envPayload: any;

      if (selectedDb === 'firebase') {
        let webConfigJson = formData['firebaseWebConfig'] || '';
        let webConfig: any = {};
        try {
          webConfig = JSON.parse(webConfigJson);
        } catch {
          webConfigJson = webConfigJson.replace(/const\s+\w+\s*=\s*/, '').replace(/;$/, '');
          webConfigJson = webConfigJson.replace(/([{,]\s*)([a-zA-Z0-9_]+)\s*:/g, '$1"$2":');
          webConfig = JSON.parse(webConfigJson);
        }
        envPayload = {
          type: 'firebase',
          domain: installerStore.domain,
          firebaseConfigJson: formData['firebaseConfigJson'],
          firebaseWebConfig: webConfig,
          firebaseDbType,
          storageBucket: webConfig.storageBucket || undefined,
        };
      } else {
        envPayload = { type: selectedDb, domain: installerStore.domain, ...formData };
      }

      logStep('Payload to save', envPayload);

      setInstallerValue('selectedDb', selectedDb);
      setInstallerValue('dbConfig', envPayload);

      const res = await fetch('/api/save-db-config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(envPayload),
      });

      logStep('Save config response status', res.status);
      const data = await res.json();
      logStep('Save config response body', data);

      if (!res.ok || !data.success) throw new Error(data.error || 'Failed to save configuration');

      localStorage.setItem('dbConfigured', 'true');
      await Promise.resolve();
      logStep('Navigating to demo page');
      router.push('/installer/demo');
    } catch (err: any) {
      console.error('❌ Failed to save configuration', err);
      alert(`Failed to save configuration: ${err.message}`);
      setLoading(false);
      loadingRef.current = false;
    }
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
          Select your database and provide the necessary connection details. You can test your connection before continuing.
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

        {testSteps.length > 0 && (
          <ul className="mt-4 space-y-2">
            {testSteps.map((step, idx) => (
              <li key={idx} className="flex items-center gap-2 text-sm">
                {step.status === 'pending' && <Loader2 className="w-4 h-4 animate-spin text-gray-500" />}
                {step.status === 'success' && <CheckCircle2 className="w-5 h-5 text-green-600" />}
                {step.status === 'error' && <XCircle className="w-5 h-5 text-red-600" />}
                <span className={step.status === 'error' ? 'text-red-600' : 'text-gray-800'}>{step.label}</span>
                {step.status === 'error' && step.errorMessage && (
                  <span className="ml-2 italic text-red-500 text-xs">— {step.errorMessage}</span>
                )}
              </li>
            ))}
          </ul>
        )}

        <div className="flex flex-col space-y-2 pt-4">
          {showSavingWarning && (
            <div className="p-4 bg-yellow-100 text-yellow-800 rounded text-sm font-mono">
              ⚠️ Please be patient, this might take a while...
            </div>
          )}

          <div className="flex space-x-4">
            <Button
              onClick={handleTestConnection}
              variant="outline"
              className="bg-green-600 text-white hover:bg-green-700"
              disabled={loading || loadingRef.current}
            >
              {loading && !connectionSucceeded ? (
                <span className="flex items-center gap-2 justify-center">
                  <Loader2 className="w-4 h-4 animate-spin" /> Testing...
                </span>
              ) : (
                'Test Connection'
              )}
            </Button>

            <Button
              onClick={handleContinue}
              className="flex-1"
              disabled={!connectionSucceeded || loading || loadingRef.current}
            >
              {loading && connectionSucceeded ? (
                <span className="flex items-center gap-2 justify-center">
                  <Loader2 className="w-4 h-4 animate-spin" /> Saving...
                </span>
              ) : (
                'Continue'
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
