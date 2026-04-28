'use client';

import { useState } from 'react';
import {
  FiUsers, FiShoppingCart, FiDollarSign, FiTrendingUp,
  FiPlus, FiX, FiMove, FiRefreshCw, FiMoreHorizontal,
  FiPackage, FiEye, FiAlertCircle, FiChevronDown,
  FiCheck, FiCode,
} from 'react-icons/fi';

// ── Types ─────────────────────────────────────────────────────────────────────
type FormulaPreset = {
  id: string;
  label: string;
  formula: string;
  description: string;
};

type Widget = {
  id: string;
  type: 'stat' | 'chart' | 'list' | 'formula';
  title: string;
  formula?: string;
  value?: string;
  change?: string;
  positive?: boolean;
  icon?: string;
  color?: string;
  span?: 1 | 2 | 3;
};

// ── Formula presets (Notion/Excel style) ──────────────────────────────────────
const formulaPresets: FormulaPreset[] = [
  { id: 'sales_7d',    label: 'Sales (7 days)',       formula: 'SUM(orders.total, DATERANGE(-7d, today))',           description: 'Total revenue in the last 7 days'          },
  { id: 'sales_30d',   label: 'Sales (30 days)',      formula: 'SUM(orders.total, DATERANGE(-30d, today))',          description: 'Total revenue in the last 30 days'         },
  { id: 'users_total', label: 'Total Users',          formula: 'COUNT(users)',                                       description: 'All registered users'                      },
  { id: 'users_new',   label: 'New Users (7 days)',   formula: 'COUNT(users, WHERE created_at > DATERANGE(-7d))',    description: 'Users registered in the last 7 days'       },
  { id: 'orders_open', label: 'Open Orders',          formula: 'COUNT(orders, WHERE status = "pending")',            description: 'Orders awaiting fulfilment'                 },
  { id: 'avg_order',   label: 'Avg Order Value',      formula: 'AVG(orders.total)',                                  description: 'Average value across all orders'           },
  { id: 'conversion',  label: 'Conversion Rate',      formula: 'DIVIDE(COUNT(orders), COUNT(sessions)) * 100',      description: 'Orders divided by total sessions × 100'   },
  { id: 'revenue_mom', label: 'Revenue MoM %',        formula: 'PERCENT_CHANGE(SUM(orders.total, last_month), SUM(orders.total, this_month))', description: 'Month-over-month revenue change' },
];

// ── Mock widget data ───────────────────────────────────────────────────────────
const widgetLibrary: Omit<Widget, 'id'>[] = [
  { type: 'stat',    title: 'Total Revenue',     value: 'R 84,320',  change: '+12.4%',  positive: true,  icon: 'FiDollarSign', color: 'green',  formula: 'SUM(orders.total)'                                    },
  { type: 'stat',    title: 'Registered Users',  value: '1,284',     change: '+8.1%',   positive: true,  icon: 'FiUsers',      color: 'blue',   formula: 'COUNT(users)'                                         },
  { type: 'stat',    title: 'Orders (7 days)',   value: '243',       change: '-3.2%',   positive: false, icon: 'FiShoppingCart',color: 'orange', formula: 'COUNT(orders, DATERANGE(-7d, today))'                 },
  { type: 'stat',    title: 'Avg Order Value',   value: 'R 347',     change: '+5.7%',   positive: true,  icon: 'FiTrendingUp', color: 'purple', formula: 'AVG(orders.total)'                                    },
  { type: 'stat',    title: 'Conversion Rate',   value: '3.8%',      change: '+0.4%',   positive: true,  icon: 'FiEye',        color: 'teal',   formula: 'DIVIDE(COUNT(orders), COUNT(sessions)) * 100'          },
  { type: 'stat',    title: 'Open Orders',       value: '17',        change: '+2',      positive: false, icon: 'FiAlertCircle',color: 'red',    formula: 'COUNT(orders, WHERE status = "pending")'              },
  { type: 'chart',   title: 'Revenue (30 days)', span: 2,            formula: 'SUM(orders.total, DATERANGE(-30d, today), GROUP_BY(day))'                                                                         },
  { type: 'chart',   title: 'New Users (30 days)',span: 2,           formula: 'COUNT(users, DATERANGE(-30d, today), GROUP_BY(day))'                                                                              },
  { type: 'list',    title: 'Recent Orders',     span: 2,            formula: 'SELECT(orders, LIMIT(5), ORDER_BY(created_at, DESC))'                                                                             },
  { type: 'list',    title: 'Top Products',      span: 1,            formula: 'SELECT(products, ORDER_BY(sales, DESC), LIMIT(5))'                                                                                },
  { type: 'formula', title: 'Custom Metric',     span: 1,            formula: ''                                                                                                                                  },
];

