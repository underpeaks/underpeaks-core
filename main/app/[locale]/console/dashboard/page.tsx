'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Users, FileText, Cpu, Image, Settings2, Save,
  Plus, RefreshCw, X, Move, Code,
} from 'lucide-react';

import DashboardKpiBar  from './components/DashboardKpiBar';
import { ChartWidget }  from './components/ChartWidget';
import { ActivityFeed } from './components/ActivityFeed';
import { SystemStatus } from './components/SystemStatus';
import {
  DashboardStatWidget,
  DashboardCollection,
  DashboardChartWidget,
  DashboardStatsResponse,
  DashboardWidget,
} from '../types/dashboard';
import { KpiBlock }         from '../kpi/kpi';
import { useConsoleStore }  from '@/app/store/consoleStore';

// ─── Fixed system stat card ───────────────────────────────────

function SystemStatCard({
  icon, label, value, loading, colour,
}: {
  icon: React.ReactNode; label: string; value: number; loading: boolean; colour: string;
}) {
  return (
    <div style={{ backgroundColor: '#ffffff' }}
      className="rounded-xl border border-gray-200 p-4 flex items-start gap-3 shadow-sm">
      <div className="p-2 rounded-lg flex-shrink-0"
        style={{ backgroundColor: `${colour}20`, color: colour }}>
        {icon}
      </div>
      <div>
        <p className="text-xs text-gray-400">{label}</p>
        {loading ? (
          <div className="h-6 w-12 bg-gray-100 rounded animate-pulse mt-0.5" />
        ) : (
          <p className="text-xl font-bold text-gray-900">{value.toLocaleString()}</p>
        )}
      </div>
    </div>
  );
}

// ─── Custom stat widget ───────────────────────────────────────

function CustomStatWidget({
  widget, onRemove, onDragStart, dragging, isEditMode,
}: {
  widget: DashboardStatWidget; onRemove: () => void;
  onDragStart: () => void; dragging: boolean; isEditMode: boolean;
}) {
  const [value,   setValue]   = useState<string>('—');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setLoading(true);
    fetch('/api/dashboard/kpi', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        user_id:      'system',
        collection:   widget.collection,
        formula:      widget.formula,
        format:       widget.format,
        field:        widget.field,
        field_a:      widget.field_a,
        field_b:      widget.field_b,
        operator:     widget.operator,
        filter_field: widget.filter_field,
        filter_value: widget.filter_value,
      }),
    })
      .then((r) => r.json())
      .then((d) => setValue(d.formatted ?? '—'))
      .catch(() => setValue('—'))
      .finally(() => setLoading(false));
  }, [widget]);

  const accent = widget.colour || 'var(--color-primary)';

  return (
    <div
      className={`group relative border border-gray-200 rounded-xl p-5 flex flex-col gap-3 shadow-sm transition-shadow hover:shadow-md ${
        dragging ? 'opacity-50 ring-2 ring-blue-300' : ''
      }`}
      style={{ backgroundColor: '#ffffff' }}
    >
      {isEditMode && (
        <div className="absolute top-2 right-2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <div draggable onDragStart={onDragStart}
            className="cursor-grab p-1 rounded hover:bg-gray-100 text-gray-400">
            <Move size={13} />
          </div>
          <button onClick={onRemove}
            className="p-1 rounded hover:bg-red-50 text-gray-400 hover:text-red-500">
            <X size={13} />
          </button>
        </div>
      )}
      <div className="flex items-start gap-3">
        <div className="p-2 rounded-lg flex-shrink-0"
          style={{ backgroundColor: `${accent}20`, color: accent }}>
          <Code size={16} />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-xs text-gray-400">{widget.title}</p>
          {loading ? (
            <div className="h-7 w-16 bg-gray-100 rounded animate-pulse mt-0.5" />
          ) : (
            <p className="text-2xl font-bold text-gray-900 mt-0.5">{value}</p>
          )}
        </div>
      </div>
      <div className="flex items-center gap-1.5 px-2 py-1 bg-gray-50 border border-gray-100 rounded-md">
        <Code size={10} className="text-gray-400 shrink-0" />
        <p className="text-[10px] text-gray-400 font-mono truncate">
          {widget.formula}({widget.collection}{widget.field ? `.${widget.field}` : ''})
        </p>
      </div>
    </div>
  );
}

// ─── Add widget panel ─────────────────────────────────────────

