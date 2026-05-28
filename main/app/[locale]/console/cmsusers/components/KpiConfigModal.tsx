// ============================================================
// FILE: app/[locale]/console/users/components/KpiConfigModal.tsx
// ============================================================

'use client';

import { useState, useEffect } from 'react';
import {
  X, BarChart2,
  Users, UserCheck, UserX, Shield, Activity,
  TrendingUp, TrendingDown, Clock, Calendar,
} from 'lucide-react';
import { KpiConfig, KpiFormula, KpiFormat, CustomOperator } from '../../kpi/kpi';


interface KpiConfigModalProps {
  initial?: KpiConfig | null;
  availableFields: { value: string; label: string }[];
  onSave: (config: KpiConfig) => void;
  onClose: () => void;
}

const ICON_OPTIONS: { value: string; label: string; node: React.ReactNode }[] = [
  { value: 'bar-chart-2',   label: 'Bar chart',    node: <BarChart2 size={15} /> },
  { value: 'users',         label: 'Users',         node: <Users size={15} /> },
  { value: 'user-check',    label: 'User check',    node: <UserCheck size={15} /> },
  { value: 'user-x',        label: 'User X',        node: <UserX size={15} /> },
  { value: 'shield',        label: 'Shield',        node: <Shield size={15} /> },
  { value: 'activity',      label: 'Activity',      node: <Activity size={15} /> },
  { value: 'trending-up',   label: 'Trend up',      node: <TrendingUp size={15} /> },
  { value: 'trending-down', label: 'Trend down',    node: <TrendingDown size={15} /> },
  { value: 'clock',         label: 'Clock',         node: <Clock size={15} /> },
  { value: 'calendar',      label: 'Calendar',      node: <Calendar size={15} /> },
];

const FORMULA_OPTIONS: { value: KpiFormula; label: string; description: string }[] = [
  { value: 'COUNT',          label: 'Count',          description: 'Total number of records' },
  { value: 'COUNT_DISTINCT', label: 'Count distinct', description: 'Unique values in a field' },
  { value: 'SUM',            label: 'Sum',            description: 'Add up a numeric field' },
  { value: 'AVG',            label: 'Average',        description: 'Mean value of a field' },
  { value: 'MIN',            label: 'Minimum',        description: 'Lowest value in a field' },
  { value: 'MAX',            label: 'Maximum',        description: 'Highest value in a field' },
  { value: 'PERCENTAGE',     label: 'Percentage',     description: 'Matching records as % of total' },
  { value: 'RATIO',          label: 'Ratio',          description: 'Sum of A ÷ Sum of B' },
  { value: 'CUSTOM',         label: 'Custom',         description: 'Count rows where A op B' },
];

const FORMAT_OPTIONS: { value: KpiFormat; label: string }[] = [
  { value: 'compact',    label: 'Compact (1.2k)' },
  { value: 'full',       label: 'Full number (1,234)' },
  { value: 'percentage', label: 'Percentage (84%)' },
  { value: 'currency',   label: 'Currency (R 1,234)' },
  { value: 'duration',   label: 'Duration (3 days)' },
];

const OPERATOR_OPTIONS: { value: CustomOperator; label: string }[] = [
  { value: '=',  label: '= equals' },
  { value: '!=', label: '≠ not equals' },
  { value: '>',  label: '> greater than' },
  { value: '<',  label: '< less than' },
  { value: '>=', label: '≥ greater or equal' },
  { value: '<=', label: '≤ less or equal' },
];

// Extended KpiConfig with visual extras stored alongside the config
export interface KpiConfigExtended extends KpiConfig {
  block_colour?: string;
  font_colour?: string;
}

function FieldSelect({
  label,
  value,
  onChange,
  fields,
  placeholder = 'Select field…',
}: {
  label: string;
  value?: string;
  onChange: (v: string) => void;
  fields: { value: string; label: string }[];
  placeholder?: string;
}) {
  return (
    <div className="space-y-1.5">
      {label && (
        <label className="text-xs font-medium text-[var(--color-text-muted)]">
          {label}
        </label>
      )}
      <select
        value={value ?? ''}
        onChange={(e) => onChange(e.target.value)}
        className="w-full px-3 py-2 text-sm rounded-lg border border-[var(--color-border)]
                   bg-white text-[var(--color-text)]
                   focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
      >
        <option value="">{placeholder}</option>
        {fields.map((f) => (
          <option key={f.value} value={f.value}>{f.label}</option>
        ))}
      </select>
    </div>
  );
}