// ── Colour map ────────────────────────────────────────────────────────────────
const colorMap: Record<string, { bg: string; text: string; light: string }> = {
  green:  { bg: 'bg-green-500',  text: 'text-green-600',  light: 'bg-green-50'  },
  blue:   { bg: 'bg-blue-500',   text: 'text-blue-600',   light: 'bg-blue-50'   },
  orange: { bg: 'bg-orange-500', text: 'text-orange-600', light: 'bg-orange-50' },
  purple: { bg: 'bg-violet-500', text: 'text-violet-600', light: 'bg-violet-50' },
  teal:   { bg: 'bg-teal-500',   text: 'text-teal-600',   light: 'bg-teal-50'   },
  red:    { bg: 'bg-red-500',    text: 'text-red-600',    light: 'bg-red-50'    },
};

function getIconNode(name?: string, size = 18) {
  const map: Record<string, React.ReactNode> = {
    FiDollarSign:  <FiDollarSign size={size} />,
    FiUsers:       <FiUsers size={size} />,
    FiShoppingCart:<FiShoppingCart size={size} />,
    FiTrendingUp:  <FiTrendingUp size={size} />,
    FiEye:         <FiEye size={size} />,
    FiAlertCircle: <FiAlertCircle size={size} />,
    FiPackage:     <FiPackage size={size} />,
  };
  return map[name ?? ''] ?? <FiTrendingUp size={size} />;
}

// ── Mock chart bars ───────────────────────────────────────────────────────────
const mockBars = [40, 65, 45, 80, 55, 90, 70, 85, 60, 95, 75, 88, 50, 72, 68, 91, 63, 77, 84, 58, 93, 66, 79, 87, 54, 70, 82, 61, 88, 74];

// ── Mock orders ───────────────────────────────────────────────────────────────
const mockOrders = [
  { id: '#1042', customer: 'Anton Wentzel',  amount: 'R 1,240', status: 'paid',    date: '25 Apr' },
  { id: '#1041', customer: 'Sarah Louw',     amount: 'R 320',   status: 'pending', date: '24 Apr' },
  { id: '#1040', customer: 'James Botha',    amount: 'R 890',   status: 'paid',    date: '24 Apr' },
  { id: '#1039', customer: 'Nadia Smit',     amount: 'R 2,100', status: 'shipped', date: '23 Apr' },
  { id: '#1038', customer: 'Ruan Pretorius', amount: 'R 450',   status: 'paid',    date: '22 Apr' },
];

const mockProducts = [
  { name: 'Running Shoes Pro', sales: 142, revenue: 'R 28,400' },
  { name: 'Gym Bag XL',        sales: 98,  revenue: 'R 14,700' },
  { name: 'Water Bottle',      sales: 87,  revenue: 'R 4,350'  },
  { name: 'Yoga Mat',          sales: 64,  revenue: 'R 9,600'  },
  { name: 'Resistance Bands',  sales: 51,  revenue: 'R 2,550'  },
];

const statusColor: Record<string, string> = {
  paid:    'bg-green-100 text-green-700',
  pending: 'bg-amber-100 text-amber-700',
  shipped: 'bg-blue-100 text-blue-700',
};

