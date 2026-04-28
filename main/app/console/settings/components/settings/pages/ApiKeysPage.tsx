'use client';

import { SectionCard, Field, Input } from '../shared';

const keys = [
  { name: 'Production Key', key: 'nxt_live_••••••••••••3a9f', created: '12 Jan 2025' },
  { name: 'Dev Key',        key: 'nxt_test_••••••••••••7c2d', created: '3 Mar 2025'  },
];

export default function ApiKeysPage() {
  return (
    <div className="flex flex-col gap-5">
      <div>
        <h2 className="text-lg font-bold text-gray-900">API Keys</h2>
        <p className="text-sm text-gray-500 mt-0.5">Manage keys used to authenticate API requests.</p>
      </div>

      <SectionCard title="Active Keys">
        <div className="flex flex-col gap-3">
          {keys.map((k) => (
            <div key={k.name} className="flex items-center justify-between p-3 bg-gray-50 border border-gray-200 rounded-md">
              <div>
                <p className="text-sm font-semibold text-gray-800">{k.name}</p>
                <p className="text-xs text-gray-400 font-mono mt-0.5">{k.key}</p>
                <p className="text-[11px] text-gray-400 mt-0.5">Created {k.created}</p>
              </div>
              <button className="text-xs text-red-500 hover:underline">Revoke</button>
            </div>
          ))}
        </div>
      </SectionCard>

      <SectionCard title="Create New Key">
        <Field label="Key Name">
          <Input placeholder="e.g. Staging Key" />
        </Field>
        <div className="flex justify-end">
          <button className="px-5 py-2 bg-gray-900 text-white text-sm font-medium rounded-md hover:bg-gray-700 transition">
            Generate Key
          </button>
        </div>
      </SectionCard>
    </div>
  );
}