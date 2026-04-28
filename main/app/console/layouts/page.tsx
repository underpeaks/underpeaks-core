'use client';

import { useState } from 'react';
import {
  FiPlus, FiX, FiCheck, FiChevronRight, FiMenu,
  FiEdit2, FiTrash2, FiExternalLink, FiLink,
  FiEye, FiEyeOff, FiChevronDown, FiChevronUp,
  FiHome, FiGrid, FiPackage, FiUsers, FiSettings,
  FiFileText, FiShoppingCart, FiMail, FiStar, FiInfo,
} from 'react-icons/fi';

// ── Types ─────────────────────────────────────────────────────────────────────
type MenuTarget = '_self' | '_blank';
type LinkType   = 'page' | 'external';

type MenuItem = {
  id: string;
  label: string;
  linkType: LinkType;
  pageId: string | null;
  externalUrl: string;
  icon: string;
  target: MenuTarget;
  visible: boolean;
  parentId: string | null;
  order: number;
};

// ── Mock pages (would come from your Pages store) ─────────────────────────────
const availablePages = [
  { id: '1', name: 'Product Listing',  slug: '/products'      },
  { id: '2', name: 'Product Detail',   slug: '/products/:id'  },
  { id: '3', name: 'Admin Orders',     slug: '/admin/orders'  },
  { id: '4', name: 'Blog',             slug: '/blog'          },
  { id: '5', name: 'New Landing Page', slug: '/landing'       },
];

// ── Icon options ──────────────────────────────────────────────────────────────
const iconOptions = [
  { id: 'FiHome',         label: 'Home',      icon: <FiHome size={14} />         },
  { id: 'FiGrid',         label: 'Grid',      icon: <FiGrid size={14} />         },
  { id: 'FiPackage',      label: 'Package',   icon: <FiPackage size={14} />      },
  { id: 'FiUsers',        label: 'Users',     icon: <FiUsers size={14} />        },
  { id: 'FiSettings',     label: 'Settings',  icon: <FiSettings size={14} />     },
  { id: 'FiFileText',     label: 'File',      icon: <FiFileText size={14} />     },
  { id: 'FiShoppingCart', label: 'Cart',      icon: <FiShoppingCart size={14} /> },
  { id: 'FiMail',         label: 'Mail',      icon: <FiMail size={14} />         },
  { id: 'FiStar',         label: 'Star',      icon: <FiStar size={14} />         },
  { id: 'FiInfo',         label: 'Info',      icon: <FiInfo size={14} />         },
];

function getIcon(id: string, size = 14) {
  const map: Record<string, React.ReactNode> = {
    FiHome:         <FiHome size={size} />,
    FiGrid:         <FiGrid size={size} />,
    FiPackage:      <FiPackage size={size} />,
    FiUsers:        <FiUsers size={size} />,
    FiSettings:     <FiSettings size={size} />,
    FiFileText:     <FiFileText size={size} />,
    FiShoppingCart: <FiShoppingCart size={size} />,
    FiMail:         <FiMail size={size} />,
    FiStar:         <FiStar size={size} />,
    FiInfo:         <FiInfo size={size} />,
  };
  return map[id] ?? <FiLink size={size} />;
}

// ── Mock initial menu ─────────────────────────────────────────────────────────
const initialItems: MenuItem[] = [
  { id: '1', label: 'Home',     linkType: 'page', pageId: '5', externalUrl: '', icon: 'FiHome',    target: '_self',  visible: true,  parentId: null, order: 0 },
  { id: '2', label: 'Products', linkType: 'page', pageId: '1', externalUrl: '', icon: 'FiPackage', target: '_self',  visible: true,  parentId: null, order: 1 },
  { id: '3', label: 'Blog',     linkType: 'page', pageId: '4', externalUrl: '', icon: 'FiFileText',target: '_self',  visible: true,  parentId: null, order: 2 },
  { id: '4', label: 'Detail',   linkType: 'page', pageId: '2', externalUrl: '', icon: 'FiGrid',    target: '_self',  visible: false, parentId: '2',  order: 0 },
  { id: '5', label: 'Docs',     linkType: 'external', pageId: null, externalUrl: 'https://docs.example.com', icon: 'FiInfo', target: '_blank', visible: true, parentId: null, order: 3 },
];