// ── Widget components ─────────────────────────────────────────────────────────
function StatWidget({ widget, onRemove, dragging, onDragStart }: {
  widget: Widget;
  onRemove: () => void;
  dragging: boolean;
  onDragStart: () => void;
}) {
  const c = colorMap[widget.color ?? 'blue'];
  return (
    <div className={`group relative bg-white border border-gray-200 rounded-xl p-5 flex flex-col gap-3 shadow-sm transition-shadow hover:shadow-md ${dragging ? 'opacity-50 ring-2 ring-blue-300' : ''}`}>
      <div className="flex items-start justify-between">
        <div className={`w-10 h-10 rounded-lg ${c.light} ${c.text} flex items-center justify-center`}>
          {getIconNode(widget.icon)}
        </div>
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <div
            draggable
            onDragStart={onDragStart}
            className="cursor-grab p-1 rounded hover:bg-gray-100 text-gray-400"
            title="Drag to reorder"
          >
            <FiMove size={13} />
          </div>
          <button onClick={onRemove} className="p-1 rounded hover:bg-red-50 text-gray-400 hover:text-red-500">
            <FiX size={13} />
          </button>
        </div>
      </div>

      <div>
        <p className="text-xs text-gray-400 font-medium">{widget.title}</p>
        <p className="text-2xl font-bold text-gray-900 mt-0.5">{widget.value}</p>
      </div>

      <div className="flex items-center justify-between">
        <span className={`text-xs font-semibold ${widget.positive ? 'text-green-600' : 'text-red-500'}`}>
          {widget.change} vs last period
        </span>
      </div>

      {widget.formula && (
        <div className="flex items-center gap-1.5 px-2 py-1 bg-gray-50 border border-gray-100 rounded-md">
          <FiCode size={10} className="text-gray-400 shrink-0" />
          <p className="text-[10px] text-gray-400 font-mono truncate">{widget.formula}</p>
        </div>
      )}
    </div>
  );
}

function ChartWidget({ widget, onRemove, onDragStart, dragging }: {
  widget: Widget;
  onRemove: () => void;
  onDragStart: () => void;
  dragging: boolean;
}) {
  const max = Math.max(...mockBars);
  return (
    <div className={`group relative bg-white border border-gray-200 rounded-xl p-5 shadow-sm hover:shadow-md transition-shadow ${dragging ? 'opacity-50 ring-2 ring-blue-300' : ''}`}>
      <div className="flex items-center justify-between mb-4">
        <div>
          <p className="text-sm font-semibold text-gray-800">{widget.title}</p>
          {widget.formula && (
            <p className="text-[10px] text-gray-400 font-mono mt-0.5 truncate max-w-xs">{widget.formula}</p>
          )}
        </div>
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button className="p-1 rounded hover:bg-gray-100 text-gray-400"><FiRefreshCw size={13} /></button>
          <div draggable onDragStart={onDragStart} className="cursor-grab p-1 rounded hover:bg-gray-100 text-gray-400"><FiMove size={13} /></div>
          <button onClick={onRemove} className="p-1 rounded hover:bg-red-50 text-gray-400 hover:text-red-500"><FiX size={13} /></button>
        </div>
      </div>

      <div className="flex items-end gap-0.5 h-28">
        {mockBars.map((h, i) => (
          <div
            key={i}
            className="flex-1 bg-gray-200 hover:bg-gray-800 rounded-t transition-colors cursor-pointer"
            style={{ height: `${(h / max) * 100}%` }}
            title={`Day ${i + 1}: ${h}`}
          />
        ))}
      </div>

      <div className="flex justify-between mt-2">
        <span className="text-[10px] text-gray-400">30 days ago</span>
        <span className="text-[10px] text-gray-400">Today</span>
      </div>
    </div>
  );
}

