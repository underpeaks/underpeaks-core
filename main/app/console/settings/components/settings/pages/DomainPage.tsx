'use client';

import { SectionCard, Field, Input } from '../shared';

export default function DomainsPage() {
  return (
    <div className="flex flex-col gap-5">
      <div>
        <h2 className="text-lg font-bold text-gray-900">Domains</h2>
        <p className="text-sm text-gray-500 mt-0.5">Add and verify custom domains for your project.</p>
      </div>

      <SectionCard title="Add Domain">
        <Field label="Custom Domain">
          <div className="flex gap-2">
            <Input placeholder="app.yourdomain.com" />
            <button className="px-4 py-2 bg-gray-900 text-white text-sm font-medium rounded-md hover:bg-gray-700 transition whitespace-nowrap">
              Add
            </button>
          </div>
        </Field>
      </SectionCard>

      <SectionCard title="Verified Domains">
        <div className="flex items-center justify-between p-3 bg-gray-50 border border-gray-200 rounded-md">
          <div>
            <p className="text-sm font-semibold text-gray-800">app.her.co.za</p>
            <p className="text-[11px] text-green-500 mt-0.5">✓ Verified</p>
          </div>
          <button className="text-xs text-red-500 hover:underline">Remove</button>
        </div>
      </SectionCard>
    </div>
  );
}