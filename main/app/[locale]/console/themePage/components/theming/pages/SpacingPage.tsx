'use client';

import { useState } from 'react';
import { FiCheck } from 'react-icons/fi';

const radiusOptions = [
  { id: 'none',   label: 'None',    preview: '0px',    class: 'rounded-none'  },
  { id: 'sm',     label: 'Small',   preview: '4px',    class: 'rounded'       },
  { id: 'md',     label: 'Medium',  preview: '8px',    class: 'rounded-md'    },
  { id: 'lg',     label: 'Large',   preview: '12px',   class: 'rounded-lg'    },
  { id: 'xl',     label: 'X-Large', preview: '16px',   class: 'rounded-xl'    },
  { id: 'full',   label: 'Pill',    preview: '9999px', class: 'rounded-full'  },
];

const densityOptions = [
  { id: 'compact',  label: 'Compact',  description: 'Tight padding, more content visible'  },
  { id: 'default',  label: 'Default',  description: 'Balanced spacing for most use cases'  },
  { id: 'relaxed',  label: 'Relaxed',  description: 'Generous padding, easier to tap'      },
];

const shadowOptions = [
  { id: 'none',   label: 'None'   },
  { id: 'sm',     label: 'Subtle' },
  { id: 'md',     label: 'Medium' },
  { id: 'lg',     label: 'Strong' },
];

function SectionCard({ title, description, children }: { title: string; description?: string; children: React.ReactNode }) {
  return (
    <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
      <div className="px-5 py-3.5 border-b border-gray-100 bg-gray-50">
        <h3 className="text-sm font-semibold text-gray-800">{title}</h3>
        {description && <p className="text-xs text-gray-400 mt-0.5">{description}</p>}
      </div>
      <div className="px-5 py-4 flex flex-col gap-4">{children}</div>
    </div>
  );
}

export default function SpacingPage() {
  const [radius,  setRadius]  = useState('md');
  const [density, setDensity] = useState('default');
  const [shadow,  setShadow]  = useState('sm');
  const [saving,  setSaving]  = useState(false);
  const [saved,   setSaved]   = useState(false);

  const selectedRadius = radiusOptions.find((r) => r.id === radius)!;

  const handleSave = () => {
    setSaving(true);
    setTimeout(() => { setSaving(false); setSaved(true); setTimeout(() => setSaved(false), 2500); }, 800);
  };

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h2 className="text-lg font-bold text-gray-900">Spacing & Radius</h2>
        <p className="text-sm text-gray-500 mt-0.5">
          Control the shape, density and elevation of components in your generated apps.
        </p>
      </div>

      {/* Preview */}
      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
        <div className="px-5 py-3.5 border-b border-gray-100 bg-gray-50">
          <p className="text-xs font-semibold text-gray-700">Live Preview</p>
        </div>
        <div className="px-5 py-6 flex items-center gap-4 flex-wrap">
          <button
            className={`px-5 py-2.5 bg-gray-900 text-white text-sm font-medium transition-all ${selectedRadius.class} ${
              shadow === 'sm' ? 'shadow-sm' : shadow === 'md' ? 'shadow-md' : shadow === 'lg' ? 'shadow-lg' : ''
            }`}
          >
            Button
          </button>
          <div
            className={`px-4 py-3 bg-white border border-gray-200 text-sm text-gray-700 w-40 transition-all ${selectedRadius.class} ${
              shadow === 'sm' ? 'shadow-sm' : shadow === 'md' ? 'shadow-md' : shadow === 'lg' ? 'shadow-lg' : ''
            }`}
          >
            Card component
          </div>
          <input
            readOnly
            value="Input field"
            className={`px-3 py-2 border border-gray-200 text-sm text-gray-500 bg-gray-50 w-36 outline-none ${selectedRadius.class}`}
          />
        </div>
      </div>

      {/* Border radius */}
      <SectionCard title="Border Radius" description="Applied to buttons, cards, inputs and modals">
        <div className="grid grid-cols-3 gap-3">
          {radiusOptions.map((r) => (
            <button
              key={r.id}
              onClick={() => setRadius(r.id)}
              className={`flex flex-col items-center gap-2 p-3 border rounded-lg transition ${
                radius === r.id
                  ? 'bg-gray-900 border-gray-900 text-white'
                  : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50'
              }`}
            >
              <div
                className={`w-8 h-8 border-2 ${radius === r.id ? 'border-white' : 'border-gray-300'} ${r.class}`}
              />
              <div>
                <p className="text-xs font-semibold">{r.label}</p>
                <p className={`text-[10px] ${radius === r.id ? 'text-gray-300' : 'text-gray-400'}`}>{r.preview}</p>
              </div>
            </button>
          ))}
        </div>
      </SectionCard>

      {/* Density */}
      <SectionCard title="Spacing Density" description="Controls padding inside components">
        <div className="grid grid-cols-3 gap-3">
          {densityOptions.map((d) => (
            <button
              key={d.id}
              onClick={() => setDensity(d.id)}
              className={`flex flex-col gap-1 p-3 rounded-lg border text-left transition ${
                density === d.id
                  ? 'bg-gray-900 text-white border-gray-900'
                  : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
              }`}
            >
              <p className="text-sm font-semibold">{d.label}</p>
              <p className={`text-[11px] ${density === d.id ? 'text-gray-300' : 'text-gray-400'}`}>
                {d.description}
              </p>
            </button>
          ))}
        </div>
      </SectionCard>

      {/* Shadow */}
      <SectionCard title="Elevation / Shadow" description="Card and component shadow depth">
        <div className="grid grid-cols-4 gap-3">
          {shadowOptions.map((s) => (
            <button
              key={s.id}
              onClick={() => setShadow(s.id)}
              className={`flex flex-col items-center gap-2 p-3 border rounded-lg transition ${
                shadow === s.id
                  ? 'bg-gray-900 border-gray-900 text-white'
                  : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50'
              }`}
            >
              <div
                className={`w-10 h-10 bg-white border border-gray-200 rounded-md ${
                  s.id === 'sm' ? 'shadow-sm' : s.id === 'md' ? 'shadow-md' : s.id === 'lg' ? 'shadow-lg' : ''
                }`}
              />
              <p className="text-xs font-semibold">{s.label}</p>
            </button>
          ))}
        </div>
      </SectionCard>

      {/* Save */}
      <div className="flex items-center justify-end gap-3 pt-1">
        {saved && (
          <p className="text-xs text-green-600 flex items-center gap-1">
            <FiCheck size={13} /> Saved
          </p>
        )}
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 px-5 py-2 bg-gray-900 text-white text-sm font-medium rounded-md hover:bg-gray-700 disabled:opacity-50 transition"
        >
          {saving && <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
          {saving ? 'Saving…' : 'Save Spacing'}
        </button>
      </div>
    </div>
  );
}