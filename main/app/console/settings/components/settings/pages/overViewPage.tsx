'use client';

import { SectionCard, Field, Input, SaveButton } from '../shared';

const stats = [
  { label: 'Total Users',     value: '1,284'      },
  { label: 'API Keys Active', value: '3'          },
  { label: 'DB Type',         value: 'Supabase'   },
  { label: 'Environment',     value: 'Production' },
];

export default function OverviewPage() {
  return (
    <div className="flex flex-col gap-5">
      <div>
        <h2 className="text-lg font-bold text-gray-900">Project Overview</h2>
        <p className="text-sm text-gray-500 mt-0.5">A snapshot of your self-hosted NXTFlutter project.</p>
      </div>

      <div className="grid grid-cols-2 gap-4">
        {stats.map((s) => (
          <div key={s.label} className="bg-white border border-gray-200 rounded-lg px-5 py-4">
            <p className="text-xs text-gray-400 font-medium">{s.label}</p>
            <p className="text-xl font-bold text-gray-900 mt-1">{s.value}</p>
          </div>
        ))}
      </div>

      <SectionCard title="Project Info">
        <Field label="Project Name">
          <Input placeholder="My NXTFlutter App" />
        </Field>
        <Field label="Project URL" hint="The public URL of your deployed app.">
          <Input placeholder="https://app.example.com" />
        </Field>
      </SectionCard>

      <SaveButton />
    </div>
  );
}