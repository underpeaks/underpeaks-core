'use client';

/**
 * DashboardKpiConfigModal.tsx
 *
 * Same structure as KpiConfigModal (users page) but adds:
 *   - Collection picker at the top (system + developer collections)
 *   - Fields become free-text input (we can't know the schema
 *     of every developer collection at config time)
 *
 * The formula, format, icon, and colour sections are identical
 * to KpiConfigModal so developers get a consistent experience.
 */

import { useState, useEffect } from 'react';
import { X, BarChart2 } from 'lucide-react';
import { KpiFormula, KpiFormat, CustomOperator } from '../../kpi/kpi';
import { DashboardKpiConfig, DashboardCollection } from '../../types/dashboard';


// ── Options (same as KpiConfigModal) ─────────────────────────

const FORMULA_OPTIONS: { value: KpiFormula; label: string; description: string }[] = [
  { value: 'COUNT',          label: 'Count',          description: 'Total records' },
  { value: 'COUNT_DISTINCT', label: 'Count distinct', description: 'Unique field values' },
  { value: 'SUM',            label: 'Sum',            description: 'Add up a numeric field' },
  { value: 'AVG',            label: 'Average',        description: 'Mean of a field' },
  { value: 'MIN',            label: 'Minimum',        description: 'Lowest value' },
  { value: 'MAX',            label: 'Maximum',        description: 'Highest value' },
  { value: 'PERCENTAGE',     label: 'Percentage',     description: 'Matching records as % of total' },
  { value: 'RATIO',          label: 'Ratio',          description: 'Sum A ÷ Sum B' },
  { value: 'CUSTOM',         label: 'Custom',         description: 'Count rows where A op B' },
];

const FORMAT_OPTIONS: { value: KpiFormat; label: string }[] = [
  { value: 'compact',    label: 'Compact (1.2k)' },
  { value: 'full',       label: 'Full (1,234)' },
  { value: 'percentage', label: 'Percentage (84%)' },
  { value: 'currency',   label: 'Currency (R 1,234)' },
  { value: 'duration',   label: 'Duration (3 days)' },
];

const OPERATOR_OPTIONS: { value: CustomOperator; label: string }[] = [
  { value: '=',  label: '= equals' },
  { value: '!=', label: '≠ not equals' },
  { value: '>',  label: '> greater than' },
  { value: '<',  label: '< less than' },
  { value: '>=', label: '≥ ≥ or equal' },
  { value: '<=', label: '≤ ≤ or equal' },
];

const ICON_OPTIONS = [
  'bar-chart-2', 'users', 'file-text', 'cpu', 'image',
  'hard-drive', 'user-check', 'shield', 'menu', 'activity',
];

// ── Field text input ──────────────────────────────────────────
// Free-text because we can't know the schema of developer collections.
// Developer types the field name exactly as it appears in their DB.

function FieldInput({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value?: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <div className="space-y-1.5">
      {label && (
        <label className="text-xs font-medium text-[var(--color-text-muted)]">{label}</label>
      )}
      <input
        type="text"
        value={value ?? ''}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder ?? 'field_name'}
        className="w-full px-3 py-2 text-sm font-mono rounded-lg border border-gray-200
                   bg-white text-[var(--color-text)] placeholder:text-gray-300
                   focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
      />
    </div>
  );
}

// ── Component ─────────────────────────────────────────────────

interface Props {
  initial?:    DashboardKpiConfig | null;
  collections: DashboardCollection[];
  onSave:      (config: DashboardKpiConfig) => void;
  onClose:     () => void;
}