function AddWidgetPanel({
  collections, onAddStat, onAddChart, onClose,
}: {
  collections: DashboardCollection[];
  onAddStat:   (w: DashboardStatWidget) => void;
  onAddChart:  (w: DashboardChartWidget) => void;
  onClose:     () => void;
}) {
  const [tab, setTab] = useState<'stat' | 'chart'>('stat');

  function addStat(collection: string, label: string) {
    onAddStat({
      widget_id:  crypto.randomUUID(),
      type:       'stat',
      title:      `${label} count`,
      collection,
      formula:    'COUNT',
      format:     'full',
      icon:       'bar-chart-2',
      colour:     '#5C6BC0',
      span:       1,
    });
    onClose();
  }

  function addChart(collection: string, label: string) {
    onAddChart({
      widget_id:  crypto.randomUUID(),
      type:       'chart',
      title:      `${label} over time`,
      collection,
      date_field: 'created_at',
      formula:    'COUNT',
      group_by:   'day',
      range:      '30d',
      colour:     '#3b82f6',
      span:       2,
    });
    onClose();
  }

  return (
    <>
      <div className="fixed inset-0 bg-black/20 z-40" onClick={onClose} />
      <div className="fixed top-16 right-0 bottom-0 w-80 bg-white border-l border-gray-200 z-50 flex flex-col shadow-2xl">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 shrink-0">
          <div>
            <h2 className="text-sm font-bold text-gray-900">Add Widget</h2>
            <p className="text-xs text-gray-400 mt-0.5">Pick a collection to visualise</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X size={18} />
          </button>
        </div>

        <div className="flex border-b border-gray-100 shrink-0">
          {(['stat', 'chart'] as const).map((t) => (
            <button key={t} onClick={() => setTab(t)}
              className={`flex-1 py-3 text-xs font-medium transition-colors ${
                tab === t
                  ? 'border-b-2 border-[var(--color-primary)] text-[var(--color-primary)]'
                  : 'text-gray-500 hover:text-gray-700'
              }`}>
              {t === 'stat' ? 'Stat widget' : 'Chart widget'}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-2">
          <p className="text-[10px] text-gray-400 uppercase tracking-wide mb-1">
            {tab === 'stat' ? 'Choose a collection to count' : 'Choose a collection to chart'}
          </p>
          {collections.map((col) => (
            <button key={col.key}
              onClick={() => tab === 'stat' ? addStat(col.key, col.label) : addChart(col.key, col.label)}
              className="w-full text-left px-4 py-3 bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-lg transition-colors">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold text-gray-800">{col.label}</p>
                <span className={`text-[10px] px-1.5 py-0.5 rounded border font-mono ${
                  col.system
                    ? 'text-blue-500 border-blue-200 bg-blue-50'
                    : 'text-purple-500 border-purple-200 bg-purple-50'
                }`}>
                  {col.system ? 'system' : 'custom'}
                </span>
              </div>
              <p className="text-[10px] text-gray-400 font-mono mt-0.5">{col.key}</p>
            </button>
          ))}
        </div>
      </div>
    </>
  );
}

// ─── Constants ────────────────────────────────────────────────

const SYSTEM_STATS = [
  { key: 'users',       label: 'Users',       icon: <Users size={16} />,    colour: '#2563eb' },
  { key: 'pages',       label: 'Pages',       icon: <FileText size={16} />, colour: '#7c3aed' },
  { key: 'models',      label: 'Models',      icon: <Cpu size={16} />,      colour: '#059669' },
  { key: 'media_files', label: 'Media files', icon: <Image size={16} />,    colour: '#d97706' },
];

// ─── Main page ────────────────────────────────────────────────

export default function DashboardPage() {

  // ── Auth — read from store, no Firebase calls ─────────────────
  const { user } = useConsoleStore();
  const [currentUserId, setCurrentUserId] = useState('');

  useEffect(() => {
    if (user?.user_id) setCurrentUserId(user.user_id);
  }, [user]);

  // ── Stats ─────────────────────────────────────────────────────
  const [stats,        setStats]        = useState<DashboardStatsResponse | null>(null);
  const [statsLoading, setStatsLoading] = useState(true);

  const fetchStats = useCallback(async () => {
    if (!currentUserId) return;
    setStatsLoading(true);
    try {
      const res  = await fetch(`/api/dashboard/stats?user_id=${currentUserId}`);
      const data = await res.json();
      setStats(data);
    } catch (err) {
      console.error('[dashboard] stats:', err);
    } finally {
      setStatsLoading(false);
    }
  }, [currentUserId]);

  useEffect(() => { if (currentUserId) fetchStats(); }, [currentUserId, fetchStats]);

  // ── Collections ───────────────────────────────────────────────
  const [collections, setCollections] = useState<DashboardCollection[]>([]);

  useEffect(() => {
    if (!currentUserId) return;
    fetch(`/api/dashboard/collections?user_id=${currentUserId}`)
      .then((r) => r.json())
      .then((d) => setCollections(d.collections ?? []))
      .catch(() => {});
  }, [currentUserId]);

  // ── Layout config ─────────────────────────────────────────────
  const [kpiBlocks,    setKpiBlocks]    = useState<KpiBlock[]>([]);
  const [widgets,      setWidgets]      = useState<DashboardWidget[]>([]);
  const [isEditMode,   setIsEditMode]   = useState(false);
  const [isSaving,     setIsSaving]     = useState(false);
  const [showAddPanel, setShowAddPanel] = useState(false);

  // ── Load layout — KEY FIX: read cfg.blocks not cfg.kpi_blocks ──
  useEffect(() => {
    if (!currentUserId) return;
    fetch(`/api/kpi-config?page=dashboard&user_id=${currentUserId}`)
      .then((r) => r.json())
      .then((data) => {
        const cfg = data?.config as any;
        if (!cfg) return;
        // API stores kpi blocks under 'blocks' field.
        // Support both field names for backwards compatibility.
        const loadedBlocks: KpiBlock[] = cfg.blocks ?? cfg.kpi_blocks ?? [];
        const loadedWidgets: DashboardWidget[] = cfg.widgets ?? [];
        if (loadedBlocks.length) setKpiBlocks(loadedBlocks);
        if (loadedWidgets.length) setWidgets(loadedWidgets);
      })
      .catch(() => {});
  }, [currentUserId]);

  // ── Save layout ───────────────────────────────────────────────
  const saveLayout = async () => {
    if (!currentUserId) return;
    setIsSaving(true);
    try {
      await fetch('/api/kpi-config', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          page:    'dashboard',
          blocks:  kpiBlocks,   // single source of truth — always 'blocks'
          widgets,
          user_id: currentUserId,
        }),
      });
      setIsEditMode(false);
    } catch (err) {
      console.error('[dashboard] save:', err);
    } finally {
      setIsSaving(false);
    }
  };

  // ── Widget DnD ────────────────────────────────────────────────
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [overIdx,    setOverIdx]    = useState<number | null>(null);

  const handleDragOver = (e: React.DragEvent, idx: number) => {
    e.preventDefault();
    setOverIdx(idx);
  };

  const handleDrop = (idx: number) => {
    if (!draggingId) return;
    const fromIdx = widgets.findIndex((w) => w.widget_id === draggingId);
    if (fromIdx === -1 || fromIdx === idx) {
      setDraggingId(null);
      setOverIdx(null);
      return;
    }
    const next = [...widgets];
    const [moved] = next.splice(fromIdx, 1);
    next.splice(idx, 0, moved);
    setWidgets(next);
    setDraggingId(null);
    setOverIdx(null);
  };

  // At the top of the component, derive the greeting:
const greeting = (() => {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
})();

const displayName = user?.full_name?.trim() || user?.user_email?.split('@')[0] || '';

  const addStatWidget  = (w: DashboardStatWidget)  => setWidgets((p) => [...p, w]);
  const addChartWidget = (w: DashboardChartWidget) => setWidgets((p) => [...p, w]);
  const removeWidget   = (id: string) => setWidgets((p) => p.filter((w) => w.widget_id !== id));
  const updateWidget   = (id: string, cfg: DashboardChartWidget) =>
    setWidgets((p) => p.map((w) => w.widget_id === id ? cfg : w));

  // ── Split widgets by type ─────────────────────────────────────
  const chartWidgets = widgets.filter((w) => w.type === 'chart') as DashboardChartWidget[];
  const statWidgets  = widgets.filter((w) => w.type === 'stat')  as DashboardStatWidget[];

  // ── Render ────────────────────────────────────────────────────
  return (
    <div className="flex flex-col h-[calc(100vh-64px)] bg-gray-100 overflow-hidden">

      {/* Toolbar */}
      <div className="shrink-0 border-b border-gray-200 px-6 py-4 flex items-center justify-between"
        style={{ backgroundColor: '#ffffff' }}>
        <div>
  <h1 className="text-xl font-bold text-[var(--color-text)]">
    {displayName ? `${greeting}, ${displayName}` : 'Dashboard'}
  </h1>
  <p className="text-sm text-[var(--color-text-muted)]">
    Underpeaks Core Studio overview
  </p>
</div>
        <div className="flex items-center gap-2">
          <button onClick={fetchStats}
            className="flex items-center gap-2 px-3 py-2 text-sm rounded-lg border border-[var(--color-border)] text-[var(--color-text-muted)] hover:text-[var(--color-text)] transition-colors">
            <RefreshCw size={14} className={statsLoading ? 'animate-spin' : ''} />
            Refresh
          </button>
          {isEditMode && (
            <button onClick={saveLayout} disabled={isSaving}
              className="flex items-center gap-2 px-3 py-2 text-sm rounded-lg bg-[var(--color-primary)] text-white hover:opacity-90 transition-opacity disabled:opacity-50">
              <Save size={14} />
              {isSaving ? 'Saving…' : 'Save layout'}
            </button>
          )}
          <button onClick={() => setIsEditMode((p) => !p)}
            className={`flex items-center gap-2 px-3 py-2 text-sm rounded-lg border transition-colors ${
              isEditMode
                ? 'border-[var(--color-primary)] text-[var(--color-primary)] bg-[var(--color-primary)]/10'
                : 'border-[var(--color-border)] text-[var(--color-text-muted)] hover:text-[var(--color-text)]'
            }`}>
            <Settings2 size={14} />
            {isEditMode ? 'Editing' : 'Edit layout'}
          </button>
          {isEditMode && (
            <button onClick={() => setShowAddPanel(true)}
              className="flex items-center gap-2 px-3 py-2 text-sm rounded-lg bg-gray-900 text-white hover:bg-gray-700 transition-colors">
              <Plus size={14} />
              Add widget
            </button>
          )}
        </div>
      </div>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto">

        {/* ── KPI bar ── */}
        <div className="border-b border-gray-200" style={{ backgroundColor: '#f9fafb' }}>
          <DashboardKpiBar
            blocks={kpiBlocks}
            isEditMode={isEditMode}
            onBlocksChange={setKpiBlocks}
            collections={collections}
            currentUserId={currentUserId}
          />
        </div>

        <div className="p-6 flex flex-col gap-6">

          {/* ── Chart widgets ── */}
          {(chartWidgets.length > 0 || isEditMode) && (
            <div>
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">
                Charts
              </p>
              <div className="grid grid-cols-4 gap-4">
                {chartWidgets.map((widget) => {
                  const globalIdx  = widgets.findIndex((w) => w.widget_id === widget.widget_id);
                  const isOver     = overIdx === globalIdx;
                  const isDragging = draggingId === widget.widget_id;
                  const spanClass  = widget.span === 2 ? 'col-span-2' : widget.span === 3 ? 'col-span-3' : 'col-span-1';
                  return (
                    <div key={widget.widget_id}
                      className={`${spanClass} ${isOver ? 'ring-2 ring-blue-400 ring-offset-2 rounded-xl' : ''}`}
                      onDragOver={(e) => handleDragOver(e, globalIdx)}
                      onDrop={() => handleDrop(globalIdx)}>
                      <ChartWidget
                        config={widget}
                        collections={collections}
                        currentUserId={currentUserId}
                        isEditMode={isEditMode}
                        onConfigChange={(cfg) => updateWidget(widget.widget_id, cfg)}
                        onRemove={() => removeWidget(widget.widget_id)}
                        onDragStart={() => setDraggingId(widget.widget_id)}
                        dragging={isDragging}
                      />
                    </div>
                  );
                })}
                {isEditMode && (
                  <div
                    className="col-span-2 h-24 border-2 border-dashed rounded-xl flex items-center justify-center cursor-pointer transition-colors border-gray-200 hover:border-gray-300 bg-white"
                    onClick={() => setShowAddPanel(true)}>
                    <div className="flex flex-col items-center gap-1 text-gray-400">
                      <Plus size={18} />
                      <p className="text-xs">Add chart</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ── Stat widgets ── */}
          {(statWidgets.length > 0 || isEditMode) && (
            <div>
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">
                Custom stats
              </p>
              <div className="grid grid-cols-4 gap-4">
                {statWidgets.map((widget) => {
                  const globalIdx  = widgets.findIndex((w) => w.widget_id === widget.widget_id);
                  const isOver     = overIdx === globalIdx;
                  const isDragging = draggingId === widget.widget_id;
                  return (
                    <div key={widget.widget_id}
                      className={`col-span-1 ${isOver ? 'ring-2 ring-blue-400 ring-offset-2 rounded-xl' : ''}`}
                      onDragOver={(e) => handleDragOver(e, globalIdx)}
                      onDrop={() => handleDrop(globalIdx)}>
                      <CustomStatWidget
                        widget={widget}
                        onRemove={() => removeWidget(widget.widget_id)}
                        onDragStart={() => setDraggingId(widget.widget_id)}
                        dragging={isDragging}
                        isEditMode={isEditMode}
                      />
                    </div>
                  );
                })}
                {isEditMode && (
                  <div
                    className="col-span-1 h-24 border-2 border-dashed rounded-xl flex items-center justify-center cursor-pointer transition-colors border-gray-200 hover:border-gray-300 bg-white"
                    onClick={() => setShowAddPanel(true)}>
                    <div className="flex flex-col items-center gap-1 text-gray-400">
                      <Plus size={18} />
                      <p className="text-xs">Add stat</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ── System overview ── */}
          <div>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">
              System overview
            </p>
            <div className="grid grid-cols-4 gap-4">
              {SYSTEM_STATS.map((s) => (
                <SystemStatCard
                  key={s.key}
                  icon={s.icon}
                  label={s.label}
                  value={(stats?.counts as any)?.[s.key] ?? 0}
                  loading={statsLoading}
                  colour={s.colour}
                />
              ))}
            </div>
          </div>

          {/* ── Activity + recent pages + system status ── */}
          <div className="grid grid-cols-4 gap-4">
            <div className="col-span-2">
              <ActivityFeed
                events={stats?.recent_activity ?? []}
                loading={statsLoading}
              />
            </div>
            <div className="col-span-1">
              <div style={{ backgroundColor: '#ffffff' }}
                className="rounded-xl border border-gray-200 shadow-sm overflow-hidden h-full">
                <div className="px-5 py-4 border-b border-gray-100">
                  <h2 className="text-sm font-semibold text-gray-900">Recent Pages</h2>
                  <p className="text-xs text-gray-400 mt-0.5">Last 5 modified</p>
                </div>
                {statsLoading ? (
                  <div className="p-4 flex flex-col gap-3 animate-pulse">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <div key={i} className="h-3 bg-gray-100 rounded w-full" />
                    ))}
                  </div>
                ) : (stats?.recent_pages ?? []).length === 0 ? (
                  <div className="px-5 py-6 text-center text-xs text-gray-400">No pages yet</div>
                ) : (
                  <div className="divide-y divide-gray-50">
                    {(stats?.recent_pages ?? []).map((page) => (
                      <div key={page.id}
                        className="flex items-center gap-3 px-4 py-2.5 hover:bg-gray-50 transition-colors">
                        <FileText size={13} className="text-gray-400 shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium text-gray-800 truncate">{page.title}</p>
                          <p className="text-[10px] text-gray-400 font-mono">/{page.slug}</p>
                        </div>
                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
                          page.page_type === 'admin'
                            ? 'bg-violet-50 text-violet-600'
                            : 'bg-blue-50 text-blue-600'
                        }`}>
                          {page.page_type ?? 'client'}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
            <div className="col-span-1">
              <SystemStatus
                project={stats?.project ?? null}
                counts={{
                  users:         stats?.counts?.users         ?? 0,
                  pages:         stats?.counts?.pages         ?? 0,
                  models:        stats?.counts?.models        ?? 0,
                  menu_items:    stats?.counts?.menu_items    ?? 0,
                  media_files:   stats?.counts?.media_files   ?? 0,
                  storage_bytes: stats?.counts?.storage_bytes ?? 0,
                }}
                loading={statsLoading}
              />
            </div>
          </div>

        </div>
      </div>

      {showAddPanel && (
        <AddWidgetPanel
          collections={collections}
          onAddStat={addStatWidget}
          onAddChart={addChartWidget}
          onClose={() => setShowAddPanel(false)}
        />
      )}
    </div>
  );
}