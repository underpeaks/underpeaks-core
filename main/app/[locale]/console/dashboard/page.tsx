'use client';

/**
 * @file DashboardPage.tsx
 * @description
 * The main dashboard page for the admin console. It displays a customisable
 * grid of widgets that show key business metrics, charts, and data lists.
 *
 * What can the user do on this page?
 * ------------------------------------
 * - View stat widgets showing totals and percentage changes (revenue, users, orders, etc.)
 * - View bar chart widgets showing trends over time
 * - View list widgets showing recent orders and top products
 * - Add a custom formula widget with Excel/Notion-style formula syntax
 * - Add new widgets from a slide-in panel on the right
 * - Remove any widget by hovering over it and clicking the X button
 * - Reorder widgets by dragging and dropping them into a new position
 *
 * How does the drag-and-drop work?
 * ---------------------------------
 * We use the browser's native HTML drag-and-drop API (draggable, onDragStart,
 * onDragOver, onDrop). When a widget starts being dragged, its ID is stored in
 * state. When it is dropped onto another position, we find both the dragged widget
 * and the target position in the widgets array, remove the dragged item, and
 * insert it at the new position.
 *
 * What are formula widgets?
 * --------------------------
 * Formula widgets let the user type a custom metric expression using a
 * spreadsheet-like syntax (e.g. SUM(orders.total, DATERANGE(-7d, today))).
 * A list of preset formulas is available to help users get started quickly.
 * The formula is currently display-only — it is not evaluated in this UI.
 *
 * What is the widget span system?
 * --------------------------------
 * The dashboard uses a 4-column CSS grid. Each widget can span 1, 2, or 3
 * columns using the `span` property. This allows charts and lists to take up
 * more horizontal space than smaller stat cards.
 *
 * Note on mock data:
 * -------------------
 * All values (revenue, order data, product data, chart bars) are hardcoded
 * mock data for display purposes. In production, these would be replaced by
 * real API calls driven by each widget's formula.
 */

import { useState } from 'react';
import {
  FiUsers, FiShoppingCart, FiDollarSign, FiTrendingUp,
  FiPlus, FiX, FiMove, FiRefreshCw, FiMoreHorizontal,
  FiPackage, FiEye, FiAlertCircle, FiChevronDown,
  FiCheck, FiCode,
} from 'react-icons/fi';
import { useTranslations } from 'next-intl';

// ─── Types ────────────────────────────────────────────────────────────────────

/**
 * @typedef FormulaPreset
 * @description
 * A predefined formula the user can select from the formula widget's preset menu.
 *
 * @property {string} id          - Unique identifier for the preset.
 * @property {string} label       - Human-readable name shown in the preset list.
 * @property {string} formula     - The formula string that gets inserted into the input.
 * @property {string} description - A brief explanation of what the formula calculates.
 */
type FormulaPreset = {
  id: string;
  label: string;
  formula: string;
  description: string;
};

/**
 * @typedef Widget
 * @description
 * Represents a single widget on the dashboard grid.
 *
 * @property {string} id               - Unique identifier (used as React key and for drag-drop).
 * @property {'stat'|'chart'|'list'|'formula'} type - Determines which widget component is rendered.
 * @property {string} title            - Display title shown on the widget.
 * @property {string} [formula]        - Formula string shown below the title (display only).
 * @property {string} [value]          - The main metric value shown on stat widgets (e.g. "R 84,320").
 * @property {string} [change]         - The percentage/absolute change string (e.g. "+12.4%").
 * @property {boolean} [positive]      - Whether the change is positive (green) or negative (red).
 * @property {string} [icon]           - Icon name string mapped to a react-icons component.
 * @property {string} [color]          - Colour key looked up in colorMap (e.g. 'green', 'blue').
 * @property {1|2|3} [span]            - How many grid columns this widget occupies. Defaults to 1.
 */
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

// ─── Formula Presets ──────────────────────────────────────────────────────────

/**
 * List of predefined formulas available in the formula widget's preset dropdown.
 * These use a spreadsheet-like syntax inspired by Notion and Excel formulas.
 * In production, these would be parsed and executed server-side against real data.
 */
