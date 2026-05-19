'use client';

/**
 * @file PagesPage.tsx
 * @description
 * The Pages management page in the admin console. It displays all pages that
 * have been created for the project in a searchable, filterable table, and
 * provides a slide-in drawer for creating new pages.
 *
 * ─── What can the user do on this page? ──────────────────────────────────────
 *
 * 1. VIEW PAGES      — All pages are listed in a table showing the page name,
 *                      slug, attached model, template, and visibility status.
 *
 * 2. SEARCH          — A search input filters the list by page name or slug
 *                      in real time without any API call.
 *
 * 3. FILTER          — A visibility filter bar lets the user show only "public",
 *                      "admin", or "draft" pages, or show all of them at once.
 *
 * 4. CREATE PAGE     — A "New Page" button opens the CreatePageDrawer slide-in
 *                      panel where the user fills in the page details and submits.
 *
 * 5. EDIT PAGE       — An edit icon appears on row hover and links to the page
 *                      editor (not yet wired up).
 *
 * 6. DELETE PAGE     — A trash icon on row hover starts a two-step inline
 *                      confirmation. The user must click the green check to
 *                      confirm, or the X to cancel. This prevents accidental deletion.
 *
 * 7. VIEW PAGE       — A chevron icon on row hover navigates to the live page
 *                      (not yet wired up).
 *
 * ─── Component breakdown ─────────────────────────────────────────────────────
 *
 *   PagesPage             ← this file (owns all state)
 *     ├── VisibilityBadge ← small coloured pill showing public / admin / draft
 *     └── CreatePageDrawer← slide-in form for creating a new page
 *
 * ─── Translation namespace ───────────────────────────────────────────────────
 * All user-facing strings use the "pagesPage" namespace from en.json.
 */

import { useState }        from 'react';
import { useTranslations } from 'next-intl';
import {
  FiPlus, FiSearch, FiEdit2, FiTrash2, FiEye,
  FiEyeOff, FiGlobe, FiLock, FiChevronRight,
  FiLayout, FiX, FiCheck,
} from 'react-icons/fi';

// ─── Types ────────────────────────────────────────────────────────────────────

/**
 * @typedef PageVisibility
 * The three possible visibility states for a page.
 *
 * - 'public' → visible to all users on the live site.
 * - 'admin'  → only visible to admin users.
 * - 'draft'  → hidden from everyone; work in progress.
 */
type PageVisibility = 'public' | 'admin' | 'draft';

/**
 * @typedef PageItem
 * Represents a single page entry in the system.
 *
 * @property {string}          id             - Unique identifier for the page.
 * @property {string}          name           - Human-readable page name shown in the table.
 * @property {string}          slug           - The URL path for this page (e.g. "/products/:id").
 * @property {string|null}     model          - The id of the attached data model, or null for
 *                                              custom pages that do not use a model.
 * @property {string}          template       - The id of the layout template (e.g. "list", "detail").
 * @property {PageVisibility}  visibility     - Who can see this page: public, admin, or draft.
 * @property {string}          seoTitle       - The <title> tag value for search engines.
 * @property {string}          seoDescription - The meta description for search engines.
 * @property {string}          createdAt      - Human-readable creation date string.
 * @property {string}          updatedAt      - Human-readable last-updated date string.
 */
type PageItem = {
  id:             string;
  name:           string;
  slug:           string;
  model:          string | null;
  template:       string;
  visibility:     PageVisibility;
  seoTitle:       string;
  seoDescription: string;
  createdAt:      string;
  updatedAt:      string;
};

// ─── Mock Data ────────────────────────────────────────────────────────────────

/**
 * @constant mockModels
 * Placeholder list of data models available to attach to a page.
 * In production this would be fetched from the API.
 */
const mockModels = [
  { id: 'products',   name: 'Products'   },
  { id: 'blog-posts', name: 'Blog Posts' },
  { id: 'users',      name: 'Users'      },
  { id: 'orders',     name: 'Orders'     },
  { id: 'categories', name: 'Categories' },
];