// Small colour swatch + hex label
function ColourRow({
  label,
  value,
  onChange,
  onClear,
  preview,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  onClear?: () => void;
  preview?: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <label className="text-xs font-medium text-[var(--color-text-muted)]">{label}</label>
      <div className="flex items-center gap-2">
        <input
          type="color"
          value={value || '#ffffff'}
          onChange={(e) => onChange(e.target.value)}
          className="w-9 h-9 rounded-lg border border-[var(--color-border)] cursor-pointer p-0.5 flex-shrink-0"
        />
        {preview ? (
          <div className="flex-1 flex items-center gap-2 px-3 py-2 rounded-lg border
                          border-[var(--color-border)] text-sm min-w-0">
            {preview}
            <span className="text-xs text-[var(--color-text-muted)] truncate">{value}</span>
          </div>
        ) : (
          <div className="flex-1 flex items-center justify-between px-3 py-2 rounded-lg border
                          border-[var(--color-border)] min-w-0">
            <span className="text-xs text-[var(--color-text-muted)] truncate">{value || 'Default'}</span>
            {onClear && value && (
              <button
                onClick={onClear}
                className="text-xs text-[var(--color-text-muted)] hover:text-red-500 ml-2 flex-shrink-0"
              >
                Clear
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default function KpiConfigModal({
  initial,
  availableFields,
  onSave,
  onClose,
}: KpiConfigModalProps) {
  const ext = initial as KpiConfigExtended | null | undefined;

  const [label,        setLabel]       = useState(initial?.label        ?? '');
  const [formula,      setFormula]     = useState<KpiFormula>(initial?.formula  ?? 'COUNT');
  const [format,       setFormat]      = useState<KpiFormat>(initial?.format   ?? 'compact');
  const [field,        setField]       = useState(initial?.field        ?? '');
  const [fieldA,       setFieldA]      = useState(initial?.field_a      ?? '');
  const [fieldB,       setFieldB]      = useState(initial?.field_b      ?? '');
  const [operator,     setOperator]    = useState<CustomOperator>(initial?.operator ?? '=');
  const [filterField,  setFilterField] = useState(initial?.filter_field ?? '');
  const [filterValue,  setFilterValue] = useState(initial?.filter_value ?? '');
  const [icon,         setIcon]        = useState(initial?.icon         ?? 'bar-chart-2');
  const [iconColour,   setIconColour]  = useState(initial?.colour       ?? '#5C6BC0');
  const [blockColour,  setBlockColour] = useState(ext?.block_colour     ?? '');
  const [fontColour,   setFontColour]  = useState(ext?.font_colour      ?? '');
  const [customBMode,  setCustomBMode] = useState<'field' | 'value'>('value');
  const [customBValue, setCustomBValue] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    setField(''); setFieldA(''); setFieldB('');
    setFilterField(''); setFilterValue('');
    setCustomBValue(''); setError('');
  }, [formula]);

  function validate(): boolean {
    if (!label.trim()) { setError('Label is required'); return false; }
    if (['COUNT_DISTINCT', 'SUM', 'AVG', 'MIN', 'MAX'].includes(formula) && !field) {
      setError('Select a field'); return false;
    }
    if (formula === 'PERCENTAGE' && (!filterField || !filterValue.trim())) {
      setError('Select a field and enter a value to match'); return false;
    }
    if (formula === 'RATIO' && (!fieldA || !fieldB)) {
      setError('Select both fields'); return false;
    }
    if (formula === 'CUSTOM') {
      if (!fieldA) { setError('Select Field A'); return false; }
      if (customBMode === 'field' && !fieldB) { setError('Select Field B'); return false; }
      if (customBMode === 'value' && !customBValue.trim()) { setError('Enter a comparison value'); return false; }
    }
    return true;
  }

  function handleSave() {
    if (!validate()) return;
    const config: KpiConfigExtended = {
      kpi_id:       initial?.kpi_id ?? crypto.randomUUID(),
      label:        label.trim(),
      formula,
      format,
      icon,
      colour:       iconColour,
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

  const selectedIconNode = ICON_OPTIONS.find((i) => i.value === icon)?.node;

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
              placeholder="e.g. Total Users"
              className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200
                         bg-white text-[var(--color-text)]
                         focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
            />
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

          {/* Single field */}
          {['COUNT_DISTINCT', 'SUM', 'AVG', 'MIN', 'MAX'].includes(formula) && (
            <FieldSelect label="Field" value={field} onChange={setField} fields={availableFields} />
          )}

          {/* Percentage */}
          {formula === 'PERCENTAGE' && (
            <div className="space-y-3">
              <FieldSelect label="Field to check" value={filterField} onChange={setFilterField} fields={availableFields} />
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-[var(--color-text-muted)]">Value to match</label>
                <input
                  type="text"
                  value={filterValue}
                  onChange={(e) => setFilterValue(e.target.value)}
                  placeholder="e.g. admin"
                  className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200
                             bg-white text-[var(--color-text)]
                             focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
                />
              </div>
            </div>
          )}

          {/* Ratio */}
          {formula === 'RATIO' && (
            <div className="space-y-3">
              <FieldSelect label="Numerator field (A)" value={fieldA} onChange={setFieldA} fields={availableFields} />
              <FieldSelect label="Denominator field (B)" value={fieldB} onChange={setFieldB} fields={availableFields} />
            </div>
          )}

          {/* Custom */}
          {formula === 'CUSTOM' && (
            <div className="space-y-3">
              <FieldSelect label="Field A" value={fieldA} onChange={setFieldA} fields={availableFields} />
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
                  <FieldSelect label="" value={fieldB} onChange={setFieldB} fields={availableFields} placeholder="Select field B…" />
                ) : (
                  <input
                    type="text"
                    value={customBValue}
                    onChange={(e) => setCustomBValue(e.target.value)}
                    placeholder='e.g. "admin" or 100'
                    className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200
                               bg-white text-[var(--color-text)]
                               focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
                  />
                )}
              </div>
            </div>
          )}

          {/* Display format */}
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

          {/* Icon grid */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-[var(--color-text-muted)]">Icon</label>
            <div className="grid grid-cols-5 gap-2">
              {ICON_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => setIcon(opt.value)}
                  title={opt.label}
                  className={`flex flex-col items-center gap-1 py-2 px-1 rounded-lg border
                              text-xs transition-colors ${
                    icon === opt.value
                      ? 'border-[var(--color-primary)] bg-[var(--color-primary)]/10 text-[var(--color-primary)]'
                      : 'border-gray-200 text-gray-400 hover:bg-gray-50'
                  }`}
                >
                  {opt.node}
                  <span className="truncate w-full text-center text-[10px] leading-tight">{opt.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* ── Colour section ─────────────────────────────── */}
          <div className="space-y-3">
            <label className="text-xs font-semibold uppercase tracking-wider text-gray-400">
              Colours
            </label>

            {/* Icon / accent colour */}
            <ColourRow
              label="Icon colour"
              value={iconColour}
              onChange={setIconColour}
              preview={
                <span style={{ color: iconColour }}>{selectedIconNode}</span>
              }
            />

            {/* Block background colour */}
            <ColourRow
              label="Block background colour"
              value={blockColour}
              onChange={setBlockColour}
              onClear={() => setBlockColour('')}
            />

            {/* Font / value colour */}
            <ColourRow
              label="Value font colour"
              value={fontColour}
              onChange={setFontColour}
              onClear={() => setFontColour('')}
              preview={
                fontColour
                  ? <span style={{ color: fontColour }} className="text-sm font-bold">1.2k</span>
                  : <span className="text-xs text-gray-400">Default (inherits theme)</span>
              }
            />
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
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm rounded-lg border border-gray-200
                       text-[var(--color-text)] hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="px-4 py-2 text-sm rounded-lg bg-[var(--color-primary)]
                       text-white hover:opacity-90 transition-opacity font-medium"
          >
            {initial ? 'Save changes' : 'Add KPI'}
          </button>
        </div>
      </div>
    </div>
  );
}