const formulaPresets: FormulaPreset[] = [
  { id: 'sales_7d',    label: 'Sales (7 days)',      formula: 'SUM(orders.total, DATERANGE(-7d, today))',                                                   description: 'Total revenue in the last 7 days'         },
  { id: 'sales_30d',   label: 'Sales (30 days)',     formula: 'SUM(orders.total, DATERANGE(-30d, today))',                                                  description: 'Total revenue in the last 30 days'        },
  { id: 'users_total', label: 'Total Users',         formula: 'COUNT(users)',                                                                               description: 'All registered users'                     },
  { id: 'users_new',   label: 'New Users (7 days)',  formula: 'COUNT(users, WHERE created_at > DATERANGE(-7d))',                                            description: 'Users registered in the last 7 days'      },
  { id: 'orders_open', label: 'Open Orders',         formula: 'COUNT(orders, WHERE status = "pending")',                                                    description: 'Orders awaiting fulfilment'                },
  { id: 'avg_order',   label: 'Avg Order Value',     formula: 'AVG(orders.total)',                                                                          description: 'Average value across all orders'          },
  { id: 'conversion',  label: 'Conversion Rate',     formula: 'DIVIDE(COUNT(orders), COUNT(sessions)) * 100',                                              description: 'Orders divided by total sessions × 100'  },
  { id: 'revenue_mom', label: 'Revenue MoM %',       formula: 'PERCENT_CHANGE(SUM(orders.total, last_month), SUM(orders.total, this_month))',              description: 'Month-over-month revenue change'          },
];

// ─── Widget Library ───────────────────────────────────────────────────────────

/**
 * The full catalogue of widgets available in the "Add Widget" panel.
 * Each entry is a widget definition without an `id` (the id is assigned when added).
 * The user clicks any of these to add it to their dashboard.
 */
const widgetLibrary: Omit<Widget, 'id'>[] = [
  { type: 'stat',    title: 'Total Revenue',      value: 'R 84,320', change: '+12.4%', positive: true,  icon: 'FiDollarSign',  color: 'green',  formula: 'SUM(orders.total)'                                   },
  { type: 'stat',    title: 'Registered Users',   value: '1,284',    change: '+8.1%',  positive: true,  icon: 'FiUsers',       color: 'blue',   formula: 'COUNT(users)'                                        },
  { type: 'stat',    title: 'Orders (7 days)',    value: '243',      change: '-3.2%',  positive: false, icon: 'FiShoppingCart',color: 'orange', formula: 'COUNT(orders, DATERANGE(-7d, today))'                },
  { type: 'stat',    title: 'Avg Order Value',    value: 'R 347',    change: '+5.7%',  positive: true,  icon: 'FiTrendingUp',  color: 'purple', formula: 'AVG(orders.total)'                                   },
  { type: 'stat',    title: 'Conversion Rate',    value: '3.8%',     change: '+0.4%',  positive: true,  icon: 'FiEye',         color: 'teal',   formula: 'DIVIDE(COUNT(orders), COUNT(sessions)) * 100'        },
  { type: 'stat',    title: 'Open Orders',        value: '17',       change: '+2',     positive: false, icon: 'FiAlertCircle', color: 'red',    formula: 'COUNT(orders, WHERE status = "pending")'             },
  { type: 'chart',   title: 'Revenue (30 days)',  span: 2,           formula: 'SUM(orders.total, DATERANGE(-30d, today), GROUP_BY(day))'                                                                        },
  { type: 'chart',   title: 'New Users (30 days)',span: 2,           formula: 'COUNT(users, DATERANGE(-30d, today), GROUP_BY(day))'                                                                             },
  { type: 'list',    title: 'Recent Orders',      span: 2,           formula: 'SELECT(orders, LIMIT(5), ORDER_BY(created_at, DESC))'                                                                            },
  { type: 'list',    title: 'Top Products',       span: 1,           formula: 'SELECT(products, ORDER_BY(sales, DESC), LIMIT(5))'                                                                               },
  { type: 'formula', title: 'Custom Metric',      span: 1,           formula: ''                                                                                                                                 },
];

// ─── Colour Map ───────────────────────────────────────────────────────────────

/**
 * Maps colour names to their Tailwind CSS class sets.
 * Each entry provides three variants: a solid background, a text colour,
 * and a light background — used together to style stat widget icon circles.
 */