/**
 * @constant templates
 * The available layout templates a page can use.
 * Each template controls how the page data is rendered.
 */
const templates = [
  { id: 'list',      name: 'List View'   },
  { id: 'detail',    name: 'Detail View' },
  { id: 'form',      name: 'Form'        },
  { id: 'dashboard', name: 'Dashboard'   },
  { id: 'custom',    name: 'Custom'      },
];

/**
 * @constant initialPages
 * Seed data used to pre-populate the page list on first render.
 * In production this would be replaced by an API fetch.
 */
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

// ─── VisibilityBadge ──────────────────────────────────────────────────────────

/**
 * @component VisibilityBadge
 * @description
 * Renders a small coloured pill badge that communicates the visibility
 * status of a page at a glance. Each visibility level has its own
 * colour scheme and icon:
 *
 *   - public → green pill  + globe icon
 *   - admin  → amber pill  + lock icon
 *   - draft  → grey pill   + eye-off icon
 *
 * @param {{ visibility: PageVisibility }} props - The page visibility value.
 * @returns {JSX.Element} A styled badge element.
 */
function VisibilityBadge({ visibility }: { visibility: PageVisibility }) {
  const t = useTranslations('pagesPage');

  const map: Record<PageVisibility, { labelKey: string; className: string; icon: React.ReactNode }> = {
    public: { labelKey: 'visibility.public', className: 'bg-green-50 text-green-600 border-green-200',  icon: <FiGlobe size={10} />  },
    admin:  { labelKey: 'visibility.admin',  className: 'bg-amber-50 text-amber-600 border-amber-200',  icon: <FiLock size={10} />   },
    draft:  { labelKey: 'visibility.draft',  className: 'bg-gray-100 text-gray-500 border-gray-200',    icon: <FiEyeOff size={10} /> },
  };

  const { labelKey, className, icon } = map[visibility];

  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-[10px] font-medium ${className}`}>
      {icon}{t(labelKey)}
    </span>
  );
}

// ─── CreatePageDrawer ─────────────────────────────────────────────────────────

/**
 * @component CreatePageDrawer
 * @description
 * A slide-in side drawer panel that contains the form for creating a new page.
 * It is rendered on top of the main page list with a semi-transparent backdrop.
 * Clicking the backdrop closes the drawer without saving.
 *
 * ─── Form sections ────────────────────────────────────────────────────────────
 *
 * 1. BASIC INFO     — Page name (required), slug/URL (required, auto-generated
 *                     from the name but editable), and visibility selector.
 *
 * 2. MODEL & TEMPLATE — Optional model attachment and template layout selector.
 *
 * 3. SEO            — Optional SEO title and meta description with a live
 *                     search result preview that updates as the user types.
 *
 * ─── Auto-slug logic ─────────────────────────────────────────────────────────
 * When the user types a page name, the slug is automatically generated from it
 * (lowercased, spaces replaced with hyphens, special characters stripped).
 * The user can override the slug by editing it directly — once they do, the
 * auto-generation stops following the name.
 *
 * ─── Create guard ────────────────────────────────────────────────────────────
 * The "Create Page" button is disabled unless both name and slug are filled in.
 *
 * @param {{ open: boolean, onClose: () => void, onCreate: (page: PageItem) => void }} props
 * @returns {JSX.Element | null} The drawer UI, or null when closed.
 */
function CreatePageDrawer({
  open,
  onClose,
  onCreate,
}: {
  open:     boolean;
  onClose:  () => void;
  onCreate: (page: PageItem) => void;
}) {
  const t = useTranslations('pagesPage');

  // ─── Local form state ───────────────────────────────────────────────────────

  /** The page's human-readable name. Required. */
  const [name,       setName]       = useState('');

  /** The page's URL slug. Required. Auto-generated from name unless manually edited. */
  const [slug,       setSlug]       = useState('');

  /** The id of the attached model, or empty string for no model. */
  const [model,      setModel]      = useState('');

  /** The id of the selected layout template. Defaults to 'list'. */
  const [template,   setTemplate]   = useState('list');

  /** Who can see this page. Defaults to 'public'. */
  const [visibility, setVisibility] = useState<PageVisibility>('public');

  /** The SEO <title> tag value. Optional. */
  const [seoTitle,   setSeoTitle]   = useState('');

  /** The SEO meta description value. Optional. */
  const [seoDesc,    setSeoDesc]    = useState('');

  // ─── Helpers ────────────────────────────────────────────────────────────────

  /**
   * @function autoSlug
   * Converts a page name string into a URL-safe slug.
   * Steps: prepend "/", lowercase, replace spaces with hyphens,
   * strip any character that is not a letter, digit, hyphen, or forward slash.
   *
   * @param {string} n - The raw page name string.
   * @returns {string} A URL-safe slug starting with "/".
   */
  const autoSlug = (n: string) =>
    '/' + n.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-/]/g, '');

  /**
   * @function handleNameChange
   * Updates the name state and, if the slug has not been manually customised,
   * also updates the slug to match the auto-generated version of the new name.
   * This keeps the slug in sync with the name until the user edits it directly.
   *
   * @param {string} v - The new name value from the input.
   */
  const handleNameChange = (v: string) => {
    setName(v);
    if (!slug || slug === autoSlug(name)) setSlug(autoSlug(v));
  };

  /**
   * `canCreate` — true only when both name and slug have non-empty values.
   * Used to disable the "Create Page" button and prevent empty submissions.
   */
  const canCreate = name.trim() && slug.trim();

  /**
   * @function handleCreate
   * Builds a new PageItem from the current form state and passes it to the
   * onCreate callback. Then resets all form fields and closes the drawer.
   * Does nothing if canCreate is false (the button should already be disabled).
   */
  const handleCreate = () => {
    if (!canCreate) return;
    onCreate({
      id:             Date.now().toString(),
      name:           name.trim(),
      slug:           slug.trim(),
      model:          model || null,
      template,
      visibility,
      seoTitle,
      seoDescription: seoDesc,
      createdAt: new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }),
      updatedAt: new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }),
    });

    /* Reset all form fields so the drawer is clean next time it opens. */
    setName(''); setSlug(''); setModel(''); setTemplate('list');
    setVisibility('public'); setSeoTitle(''); setSeoDesc('');
    onClose();
  };

  /* Do not render anything when the drawer is closed. */
  if (!open) return null;

  return (
    <>
      {/* ── Backdrop ──
          Semi-transparent overlay behind the drawer.
          Clicking it closes the drawer without saving. */}
      <div className="fixed inset-0 bg-black/20 z-40" onClick={onClose} />

      {/* ── Drawer Panel ── */}
      <div className="fixed top-16 right-0 bottom-0 w-full max-w-md bg-white border-l border-gray-200 z-50 flex flex-col shadow-2xl">

        {/* ── Drawer Header ── */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 shrink-0">
          <div>
            <h2 className="text-sm font-bold text-gray-900">{t('drawer.title')}</h2>
            <p className="text-xs text-gray-400 mt-0.5">{t('drawer.subtitle')}</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <FiX size={18} />
          </button>
        </div>

        {/* ── Drawer Body ── */}
        <div className="flex-1 overflow-y-auto px-5 py-4 flex flex-col gap-5">

          {/* ── Section: Basic Info ── */}
          <section>
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-3">
              {t('drawer.sections.basicInfo')}
            </p>
            <div className="flex flex-col gap-3">

              {/* Page Name */}
              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold text-gray-700">
                  {t('drawer.fields.name.label')} <span className="text-red-400">*</span>
                </label>
                <input
                  value={name}
                  onChange={(e) => handleNameChange(e.target.value)}
                  placeholder={t('drawer.fields.name.placeholder')}
                  className="px-3 py-2 text-sm border border-gray-200 rounded-md bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-300 focus:bg-white transition"
                />
              </div>

              {/* Slug / URL */}
              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold text-gray-700">
                  {t('drawer.fields.slug.label')} <span className="text-red-400">*</span>
                </label>
                <input
                  value={slug}
                  onChange={(e) => setSlug(e.target.value)}
                  placeholder={t('drawer.fields.slug.placeholder')}
                  className="px-3 py-2 text-sm border border-gray-200 rounded-md bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-300 focus:bg-white transition font-mono"
                />
                <p className="text-[11px] text-gray-400">
                  {t('drawer.fields.slug.hint')}
                </p>
              </div>

              {/* Visibility selector */}
              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold text-gray-700">
                  {t('drawer.fields.visibility.label')}
                </label>
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
                      {t(`visibility.${v}`)}
                    </button>
                  ))}
                </div>
              </div>

            </div>
          </section>

          {/* ── Section: Model & Template ── */}
          <section>
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-3">
              {t('drawer.sections.modelTemplate')}
            </p>
            <div className="flex flex-col gap-3">

              {/* Model selector */}
              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold text-gray-700">
                  {t('drawer.fields.model.label')}
                </label>
                <select
                  value={model}
                  onChange={(e) => setModel(e.target.value)}
                  className="px-3 py-2 text-sm border border-gray-200 rounded-md bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-300 transition"
                >
                  <option value="">{t('drawer.fields.model.noModel')}</option>
                  {mockModels.map((m) => (
                    <option key={m.id} value={m.id}>{m.name}</option>
                  ))}
                </select>
                <p className="text-[11px] text-gray-400">
                  {t('drawer.fields.model.hint')}
                </p>
              </div>

              {/* Template selector */}
              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold text-gray-700">
                  {t('drawer.fields.template.label')}
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {templates.map((tmpl) => (
                    <button
                      key={tmpl.id}
                      onClick={() => setTemplate(tmpl.id)}
                      className={`py-2 text-xs font-medium rounded-md border transition ${
                        template === tmpl.id
                          ? 'bg-gray-900 text-white border-gray-900'
                          : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
                      }`}
                    >
                      {tmpl.name}
                    </button>
                  ))}
                </div>
              </div>

            </div>
          </section>

          {/* ── Section: SEO ── */}
          <section>
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-3">
              {t('drawer.sections.seo')}
            </p>
            <div className="flex flex-col gap-3">

              {/* SEO Title */}
              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold text-gray-700">
                  {t('drawer.fields.seoTitle.label')}
                </label>
                <input
                  value={seoTitle}
                  onChange={(e) => setSeoTitle(e.target.value)}
                  placeholder={t('drawer.fields.seoTitle.placeholder')}
                  className="px-3 py-2 text-sm border border-gray-200 rounded-md bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-300 focus:bg-white transition"
                />
                <p className="text-[11px] text-gray-400">
                  {t('drawer.fields.seoTitle.charCount', { count: seoTitle.length })}
                </p>
              </div>

              {/* Meta Description */}
              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold text-gray-700">
                  {t('drawer.fields.seoDesc.label')}
                </label>
                <textarea
                  value={seoDesc}
                  onChange={(e) => setSeoDesc(e.target.value)}
                  placeholder={t('drawer.fields.seoDesc.placeholder')}
                  rows={3}
                  className="px-3 py-2 text-sm border border-gray-200 rounded-md bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-300 focus:bg-white transition resize-none"
                />
                <p className="text-[11px] text-gray-400">
                  {t('drawer.fields.seoDesc.charCount', { count: seoDesc.length })}
                </p>
              </div>

              {/* ── Live SEO Preview ──
                  Only shown when the user has entered at least one of:
                  seoTitle, seoDesc, or slug. Gives a realistic preview of
                  how the page would appear in Google search results. */}
              {(seoTitle || seoDesc || slug) && (
                <div className="p-3 bg-gray-50 border border-gray-200 rounded-md">
                  <p className="text-[10px] font-semibold text-gray-400 uppercase mb-2">
                    {t('drawer.seoPreview.label')}
                  </p>
                  <p className="text-sm text-blue-600 font-medium truncate">
                    {seoTitle || name || t('drawer.seoPreview.titleFallback')}
                  </p>
                  <p className="text-[11px] text-green-700 truncate">
                    {t('drawer.seoPreview.urlPrefix')}{slug || '/slug'}
                  </p>
                  <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">
                    {seoDesc || t('drawer.seoPreview.descFallback')}
                  </p>
                </div>
              )}

            </div>
          </section>

        </div>

        {/* ── Drawer Footer ──
            Cancel closes without saving. Create Page is disabled until
            name and slug are both filled in. */}
        <div className="shrink-0 px-5 py-4 border-t border-gray-100 flex gap-2">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 bg-white border border-gray-200 text-gray-700 text-sm font-medium rounded-md hover:bg-gray-50 transition"
          >
            {t('drawer.actions.cancel')}
          </button>
          <button
            onClick={handleCreate}
            disabled={!canCreate}
            className="flex-1 py-2.5 bg-gray-900 text-white text-sm font-medium rounded-md hover:bg-gray-700 disabled:opacity-40 disabled:cursor-not-allowed transition"
          >
            {t('drawer.actions.create')}
          </button>
        </div>

      </div>
    </>
  );
}

// ─── PagesPage ────────────────────────────────────────────────────────────────

/**
 * @component PagesPage
 * @description
 * The main smart component for the Pages section. Owns all page list state
 * and orchestrates searching, filtering, creating, and deleting pages.
 *
 * All child components (VisibilityBadge, CreatePageDrawer) are purely
 * presentational and receive their data and callbacks via props.
 *
 * @returns {JSX.Element} The full pages management layout.
 */
export default function PagesPage() {
  const t = useTranslations('pagesPage');

  // ─── State ─────────────────────────────────────────────────────────────────

  /**
   * `pages` — the full list of page items. Starts with seed data and is
   * updated when the user creates or deletes a page.
   */
  const [pages, setPages] = useState<PageItem[]>(initialPages);

  /**
   * `search` — the current value of the search input.
   * Used to filter pages by name or slug in real time.
   */
  const [search, setSearch] = useState('');

  /**
   * `filterVis` — the active visibility filter.
   * 'all' shows every page; other values show only pages with that visibility.
   */
  const [filterVis, setFilterVis] = useState<PageVisibility | 'all'>('all');

  /**
   * `drawerOpen` — controls whether the CreatePageDrawer is visible.
   * Set to true when the "New Page" button is clicked.
   */
  const [drawerOpen, setDrawerOpen] = useState(false);

  /**
   * `deletingId` — the id of the page currently in the delete confirmation state.
   * When set, that row shows the confirm/cancel icon pair instead of the normal actions.
   * Null when no deletion is in progress.
   */
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // ─── Derived State ──────────────────────────────────────────────────────────

  /**
   * `filtered` — the subset of pages to display in the table.
   * Computed from `pages` by applying the search term and visibility filter.
   * Both filters are applied together — a page must match both to appear.
   */
  const filtered = pages.filter((p) => {
    const matchSearch = p.name.toLowerCase().includes(search.toLowerCase()) ||
                        p.slug.toLowerCase().includes(search.toLowerCase());
    const matchVis    = filterVis === 'all' || p.visibility === filterVis;
    return matchSearch && matchVis;
  });

  // ─── Handlers ──────────────────────────────────────────────────────────────

  /**
   * @function handleCreate
   * Adds a newly created page to the top of the pages list.
   * Called by CreatePageDrawer when the user submits the form.
   *
   * @param {PageItem} page - The new page object built inside the drawer.
   */
  const handleCreate = (page: PageItem) => {
    setPages((prev) => [page, ...prev]);
  };

  /**
   * @function handleDelete
   * Removes a page from the list by its id and clears the deletingId state.
   * Only called after the user confirms deletion via the inline check button.
   *
   * @param {string} id - The id of the page to remove.
   */
  const handleDelete = (id: string) => {
    setPages((prev) => prev.filter((p) => p.id !== id));
    setDeletingId(null);
  };

  // ─── Lookup Helpers ─────────────────────────────────────────────────────────

  /**
   * @function modelName
   * Returns the human-readable name for a model id, or "—" if the page
   * has no attached model or the id is not found in mockModels.
   *
   * @param {string|null} id - The model id to look up.
   * @returns {string} The model's display name or "—".
   */
  const modelName = (id: string | null) =>
    mockModels.find((m) => m.id === id)?.name ?? '—';

  /**
   * @function templateName
   * Returns the human-readable name for a template id, or the raw id as
   * a fallback if it is not found in the templates list.
   *
   * @param {string} id - The template id to look up.
   * @returns {string} The template's display name.
   */
  const templateName = (id: string) =>
    templates.find((tmpl) => tmpl.id === id)?.name ?? id;

  // ─── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col h-[calc(100vh-64px)] bg-gray-100 overflow-hidden">

      {/* ── Top Toolbar ──
          Page title, total page count, search input, visibility filter, and
          the "New Page" button that opens the CreatePageDrawer. */}
      <div className="shrink-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between gap-4">
        <div>
          <h1 className="text-base font-bold text-gray-900">{t('toolbar.title')}</h1>
          <p className="text-xs text-gray-400 mt-0.5">
            {t('toolbar.pageCount', { count: pages.length })}
          </p>
        </div>

        <div className="flex items-center gap-3">

          {/* Search input — filters by name or slug */}
          <div className="flex items-center gap-2 px-3 py-2 border border-gray-200 rounded-md bg-gray-50 w-56">
            <FiSearch size={14} className="text-gray-400 shrink-0" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t('toolbar.searchPlaceholder')}
              className="flex-1 text-sm bg-transparent focus:outline-none text-gray-700 placeholder-gray-400"
            />
          </div>

          {/* Visibility filter tabs */}
          <div className="flex items-center border border-gray-200 rounded-md overflow-hidden bg-white text-xs font-medium">
            {(['all', 'public', 'admin', 'draft'] as const).map((v) => (
              <button
                key={v}
                onClick={() => setFilterVis(v)}
                className={`px-3 py-2 capitalize transition-colors border-r border-gray-200 last:border-0 ${
                  filterVis === v ? 'bg-gray-100 text-gray-900' : 'text-gray-500 hover:bg-gray-50'
                }`}
              >
                {v === 'all' ? t('filter.all') : t(`visibility.${v}`)}
              </button>
            ))}
          </div>

          {/* New Page button */}
          <button
            onClick={() => setDrawerOpen(true)}
            className="flex items-center gap-1.5 px-4 py-2 bg-gray-900 text-white text-sm font-medium rounded-md hover:bg-gray-700 transition"
          >
            <FiPlus size={15} />
            {t('toolbar.newPage')}
          </button>
        </div>
      </div>

      {/* ── Page List ── */}
      <div className="flex-1 overflow-y-auto p-6">

        {/* ── Empty State ──
            Shown when no pages match the current search/filter combination.
            Offers a shortcut to open the drawer and create the first page. */}
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 gap-3 text-gray-400">
            <FiLayout size={36} className="text-gray-300" />
            <p className="text-sm">{t('emptyState.message')}</p>
            <button
              onClick={() => setDrawerOpen(true)}
              className="text-xs text-blue-500 hover:underline"
            >
              {t('emptyState.cta')}
            </button>
          </div>
        ) : (
          <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">

            {/* ── Table Header Row ── */}
            <div className="grid grid-cols-[2fr_1fr_1fr_1fr_auto] gap-x-4 px-5 py-2.5 border-b border-gray-100 bg-gray-50">
              <p className="text-[10px] font-bold text-gray-400 uppercase">{t('table.page')}</p>
              <p className="text-[10px] font-bold text-gray-400 uppercase">{t('table.model')}</p>
              <p className="text-[10px] font-bold text-gray-400 uppercase">{t('table.template')}</p>
              <p className="text-[10px] font-bold text-gray-400 uppercase">{t('table.visibility')}</p>
              <p className="text-[10px] font-bold text-gray-400 uppercase">{t('table.actions')}</p>
            </div>

            {/* ── Table Rows ── */}
            {filtered.map((page) => (
              <div
                key={page.id}
                className="group grid grid-cols-[2fr_1fr_1fr_1fr_auto] gap-x-4 items-center px-5 py-3.5 border-b border-gray-100 last:border-0 hover:bg-gray-50 transition-colors"
              >
                {/* Name + slug + optional SEO title */}
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-gray-800 truncate">{page.name}</p>
                  <p className="text-xs text-gray-400 font-mono truncate mt-0.5">{page.slug}</p>
                  {page.seoTitle && (
                    <p className="text-[10px] text-gray-400 truncate mt-0.5">
                      {t('table.seoPrefix')}: {page.seoTitle}
                    </p>
                  )}
                </div>

                {/* Attached model name or dash */}
                <div>
                  {page.model ? (
                    <span className="inline-flex items-center gap-1 text-xs text-gray-700 bg-gray-100 px-2 py-0.5 rounded-full font-medium">
                      {modelName(page.model)}
                    </span>
                  ) : (
                    <span className="text-xs text-gray-400">—</span>
                  )}
                </div>

                {/* Template name */}
                <div>
                  <span className="text-xs text-gray-600">{templateName(page.template)}</span>
                </div>

                {/* Visibility badge */}
                <div>
                  <VisibilityBadge visibility={page.visibility} />
                </div>

                {/* ── Row Actions ──
                    Normal state: edit, delete, view icons (visible on hover).
                    Deleting state: confirm (green check) and cancel (X) icons.
                    The two-step pattern prevents accidental deletion. */}
                <div className="flex items-center gap-1">
                  {deletingId === page.id ? (
                    <div className="flex items-center gap-1">
                      {/* Confirm delete */}
                      <button
                        onClick={() => handleDelete(page.id)}
                        className="flex items-center justify-center w-7 h-7 rounded bg-red-50 text-red-500 hover:bg-red-100 transition"
                        title={t('actions.confirmDelete')}
                      >
                        <FiCheck size={13} />
                      </button>
                      {/* Cancel delete */}
                      <button
                        onClick={() => setDeletingId(null)}
                        className="flex items-center justify-center w-7 h-7 rounded bg-gray-100 text-gray-500 hover:bg-gray-200 transition"
                        title={t('actions.cancel')}
                      >
                        <FiX size={13} />
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      {/* Edit */}
                      <button
                        className="flex items-center justify-center w-7 h-7 rounded bg-gray-100 text-gray-500 hover:bg-gray-200 transition"
                        title={t('actions.edit')}
                      >
                        <FiEdit2 size={13} />
                      </button>
                      {/* Delete (starts confirmation) */}
                      <button
                        onClick={() => setDeletingId(page.id)}
                        className="flex items-center justify-center w-7 h-7 rounded bg-gray-100 text-gray-500 hover:bg-red-50 hover:text-red-500 transition"
                        title={t('actions.delete')}
                      >
                        <FiTrash2 size={13} />
                      </button>
                      {/* View */}
                      <button
                        className="flex items-center justify-center w-7 h-7 rounded bg-gray-100 text-gray-500 hover:bg-gray-200 transition"
                        title={t('actions.view')}
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

      {/* ── Create Page Drawer ──
          Rendered at the bottom of the tree so it sits on top of everything else
          in the stacking order. Controlled by the drawerOpen state. */}
      <CreatePageDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        onCreate={handleCreate}
      />
    </div>
  );
}