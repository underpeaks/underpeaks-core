'use client';

import { useState } from 'react';
import { FiCheck, FiRefreshCw } from 'react-icons/fi';

type ColorToken = {
  id: string;
  label: string;
  description: string;
  value: string;
  default: string;
};

const initialTokens: ColorToken[] = [
  { id: 'primary',      label: 'Primary',           description: 'Main brand colour — buttons, links, highlights',   value: '#111827', default: '#111827' },
  { id: 'primary-fg',   label: 'Primary Foreground', description: 'Text on primary colour backgrounds',               value: '#FFFFFF', default: '#FFFFFF' },
  { id: 'secondary',    label: 'Secondary',          description: 'Supporting brand colour',                          value: '#6B7280', default: '#6B7280' },
  { id: 'secondary-fg', label: 'Secondary Foreground',description: 'Text on secondary colour backgrounds',            value: '#FFFFFF', default: '#FFFFFF' },
  { id: 'accent',       label: 'Accent',             description: 'Highlight colour for badges and tags',             value: '#3B82F6', default: '#3B82F6' },
  { id: 'background',   label: 'Background',         description: 'Main app background',                              value: '#F9FAFB', default: '#F9FAFB' },
  { id: 'surface',      label: 'Surface',            description: 'Card and panel background',                        value: '#FFFFFF', default: '#FFFFFF' },
  { id: 'border',       label: 'Border',             description: 'Default border colour',                            value: '#E5E7EB', default: '#E5E7EB' },
  { id: 'success',      label: 'Success',            description: 'Positive states and confirmations',                value: '#10B981', default: '#10B981' },
  { id: 'warning',      label: 'Warning',            description: 'Warnings and caution states',                      value: '#F59E0B', default: '#F59E0B' },
  { id: 'danger',       label: 'Danger',             description: 'Errors and destructive actions',                   value: '#EF4444', default: '#EF4444' },
  { id: 'text',         label: 'Text Primary',       description: 'Main body text colour',                            value: '#111827', default: '#111827' },
  { id: 'text-muted',   label: 'Text Muted',         description: 'Secondary and placeholder text',                   value: '#6B7280', default: '#6B7280' },
];

function SectionCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
      <div className="px-5 py-3.5 border-b border-gray-100 bg-gray-50">
        <h3 className="text-sm font-semibold text-gray-800">{title}</h3>
      </div>
      <div className="px-5 py-4 flex flex-col gap-4">{children}</div>
    </div>
  );
}

export default function ColoursPage() {
  const [tokens, setTokens] = useState<ColorToken[]>(initialTokens);
  const [saving, setSaving] = useState(false);
  const [saved,  setSaved]  = useState(false);

  const updateToken = (id: string, value: string) => {
    setTokens((prev) => prev.map((t) => (t.id === id ? { ...t, value } : t)));
  };

  const resetToken = (id: string) => {
    setTokens((prev) => prev.map((t) => (t.id === id ? { ...t, value: t.default } : t)));
  };

  const resetAll = () => {
    setTokens((prev) => prev.map((t) => ({ ...t, value: t.default })));
  };

  const handleSave = () => {
    setSaving(true);
    setTimeout(() => {
      setSaving(false);
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    }, 800);
  };

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h2 className="text-lg font-bold text-gray-900">Colours</h2>
        <p className="text-sm text-gray-500 mt-0.5">
          Define the colour tokens used across your generated Flutter and Next.js apps.
        </p>
      </div>

      {/* Live preview strip */}
      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
        <div className="px-5 py-3.5 border-b border-gray-100 bg-gray-50">
          <p className="text-xs font-semibold text-gray-700">Live Preview</p>
        </div>
        <div className="px-5 py-4 flex items-center gap-3 flex-wrap">
          <button
            style={{ backgroundColor: tokens.find((t) => t.id === 'primary')?.value, color: tokens.find((t) => t.id === 'primary-fg')?.value }}
            className="px-4 py-2 rounded-md text-sm font-medium"
          >
            Primary Button
          </button>
          <button
            style={{ backgroundColor: tokens.find((t) => t.id === 'secondary')?.value, color: tokens.find((t) => t.id === 'secondary-fg')?.value }}
            className="px-4 py-2 rounded-md text-sm font-medium"
          >
            Secondary
          </button>
          <span
            style={{ backgroundColor: tokens.find((t) => t.id === 'accent')?.value + '20', color: tokens.find((t) => t.id === 'accent')?.value, borderColor: tokens.find((t) => t.id === 'accent')?.value + '40' }}
            className="px-3 py-1 rounded-full text-xs font-medium border"
          >
            Accent Badge
          </span>
          <span style={{ color: tokens.find((t) => t.id === 'success')?.value }} className="text-sm font-medium">✓ Success</span>
          <span style={{ color: tokens.find((t) => t.id === 'warning')?.value }} className="text-sm font-medium">⚠ Warning</span>
          <span style={{ color: tokens.find((t) => t.id === 'danger')?.value  }} className="text-sm font-medium">✕ Danger</span>
        </div>
      </div>

      {/* Colour tokens */}
      <SectionCard title="Colour Tokens">
        <div className="flex flex-col gap-1">
          {tokens.map((token) => (
            <div
              key={token.id}
              className="flex items-center gap-4 py-2.5 border-b border-gray-50 last:border-0"
            >
              {/* Colour picker */}
              <div className="relative shrink-0">
                <div
                  className="w-9 h-9 rounded-md border border-gray-200 shadow-sm cursor-pointer overflow-hidden"
                  style={{ backgroundColor: token.value }}
                >
                  <input
                    type="color"
                    value={token.value}
                    onChange={(e) => updateToken(token.id, e.target.value)}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  />
                </div>
              </div>

              {/* Label + description */}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-800">{token.label}</p>
                <p className="text-[11px] text-gray-400 truncate">{token.description}</p>
              </div>

              {/* Hex value */}
              <input
                type="text"
                value={token.value}
                onChange={(e) => {
                  const v = e.target.value;
                  if (/^#[0-9A-Fa-f]{0,6}$/.test(v)) updateToken(token.id, v);
                }}
                className="w-24 px-2 py-1.5 text-xs font-mono border border-gray-200 rounded-md bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-300 text-center"
              />

              {/* Reset */}
              <button
                onClick={() => resetToken(token.id)}
                title="Reset to default"
                className="p-1.5 rounded hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition shrink-0"
              >
                <FiRefreshCw size={12} />
              </button>
            </div>
          ))}
        </div>
      </SectionCard>

      {/* Footer actions */}
      <div className="flex items-center justify-between pt-1">
        <button
          onClick={resetAll}
          className="text-xs text-gray-400 hover:text-gray-600 hover:underline transition"
        >
          Reset all to defaults
        </button>
        <div className="flex items-center gap-3">
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
            {saving ? 'Saving…' : 'Save Colours'}
          </button>
        </div>
      </div>
    </div>
  );
}