const colorMap: Record<string, { bg: string; text: string; light: string }> = {
  green:  { bg: 'bg-green-500',  text: 'text-green-600',  light: 'bg-green-50'  },
  blue:   { bg: 'bg-blue-500',   text: 'text-blue-600',   light: 'bg-blue-50'   },
  orange: { bg: 'bg-orange-500', text: 'text-orange-600', light: 'bg-orange-50' },
  purple: { bg: 'bg-violet-500', text: 'text-violet-600', light: 'bg-violet-50' },
  teal:   { bg: 'bg-teal-500',   text: 'text-teal-600',   light: 'bg-teal-50'   },
  red:    { bg: 'bg-red-500',    text: 'text-red-600',    light: 'bg-red-50'    },
};

// ─── Icon Resolver ────────────────────────────────────────────────────────────

/**
 * @function getIconNode
 * @description
 * Converts an icon name string (stored in widget data) into an actual
 * React icon element from the react-icons/fi library.
 *
 * Why do we store icon names as strings?
 * We can't store JSX/React elements in plain JSON or state safely, so we
 * store the icon name and resolve it here at render time.
 *
 * Falls back to FiTrendingUp if the name is not found in the map.
 *
 * @param {string} [name] - The icon name string (e.g. "FiDollarSign").
 * @param {number} [size=18] - The icon size in pixels.
 * @returns {React.ReactNode} The resolved icon element.
 */
function getIconNode(name?: string, size = 18) {
  const map: Record<string, React.ReactNode> = {
    FiDollarSign:   <FiDollarSign size={size} />,
    FiUsers:        <FiUsers size={size} />,
    FiShoppingCart: <FiShoppingCart size={size} />,
    FiTrendingUp:   <FiTrendingUp size={size} />,
    FiEye:          <FiEye size={size} />,
    FiAlertCircle:  <FiAlertCircle size={size} />,
    FiPackage:      <FiPackage size={size} />,
  };
  return map[name ?? ''] ?? <FiTrendingUp size={size} />;
}

// ─── Mock Data ────────────────────────────────────────────────────────────────

/**
 * Mock bar heights for the chart widget (30 values representing 30 days).
 * In production, these would be fetched from the API based on the widget's formula.
 */
const mockBars = [40,65,45,80,55,90,70,85,60,95,75,88,50,72,68,91,63,77,84,58,93,66,79,87,54,70,82,61,88,74];

/**
 * Mock recent orders for the "Recent Orders" list widget.
 * In production, these would be fetched from the orders API.
 */
const mockOrders = [
  { id: '#1042', customer: 'Anton Wentzel',  amount: 'R 1,240', status: 'paid',    date: '25 Apr' },
  { id: '#1041', customer: 'Sarah Louw',     amount: 'R 320',   status: 'pending', date: '24 Apr' },
  { id: '#1040', customer: 'James Botha',    amount: 'R 890',   status: 'paid',    date: '24 Apr' },
  { id: '#1039', customer: 'Nadia Smit',     amount: 'R 2,100', status: 'shipped', date: '23 Apr' },
  { id: '#1038', customer: 'Ruan Pretorius', amount: 'R 450',   status: 'paid',    date: '22 Apr' },
];

/**
 * Mock top products for the "Top Products" list widget.
 * In production, these would be fetched from the products API.
 */
const mockProducts = [
  { name: 'Running Shoes Pro', sales: 142, revenue: 'R 28,400' },
  { name: 'Gym Bag XL',        sales: 98,  revenue: 'R 14,700' },
  { name: 'Water Bottle',      sales: 87,  revenue: 'R 4,350'  },
  { name: 'Yoga Mat',          sales: 64,  revenue: 'R 9,600'  },
  { name: 'Resistance Bands',  sales: 51,  revenue: 'R 2,550'  },
];

/**
 * Tailwind class pairs for order status badges.
 * Maps a status string to background + text colour classes.
 */
const statusColor: Record<string, string> = {
  paid:    'bg-green-100 text-green-700',
  pending: 'bg-amber-100 text-amber-700',
  shipped: 'bg-blue-100 text-blue-700',
};

// ─── Widget Sub-components ────────────────────────────────────────────────────

/**
 * @component StatWidget
 * @description
 * Displays a single metric as a card with an icon, title, value, change indicator,
 * and the formula used to calculate it. Shown for widgets of type 'stat'.
 *
 * The controls (drag handle, remove button) are hidden by default and appear
 * on hover using Tailwind's `group` and `group-hover` pattern.
 */
