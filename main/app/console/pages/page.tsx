'use client';

import { useState } from 'react';
import {
  FiPlus, FiSearch, FiEdit2, FiTrash2, FiEye,
  FiEyeOff, FiGlobe, FiLock, FiChevronRight,
  FiLayout, FiX, FiCheck,
} from 'react-icons/fi';

// ── Types ─────────────────────────────────────────────────────────────────────
type PageVisibility = 'public' | 'admin' | 'draft';

type PageItem = {
  id: string;
  name: string;
  slug: string;
  model: string | null;
  template: string;
  visibility: PageVisibility;
  seoTitle: string;
  seoDescription: string;
  createdAt: string;
  updatedAt: string;
};

// ── Mock data ─────────────────────────────────────────────────────────────────
const mockModels = [
  { id: 'products',   name: 'Products'   },
  { id: 'blog-posts', name: 'Blog Posts' },
  { id: 'users',      name: 'Users'      },
  { id: 'orders',     name: 'Orders'     },
  { id: 'categories', name: 'Categories' },
];

const templates = [
  { id: 'list',      name: 'List View'    },
  { id: 'detail',    name: 'Detail View'  },
  { id: 'form',      name: 'Form'         },
  { id: 'dashboard', name: 'Dashboard'    },
  { id: 'custom',    name: 'Custom'       },
];

const initialPages: PageItem[] = [
  {
    id: '1',
    name: 'Product Listing',
    slug: '/products',
    model: 'products',
    template: 'list',
    visibility: 'public',
    seoTitle: 'Our Products',
    seoDescription: 'Browse our full product catalogue.',
    createdAt: '10 Jan 2025',
    updatedAt: '2 Apr 2025',
  },
  {
    id: '2',
    name: 'Product Detail',
    slug: '/products/:id',
    model: 'products',
    template: 'detail',
    visibility: 'public',
    seoTitle: 'Product Detail',
    seoDescription: 'View full product details.',
    createdAt: '10 Jan 2025',
    updatedAt: '2 Apr 2025',
  },
  {
    id: '3',
    name: 'Admin Orders',
    slug: '/admin/orders',
    model: 'orders',
    template: 'dashboard',
    visibility: 'admin',
    seoTitle: '',
    seoDescription: '',
    createdAt: '15 Jan 2025',
    updatedAt: '20 Mar 2025',
  },
  {
    id: '4',
    name: 'Blog',
    slug: '/blog',
    model: 'blog-posts',
    template: 'list',
    visibility: 'public',
    seoTitle: 'Blog',
    seoDescription: 'Read our latest articles.',
    createdAt: '20 Feb 2025',
    updatedAt: '1 Apr 2025',
  },
  {
    id: '5',
    name: 'New Landing Page',
    slug: '/landing',
    model: null,
    template: 'custom',
    visibility: 'draft',
    seoTitle: '',
    seoDescription: '',
    createdAt: '22 Apr 2025',
    updatedAt: '22 Apr 2025',
  },
];

