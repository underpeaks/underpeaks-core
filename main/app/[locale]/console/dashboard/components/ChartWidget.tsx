'use client';

import { useState, useEffect, useCallback } from 'react';
import { Settings2, X, RefreshCw } from 'lucide-react';
import {
  DashboardCollection,
  ChartDataPoint,
  ChartComputeRequest,
  DashboardChartWidget,
} from '../../types/dashboard';

// ─── Chart type definitions with SVG icon previews ────────────

type ChartType = 'bar' | 'line' | 'area' | 'horizontal_bar' | 'donut';

const CHART_TYPES: { type: ChartType; label: string; icon: React.ReactNode }[] = [
  {
    type:  'bar',
    label: 'Bar',
    icon: (
      <svg viewBox="0 0 40 30" className="w-10 h-7">
        <rect x="3"  y="18" width="6" height="10" rx="1" fill="currentColor" opacity="0.9" />
        <rect x="11" y="10" width="6" height="18" rx="1" fill="currentColor" opacity="0.9" />
        <rect x="19" y="14" width="6" height="14" rx="1" fill="currentColor" opacity="0.9" />
        <rect x="27" y="6"  width="6" height="22" rx="1" fill="currentColor" opacity="0.9" />
        <rect x="35" y="12" width="6" height="16" rx="1" fill="currentColor" opacity="0.9" />
      </svg>
    ),
  },
  {
    type:  'line',
    label: 'Line',
    icon: (
      <svg viewBox="0 0 40 30" className="w-10 h-7">
        <polyline points="2,24 10,16 18,19 26,8 34,12 42,6"
          fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />
        <circle cx="2"  cy="24" r="2" fill="currentColor" />
        <circle cx="10" cy="16" r="2" fill="currentColor" />
        <circle cx="18" cy="19" r="2" fill="currentColor" />
        <circle cx="26" cy="8"  r="2" fill="currentColor" />
        <circle cx="34" cy="12" r="2" fill="currentColor" />
      </svg>
    ),
  },
  {
    type:  'area',
    label: 'Area',
    icon: (
      <svg viewBox="0 0 40 30" className="w-10 h-7">
        <path d="M2,24 L10,16 L18,19 L26,8 L34,12 L42,6 L42,28 L2,28 Z"
          fill="currentColor" opacity="0.25" />
        <polyline points="2,24 10,16 18,19 26,8 34,12 42,6"
          fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    type:  'horizontal_bar',
    label: 'H-Bar',
    icon: (
      <svg viewBox="0 0 40 30" className="w-10 h-7">
        <rect x="2" y="3"  width="22" height="5" rx="1" fill="currentColor" opacity="0.9" />
        <rect x="2" y="10" width="34" height="5" rx="1" fill="currentColor" opacity="0.9" />
        <rect x="2" y="17" width="16" height="5" rx="1" fill="currentColor" opacity="0.9" />
        <rect x="2" y="24" width="28" height="5" rx="1" fill="currentColor" opacity="0.9" />
      </svg>
    ),
  },
  {
    type:  'donut',
    label: 'Donut',
    icon: (
      <svg viewBox="0 0 40 30" className="w-10 h-7">
        <circle cx="20" cy="15" r="12" fill="none" stroke="currentColor" strokeWidth="7" opacity="0.15" />
        <circle cx="20" cy="15" r="12" fill="none" stroke="currentColor" strokeWidth="7"
          strokeDasharray="28 47" strokeLinecap="round"
          transform="rotate(-90 20 15)" opacity="0.9" />
        <circle cx="20" cy="15" r="12" fill="none" stroke="currentColor" strokeWidth="7"
          strokeDasharray="18 57" strokeLinecap="round"
          transform="rotate(105 20 15)" opacity="0.6" />
        <circle cx="20" cy="15" r="5" fill="white" />
      </svg>
    ),
  },
];

// ─── Config modal ─────────────────────────────────────────────

function ChartConfigModal({
  initial,
  collections,
  onSave,
  onClose,
}: {
  initial:     DashboardChartWidget;
  collections: DashboardCollection[];
  onSave:      (cfg: DashboardChartWidget) => void;
  onClose:     () => void;
}) {
  const [title,      setTitle]      = useState(initial.title       ?? '');
  const [collection, setCollection] = useState(initial.collection  ?? collections[0]?.key ?? '');
  const [dateField,  setDateField]  = useState(initial.date_field   ?? 'created_at');
  const [formula,    setFormula]    = useState<'COUNT' | 'SUM'>(initial.formula ?? 'COUNT');
  const [valueField, setValueField] = useState(initial.value_field  ?? '');
  const [groupBy,    setGroupBy]    = useState<'day' | 'week' | 'month'>(initial.group_by ?? 'day');
  const [range,      setRange]      = useState<'7d' | '30d' | '90d'>(initial.range ?? '30d');
  const [colour,     setColour]     = useState(initial.colour       ?? '#3b82f6');
  const [chartType,  setChartType]  = useState<ChartType>((initial.chart_type as ChartType) ?? 'bar');
  const [error,      setError]      = useState('');

  // Fields available for the selected collection
  const selectedCol  = collections.find((c) => c.key === collection);
  const fields       = selectedCol?.fields ?? [];

  function handleSave() {
    if (!title.trim())      { setError('Title is required'); return; }
    if (!collection.trim()) { setError('Collection is required'); return; }
    if (!dateField.trim())  { setError('Date field is required'); return; }
    if (formula === 'SUM' && !valueField.trim()) { setError('Value field required for SUM'); return; }
    onSave({
      ...initial,
      title:       title.trim(),
      collection:  collection.trim(),
      date_field:  dateField.trim(),
      formula,
      value_field: formula === 'SUM' ? valueField.trim() : undefined,
      group_by:    groupBy,
      range,
      colour,
      chart_type:  chartType,
    });
  }

  const systemCollections    = collections.filter((c) => c.system);
  const developerCollections = collections.filter((c) => !c.system);

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div
        className="relative rounded-2xl border border-gray-200 w-full max-w-md shadow-2xl max-h-[90vh] overflow-y-auto"
        style={{ backgroundColor: '#ffffff' }}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 sticky top-0 z-10"
          style={{ backgroundColor: '#ffffff' }}>
          <h3 className="text-sm font-semibold text-[var(--color-text)]">Configure Chart</h3>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400">
            <X size={16} />
          </button>
        </div>

        <div className="px-6 py-5 space-y-5">

          {/* Chart type */}
          <div className="space-y-2">
            <label className="text-xs font-medium text-[var(--color-text-muted)]">Chart type</label>
            <div className="grid grid-cols-5 gap-2">
              {CHART_TYPES.map((ct) => (
                <button key={ct.type} onClick={() => setChartType(ct.type)}
                  className={`flex flex-col items-center gap-1.5 p-2 rounded-xl border-2 transition-all ${
                    chartType === ct.type
                      ? 'border-[var(--color-primary)] bg-[var(--color-primary)]/5 text-[var(--color-primary)]'
                      : 'border-gray-200 text-gray-400 hover:border-gray-300 hover:text-gray-600'
                  }`}>
                  {ct.icon}
                  <span className="text-[10px] font-medium">{ct.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Title */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-[var(--color-text-muted)]">Chart title *</label>
            <input type="text" value={title} onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Orders over time"
              className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 bg-white text-[var(--color-text)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]" />
          </div>

          {/* Collection + field — single dropdown group */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-[var(--color-text-muted)]">Collection & field *</label>
            <select value={collection} onChange={(e) => { setCollection(e.target.value); setDateField('created_at'); setValueField(''); }}
              className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 bg-white text-[var(--color-text)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]">
              {systemCollections.length > 0 && (
                <optgroup label="── System collections">
                  {systemCollections.map((c) => <option key={c.key} value={c.key}>{c.label} ({c.key})</option>)}
                </optgroup>
              )}
              {developerCollections.length > 0 && (
                <optgroup label="── Your collections">
                  {developerCollections.map((c) => <option key={c.key} value={c.key}>{c.label} ({c.key})</option>)}
                </optgroup>
              )}
            </select>

            {/* Date field — dropdown if fields available, text input fallback */}
            <div className="mt-2 space-y-1">
              <p className="text-[10px] text-gray-400">Date field <span className="text-gray-300">(used for time axis)</span></p>
              {fields.length > 0 ? (
                <select value={dateField} onChange={(e) => setDateField(e.target.value)}
                  className="w-full px-3 py-2 text-sm font-mono rounded-lg border border-gray-200 bg-white text-[var(--color-text)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]">
                  {fields.map((f) => <option key={f} value={f}>{f}</option>)}
                </select>
              ) : (
                <input type="text" value={dateField} onChange={(e) => setDateField(e.target.value)}
                  placeholder="created_at"
                  className="w-full px-3 py-2 text-sm font-mono rounded-lg border border-gray-200 bg-white text-[var(--color-text)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]" />
              )}
            </div>
          </div>

          {/* Formula */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-[var(--color-text-muted)]">Formula</label>
            <div className="flex rounded-lg border border-gray-200 overflow-hidden">
              {(['COUNT', 'SUM'] as const).map((f) => (
                <button key={f} onClick={() => setFormula(f)}
                  className={`flex-1 py-2 text-sm font-medium transition-colors ${
                    formula === f ? 'bg-[var(--color-primary)] text-white' : 'text-gray-500 hover:bg-gray-50'
                  }`}>
                  {f === 'COUNT' ? 'Count records' : 'Sum a field'}
                </button>
              ))}
            </div>
          </div>

          {/* Value field (SUM only) */}
          {formula === 'SUM' && (
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-[var(--color-text-muted)]">Value field *</label>
              {fields.length > 0 ? (
                <select value={valueField} onChange={(e) => setValueField(e.target.value)}
                  className="w-full px-3 py-2 text-sm font-mono rounded-lg border border-gray-200 bg-white text-[var(--color-text)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]">
                  <option value="">— select field —</option>
                  {fields.map((f) => <option key={f} value={f}>{f}</option>)}
                </select>
              ) : (
                <input type="text" value={valueField} onChange={(e) => setValueField(e.target.value)}
                  placeholder="e.g. total_price"
                  className="w-full px-3 py-2 text-sm font-mono rounded-lg border border-gray-200 bg-white text-[var(--color-text)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]" />
              )}
            </div>
          )}

          {/* Group by */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-[var(--color-text-muted)]">Group by</label>
            <div className="flex gap-2">
              {(['day', 'week', 'month'] as const).map((g) => (
                <button key={g} onClick={() => setGroupBy(g)}
                  className={`flex-1 py-1.5 text-xs font-medium rounded-lg border transition-colors ${
                    groupBy === g
                      ? 'border-[var(--color-primary)] bg-[var(--color-primary)]/10 text-[var(--color-primary)]'
                      : 'border-gray-200 text-gray-500 hover:bg-gray-50'
                  }`}>
                  {g.charAt(0).toUpperCase() + g.slice(1)}
                </button>
              ))}
            </div>
          </div>

          {/* Range */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-[var(--color-text-muted)]">Time range</label>
            <div className="flex gap-2">
              {(['7d', '30d', '90d'] as const).map((r) => (
                <button key={r} onClick={() => setRange(r)}
                  className={`flex-1 py-1.5 text-xs font-medium rounded-lg border transition-colors ${
                    range === r
                      ? 'border-[var(--color-primary)] bg-[var(--color-primary)]/10 text-[var(--color-primary)]'
                      : 'border-gray-200 text-gray-500 hover:bg-gray-50'
                  }`}>
                  {r === '7d' ? 'Last 7 days' : r === '30d' ? 'Last 30 days' : 'Last 90 days'}
                </button>
              ))}
            </div>
          </div>

          {/* Bar colour */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-[var(--color-text-muted)]">Chart colour</label>
            <div className="flex items-center gap-2">
              <input type="color" value={colour} onChange={(e) => setColour(e.target.value)}
                className="w-9 h-9 rounded-lg border border-gray-200 cursor-pointer p-0.5" />
              <span className="text-xs text-gray-400">{colour}</span>
            </div>
          </div>

          {error && <p className="text-xs text-red-500">{error}</p>}
        </div>

        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-200 sticky bottom-0"
          style={{ backgroundColor: '#ffffff' }}>
          <button onClick={onClose}
            className="px-4 py-2 text-sm rounded-lg border border-gray-200 text-[var(--color-text)] hover:bg-gray-50 transition-colors">
            Cancel
          </button>
          <button onClick={handleSave}
            className="px-4 py-2 text-sm rounded-lg bg-[var(--color-primary)] text-white hover:opacity-90 font-medium">
            Save
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Chart renderers ──────────────────────────────────────────

function BarChartDisplay({ data, maxVal, colour, hovered, setHovered }: {
  data: ChartDataPoint[]; maxVal: number; colour: string;
  hovered: number | null; setHovered: (i: number | null) => void;
}) {
  return (
    <div className="flex items-end gap-0.5 h-28">
      {data.map((point, i) => {
        const pct     = maxVal === 0 ? 0 : (point.value / maxVal) * 100;
        const isHover = hovered === i;
        return (
          <div key={point.date} className="relative flex-1 flex flex-col justify-end" style={{ height: '100%' }}
            onMouseEnter={() => setHovered(i)} onMouseLeave={() => setHovered(null)}>
            {isHover && <Tooltip value={point.value} label={point.label} />}
            <div className="w-full rounded-t transition-all duration-150 cursor-pointer"
              style={{
                height:          `${Math.max(pct, 2)}%`,
                backgroundColor: isHover ? colour : point.value > 0 ? `${colour}cc` : '#e5e7eb',
              }} />
          </div>
        );
      })}
    </div>
  );
}

function LineChartDisplay({ data, maxVal, colour, hovered, setHovered, area }: {
  data: ChartDataPoint[]; maxVal: number; colour: string;
  hovered: number | null; setHovered: (i: number | null) => void; area?: boolean;
}) {
  if (data.length === 0) return null;
  const W = 400; const H = 112;
  const pad = 4;
  const pts = data.map((p, i) => {
    const x = pad + (i / (data.length - 1 || 1)) * (W - pad * 2);
    const y = H - pad - ((maxVal === 0 ? 0 : p.value / maxVal) * (H - pad * 2));
    return { x, y, ...p };
  });
  const polyline = pts.map((p) => `${p.x},${p.y}`).join(' ');
  const areaPath = `M${pts[0].x},${H} ` + pts.map((p) => `L${p.x},${p.y}`).join(' ') + ` L${pts[pts.length - 1].x},${H} Z`;

  return (
    <div className="relative h-28">
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-full" preserveAspectRatio="none">
        {area && <path d={areaPath} fill={colour} opacity="0.15" />}
        <polyline points={polyline} fill="none" stroke={colour} strokeWidth="2.5"
          strokeLinejoin="round" strokeLinecap="round" />
        {pts.map((p, i) => (
          <circle key={i} cx={p.x} cy={p.y} r={hovered === i ? 4 : 2.5} fill={colour}
            onMouseEnter={() => setHovered(i)} onMouseLeave={() => setHovered(null)}
            className="cursor-pointer" style={{ pointerEvents: 'all' }} />
        ))}
      </svg>
      {hovered !== null && pts[hovered] && (
        <div className="absolute pointer-events-none"
          style={{ left: `${(pts[hovered].x / W) * 100}%`, top: 0, transform: 'translateX(-50%)' }}>
          <Tooltip value={pts[hovered].value} label={pts[hovered].label} />
        </div>
      )}
    </div>
  );
}

function HorizontalBarDisplay({ data, maxVal, colour, hovered, setHovered }: {
  data: ChartDataPoint[]; maxVal: number; colour: string;
  hovered: number | null; setHovered: (i: number | null) => void;
}) {
  const visible = data.slice(-8);
  return (
    <div className="flex flex-col gap-1.5 h-28 justify-end overflow-hidden">
      {visible.map((point, i) => {
        const pct     = maxVal === 0 ? 0 : (point.value / maxVal) * 100;
        const isHover = hovered === i;
        return (
          <div key={point.date} className="flex items-center gap-2"
            onMouseEnter={() => setHovered(i)} onMouseLeave={() => setHovered(null)}>
            <span className="text-[9px] text-gray-400 w-8 text-right shrink-0 truncate">{point.label}</span>
            <div className="flex-1 h-3 bg-gray-100 rounded-full overflow-hidden">
              <div className="h-full rounded-full transition-all duration-300"
                style={{ width: `${Math.max(pct, 1)}%`, backgroundColor: isHover ? colour : `${colour}cc` }} />
            </div>
            <span className="text-[9px] text-gray-500 w-6 shrink-0">{point.value}</span>
          </div>
        );
      })}
    </div>
  );
}

function DonutDisplay({ data, colour }: { data: ChartDataPoint[]; colour: string }) {
  const total   = data.reduce((s, p) => s + p.value, 0);
  const topItems = data.slice(-6);
  const COLOURS  = [colour, '#f59e0b', '#10b981', '#ef4444', '#8b5cf6', '#ec4899'];
  let cumAngle   = -90;
  const R = 40; const cx = 50; const cy = 50;
  const slices = topItems.map((p, i) => {
    const angle     = total === 0 ? 0 : (p.value / total) * 360;
    const startAngle = cumAngle;
    cumAngle += angle;
    const x1 = cx + R * Math.cos((startAngle * Math.PI) / 180);
    const y1 = cy + R * Math.sin((startAngle * Math.PI) / 180);
    const x2 = cx + R * Math.cos(((startAngle + angle) * Math.PI) / 180);
    const y2 = cy + R * Math.sin(((startAngle + angle) * Math.PI) / 180);
    const large = angle > 180 ? 1 : 0;
    return { p, i, x1, y1, x2, y2, large, angle };
  });

  return (
    <div className="flex items-center gap-4 h-28">
      <svg viewBox="0 0 100 100" className="w-28 h-28 shrink-0">
        {slices.map(({ p, i, x1, y1, x2, y2, large, angle }) =>
          angle > 0 ? (
            <path key={i}
              d={`M${cx},${cy} L${x1},${y1} A${R},${R} 0 ${large} 1 ${x2},${y2} Z`}
              fill={COLOURS[i % COLOURS.length]} opacity="0.85" />
          ) : null
        )}
        <circle cx={cx} cy={cy} r="24" fill="white" />
        <text x={cx} y={cy - 4} textAnchor="middle" fontSize="10" fontWeight="bold" fill="#111">
          {total.toLocaleString()}
        </text>
        <text x={cx} y={cy + 8} textAnchor="middle" fontSize="6" fill="#9ca3af">total</text>
      </svg>
      <div className="flex flex-col gap-1 min-w-0 overflow-hidden">
        {slices.map(({ p, i }) => (
          <div key={i} className="flex items-center gap-1.5 min-w-0">
            <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: COLOURS[i % COLOURS.length] }} />
            <span className="text-[10px] text-gray-600 truncate">{p.label}</span>
            <span className="text-[10px] text-gray-400 shrink-0">{p.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function Tooltip({ value, label }: { value: number; label: string }) {
  return (
    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 z-10 pointer-events-none">
      <div className="bg-gray-900 text-white text-[10px] rounded-md px-2 py-1 whitespace-nowrap shadow-lg">
        <p className="font-semibold">{value.toLocaleString()}</p>
        <p className="text-gray-400">{label}</p>
      </div>
      <div className="w-0 h-0 border-l-4 border-r-4 border-t-4 border-l-transparent border-r-transparent border-t-gray-900 mx-auto" />
    </div>
  );
}

// ─── X-axis labels ────────────────────────────────────────────

function XLabels({ data }: { data: ChartDataPoint[] }) {
  return (
    <div className="flex gap-0.5 mt-1">
      {data.map((point, i) => (
        <div key={point.date} className="flex-1 text-center">
          {(i === 0 || i === data.length - 1 || i % Math.ceil(data.length / 6) === 0) && (
            <span className="text-[9px] text-gray-400">{point.label}</span>
          )}
        </div>
      ))}
    </div>
  );
}

// ─── Main ChartWidget ─────────────────────────────────────────

interface Props {
  config:         DashboardChartWidget;
  collections:    DashboardCollection[];
  currentUserId:  string;
  isEditMode:     boolean;
  onConfigChange: (cfg: DashboardChartWidget) => void;
  onRemove:       () => void;
  onDragStart:    () => void;
  dragging:       boolean;
}

export function ChartWidget({
  config, collections, currentUserId, isEditMode,
  onConfigChange, onRemove, onDragStart, dragging,
}: Props) {
  const [data,       setData]       = useState<ChartDataPoint[]>([]);
  const [total,      setTotal]      = useState(0);
  const [maxVal,     setMaxVal]     = useState(1);
  const [loading,    setLoading]    = useState(true);
  const [hovered,    setHovered]    = useState<number | null>(null);
  const [showConfig, setShowConfig] = useState(false);

  const fetchData = useCallback(async () => {
    if (!currentUserId || !config.collection || !config.date_field) return;
    setLoading(true);
    try {
      const payload: ChartComputeRequest = {
        user_id:     currentUserId,
        collection:  config.collection,
        date_field:  config.date_field,
        value_field: config.value_field,
        formula:     config.formula ?? 'COUNT',
        group_by:    config.group_by ?? 'day',
        range:       config.range   ?? '30d',
      };
      const res  = await fetch('/api/dashboard/chart', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body:   JSON.stringify(payload),
      });
      const json = await res.json();
      setData(json.data  ?? []);
      setTotal(json.total ?? 0);
      setMaxVal(json.max  ?? 1);
    } catch {
      setData([]);
    } finally {
      setLoading(false);
    }
  }, [config, currentUserId]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const barColour  = config.colour     || '#3b82f6';
  const chartType  = (config.chart_type as ChartType) || 'bar';
  const chartLabel = CHART_TYPES.find((c) => c.type === chartType)?.label ?? 'Chart';

  function renderChart() {
    if (loading) {
      return (
        <div className="flex items-end gap-0.5 h-28">
          {Array.from({ length: 20 }).map((_, i) => (
            <div key={i} className="flex-1 rounded-t bg-gray-100 animate-pulse"
              style={{ height: `${20 + Math.random() * 70}%` }} />
          ))}
        </div>
      );
    }
    if (data.length === 0) {
      return (
        <div className="h-28 flex items-center justify-center text-xs text-gray-400">
          No data in <span className="font-mono mx-1">{config.collection}</span> for selected range
        </div>
      );
    }
    switch (chartType) {
      case 'bar':            return <><BarChartDisplay data={data} maxVal={maxVal} colour={barColour} hovered={hovered} setHovered={setHovered} /><XLabels data={data} /></>;
      case 'line':           return <><LineChartDisplay data={data} maxVal={maxVal} colour={barColour} hovered={hovered} setHovered={setHovered} /><XLabels data={data} /></>;
      case 'area':           return <><LineChartDisplay data={data} maxVal={maxVal} colour={barColour} hovered={hovered} setHovered={setHovered} area /><XLabels data={data} /></>;
      case 'horizontal_bar': return <HorizontalBarDisplay data={data} maxVal={maxVal} colour={barColour} hovered={hovered} setHovered={setHovered} />;
      case 'donut':          return <DonutDisplay data={data} colour={barColour} />;
      default:               return null;
    }
  }

  return (
    <>
      <div
        className={`group relative border border-gray-200 rounded-xl shadow-sm hover:shadow-md transition-shadow overflow-hidden ${
          dragging ? 'opacity-50 ring-2 ring-blue-300' : ''
        }`}
        style={{ backgroundColor: '#ffffff' }}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <div>
            <p className="text-sm font-semibold text-gray-800">{config.title}</p>
            <p className="text-[10px] text-gray-400 font-mono mt-0.5">
              {chartLabel} · {config.formula}({config.collection}{config.value_field ? `.${config.value_field}` : ''}) · {config.group_by} · {config.range}
            </p>
          </div>
          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <button onClick={fetchData} className="p-1 rounded hover:bg-gray-100 text-gray-400">
              <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
            </button>
            {isEditMode && (
              <>
                <button onClick={() => setShowConfig(true)} className="p-1 rounded hover:bg-gray-100 text-gray-400">
                  <Settings2 size={13} />
                </button>
                <div draggable onDragStart={onDragStart}
                  className="cursor-grab p-1 rounded hover:bg-gray-100 text-gray-400 select-none">
                  ⠿
                </div>
                <button onClick={onRemove} className="p-1 rounded hover:bg-red-50 text-gray-400 hover:text-red-500">
                  <X size={13} />
                </button>
              </>
            )}
          </div>
        </div>

        <div className="px-5 py-5">
          {chartType !== 'donut' && (
            <div className="flex items-baseline gap-2 mb-4">
              <span className="text-2xl font-bold text-gray-900">{total.toLocaleString()}</span>
              <span className="text-xs text-gray-400">total · {config.range}</span>
            </div>
          )}
          {renderChart()}
        </div>
      </div>

      {showConfig && (
        <ChartConfigModal
          initial={config}
          collections={collections}
          onSave={(cfg) => { onConfigChange(cfg); setShowConfig(false); fetchData(); }}
          onClose={() => setShowConfig(false)}
        />
      )}
    </>
  );
}