// ── Helpers ───────────────────────────────────────────────────────────────────
function pageName(pageId: string | null) {
  return availablePages.find((p) => p.id === pageId)?.name ?? '—';
}
function pageSlug(pageId: string | null) {
  return availablePages.find((p) => p.id === pageId)?.slug ?? '';
}

// ── Create / Edit drawer ──────────────────────────────────────────────────────
function MenuItemDrawer({
  open,
  onClose,
  onSave,
  existing,
  parentOptions,
}: {
  open: boolean;
  onClose: () => void;
  onSave: (item: MenuItem) => void;
  existing?: MenuItem | null;
  parentOptions: MenuItem[];
}) {
  const [label,       setLabel]       = useState(existing?.label       ?? '');
  const [linkType,    setLinkType]    = useState<LinkType>(existing?.linkType ?? 'page');
  const [pageId,      setPageId]      = useState(existing?.pageId      ?? '');
  const [externalUrl, setExternalUrl] = useState(existing?.externalUrl ?? '');
  const [icon,        setIcon]        = useState(existing?.icon        ?? 'FiHome');
  const [target,      setTarget]      = useState<MenuTarget>(existing?.target ?? '_self');
  const [visible,     setVisible]     = useState(existing?.visible     ?? true);
  const [parentId,    setParentId]    = useState(existing?.parentId    ?? '');

  const canSave = label.trim() && (linkType === 'external' ? externalUrl.trim() : true);

  const handleSave = () => {
    if (!canSave) return;
    onSave({
      id:          existing?.id ?? Date.now().toString(),
      label:       label.trim(),
      linkType,
      pageId:      linkType === 'page' ? (pageId || null) : null,
      externalUrl: linkType === 'external' ? externalUrl.trim() : '',
      icon,
      target,
      visible,
      parentId:    parentId || null,
      order:       existing?.order ?? 999,
    });
    onClose();
  };

  if (!open) return null;

  const resolvedSlug = linkType === 'page'
    ? pageSlug(pageId)
    : externalUrl;

  return (
    <>
      <div className="fixed inset-0 bg-black/20 z-40" onClick={onClose} />
      <div className="fixed top-16 right-0 bottom-0 w-full max-w-md bg-white border-l border-gray-200 z-50 flex flex-col shadow-2xl">

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 shrink-0">
          <div>
            <h2 className="text-sm font-bold text-gray-900">{existing ? 'Edit Menu Item' : 'Add Menu Item'}</h2>
            <p className="text-xs text-gray-400 mt-0.5">Configure label, link, icon and visibility</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><FiX size={18} /></button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-5 py-4 flex flex-col gap-5">

          {/* Label */}
          <section>
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-3">Label & Visibility</p>
            <div className="flex flex-col gap-3">

              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold text-gray-700">Menu Label <span className="text-red-400">*</span></label>
                <input
                  value={label}
                  onChange={(e) => setLabel(e.target.value)}
                  placeholder="e.g. Products"
                  className="px-3 py-2 text-sm border border-gray-200 rounded-md bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-300 focus:bg-white transition"
                />
                <p className="text-[11px] text-gray-400">This is the text shown in the navigation menu.</p>
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold text-gray-700">Visibility</label>
                <div className="flex gap-2">
                  <button
                    onClick={() => setVisible(true)}
                    className={`flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-medium rounded-md border transition ${
                      visible ? 'bg-gray-900 text-white border-gray-900' : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
                    }`}
                  >
                    <FiEye size={12} /> Visible
                  </button>
                  <button
                    onClick={() => setVisible(false)}
                    className={`flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-medium rounded-md border transition ${
                      !visible ? 'bg-gray-900 text-white border-gray-900' : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
                    }`}
                  >
                    <FiEyeOff size={12} /> Hidden
                  </button>
                </div>
              </div>

            </div>
          </section>

          {/* Link */}
          <section>
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-3">Link</p>
            <div className="flex flex-col gap-3">

              <div className="flex gap-2">
                <button
                  onClick={() => setLinkType('page')}
                  className={`flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-medium rounded-md border transition ${
                    linkType === 'page' ? 'bg-gray-900 text-white border-gray-900' : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
                  }`}
                >
                  <FiFileText size={12} /> Page
                </button>
                <button
                  onClick={() => setLinkType('external')}
                  className={`flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-medium rounded-md border transition ${
                    linkType === 'external' ? 'bg-gray-900 text-white border-gray-900' : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
                  }`}
                >
                  <FiExternalLink size={12} /> External URL
                </button>
              </div>

              {linkType === 'page' ? (
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-semibold text-gray-700">Select Page</label>
                  <select
                    value={pageId}
                    onChange={(e) => setPageId(e.target.value)}
                    className="px-3 py-2 text-sm border border-gray-200 rounded-md bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-300 transition"
                  >
                    <option value="">— Select a page —</option>
                    {availablePages.map((p) => (
                      <option key={p.id} value={p.id}>{p.name} ({p.slug})</option>
                    ))}
                  </select>
                </div>
              ) : (
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-semibold text-gray-700">External URL <span className="text-red-400">*</span></label>
                  <input
                    value={externalUrl}
                    onChange={(e) => setExternalUrl(e.target.value)}
                    placeholder="https://example.com"
                    className="px-3 py-2 text-sm border border-gray-200 rounded-md bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-300 focus:bg-white transition font-mono"
                  />
                </div>
              )}

              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold text-gray-700">Open in</label>
                <div className="flex gap-2">
                  <button
                    onClick={() => setTarget('_self')}
                    className={`flex-1 py-2 text-xs font-medium rounded-md border transition ${
                      target === '_self' ? 'bg-gray-900 text-white border-gray-900' : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
                    }`}
                  >
                    Same Tab
                  </button>
                  <button
                    onClick={() => setTarget('_blank')}
                    className={`flex-1 py-2 text-xs font-medium rounded-md border transition ${
                      target === '_blank' ? 'bg-gray-900 text-white border-gray-900' : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
                    }`}
                  >
                    New Tab
                  </button>
                </div>
              </div>

            </div>
          </section>

          {/* Icon */}
          <section>
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-3">Icon</p>
            <div className="grid grid-cols-5 gap-2">
              {iconOptions.map((opt) => (
                <button
                  key={opt.id}
                  onClick={() => setIcon(opt.id)}
                  title={opt.label}
                  className={`flex flex-col items-center gap-1 py-2 rounded-md border text-[10px] transition ${
                    icon === opt.id
                      ? 'bg-gray-900 text-white border-gray-900'
                      : 'bg-white text-gray-500 border-gray-200 hover:bg-gray-50'
                  }`}
                >
                  {opt.icon}
                  <span>{opt.label}</span>
                </button>
              ))}
            </div>
          </section>

          {/* Parent */}
          <section>
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-3">Nesting</p>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold text-gray-700">Parent Item</label>
              <select
                value={parentId}
                onChange={(e) => setParentId(e.target.value)}
                className="px-3 py-2 text-sm border border-gray-200 rounded-md bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-300 transition"
              >
                <option value="">— Top level —</option>
                {parentOptions
                  .filter((p) => p.id !== existing?.id)
                  .map((p) => (
                    <option key={p.id} value={p.id}>{p.label}</option>
                  ))}
              </select>
              <p className="text-[11px] text-gray-400">Nested items appear as dropdown children in the nav.</p>
            </div>
          </section>

          {/* Live preview */}
          {label && (
            <section>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-3">Preview</p>
              <div className="flex items-center gap-2.5 px-4 py-3 bg-gray-50 border border-gray-200 rounded-md">
                <span className="text-gray-500">{getIcon(icon)}</span>
                <span className="text-sm font-medium text-gray-800">{label}</span>
                {!visible && <span className="text-[10px] text-gray-400 ml-auto">(hidden)</span>}
                {target === '_blank' && <FiExternalLink size={11} className="text-gray-400 ml-auto" />}
                {resolvedSlug && (
                  <span className="text-[10px] text-gray-400 font-mono truncate ml-auto">{resolvedSlug}</span>
                )}
              </div>
            </section>
          )}

        </div>

        {/* Footer */}
        <div className="shrink-0 px-5 py-4 border-t border-gray-100 flex gap-2">
          <button onClick={onClose} className="flex-1 py-2.5 bg-white border border-gray-200 text-gray-700 text-sm font-medium rounded-md hover:bg-gray-50 transition">
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={!canSave}
            className="flex-1 py-2.5 bg-gray-900 text-white text-sm font-medium rounded-md hover:bg-gray-700 disabled:opacity-40 disabled:cursor-not-allowed transition"
          >
            {existing ? 'Save Changes' : 'Add Item'}
          </button>
        </div>

      </div>
    </>
  );
}