function StatWidget({ widget, onRemove, dragging, onDragStart, t }: {
  widget: Widget;
  onRemove: () => void;
  dragging: boolean;
  onDragStart: () => void;
  t: (key: string) => string;
}) {
  const c = colorMap[widget.color ?? 'blue'];
  return (
    <div className={`group relative bg-white border border-gray-200 rounded-xl p-5 flex flex-col gap-3 shadow-sm transition-shadow hover:shadow-md ${dragging ? 'opacity-50 ring-2 ring-blue-300' : ''}`}>
      <div className="flex items-start justify-between">
        {/* Icon circle — colour-coded per widget */}
        <div className={`w-10 h-10 rounded-lg ${c.light} ${c.text} flex items-center justify-center`}>
          {getIconNode(widget.icon)}
        </div>
        {/* Hover controls: drag handle + remove button */}
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <div
            draggable
            onDragStart={onDragStart}
            className="cursor-grab p-1 rounded hover:bg-gray-100 text-gray-400"
            title={t('widget.dragToReorder')}
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

      {/* Change indicator — green for positive, red for negative */}
      <div className="flex items-center justify-between">
        <span className={`text-xs font-semibold ${widget.positive ? 'text-green-600' : 'text-red-500'}`}>
          {widget.change} {t('widget.vsLastPeriod')}
        </span>
      </div>

      {/* Formula badge shown at the bottom of the card */}
      {widget.formula && (
        <div className="flex items-center gap-1.5 px-2 py-1 bg-gray-50 border border-gray-100 rounded-md">
          <FiCode size={10} className="text-gray-400 shrink-0" />
          <p className="text-[10px] text-gray-400 font-mono truncate">{widget.formula}</p>
        </div>
      )}
    </div>
  );
}

/**
 * @component ChartWidget
 * @description
 * Displays a bar chart showing a metric over the last 30 days.
 * Currently uses mock bar data — in production this would be driven by the formula.
 * Shown for widgets of type 'chart'.
 */
function ChartWidget({ widget, onRemove, onDragStart, dragging, t }: {
  widget: Widget;
  onRemove: () => void;
  onDragStart: () => void;
  dragging: boolean;
  t: (key: string) => string;
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
        {/* Hover controls: refresh, drag handle, remove */}
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button className="p-1 rounded hover:bg-gray-100 text-gray-400"><FiRefreshCw size={13} /></button>
          <div draggable onDragStart={onDragStart} className="cursor-grab p-1 rounded hover:bg-gray-100 text-gray-400"><FiMove size={13} /></div>
          <button onClick={onRemove} className="p-1 rounded hover:bg-red-50 text-gray-400 hover:text-red-500"><FiX size={13} /></button>
        </div>
      </div>

      {/* Bar chart — each bar's height is proportional to its value relative to the max */}
      <div className="flex items-end gap-0.5 h-28">
        {mockBars.map((h, i) => (
          <div
            key={i}
            className="flex-1 bg-gray-200 hover:bg-gray-800 rounded-t transition-colors cursor-pointer"
            style={{ height: `${(h / max) * 100}%` }}
            title={`${t('chart.day')} ${i + 1}: ${h}`}
          />
        ))}
      </div>

      {/* X-axis labels */}
      <div className="flex justify-between mt-2">
        <span className="text-[10px] text-gray-400">{t('chart.daysAgo')}</span>
        <span className="text-[10px] text-gray-400">{t('chart.today')}</span>
      </div>
    </div>
  );
}

/**
 * @component ListWidget
 * @description
 * Displays a list of recent orders or top products depending on the widget title.
 * The content is determined by checking whether the title contains "order" or "product".
 * Shown for widgets of type 'list'.
 */