function ListWidget({ widget, onRemove, onDragStart, dragging }: {
  widget: Widget;
  onRemove: () => void;
  onDragStart: () => void;
  dragging: boolean;
}) {
  const isOrders   = widget.title.toLowerCase().includes('order');
  const isProducts = widget.title.toLowerCase().includes('product');

  return (
    <div className={`group relative bg-white border border-gray-200 rounded-xl shadow-sm hover:shadow-md transition-shadow overflow-hidden ${dragging ? 'opacity-50 ring-2 ring-blue-300' : ''}`}>
      <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
        <div>
          <p className="text-sm font-semibold text-gray-800">{widget.title}</p>
          {widget.formula && (
            <p className="text-[10px] text-gray-400 font-mono mt-0.5 truncate max-w-xs">{widget.formula}</p>
          )}
        </div>
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <div draggable onDragStart={onDragStart} className="cursor-grab p-1 rounded hover:bg-gray-100 text-gray-400"><FiMove size={13} /></div>
          <button onClick={onRemove} className="p-1 rounded hover:bg-red-50 text-gray-400 hover:text-red-500"><FiX size={13} /></button>
        </div>
      </div>

      {isOrders && (
        <div>
          {mockOrders.map((o) => (
            <div key={o.id} className="flex items-center gap-3 px-5 py-2.5 border-b border-gray-50 last:border-0 hover:bg-gray-50 transition-colors">
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-gray-800">{o.id} · {o.customer}</p>
                <p className="text-[10px] text-gray-400">{o.date}</p>
              </div>
              <p className="text-xs font-semibold text-gray-700 shrink-0">{o.amount}</p>
              <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full shrink-0 capitalize ${statusColor[o.status]}`}>{o.status}</span>
            </div>
          ))}
        </div>
      )}

      {isProducts && (
        <div>
          {mockProducts.map((p, i) => (
            <div key={p.name} className="flex items-center gap-3 px-5 py-2.5 border-b border-gray-50 last:border-0 hover:bg-gray-50 transition-colors">
              <span className="text-xs font-bold text-gray-300 w-4 shrink-0">#{i + 1}</span>
              <p className="text-xs font-medium text-gray-800 flex-1 truncate">{p.name}</p>
              <p className="text-[10px] text-gray-400 shrink-0">{p.sales} sold</p>
              <p className="text-xs font-semibold text-gray-700 shrink-0">{p.revenue}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function FormulaWidget({ widget, onRemove, onDragStart, dragging }: {
  widget: Widget;
  onRemove: () => void;
  onDragStart: () => void;
  dragging: boolean;
}) {
  const [formula, setFormula] = useState(widget.formula ?? '');
  const [showPresets, setShowPresets] = useState(false);

  return (
    <div className={`group relative bg-white border border-gray-200 rounded-xl p-5 shadow-sm hover:shadow-md transition-shadow ${dragging ? 'opacity-50 ring-2 ring-blue-300' : ''}`}>
      <div className="flex items-center justify-between mb-3">
        <p className="text-sm font-semibold text-gray-800">{widget.title}</p>
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <div draggable onDragStart={onDragStart} className="cursor-grab p-1 rounded hover:bg-gray-100 text-gray-400"><FiMove size={13} /></div>
          <button onClick={onRemove} className="p-1 rounded hover:bg-red-50 text-gray-400 hover:text-red-500"><FiX size={13} /></button>
        </div>
      </div>

      <div className="relative">
        <input
          value={formula}
          onChange={(e) => setFormula(e.target.value)}
          placeholder="e.g. SUM(orders.total, DATERANGE(-7d, today))"
          className="w-full px-3 py-2 pr-24 text-xs font-mono border border-gray-200 rounded-md bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-300 focus:bg-white transition"
        />
        <button
          onClick={() => setShowPresets((v) => !v)}
          className="absolute right-1 top-1 px-2 py-1 text-[10px] font-medium bg-gray-100 hover:bg-gray-200 text-gray-600 rounded transition flex items-center gap-1"
        >
          Presets <FiChevronDown size={10} />
        </button>
      </div>

      {showPresets && (
        <div className="mt-2 border border-gray-200 rounded-lg overflow-hidden bg-white shadow-md">
          {formulaPresets.map((p) => (
            <button
              key={p.id}
              onClick={() => { setFormula(p.formula); setShowPresets(false); }}
              className="w-full text-left px-3 py-2.5 hover:bg-gray-50 border-b border-gray-100 last:border-0 transition-colors"
            >
              <p className="text-xs font-semibold text-gray-800">{p.label}</p>
              <p className="text-[10px] text-gray-400 font-mono mt-0.5 truncate">{p.formula}</p>
            </button>
          ))}
        </div>
      )}

      {formula && (
        <div className="mt-3 flex items-center gap-2 p-2.5 bg-gray-50 border border-gray-100 rounded-md">
          <FiCheck size={12} className="text-green-500 shrink-0" />
          <p className="text-xs text-gray-600 font-mono truncate">{formula}</p>
        </div>
      )}
    </div>
  );
}

// ── Add widget panel ──────────────────────────────────────────────────────────
function AddWidgetPanel({ onAdd, onClose }: {
  onAdd: (w: Omit<Widget, 'id'>) => void;
  onClose: () => void;
}) {
  return (
    <>
      <div className="fixed inset-0 bg-black/20 z-40" onClick={onClose} />
      <div className="fixed top-16 right-0 bottom-0 w-80 bg-white border-l border-gray-200 z-50 flex flex-col shadow-2xl">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 shrink-0">
          <div>
            <h2 className="text-sm font-bold text-gray-900">Add Widget</h2>
            <p className="text-xs text-gray-400 mt-0.5">Click to add to dashboard</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><FiX size={18} /></button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-2">
          {widgetLibrary.map((w, i) => (
            <button
              key={i}
              onClick={() => { onAdd(w); onClose(); }}
              className="w-full text-left px-4 py-3 bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-lg transition-colors group"
            >
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold text-gray-800 capitalize">{w.title}</p>
                <span className="text-[10px] text-gray-400 bg-white border border-gray-200 px-1.5 py-0.5 rounded capitalize">{w.type}</span>
              </div>
              {w.formula && (
                <p className="text-[10px] text-gray-400 font-mono mt-1 truncate">{w.formula}</p>
              )}
            </button>
          ))}
        </div>
      </div>
    </>
  );
}

// ── Main dashboard ────────────────────────────────────────────────────────────
export default function DashboardPage() {
  const [widgets, setWidgets] = useState<Widget[]>([
    { id: 'w1', type: 'stat',    title: 'Total Revenue',     value: 'R 84,320', change: '+12.4%', positive: true,  icon: 'FiDollarSign', color: 'green',  formula: 'SUM(orders.total)'                              },
    { id: 'w2', type: 'stat',    title: 'Registered Users',  value: '1,284',    change: '+8.1%',  positive: true,  icon: 'FiUsers',      color: 'blue',   formula: 'COUNT(users)'                                   },
    { id: 'w3', type: 'stat',    title: 'Orders (7 days)',   value: '243',      change: '-3.2%',  positive: false, icon: 'FiShoppingCart',color: 'orange', formula: 'COUNT(orders, DATERANGE(-7d, today))'           },
    { id: 'w4', type: 'stat',    title: 'Avg Order Value',   value: 'R 347',    change: '+5.7%',  positive: true,  icon: 'FiTrendingUp', color: 'purple', formula: 'AVG(orders.total)'                              },
    { id: 'w5', type: 'chart',   title: 'Revenue (30 days)', span: 2,           formula: 'SUM(orders.total, DATERANGE(-30d, today), GROUP_BY(day))'                                                                  },
    { id: 'w6', type: 'list',    title: 'Recent Orders',     span: 2,           formula: 'SELECT(orders, LIMIT(5), ORDER_BY(created_at, DESC))'                                                                      },
    { id: 'w7', type: 'list',    title: 'Top Products',      span: 1,           formula: 'SELECT(products, ORDER_BY(sales, DESC), LIMIT(5))'                                                                         },
    { id: 'w8', type: 'formula', title: 'Custom Metric',     span: 1,           formula: ''                                                                                                                          },
  ]);

  const [draggingId,   setDraggingId]   = useState<string | null>(null);
  const [overIdx,      setOverIdx]       = useState<number | null>(null);
  const [showAddPanel, setShowAddPanel]  = useState(false);

  const removeWidget = (id: string) =>
    setWidgets((prev) => prev.filter((w) => w.id !== id));

  const addWidget = (w: Omit<Widget, 'id'>) =>
    setWidgets((prev) => [...prev, { ...w, id: Date.now().toString() }]);

  // ── Drag handlers ──
  const handleDragStart = (id: string) => setDraggingId(id);

  const handleDragOver = (e: React.DragEvent, idx: number) => {
    e.preventDefault();
    setOverIdx(idx);
  };

  const handleDrop = (idx: number) => {
    if (!draggingId) return;
    const fromIdx = widgets.findIndex((w) => w.id === draggingId);
    if (fromIdx === -1 || fromIdx === idx) { setDraggingId(null); setOverIdx(null); return; }
    const next = [...widgets];
    const [moved] = next.splice(fromIdx, 1);
    next.splice(idx, 0, moved);
    setWidgets(next);
    setDraggingId(null);
    setOverIdx(null);
  };

  const renderWidget = (widget: Widget, idx: number) => {
    const isOver    = overIdx === idx;
    const isDragging = draggingId === widget.id;

    const spanClass =
      widget.span === 2 ? 'col-span-2' :
      widget.span === 3 ? 'col-span-3' : 'col-span-1';

    const shared = {
      onRemove:    () => removeWidget(widget.id),
      onDragStart: () => handleDragStart(widget.id),
      dragging:    isDragging,
    };

    return (
      <div
        key={widget.id}
        className={`${spanClass} ${isOver ? 'ring-2 ring-blue-400 ring-offset-2 rounded-xl' : ''}`}
        onDragOver={(e) => handleDragOver(e, idx)}
        onDrop={() => handleDrop(idx)}
      >
        {widget.type === 'stat'    && <StatWidget    widget={widget} {...shared} />}
        {widget.type === 'chart'   && <ChartWidget   widget={widget} {...shared} />}
        {widget.type === 'list'    && <ListWidget     widget={widget} {...shared} />}
        {widget.type === 'formula' && <FormulaWidget  widget={widget} {...shared} />}
      </div>
    );
  };

  return (
    <div className="flex flex-col h-[calc(100vh-64px)] bg-gray-100 overflow-hidden">

      {/* ── Toolbar ── */}
      <div className="shrink-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
        <div>
          <h1 className="text-base font-bold text-gray-900">Dashboard</h1>
          <p className="text-xs text-gray-400 mt-0.5">Drag widgets to reorder · hover to edit</p>
        </div>
        <div className="flex items-center gap-2">
          <button className="flex items-center gap-1.5 px-3 py-2 border border-gray-200 bg-white text-gray-600 text-xs font-medium rounded-md hover:bg-gray-50 transition">
            <FiRefreshCw size={13} /> Refresh
          </button>
          <button className="flex items-center gap-1.5 px-3 py-2 border border-gray-200 bg-white text-gray-600 text-xs font-medium rounded-md hover:bg-gray-50 transition">
            <FiMoreHorizontal size={13} /> Last 30 days <FiChevronDown size={11} />
          </button>
          <button
            onClick={() => setShowAddPanel(true)}
            className="flex items-center gap-1.5 px-4 py-2 bg-gray-900 text-white text-sm font-medium rounded-md hover:bg-gray-700 transition"
          >
            <FiPlus size={15} /> Add Widget
          </button>
        </div>
      </div>

      {/* ── Grid ── */}
      <div className="flex-1 overflow-y-auto p-6">
        <div className="grid grid-cols-4 gap-4 auto-rows-auto">
          {widgets.map((widget, idx) => renderWidget(widget, idx))}

          {/* Drop zone at end */}
          <div
            className={`col-span-1 h-24 border-2 border-dashed rounded-xl flex items-center justify-center cursor-pointer transition-colors ${
              overIdx === widgets.length ? 'border-blue-400 bg-blue-50' : 'border-gray-200 hover:border-gray-300 bg-white'
            }`}
            onDragOver={(e) => handleDragOver(e, widgets.length)}
            onDrop={() => handleDrop(widgets.length)}
            onClick={() => setShowAddPanel(true)}
          >
            <div className="flex flex-col items-center gap-1 text-gray-400">
              <FiPlus size={18} />
              <p className="text-xs">Add widget</p>
            </div>
          </div>
        </div>
      </div>

      {/* Add widget panel */}
      {showAddPanel && (
        <AddWidgetPanel onAdd={addWidget} onClose={() => setShowAddPanel(false)} />
      )}
    </div>
  );
}