export default function DashboardKpiConfigModal({
  initial,
  collections,
  onSave,
  onClose,
}: Props) {
  const [label,       setLabel]       = useState(initial?.label        ?? '');
  const [collection,  setCollection]  = useState(initial?.collection   ?? collections[0]?.key ?? '');
  const [formula,     setFormula]     = useState<KpiFormula>(initial?.formula   ?? 'COUNT');
  const [format,      setFormat]      = useState<KpiFormat>(initial?.format    ?? 'compact');
  const [field,       setField]       = useState(initial?.field        ?? '');
  const [fieldA,      setFieldA]      = useState(initial?.field_a      ?? '');
  const [fieldB,      setFieldB]      = useState(initial?.field_b      ?? '');
  const [operator,    setOperator]    = useState<CustomOperator>(initial?.operator ?? '=');
  const [filterField, setFilterField] = useState(initial?.filter_field ?? '');
  const [filterValue, setFilterValue] = useState(initial?.filter_value ?? '');
  const [icon,        setIcon]        = useState(initial?.icon         ?? 'bar-chart-2');
  const [iconColour,  setIconColour]  = useState(initial?.colour       ?? '#5C6BC0');
  const [blockColour, setBlockColour] = useState(initial?.block_colour ?? '');
  const [fontColour,  setFontColour]  = useState(initial?.font_colour  ?? '');
  const [customBMode, setCustomBMode] = useState<'field' | 'value'>('value');
  const [customBValue,setCustomBValue]= useState('');
  const [error,       setError]       = useState('');

  // When collection changes, clear field inputs (they belong to the old schema)
  useEffect(() => {
    setField(''); setFieldA(''); setFieldB('');
    setFilterField(''); setFilterValue('');
    setCustomBValue(''); setError('');
  }, [collection, formula]);

  function validate(): boolean {
    if (!label.trim())      { setError('Label is required'); return false; }
    if (!collection.trim()) { setError('Collection is required'); return false; }
    if (['COUNT_DISTINCT', 'SUM', 'AVG', 'MIN', 'MAX'].includes(formula) && !field.trim()) {
      setError('Field name is required for this formula'); return false;
    }
    if (formula === 'PERCENTAGE' && (!filterField.trim() || !filterValue.trim())) {
      setError('Field and value are required for Percentage'); return false;
    }
    if (formula === 'RATIO' && (!fieldA.trim() || !fieldB.trim())) {
      setError('Both field names are required for Ratio'); return false;
    }
    if (formula === 'CUSTOM') {
      if (!fieldA.trim()) { setError('Field A is required'); return false; }
      if (customBMode === 'field' && !fieldB.trim()) { setError('Field B is required'); return false; }
      if (customBMode === 'value' && !customBValue.trim()) { setError('Comparison value required'); return false; }
    }
    return true;
  }

  function handleSave() {
    if (!validate()) return;
    const config: DashboardKpiConfig = {
      kpi_id:      initial?.kpi_id ?? crypto.randomUUID(),
      label:       label.trim(),
      collection:  collection.trim(),
      formula,
      format,
      icon,
      colour:      iconColour,
      block_colour: blockColour || undefined,
      font_colour:  fontColour  || undefined,
    };
    if (['COUNT_DISTINCT', 'SUM', 'AVG', 'MIN', 'MAX'].includes(formula)) config.field = field;
    if (formula === 'PERCENTAGE') { config.filter_field = filterField; config.filter_value = filterValue; }
    if (formula === 'RATIO')      { config.field_a = fieldA; config.field_b = fieldB; }
    if (formula === 'CUSTOM') {
      config.field_a  = fieldA;
      config.operator = operator;
      config.field_b  = customBMode === 'field' ? fieldB : `__value__:${customBValue.trim()}`;
    }
    onSave(config);
  }

  // Group collections for the picker
  const systemCollections    = collections.filter((c) => c.system);
  const developerCollections = collections.filter((c) => !c.system);

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div
        className="relative rounded-2xl border border-gray-200 w-full max-w-lg
                   shadow-2xl max-h-[90vh] overflow-y-auto"
        style={{ backgroundColor: '#ffffff' }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-6 py-4 border-b border-gray-200 sticky top-0 z-10"
          style={{ backgroundColor: '#ffffff' }}
        >
          <div className="flex items-center gap-2">
            <BarChart2 size={18} className="text-[var(--color-primary)]" />
            <h3 className="text-sm font-semibold text-[var(--color-text)]">
              {initial ? 'Edit KPI' : 'Add KPI'}
            </h3>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 transition-colors">
            <X size={16} />
          </button>
        </div>

        <div className="px-6 py-5 space-y-5">

          {/* Label */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-[var(--color-text-muted)]">Label *</label>
            <input
              type="text"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="e.g. Total Orders"
              className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200
                         bg-white text-[var(--color-text)]
                         focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
            />
          </div>

          {/* Collection picker */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-[var(--color-text-muted)]">Collection *</label>
            <select
              value={collection}
              onChange={(e) => setCollection(e.target.value)}
              className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200
                         bg-white text-[var(--color-text)]
                         focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
            >
              {systemCollections.length > 0 && (
                <optgroup label="System collections">
                  {systemCollections.map((c) => (
                    <option key={c.key} value={c.key}>{c.label}</option>
                  ))}
                </optgroup>
              )}
              {developerCollections.length > 0 && (
                <optgroup label="Your collections">
                  {developerCollections.map((c) => (
                    <option key={c.key} value={c.key}>{c.label}</option>
                  ))}
                </optgroup>
              )}
            </select>
            <p className="text-[10px] text-gray-400">
              Developer collections appear here once you create models in the Models section.
            </p>
          </div>

          {/* Formula */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-[var(--color-text-muted)]">Formula *</label>
            <div className="space-y-1.5">
              {FORMULA_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => setFormula(opt.value)}
                  className={`w-full flex items-center justify-between px-3 py-2.5
                              rounded-lg border text-left transition-colors ${
                    formula === opt.value
                      ? 'border-[var(--color-primary)] bg-[var(--color-primary)]/10'
                      : 'border-gray-200 hover:bg-gray-50'
                  }`}
                >
                  <span className={`text-sm font-medium ${
                    formula === opt.value ? 'text-[var(--color-primary)]' : 'text-[var(--color-text)]'
                  }`}>
                    {opt.label}
                  </span>
                  <span className="text-xs text-gray-400">{opt.description}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Field inputs — free text, not a dropdown */}
          {['COUNT_DISTINCT', 'SUM', 'AVG', 'MIN', 'MAX'].includes(formula) && (
            <FieldInput
              label="Field name"
              value={field}
              onChange={setField}
              placeholder="e.g. total_price"
            />
          )}

          {formula === 'PERCENTAGE' && (
            <div className="space-y-3">
              <FieldInput label="Field to check" value={filterField} onChange={setFilterField} placeholder="e.g. status" />
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-[var(--color-text-muted)]">Value to match</label>
                <input
                  type="text"
                  value={filterValue}
                  onChange={(e) => setFilterValue(e.target.value)}
                  placeholder='e.g. paid'
                  className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200
                             bg-white text-[var(--color-text)]
                             focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
                />
              </div>
            </div>
          )}

          {formula === 'RATIO' && (
            <div className="space-y-3">
              <FieldInput label="Numerator field (A)" value={fieldA} onChange={setFieldA} placeholder="e.g. revenue" />
              <FieldInput label="Denominator field (B)" value={fieldB} onChange={setFieldB} placeholder="e.g. sessions" />
            </div>
          )}

          {formula === 'CUSTOM' && (
            <div className="space-y-3">
              <FieldInput label="Field A" value={fieldA} onChange={setFieldA} placeholder="e.g. status" />
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-[var(--color-text-muted)]">Operator</label>
                <select
                  value={operator}
                  onChange={(e) => setOperator(e.target.value as CustomOperator)}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200
                             bg-white text-[var(--color-text)]
                             focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
                >
                  {OPERATOR_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-xs font-medium text-[var(--color-text-muted)]">Compare against</label>
                <div className="flex rounded-lg border border-gray-200 overflow-hidden">
                  <button
                    onClick={() => setCustomBMode('field')}
                    className={`flex-1 py-1.5 text-xs font-medium transition-colors ${
                      customBMode === 'field'
                        ? 'bg-[var(--color-primary)] text-white'
                        : 'text-gray-500 hover:bg-gray-50'
                    }`}
                  >
                    Another field
                  </button>
                  <button
                    onClick={() => setCustomBMode('value')}
                    className={`flex-1 py-1.5 text-xs font-medium transition-colors ${
                      customBMode === 'value'
                        ? 'bg-[var(--color-primary)] text-white'
                        : 'text-gray-500 hover:bg-gray-50'
                    }`}
                  >
                    A specific value
                  </button>
                </div>
                {customBMode === 'field' ? (
                  <FieldInput label="" value={fieldB} onChange={setFieldB} placeholder="field_name" />
                ) : (
                  <input
                    type="text"
                    value={customBValue}
                    onChange={(e) => setCustomBValue(e.target.value)}
                    placeholder='e.g. "paid" or 100'
                    className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200
                               bg-white text-[var(--color-text)]
                               focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
                  />
                )}
              </div>
            </div>
          )}

          {/* Format */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-[var(--color-text-muted)]">Display format</label>
            <select
              value={format}
              onChange={(e) => setFormat(e.target.value as KpiFormat)}
              className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200
                         bg-white text-[var(--color-text)]
                         focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
            >
              {FORMAT_OPTIONS.map((f) => (
                <option key={f.value} value={f.value}>{f.label}</option>
              ))}
            </select>
          </div>

          {/* Icon */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-[var(--color-text-muted)]">Icon</label>
            <div className="grid grid-cols-5 gap-2">
              {ICON_OPTIONS.map((name) => (
                <button
                  key={name}
                  onClick={() => setIcon(name)}
                  className={`py-2 px-1 rounded-lg border text-xs transition-colors ${
                    icon === name
                      ? 'border-[var(--color-primary)] bg-[var(--color-primary)]/10 text-[var(--color-primary)]'
                      : 'border-gray-200 text-gray-400 hover:bg-gray-50'
                  }`}
                >
                  {name.replace(/-/g, ' ')}
                </button>
              ))}
            </div>
          </div>

          {/* Colours */}
          <div className="space-y-3">
            <label className="text-xs font-semibold uppercase tracking-wider text-gray-400">Colours</label>
            {[
              { label: 'Icon colour',            value: iconColour,  setter: setIconColour },
              { label: 'Block background',        value: blockColour, setter: setBlockColour },
              { label: 'Value font colour',       value: fontColour,  setter: setFontColour },
            ].map(({ label: l, value: v, setter }) => (
              <div key={l} className="space-y-1.5">
                <label className="text-xs font-medium text-[var(--color-text-muted)]">{l}</label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={v || '#ffffff'}
                    onChange={(e) => setter(e.target.value)}
                    className="w-9 h-9 rounded-lg border border-gray-200 cursor-pointer p-0.5 flex-shrink-0"
                  />
                  <span className="text-xs text-gray-400">{v || 'Default'}</span>
                  {v && (
                    <button onClick={() => setter('')} className="text-xs text-gray-400 hover:text-red-500 ml-auto">
                      Clear
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>

          {error && (
            <p className="text-xs text-red-500 flex items-center gap-1.5">
              <X size={12} /> {error}
            </p>
          )}
        </div>

        {/* Footer */}
        <div
          className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-200 sticky bottom-0"
          style={{ backgroundColor: '#ffffff' }}
        >
          <button onClick={onClose} className="px-4 py-2 text-sm rounded-lg border border-gray-200 text-[var(--color-text)] hover:bg-gray-50 transition-colors">
            Cancel
          </button>
          <button onClick={handleSave} className="px-4 py-2 text-sm rounded-lg bg-[var(--color-primary)] text-white hover:opacity-90 transition-opacity font-medium">
            {initial ? 'Save changes' : 'Add KPI'}
          </button>
        </div>
      </div>
    </div>
  );
}