function ListWidget({ widget, onRemove, onDragStart, dragging }: {
  widget: Widget;
  onRemove: () => void;
  onDragStart: () => void;
  dragging: boolean;
}) {
  /**
   * Determine list content type by checking the widget title.
   * This is a simple heuristic — in production the widget type
   * would be explicitly set rather than inferred from the title.
   */
  const isOrders   = widget.title.toLowerCase().includes('order');
  const isProducts = widget.title.toLowerCase().includes('product');

  return (
    <div className={`group relative bg-white border border-gray-200 rounded-xl shadow-sm hover:shadow-md transition-shadow overflow-hidden ${dragging ? 'opacity-50 ring-2 ring-blue-300' : ''}`}>
      {/* List header with title, formula, and hover controls */}
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

      {/* Orders list rows */}
      {isOrders && (
        <div>
          {mockOrders.map((o) => (
            <div key={o.id} className="flex items-center gap-3 px-5 py-2.5 border-b border-gray-50 last:border-0 hover:bg-gray-50 transition-colors">
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-gray-800">{o.id} · {o.customer}</p>
                <p className="text-[10px] text-gray-400">{o.date}</p>
              </div>
              <p className="text-xs font-semibold text-gray-700 shrink-0">{o.amount}</p>
              {/* Status badge — colour coded by statusColor map */}
              <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full shrink-0 capitalize ${statusColor[o.status]}`}>
                {o.status}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Products list rows */}
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

/**
 * @component FormulaWidget
 * @description
 * An editable widget where the user can type or select a custom formula.
 * Shows a text input with a "Presets" dropdown that lists common formula options.
 * When a formula is set, it is displayed in a confirmation row at the bottom.
 * Shown for widgets of type 'formula'.
 */
function FormulaWidget({ widget, onRemove, onDragStart, dragging, t }: {
  widget: Widget;
  onRemove: () => void;
  onDragStart: () => void;
  dragging: boolean;
  t: (key: string) => string;
}) {
  /** The current formula value in the input — initialised from the widget's formula prop. */
  const [formula, setFormula] = useState(widget.formula ?? '');

  /** Whether the presets dropdown is currently visible. */
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

      {/* Formula input with presets toggle button */}
      <div className="relative">
        <input
          value={formula}
          onChange={(e) => setFormula(e.target.value)}
          placeholder={t('formula.placeholder')}
          className="w-full px-3 py-2 pr-24 text-xs font-mono border border-gray-200 rounded-md bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-300 focus:bg-white transition"
        />
        <button
          onClick={() => setShowPresets((v) => !v)}
          className="absolute right-1 top-1 px-2 py-1 text-[10px] font-medium bg-gray-100 hover:bg-gray-200 text-gray-600 rounded transition flex items-center gap-1"
        >
          {t('formula.presets')} <FiChevronDown size={10} />
        </button>
      </div>

      {/* Presets dropdown — lists all formula presets for quick selection */}
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

      {/* Active formula confirmation row — shown when a formula is set */}
      {formula && (
        <div className="mt-3 flex items-center gap-2 p-2.5 bg-gray-50 border border-gray-100 rounded-md">
          <FiCheck size={12} className="text-green-500 shrink-0" />
          <p className="text-xs text-gray-600 font-mono truncate">{formula}</p>
        </div>
      )}
    </div>
  );
}

// ─── Add Widget Panel ─────────────────────────────────────────────────────────

/**
 * @component AddWidgetPanel
 * @description
 * A slide-in panel on the right side of the screen listing all available widgets
 * from the widgetLibrary. Clicking any widget adds it to the dashboard and closes
 * the panel. Clicking the backdrop also closes the panel.
 *
 * @param {{ onAdd: (w: Omit<Widget, 'id'>) => void; onClose: () => void }} props
 */
function AddWidgetPanel({ onAdd, onClose, t }: {
  onAdd: (w: Omit<Widget, 'id'>) => void;
  onClose: () => void;
  t: (key: string) => string;
}) {
  return (
    <>
      {/* Semi-transparent backdrop — clicking it closes the panel */}
      <div className="fixed inset-0 bg-black/20 z-40" onClick={onClose} />

      {/* Panel — slides in from the right */}
      <div className="fixed top-16 right-0 bottom-0 w-80 bg-white border-l border-gray-200 z-50 flex flex-col shadow-2xl">

        {/* Panel header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 shrink-0">
          <div>
            <h2 className="text-sm font-bold text-gray-900">{t('addPanel.title')}</h2>
            <p className="text-xs text-gray-400 mt-0.5">{t('addPanel.subtitle')}</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><FiX size={18} /></button>
        </div>

        {/* Scrollable list of available widgets */}
        <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-2">
          {widgetLibrary.map((w, i) => (
            <button
              key={i}
              onClick={() => { onAdd(w); onClose(); }}
              className="w-full text-left px-4 py-3 bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-lg transition-colors group"
            >
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold text-gray-800 capitalize">{w.title}</p>
                {/* Widget type badge */}
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

// ─── Main Dashboard Page ──────────────────────────────────────────────────────

/**
 * @component DashboardPage
 * @description
 * The root dashboard component. Manages the full widget grid state including:
 * - The list of currently placed widgets
 * - Drag-and-drop reordering logic
 * - Adding and removing widgets
 * - Opening/closing the Add Widget panel
 *
 * @returns {JSX.Element}
 */
export default function DashboardPage() {
  /**
   * t() is the translation function from next-intl.
   * All keys for this page live under the "dashboard" namespace in en.json.
   */
  const t = useTranslations('dashboard');

  /**
   * The ordered array of widgets currently displayed on the dashboard.
   * The initial state mirrors the default layout shown on first load.
   * Each widget has a unique `id` used as a React key and for drag-drop tracking.
   */
  const [widgets, setWidgets] = useState<Widget[]>([
    { id: 'w1', type: 'stat',    title: 'Total Revenue',     value: 'R 84,320', change: '+12.4%', positive: true,  icon: 'FiDollarSign',  color: 'green',  formula: 'SUM(orders.total)'                            },
    { id: 'w2', type: 'stat',    title: 'Registered Users',  value: '1,284',    change: '+8.1%',  positive: true,  icon: 'FiUsers',       color: 'blue',   formula: 'COUNT(users)'                                 },
    { id: 'w3', type: 'stat',    title: 'Orders (7 days)',   value: '243',      change: '-3.2%',  positive: false, icon: 'FiShoppingCart',color: 'orange', formula: 'COUNT(orders, DATERANGE(-7d, today))'         },
    { id: 'w4', type: 'stat',    title: 'Avg Order Value',   value: 'R 347',    change: '+5.7%',  positive: true,  icon: 'FiTrendingUp',  color: 'purple', formula: 'AVG(orders.total)'                            },
    { id: 'w5', type: 'chart',   title: 'Revenue (30 days)', span: 2,           formula: 'SUM(orders.total, DATERANGE(-30d, today), GROUP_BY(day))'                                                                  },
    { id: 'w6', type: 'list',    title: 'Recent Orders',     span: 2,           formula: 'SELECT(orders, LIMIT(5), ORDER_BY(created_at, DESC))'                                                                      },
    { id: 'w7', type: 'list',    title: 'Top Products',      span: 1,           formula: 'SELECT(products, ORDER_BY(sales, DESC), LIMIT(5))'                                                                         },
    { id: 'w8', type: 'formula', title: 'Custom Metric',     span: 1,           formula: ''                                                                                                                          },
  ]);

  /** The id of the widget currently being dragged, or null if none. */
  const [draggingId, setDraggingId] = useState<string | null>(null);

  /**
   * The grid index the user is currently dragging over, or null.
   * Used to show a blue highlight ring on the drop target.
   */
  const [overIdx, setOverIdx] = useState<number | null>(null);

  /** Whether the "Add Widget" slide-in panel is currently visible. */
  const [showAddPanel, setShowAddPanel] = useState(false);

  // ─── Widget Mutation Handlers ───────────────────────────────────────────────

  /**
   * @function removeWidget
   * Removes the widget with the given id from the dashboard grid.
   * @param {string} id - The id of the widget to remove.
   */
  const removeWidget = (id: string) =>
    setWidgets((prev) => prev.filter((w) => w.id !== id));

  /**
   * @function addWidget
   * Adds a new widget to the end of the dashboard grid.
   * Uses Date.now() as a simple unique id generator.
   * @param {Omit<Widget, 'id'>} w - The widget definition without an id.
   */
  const addWidget = (w: Omit<Widget, 'id'>) =>
    setWidgets((prev) => [...prev, { ...w, id: Date.now().toString() }]);

  // ─── Drag and Drop Handlers ─────────────────────────────────────────────────

  /**
   * @function handleDragStart
   * Called when the user starts dragging a widget. Stores the dragged widget's id.
   * @param {string} id - The id of the widget being dragged.
   */
  const handleDragStart = (id: string) => setDraggingId(id);

  /**
   * @function handleDragOver
   * Called repeatedly as the user drags over a grid cell.
   * Calls e.preventDefault() to allow dropping (required by the HTML drag API).
   * Updates overIdx to highlight the current drop target.
   *
   * @param {React.DragEvent} e - The drag event (we call preventDefault on this).
   * @param {number} idx - The grid index being dragged over.
   */
  const handleDragOver = (e: React.DragEvent, idx: number) => {
    e.preventDefault();
    setOverIdx(idx);
  };

  /**
   * @function handleDrop
   * Called when the user releases the dragged widget over a new grid position.
   *
   * How it works:
   *   1. Find the current index of the dragged widget in the array.
   *   2. If it's the same as the drop target, do nothing.
   *   3. Otherwise, remove the widget from its old position and insert it at the new one.
   *   4. Reset draggingId and overIdx.
   *
   * @param {number} idx - The grid index the widget was dropped onto.
   */
  const handleDrop = (idx: number) => {
    if (!draggingId) return;
    const fromIdx = widgets.findIndex((w) => w.id === draggingId);
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

  // ─── Widget Renderer ────────────────────────────────────────────────────────

  /**
   * @function renderWidget
   * @description
   * Renders the correct widget component for a given widget object.
   * Wraps it in a div that handles drag-over and drop events for reordering.
   * Applies a blue ring highlight when a dragged widget is hovering over this slot.
   *
   * @param {Widget} widget - The widget data to render.
   * @param {number} idx - The widget's current position in the grid array.
   * @returns {JSX.Element}
   */
  const renderWidget = (widget: Widget, idx: number) => {
    const isOver    = overIdx === idx;
    const isDragging = draggingId === widget.id;

    /**
     * Map the widget's span value to a Tailwind col-span class.
     * Defaults to col-span-1 if span is not set.
     */
    const spanClass =
      widget.span === 2 ? 'col-span-2' :
      widget.span === 3 ? 'col-span-3' : 'col-span-1';

    /** Shared props passed to every widget sub-component. */
    const shared = {
      onRemove:    () => removeWidget(widget.id),
      onDragStart: () => handleDragStart(widget.id),
      dragging:    isDragging,
      t,
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

  // ─── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col h-[calc(100vh-64px)] bg-gray-100 overflow-hidden">

      {/* ── Toolbar ── */}
      <div className="shrink-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
        <div>
          <h1 className="text-base font-bold text-gray-900">{t('toolbar.title')}</h1>
          <p className="text-xs text-gray-400 mt-0.5">{t('toolbar.subtitle')}</p>
        </div>
        <div className="flex items-center gap-2">
          <button className="flex items-center gap-1.5 px-3 py-2 border border-gray-200 bg-white text-gray-600 text-xs font-medium rounded-md hover:bg-gray-50 transition">
            <FiRefreshCw size={13} /> {t('toolbar.refresh')}
          </button>
          <button className="flex items-center gap-1.5 px-3 py-2 border border-gray-200 bg-white text-gray-600 text-xs font-medium rounded-md hover:bg-gray-50 transition">
            <FiMoreHorizontal size={13} /> {t('toolbar.last30Days')} <FiChevronDown size={11} />
          </button>
          <button
            onClick={() => setShowAddPanel(true)}
            className="flex items-center gap-1.5 px-4 py-2 bg-gray-900 text-white text-sm font-medium rounded-md hover:bg-gray-700 transition"
          >
            <FiPlus size={15} /> {t('toolbar.addWidget')}
          </button>
        </div>
      </div>

      {/* ── Widget Grid ── */}
      <div className="flex-1 overflow-y-auto p-6">
        <div className="grid grid-cols-4 gap-4 auto-rows-auto">
          {widgets.map((widget, idx) => renderWidget(widget, idx))}

          {/*
           * Empty drop zone at the end of the grid.
           * Doubles as an "Add Widget" shortcut button.
           * Highlighted blue when a widget is dragged over it.
           */}
          <div
            className={`col-span-1 h-24 border-2 border-dashed rounded-xl flex items-center justify-center cursor-pointer transition-colors ${
              overIdx === widgets.length
                ? 'border-blue-400 bg-blue-50'
                : 'border-gray-200 hover:border-gray-300 bg-white'
            }`}
            onDragOver={(e) => handleDragOver(e, widgets.length)}
            onDrop={() => handleDrop(widgets.length)}
            onClick={() => setShowAddPanel(true)}
          >
            <div className="flex flex-col items-center gap-1 text-gray-400">
              <FiPlus size={18} />
              <p className="text-xs">{t('grid.addWidget')}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Add Widget panel — conditionally rendered when showAddPanel is true */}
      {showAddPanel && (
        <AddWidgetPanel
          onAdd={addWidget}
          onClose={() => setShowAddPanel(false)}
          t={t}
        />
      )}
    </div>
  );
}