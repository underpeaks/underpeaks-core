'use client';

import { useState } from 'react';
import { FiCheck } from 'react-icons/fi';

const googleFonts = [
  { id: 'inter',        label: 'Inter',         category: 'Sans-serif' },
  { id: 'roboto',       label: 'Roboto',        category: 'Sans-serif' },
  { id: 'poppins',      label: 'Poppins',       category: 'Sans-serif' },
  { id: 'nunito',       label: 'Nunito',        category: 'Sans-serif' },
  { id: 'lato',         label: 'Lato',          category: 'Sans-serif' },
  { id: 'open-sans',    label: 'Open Sans',     category: 'Sans-serif' },
  { id: 'montserrat',   label: 'Montserrat',    category: 'Sans-serif' },
  { id: 'raleway',      label: 'Raleway',       category: 'Sans-serif' },
  { id: 'playfair',     label: 'Playfair Display', category: 'Serif'   },
  { id: 'merriweather', label: 'Merriweather',  category: 'Serif'      },
  { id: 'lora',         label: 'Lora',          category: 'Serif'      },
  { id: 'source-code',  label: 'Source Code Pro', category: 'Monospace'},
  { id: 'fira-code',    label: 'Fira Code',     category: 'Monospace'  },
];

const fontSizeScales = [
  { id: 'compact', label: 'Compact',  description: 'Smaller text, tighter spacing' },
  { id: 'default', label: 'Default',  description: 'Balanced for most apps'        },
  { id: 'relaxed', label: 'Relaxed',  description: 'Larger text, more breathing room' },
];

const fontWeights = ['300', '400', '500', '600', '700', '800'];

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

export default function TypographyPage() {
  const [headingFont,   setHeadingFont]   = useState('poppins');
  const [bodyFont,      setBodyFont]      = useState('inter');
  const [monoFont,      setMonoFont]      = useState('fira-code');
  const [scale,         setScale]         = useState('default');
  const [headingWeight, setHeadingWeight] = useState('700');
  const [bodyWeight,    setBodyWeight]    = useState('400');
  const [saving,        setSaving]        = useState(false);
  const [saved,         setSaved]         = useState(false);

  const getFontLabel = (id: string) => googleFonts.find((f) => f.id === id)?.label ?? id;

  const handleSave = () => {
    setSaving(true);
    setTimeout(() => { setSaving(false); setSaved(true); setTimeout(() => setSaved(false), 2500); }, 800);
  };

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h2 className="text-lg font-bold text-gray-900">Typography</h2>
        <p className="text-sm text-gray-500 mt-0.5">
          Choose fonts and scale for your generated apps. Fonts are loaded from Google Fonts.
        </p>
      </div>

      {/* Live preview */}
      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
        <div className="px-5 py-3.5 border-b border-gray-100 bg-gray-50">
          <p className="text-xs font-semibold text-gray-700">Live Preview</p>
        </div>
        <div className="px-5 py-4 flex flex-col gap-2">
          <p className="text-2xl font-bold text-gray-900">{getFontLabel(headingFont)} — Heading</p>
          <p className="text-base text-gray-600">
            {getFontLabel(bodyFont)} — The quick brown fox jumps over the lazy dog. Body text example at default size.
          </p>
          <p className="text-xs font-mono text-gray-500 bg-gray-50 px-2 py-1 rounded w-fit">
            {getFontLabel(monoFont)} — const value = "monospace";
          </p>
        </div>
      </div>

      {/* Font selection */}
      <SectionCard title="Font Families" description="Select from Google Fonts — included automatically in code generation">
        {[
          { label: 'Heading Font', value: headingFont, set: setHeadingFont, categories: ['Sans-serif', 'Serif'] },
          { label: 'Body Font',    value: bodyFont,    set: setBodyFont,    categories: ['Sans-serif', 'Serif'] },
          { label: 'Mono Font',    value: monoFont,    set: setMonoFont,    categories: ['Monospace']           },
        ].map((row) => (
          <div key={row.label} className="flex flex-col gap-1">
            <label className="text-xs font-semibold text-gray-700">{row.label}</label>
            <select
              value={row.value}
              onChange={(e) => row.set(e.target.value)}
              className="px-3 py-2 text-sm border border-gray-200 rounded-md bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-300 transition"
            >
              {row.categories.map((cat) => (
                <optgroup key={cat} label={cat}>
                  {googleFonts.filter((f) => f.category === cat).map((f) => (
                    <option key={f.id} value={f.id}>{f.label}</option>
                  ))}
                </optgroup>
              ))}
            </select>
          </div>
        ))}
      </SectionCard>

      {/* Font weights */}
      <SectionCard title="Font Weights">
        {[
          { label: 'Heading Weight', value: headingWeight, set: setHeadingWeight },
          { label: 'Body Weight',    value: bodyWeight,    set: setBodyWeight    },
        ].map((row) => (
          <div key={row.label} className="flex flex-col gap-1">
            <label className="text-xs font-semibold text-gray-700">{row.label}</label>
            <div className="flex gap-2 flex-wrap">
              {fontWeights.map((w) => (
                <button
                  key={w}
                  onClick={() => row.set(w)}
                  style={{ fontWeight: parseInt(w) }}
                  className={`px-3 py-1.5 text-sm rounded-md border transition ${
                    row.value === w
                      ? 'bg-gray-900 text-white border-gray-900'
                      : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
                  }`}
                >
                  {w}
                </button>
              ))}
            </div>
          </div>
        ))}
      </SectionCard>

      {/* Scale */}
      <SectionCard title="Font Size Scale" description="Controls the overall text size across the app">
        <div className="grid grid-cols-3 gap-3">
          {fontSizeScales.map((s) => (
            <button
              key={s.id}
              onClick={() => setScale(s.id)}
              className={`flex flex-col gap-1 p-3 rounded-lg border text-left transition ${
                scale === s.id
                  ? 'bg-gray-900 text-white border-gray-900'
                  : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
              }`}
            >
              <p className="text-sm font-semibold">{s.label}</p>
              <p className={`text-[11px] ${scale === s.id ? 'text-gray-300' : 'text-gray-400'}`}>
                {s.description}
              </p>
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
          {saving ? 'Saving…' : 'Save Typography'}
        </button>
      </div>
    </div>
  );
}