// ── Helpers ───────────────────────────────────────────────────────────────────
function VisibilityBadge({ visibility }: { visibility: PageVisibility }) {
  const map: Record<PageVisibility, { label: string; className: string; icon: React.ReactNode }> = {
    public: { label: 'Public',  className: 'bg-green-50 text-green-600 border-green-200',  icon: <FiGlobe size={10} />  },
    admin:  { label: 'Admin',   className: 'bg-amber-50 text-amber-600 border-amber-200',  icon: <FiLock size={10} />   },
    draft:  { label: 'Draft',   className: 'bg-gray-100 text-gray-500 border-gray-200',    icon: <FiEyeOff size={10} /> },
  };
  const { label, className, icon } = map[visibility];
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-[10px] font-medium ${className}`}>
      {icon}{label}
    </span>
  );
}

// ── Create page drawer ────────────────────────────────────────────────────────
function CreatePageDrawer({
  open,
  onClose,
  onCreate,
}: {
  open: boolean;
  onClose: () => void;
  onCreate: (page: PageItem) => void;
}) {
  const [name,        setName]        = useState('');
  const [slug,        setSlug]        = useState('');
  const [model,       setModel]       = useState('');
  const [template,    setTemplate]    = useState('list');
  const [visibility,  setVisibility]  = useState<PageVisibility>('public');
  const [seoTitle,    setSeoTitle]    = useState('');
  const [seoDesc,     setSeoDesc]     = useState('');

  const autoSlug = (n: string) => '/' + n.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-/]/g, '');

  const handleNameChange = (v: string) => {
    setName(v);
    if (!slug || slug === autoSlug(name)) setSlug(autoSlug(v));
  };

  const canCreate = name.trim() && slug.trim();

  const handleCreate = () => {
    if (!canCreate) return;
    onCreate({
      id: Date.now().toString(),
      name: name.trim(),
      slug: slug.trim(),
      model: model || null,
      template,
      visibility,
      seoTitle,
      seoDescription: seoDesc,
      createdAt: new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }),
      updatedAt: new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }),
    });
    // reset
    setName(''); setSlug(''); setModel(''); setTemplate('list');
    setVisibility('public'); setSeoTitle(''); setSeoDesc('');
    onClose();
  };

  if (!open) return null;

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/20 z-40" onClick={onClose} />

      {/* Drawer */}
      <div className="fixed top-16 right-0 bottom-0 w-full max-w-md bg-white border-l border-gray-200 z-50 flex flex-col shadow-2xl">

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 shrink-0">
          <div>
            <h2 className="text-sm font-bold text-gray-900">Create Page</h2>
            <p className="text-xs text-gray-400 mt-0.5">Define a new page and attach a model</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <FiX size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-5 py-4 flex flex-col gap-5">

          {/* Basic info */}
          <section>
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-3">Basic Info</p>
            <div className="flex flex-col gap-3">

              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold text-gray-700">Page Name <span className="text-red-400">*</span></label>
                <input
                  value={name}
                  onChange={(e) => handleNameChange(e.target.value)}
                  placeholder="e.g. Product Listing"
                  className="px-3 py-2 text-sm border border-gray-200 rounded-md bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-300 focus:bg-white transition"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold text-gray-700">Slug / URL <span className="text-red-400">*</span></label>
                <input
                  value={slug}
                  onChange={(e) => setSlug(e.target.value)}
                  placeholder="/your-page-slug"
                  className="px-3 py-2 text-sm border border-gray-200 rounded-md bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-300 focus:bg-white transition font-mono"
                />
                <p className="text-[11px] text-gray-400">Use <code className="bg-gray-100 px-1 rounded">:id</code> for dynamic routes, e.g. <code className="bg-gray-100 px-1 rounded">/products/:id</code></p>
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold text-gray-700">Visibility</label>
                <div className="flex gap-2">
                  {(['public', 'admin', 'draft'] as PageVisibility[]).map((v) => (
                    <button
                      key={v}
                      onClick={() => setVisibility(v)}
                      className={`flex-1 py-2 text-xs font-medium rounded-md border transition capitalize ${
                        visibility === v
                          ? 'bg-gray-900 text-white border-gray-900'
                          : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
                      }`}
                    >
                      {v}
                    </button>
                  ))}
                </div>
              </div>

            </div>
          </section>

          {/* Model + template */}
          <section>
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-3">Model & Template</p>
            <div className="flex flex-col gap-3">

              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold text-gray-700">Attach Model</label>
                <select
                  value={model}
                  onChange={(e) => setModel(e.target.value)}
                  className="px-3 py-2 text-sm border border-gray-200 rounded-md bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-300 transition"
                >
                  <option value="">— No model (custom page) —</option>
                  {mockModels.map((m) => (
                    <option key={m.id} value={m.id}>{m.name}</option>
                  ))}
                </select>
                <p className="text-[11px] text-gray-400">One model can power multiple pages.</p>
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold text-gray-700">Template</label>
                <div className="grid grid-cols-3 gap-2">
                  {templates.map((t) => (
                    <button
                      key={t.id}
                      onClick={() => setTemplate(t.id)}
                      className={`py-2 text-xs font-medium rounded-md border transition ${
                        template === t.id
                          ? 'bg-gray-900 text-white border-gray-900'
                          : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
                      }`}
                    >
                      {t.name}
                    </button>
                  ))}
                </div>
              </div>

            </div>
          </section>

          {/* SEO */}
          <section>
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-3">SEO</p>
            <div className="flex flex-col gap-3">

              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold text-gray-700">SEO Title</label>
                <input
                  value={seoTitle}
                  onChange={(e) => setSeoTitle(e.target.value)}
                  placeholder="Page title for search engines"
                  className="px-3 py-2 text-sm border border-gray-200 rounded-md bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-300 focus:bg-white transition"
                />
                <p className="text-[11px] text-gray-400">{seoTitle.length}/60 characters</p>
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold text-gray-700">Meta Description</label>
                <textarea
                  value={seoDesc}
                  onChange={(e) => setSeoDesc(e.target.value)}
                  placeholder="Brief description for search results…"
                  rows={3}
                  className="px-3 py-2 text-sm border border-gray-200 rounded-md bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-300 focus:bg-white transition resize-none"
                />
                <p className="text-[11px] text-gray-400">{seoDesc.length}/160 characters</p>
              </div>

              {/* Live SEO preview */}
              {(seoTitle || seoDesc || slug) && (
                <div className="p-3 bg-gray-50 border border-gray-200 rounded-md">
                  <p className="text-[10px] font-semibold text-gray-400 uppercase mb-2">Search Preview</p>
                  <p className="text-sm text-blue-600 font-medium truncate">{seoTitle || name || 'Page Title'}</p>
                  <p className="text-[11px] text-green-700 truncate">yoursite.com{slug || '/slug'}</p>
                  <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{seoDesc || 'No description provided.'}</p>
                </div>
              )}

            </div>
          </section>

        </div>

        {/* Footer */}
        <div className="shrink-0 px-5 py-4 border-t border-gray-100 flex gap-2">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 bg-white border border-gray-200 text-gray-700 text-sm font-medium rounded-md hover:bg-gray-50 transition"
          >
            Cancel
          </button>
          <button
            onClick={handleCreate}
            disabled={!canCreate}
            className="flex-1 py-2.5 bg-gray-900 text-white text-sm font-medium rounded-md hover:bg-gray-700 disabled:opacity-40 disabled:cursor-not-allowed transition"
          >
            Create Page
          </button>
        </div>

      </div>
    </>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function PagesPage() {
  const [pages,       setPages]       = useState<PageItem[]>(initialPages);
  const [search,      setSearch]      = useState('');
  const [filterVis,   setFilterVis]   = useState<PageVisibility | 'all'>('all');
  const [drawerOpen,  setDrawerOpen]  = useState(false);
  const [deletingId,  setDeletingId]  = useState<string | null>(null);

  const filtered = pages.filter((p) => {
    const matchSearch = p.name.toLowerCase().includes(search.toLowerCase()) ||
                        p.slug.toLowerCase().includes(search.toLowerCase());
    const matchVis    = filterVis === 'all' || p.visibility === filterVis;
    return matchSearch && matchVis;
  });

  const handleCreate = (page: PageItem) => {
    setPages((prev) => [page, ...prev]);
  };

  const handleDelete = (id: string) => {
    setPages((prev) => prev.filter((p) => p.id !== id));
    setDeletingId(null);
  };

  const modelName = (id: string | null) =>
    mockModels.find((m) => m.id === id)?.name ?? '—';

  const templateName = (id: string) =>
    templates.find((t) => t.id === id)?.name ?? id;

  return (
    <div className="flex flex-col h-[calc(100vh-64px)] bg-gray-100 overflow-hidden">

      {/* ── Top toolbar ── */}
      <div className="shrink-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between gap-4">
        <div>
          <h1 className="text-base font-bold text-gray-900">Pages</h1>
          <p className="text-xs text-gray-400 mt-0.5">{pages.length} page{pages.length !== 1 ? 's' : ''} total</p>
        </div>

        <div className="flex items-center gap-3">
          {/* Search */}
          <div className="flex items-center gap-2 px-3 py-2 border border-gray-200 rounded-md bg-gray-50 w-56">
            <FiSearch size={14} className="text-gray-400 shrink-0" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search pages…"
              className="flex-1 text-sm bg-transparent focus:outline-none text-gray-700 placeholder-gray-400"
            />
          </div>

          {/* Visibility filter */}
          <div className="flex items-center border border-gray-200 rounded-md overflow-hidden bg-white text-xs font-medium">
            {(['all', 'public', 'admin', 'draft'] as const).map((v) => (
              <button
                key={v}
                onClick={() => setFilterVis(v)}
                className={`px-3 py-2 capitalize transition-colors border-r border-gray-200 last:border-0 ${
                  filterVis === v ? 'bg-gray-100 text-gray-900' : 'text-gray-500 hover:bg-gray-50'
                }`}
              >
                {v}
              </button>
            ))}
          </div>

          {/* Create */}
          <button
            onClick={() => setDrawerOpen(true)}
            className="flex items-center gap-1.5 px-4 py-2 bg-gray-900 text-white text-sm font-medium rounded-md hover:bg-gray-700 transition"
          >
            <FiPlus size={15} />
            New Page
          </button>
        </div>
      </div>

      {/* ── Page list ── */}
      <div className="flex-1 overflow-y-auto p-6">

        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 gap-3 text-gray-400">
            <FiLayout size={36} className="text-gray-300" />
            <p className="text-sm">No pages found</p>
            <button
              onClick={() => setDrawerOpen(true)}
              className="text-xs text-blue-500 hover:underline"
            >
              Create your first page
            </button>
          </div>
        ) : (
          <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">

            {/* Table header */}
            <div className="grid grid-cols-[2fr_1fr_1fr_1fr_auto] gap-x-4 px-5 py-2.5 border-b border-gray-100 bg-gray-50">
              <p className="text-[10px] font-bold text-gray-400 uppercase">Page</p>
              <p className="text-[10px] font-bold text-gray-400 uppercase">Model</p>
              <p className="text-[10px] font-bold text-gray-400 uppercase">Template</p>
              <p className="text-[10px] font-bold text-gray-400 uppercase">Visibility</p>
              <p className="text-[10px] font-bold text-gray-400 uppercase">Actions</p>
            </div>

            {/* Rows */}
            {filtered.map((page) => (
              <div
                key={page.id}
                className="group grid grid-cols-[2fr_1fr_1fr_1fr_auto] gap-x-4 items-center px-5 py-3.5 border-b border-gray-100 last:border-0 hover:bg-gray-50 transition-colors"
              >
                {/* Name + slug */}
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-gray-800 truncate">{page.name}</p>
                  <p className="text-xs text-gray-400 font-mono truncate mt-0.5">{page.slug}</p>
                  {page.seoTitle && (
                    <p className="text-[10px] text-gray-400 truncate mt-0.5">SEO: {page.seoTitle}</p>
                  )}
                </div>

                {/* Model */}
                <div>
                  {page.model ? (
                    <span className="inline-flex items-center gap-1 text-xs text-gray-700 bg-gray-100 px-2 py-0.5 rounded-full font-medium">
                      {modelName(page.model)}
                    </span>
                  ) : (
                    <span className="text-xs text-gray-400">—</span>
                  )}
                </div>

                {/* Template */}
                <div>
                  <span className="text-xs text-gray-600">{templateName(page.template)}</span>
                </div>

                {/* Visibility */}
                <div>
                  <VisibilityBadge visibility={page.visibility} />
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1">
                  {deletingId === page.id ? (
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleDelete(page.id)}
                        className="flex items-center justify-center w-7 h-7 rounded bg-red-50 text-red-500 hover:bg-red-100 transition"
                        title="Confirm delete"
                      >
                        <FiCheck size={13} />
                      </button>
                      <button
                        onClick={() => setDeletingId(null)}
                        className="flex items-center justify-center w-7 h-7 rounded bg-gray-100 text-gray-500 hover:bg-gray-200 transition"
                        title="Cancel"
                      >
                        <FiX size={13} />
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        className="flex items-center justify-center w-7 h-7 rounded bg-gray-100 text-gray-500 hover:bg-gray-200 transition"
                        title="Edit page"
                      >
                        <FiEdit2 size={13} />
                      </button>
                      <button
                        onClick={() => setDeletingId(page.id)}
                        className="flex items-center justify-center w-7 h-7 rounded bg-gray-100 text-gray-500 hover:bg-red-50 hover:text-red-500 transition"
                        title="Delete page"
                      >
                        <FiTrash2 size={13} />
                      </button>
                      <button
                        className="flex items-center justify-center w-7 h-7 rounded bg-gray-100 text-gray-500 hover:bg-gray-200 transition"
                        title="View page"
                      >
                        <FiChevronRight size={13} />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Create drawer */}
      <CreatePageDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        onCreate={handleCreate}
      />
    </div>
  );
}