// ── Menu item row ─────────────────────────────────────────────────────────────
function MenuRow({
  item,
  isChild,
  onEdit,
  onDelete,
  onMoveUp,
  onMoveDown,
  onToggleVisible,
  deletingId,
  setDeletingId,
}: {
  item: MenuItem;
  isChild: boolean;
  onEdit: (item: MenuItem) => void;
  onDelete: (id: string) => void;
  onMoveUp: (id: string) => void;
  onMoveDown: (id: string) => void;
  onToggleVisible: (id: string) => void;
  deletingId: string | null;
  setDeletingId: (id: string | null) => void;
}) {
  return (
    <div className={`group flex items-center gap-3 px-4 py-3 border-b border-gray-100 last:border-0 hover:bg-gray-50 transition-colors ${isChild ? 'pl-10 bg-gray-50/50' : ''}`}>

      {/* Drag handle (visual only) */}
      <div className="text-gray-300 cursor-grab shrink-0">
        <FiMenu size={14} />
      </div>

      {/* Child indent indicator */}
      {isChild && <FiChevronRight size={12} className="text-gray-300 shrink-0 -ml-2" />}

      {/* Icon */}
      <span className={`shrink-0 ${item.visible ? 'text-gray-500' : 'text-gray-300'}`}>
        {getIcon(item.icon)}
      </span>

      {/* Label + link */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className={`text-sm font-medium truncate ${item.visible ? 'text-gray-800' : 'text-gray-400'}`}>
            {item.label}
          </p>
          {!item.visible && (
            <span className="text-[10px] text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded shrink-0">hidden</span>
          )}
          {item.target === '_blank' && (
            <FiExternalLink size={11} className="text-gray-400 shrink-0" />
          )}
        </div>
        <p className="text-xs text-gray-400 font-mono truncate mt-0.5">
          {item.linkType === 'page' ? pageSlug(item.pageId) : item.externalUrl}
        </p>
      </div>

      {/* Page badge */}
      <div className="shrink-0 hidden sm:block">
        {item.linkType === 'page' && item.pageId ? (
          <span className="text-[10px] bg-blue-50 text-blue-600 border border-blue-100 px-2 py-0.5 rounded-full font-medium">
            {pageName(item.pageId)}
          </span>
        ) : item.linkType === 'external' ? (
          <span className="text-[10px] bg-amber-50 text-amber-600 border border-amber-100 px-2 py-0.5 rounded-full font-medium">
            External
          </span>
        ) : null}
      </div>

      {/* Actions */}
      <div className="shrink-0 flex items-center gap-1">
        {deletingId === item.id ? (
          <>
            <button onClick={() => onDelete(item.id)} className="flex items-center justify-center w-7 h-7 rounded bg-red-50 text-red-500 hover:bg-red-100 transition" title="Confirm">
              <FiCheck size={13} />
            </button>
            <button onClick={() => setDeletingId(null)} className="flex items-center justify-center w-7 h-7 rounded bg-gray-100 text-gray-500 hover:bg-gray-200 transition" title="Cancel">
              <FiX size={13} />
            </button>
          </>
        ) : (
          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <button onClick={() => onMoveUp(item.id)}   className="flex items-center justify-center w-7 h-7 rounded bg-gray-100 text-gray-500 hover:bg-gray-200 transition" title="Move up">
              <FiChevronUp size={13} />
            </button>
            <button onClick={() => onMoveDown(item.id)} className="flex items-center justify-center w-7 h-7 rounded bg-gray-100 text-gray-500 hover:bg-gray-200 transition" title="Move down">
              <FiChevronDown size={13} />
            </button>
            <button onClick={() => onToggleVisible(item.id)} className="flex items-center justify-center w-7 h-7 rounded bg-gray-100 text-gray-500 hover:bg-gray-200 transition" title="Toggle visibility">
              {item.visible ? <FiEye size={13} /> : <FiEyeOff size={13} />}
            </button>
            <button onClick={() => onEdit(item)} className="flex items-center justify-center w-7 h-7 rounded bg-gray-100 text-gray-500 hover:bg-gray-200 transition" title="Edit">
              <FiEdit2 size={13} />
            </button>
            <button onClick={() => setDeletingId(item.id)} className="flex items-center justify-center w-7 h-7 rounded bg-gray-100 text-gray-500 hover:bg-red-50 hover:text-red-500 transition" title="Delete">
              <FiTrash2 size={13} />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function MenuPage() {
  const [items,       setItems]       = useState<MenuItem[]>(initialItems);
  const [drawerOpen,  setDrawerOpen]  = useState(false);
  const [editItem,    setEditItem]    = useState<MenuItem | null>(null);
  const [deletingId,  setDeletingId]  = useState<string | null>(null);

  const topLevel = items
    .filter((i) => !i.parentId)
    .sort((a, b) => a.order - b.order);

  const childrenOf = (parentId: string) =>
    items.filter((i) => i.parentId === parentId).sort((a, b) => a.order - b.order);

  const handleSave = (item: MenuItem) => {
    setItems((prev) => {
      const exists = prev.find((i) => i.id === item.id);
      return exists
        ? prev.map((i) => (i.id === item.id ? item : i))
        : [...prev, item];
    });
    setEditItem(null);
  };

  const handleDelete = (id: string) => {
    // also delete children
    setItems((prev) => prev.filter((i) => i.id !== id && i.parentId !== id));
    setDeletingId(null);
  };

  const handleMoveUp = (id: string) => {
    setItems((prev) => {
      const item  = prev.find((i) => i.id === id)!;
      const peers = prev.filter((i) => i.parentId === item.parentId).sort((a, b) => a.order - b.order);
      const idx   = peers.findIndex((i) => i.id === id);
      if (idx === 0) return prev;
      const swapId = peers[idx - 1].id;
      return prev.map((i) => {
        if (i.id === id)     return { ...i, order: i.order - 1 };
        if (i.id === swapId) return { ...i, order: i.order + 1 };
        return i;
      });
    });
  };

  const handleMoveDown = (id: string) => {
    setItems((prev) => {
      const item  = prev.find((i) => i.id === id)!;
      const peers = prev.filter((i) => i.parentId === item.parentId).sort((a, b) => a.order - b.order);
      const idx   = peers.findIndex((i) => i.id === id);
      if (idx === peers.length - 1) return prev;
      const swapId = peers[idx + 1].id;
      return prev.map((i) => {
        if (i.id === id)     return { ...i, order: i.order + 1 };
        if (i.id === swapId) return { ...i, order: i.order - 1 };
        return i;
      });
    });
  };

  const handleToggleVisible = (id: string) => {
    setItems((prev) => prev.map((i) => (i.id === id ? { ...i, visible: !i.visible } : i)));
  };

  const openEdit = (item: MenuItem) => {
    setEditItem(item);
    setDrawerOpen(true);
  };

  const openCreate = () => {
    setEditItem(null);
    setDrawerOpen(true);
  };

  const parentOptions = items.filter((i) => !i.parentId);

  return (
    <div className="flex flex-col h-[calc(100vh-64px)] bg-gray-100 overflow-hidden">

      {/* ── Toolbar ── */}
      <div className="shrink-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
        <div>
          <h1 className="text-base font-bold text-gray-900">Menu</h1>
          <p className="text-xs text-gray-400 mt-0.5">{items.length} item{items.length !== 1 ? 's' : ''} · drag to reorder</p>
        </div>
        <button
          onClick={openCreate}
          className="flex items-center gap-1.5 px-4 py-2 bg-gray-900 text-white text-sm font-medium rounded-md hover:bg-gray-700 transition"
        >
          <FiPlus size={15} /> Add Item
        </button>
      </div>

      {/* ── Content ── */}
      <div className="flex-1 overflow-y-auto p-6">
        <div className="max-w-3xl mx-auto flex flex-col gap-6">

          {/* Nav preview bar */}
          <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
            <div className="px-4 py-2.5 border-b border-gray-100 bg-gray-50 flex items-center justify-between">
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Nav Preview</p>
              <p className="text-[10px] text-gray-400">Visible items only</p>
            </div>
            <div className="px-4 py-3 flex items-center gap-1 flex-wrap">
              {topLevel.filter((i) => i.visible).map((item) => {
                const children = childrenOf(item.id).filter((c) => c.visible);
                return (
                  <div key={item.id} className="relative group/nav">
                    <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-md hover:bg-gray-100 cursor-pointer transition">
                      <span className="text-gray-500">{getIcon(item.icon, 13)}</span>
                      <span className="text-sm text-gray-700 font-medium">{item.label}</span>
                      {children.length > 0 && <FiChevronDown size={11} className="text-gray-400" />}
                      {item.target === '_blank' && <FiExternalLink size={10} className="text-gray-400" />}
                    </div>
                    {children.length > 0 && (
                      <div className="absolute top-full left-0 mt-1 bg-white border border-gray-200 rounded-md shadow-lg py-1 min-w-[140px] hidden group-hover/nav:block z-10">
                        {children.map((child) => (
                          <div key={child.id} className="flex items-center gap-2 px-3 py-2 hover:bg-gray-50 cursor-pointer">
                            <span className="text-gray-400">{getIcon(child.icon, 12)}</span>
                            <span className="text-xs text-gray-700">{child.label}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
              {topLevel.filter((i) => i.visible).length === 0 && (
                <p className="text-xs text-gray-400">No visible items yet.</p>
              )}
            </div>
          </div>

          {/* Item list */}
          <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
            <div className="px-4 py-2.5 border-b border-gray-100 bg-gray-50">
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">All Items</p>
            </div>

            {items.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 gap-3 text-gray-400">
                <FiMenu size={32} className="text-gray-300" />
                <p className="text-sm">No menu items yet</p>
                <button onClick={openCreate} className="text-xs text-blue-500 hover:underline">Add your first item</button>
              </div>
            ) : (
              topLevel.map((item) => (
                <div key={item.id}>
                  <MenuRow
                    item={item}
                    isChild={false}
                    onEdit={openEdit}
                    onDelete={handleDelete}
                    onMoveUp={handleMoveUp}
                    onMoveDown={handleMoveDown}
                    onToggleVisible={handleToggleVisible}
                    deletingId={deletingId}
                    setDeletingId={setDeletingId}
                  />
                  {childrenOf(item.id).map((child) => (
                    <MenuRow
                      key={child.id}
                      item={child}
                      isChild={true}
                      onEdit={openEdit}
                      onDelete={handleDelete}
                      onMoveUp={handleMoveUp}
                      onMoveDown={handleMoveDown}
                      onToggleVisible={handleToggleVisible}
                      deletingId={deletingId}
                      setDeletingId={setDeletingId}
                    />
                  ))}
                </div>
              ))
            )}
          </div>

        </div>
      </div>

      {/* Drawer */}
      <MenuItemDrawer
        open={drawerOpen}
        onClose={() => { setDrawerOpen(false); setEditItem(null); }}
        onSave={handleSave}
        existing={editItem}
        parentOptions={parentOptions}
      />
    </div>
  );
}