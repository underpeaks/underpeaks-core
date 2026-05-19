'use client';

/**
 * @file MenuPage.tsx
 * @description
 * The Menu management page for the admin console. It allows users to build
 * and manage the navigation menu structure for their storefront or website.
 *
 * What can the user do on this page?
 * ------------------------------------
 * - View all menu items in a list, grouped by parent/child (nested) relationships.
 * - See a live nav bar preview at the top showing how the menu will look to visitors.
 * - Add new menu items via a slide-in drawer panel.
 * - Edit existing items (label, link, icon, visibility, nesting, target).
 * - Delete items — with a two-step confirmation (click delete, then confirm).
 * - Reorder items up or down within their level using arrow buttons.
 * - Toggle individual items between visible and hidden without deleting them.
 *
 * How does nesting work?
 * -----------------------
 * Menu items have an optional `parentId` field. Top-level items have parentId = null.
 * Child items reference the id of their parent. In the nav preview, children appear
 * as a dropdown under their parent on hover. Deleting a parent also deletes its children.
 *
 * How does the drawer work?
 * --------------------------
 * The MenuItemDrawer component is a slide-in panel from the right. It is used for
 * both creating new items and editing existing ones. The `existing` prop controls
 * which mode it is in — if null, it is in "add" mode; if set, it is in "edit" mode.
 *
 * How does item ordering work?
 * -----------------------------
 * Each item has an `order` number. Moving an item up decrements its order by 1
 * and increments the previous sibling's order by 1 (and vice versa for move down).
 * Items are always sorted by their `order` field before being rendered.
 */

import { useState } from 'react';
import {
  FiPlus, FiX, FiCheck, FiChevronRight, FiMenu,
  FiEdit2, FiTrash2, FiExternalLink, FiLink,
  FiEye, FiEyeOff, FiChevronDown, FiChevronUp,
  FiHome, FiGrid, FiPackage, FiUsers, FiSettings,
  FiFileText, FiShoppingCart, FiMail, FiStar, FiInfo,
} from 'react-icons/fi';
import { useTranslations } from 'next-intl';

// ─── Types ────────────────────────────────────────────────────────────────────

/**
 * @typedef MenuTarget
 * Controls how the link opens when clicked:
 *   - '_self'  — opens in the same browser tab (default for internal pages)
 *   - '_blank' — opens in a new browser tab (typical for external URLs)
 */
type MenuTarget = '_self' | '_blank';

/**
 * @typedef LinkType
 * Whether the menu item links to an internal page or an external URL:
 *   - 'page'     — links to one of the project's own pages (selected from a dropdown)
 *   - 'external' — links to any arbitrary external URL (typed in manually)
 */
type LinkType = 'page' | 'external';

/**
 * @typedef MenuItem
 * Represents a single item in the navigation menu.
 *
 * @property {string} id               - Unique identifier for the item.
 * @property {string} label            - The text shown in the navigation menu.
 * @property {LinkType} linkType       - Whether it links to a page or external URL.
 * @property {string|null} pageId      - The id of the linked internal page (or null for external).
 * @property {string} externalUrl      - The external URL (empty string for page links).
 * @property {string} icon             - Icon name string resolved via getIcon().
 * @property {MenuTarget} target       - Whether the link opens in the same or a new tab.
 * @property {boolean} visible         - Whether the item is shown in the nav (can be hidden without deleting).
 * @property {string|null} parentId    - The id of the parent item (null = top-level item).
 * @property {number} order            - Sort order within the item's level (lower = earlier).
 */
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

// ─── Static Data ──────────────────────────────────────────────────────────────

/**
 * Mock list of pages available to link menu items to.
 * In production, this would be fetched from the Pages API.
 */
const availablePages = [
  { id: '1', name: 'Product Listing',  slug: '/products'      },
  { id: '2', name: 'Product Detail',   slug: '/products/:id'  },
  { id: '3', name: 'Admin Orders',     slug: '/admin/orders'  },
  { id: '4', name: 'Blog',             slug: '/blog'          },
  { id: '5', name: 'New Landing Page', slug: '/landing'       },
];

/**
 * The available icons the user can assign to a menu item.
 * Each entry has an id (the icon component name), a label, and the icon element.
 * Labels are translated at render time via t().
 */
const iconOptions = [
  { id: 'FiHome',         labelKey: 'home',     icon: <FiHome size={14} />         },
  { id: 'FiGrid',         labelKey: 'grid',     icon: <FiGrid size={14} />         },
  { id: 'FiPackage',      labelKey: 'package',  icon: <FiPackage size={14} />      },
  { id: 'FiUsers',        labelKey: 'users',    icon: <FiUsers size={14} />        },
  { id: 'FiSettings',     labelKey: 'settings', icon: <FiSettings size={14} />     },
  { id: 'FiFileText',     labelKey: 'file',     icon: <FiFileText size={14} />     },
  { id: 'FiShoppingCart', labelKey: 'cart',     icon: <FiShoppingCart size={14} /> },
  { id: 'FiMail',         labelKey: 'mail',     icon: <FiMail size={14} />         },
  { id: 'FiStar',         labelKey: 'star',     icon: <FiStar size={14} />         },
  { id: 'FiInfo',         labelKey: 'info',     icon: <FiInfo size={14} />         },
];

/**
 * The initial menu items loaded when the page first renders.
 * In production, these would be fetched from a menu configuration API.
 */
const initialItems: MenuItem[] = [
  { id: '1', label: 'Home',     linkType: 'page',     pageId: '5', externalUrl: '',                          icon: 'FiHome',     target: '_self',  visible: true,  parentId: null, order: 0 },
  { id: '2', label: 'Products', linkType: 'page',     pageId: '1', externalUrl: '',                          icon: 'FiPackage',  target: '_self',  visible: true,  parentId: null, order: 1 },
  { id: '3', label: 'Blog',     linkType: 'page',     pageId: '4', externalUrl: '',                          icon: 'FiFileText', target: '_self',  visible: true,  parentId: null, order: 2 },
  { id: '4', label: 'Detail',   linkType: 'page',     pageId: '2', externalUrl: '',                          icon: 'FiGrid',     target: '_self',  visible: false, parentId: '2',  order: 0 },
  { id: '5', label: 'Docs',     linkType: 'external', pageId: null,externalUrl: 'https://docs.example.com',  icon: 'FiInfo',     target: '_blank', visible: true,  parentId: null, order: 3 },
];

// ─── Utility Functions ────────────────────────────────────────────────────────

/**
 * @function getIcon
 * Converts an icon name string into a React icon element.
 * Falls back to FiLink if the name is not in the map.
 *
 * @param {string} id    - The icon name (e.g. "FiHome").
 * @param {number} [size=14] - The icon size in pixels.
 * @returns {React.ReactNode}
 */
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

/**
 * @function pageName
 * Looks up a page's display name by its id.
 * Returns '—' if the page id is null or not found.
 */
function pageName(pageId: string | null) {
  return availablePages.find((p) => p.id === pageId)?.name ?? '—';
}

/**
 * @function pageSlug
 * Looks up a page's URL slug by its id.
 * Returns an empty string if the page id is null or not found.
 */
function pageSlug(pageId: string | null) {
  return availablePages.find((p) => p.id === pageId)?.slug ?? '';
}

// ─── MenuItemDrawer Sub-component ─────────────────────────────────────────────

/**
 * @component MenuItemDrawer
 * @description
 * A slide-in drawer panel used for both creating and editing menu items.
 * Rendered on the right side of the screen over a semi-transparent backdrop.
 *
 * Sections inside the drawer:
 *   1. Label & Visibility — the menu text and whether it is shown or hidden.
 *   2. Link — whether to link to an internal page or external URL, and target tab.
 *   3. Icon — a grid of icon options to assign to the item.
 *   4. Nesting — optionally assign a parent item to make this a child/dropdown item.
 *   5. Preview — a live preview of how the item will appear in the nav bar.
 *
 * @param {{ open, onClose, onSave, existing, parentOptions }} props
 */
function MenuItemDrawer({
  open,
  onClose,
  onSave,
  existing,
  parentOptions,
  t,
}: {
  open: boolean;
  onClose: () => void;
  onSave: (item: MenuItem) => void;
  existing?: MenuItem | null;
  parentOptions: MenuItem[];
  t: (key: string, values?: Record<string, any>) => string;
}) {
  /** The label text for this menu item. */
  const [label,       setLabel]       = useState(existing?.label       ?? '');

  /** Whether this item links to an internal page or external URL. */
  const [linkType,    setLinkType]    = useState<LinkType>(existing?.linkType ?? 'page');

  /** The selected internal page id (empty string = none selected). */
  const [pageId,      setPageId]      = useState(existing?.pageId      ?? '');

  /** The external URL value (only used when linkType is 'external'). */
  const [externalUrl, setExternalUrl] = useState(existing?.externalUrl ?? '');

  /** The selected icon id string (e.g. "FiHome"). */
  const [icon,        setIcon]        = useState(existing?.icon        ?? 'FiHome');

  /** Whether the link opens in the same tab or a new tab. */
  const [target,      setTarget]      = useState<MenuTarget>(existing?.target ?? '_self');

  /** Whether the item is visible in the nav (can be hidden without deleting). */
  const [visible,     setVisible]     = useState(existing?.visible     ?? true);

  /** The parent item id (empty string = top-level, no parent). */
  const [parentId,    setParentId]    = useState(existing?.parentId    ?? '');

  /**
   * Whether the form is valid enough to allow saving.
   * Requires a non-empty label. For external links, also requires a non-empty URL.
   */
  const canSave = label.trim() && (linkType === 'external' ? externalUrl.trim() : true);

  /**
   * @function handleSave
   * Builds the MenuItem object from the current form state and passes it
   * to the onSave callback, then closes the drawer.
   */
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

  /** Don't render anything if the drawer is closed. */
  if (!open) return null;

  /**
   * The resolved URL/slug shown in the live preview.
   * For page links: the page's slug. For external: the typed URL.
   */
  const resolvedSlug = linkType === 'page' ? pageSlug(pageId) : externalUrl;

  return (
    <>
      {/* Backdrop — clicking it closes the drawer */}
      <div className="fixed inset-0 bg-black/20 z-40" onClick={onClose} />

      {/* Drawer panel */}
      <div className="fixed top-16 right-0 bottom-0 w-full max-w-md bg-white border-l border-gray-200 z-50 flex flex-col shadow-2xl">

        {/* ── Drawer Header ── */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 shrink-0">
          <div>
            <h2 className="text-sm font-bold text-gray-900">
              {existing ? t('drawer.titleEdit') : t('drawer.titleAdd')}
            </h2>
            <p className="text-xs text-gray-400 mt-0.5">{t('drawer.subtitle')}</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><FiX size={18} /></button>
        </div>

        {/* ── Drawer Body ── */}
        <div className="flex-1 overflow-y-auto px-5 py-4 flex flex-col gap-5">

          {/* Section: Label & Visibility */}
          <section>
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-3">
              {t('drawer.sections.labelVisibility')}
            </p>
            <div className="flex flex-col gap-3">

              {/* Label input */}
              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold text-gray-700">
                  {t('drawer.fields.menuLabel')} <span className="text-red-400">*</span>
                </label>
                <input
                  value={label}
                  onChange={(e) => setLabel(e.target.value)}
                  placeholder={t('drawer.fields.menuLabelPlaceholder')}
                  className="px-3 py-2 text-sm border border-gray-200 rounded-md bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-300 focus:bg-white transition"
                />
                <p className="text-[11px] text-gray-400">{t('drawer.fields.menuLabelHint')}</p>
              </div>

              {/* Visibility toggle */}
              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold text-gray-700">{t('drawer.fields.visibility')}</label>
                <div className="flex gap-2">
                  <button
                    onClick={() => setVisible(true)}
                    className={`flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-medium rounded-md border transition ${
                      visible ? 'bg-gray-900 text-white border-gray-900' : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
                    }`}
                  >
                    <FiEye size={12} /> {t('drawer.fields.visible')}
                  </button>
                  <button
                    onClick={() => setVisible(false)}
                    className={`flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-medium rounded-md border transition ${
                      !visible ? 'bg-gray-900 text-white border-gray-900' : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
                    }`}
                  >
                    <FiEyeOff size={12} /> {t('drawer.fields.hidden')}
                  </button>
                </div>
              </div>

            </div>
          </section>

          {/* Section: Link */}
          <section>
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-3">
              {t('drawer.sections.link')}
            </p>
            <div className="flex flex-col gap-3">

              {/* Link type toggle: Page vs External URL */}
              <div className="flex gap-2">
                <button
                  onClick={() => setLinkType('page')}
                  className={`flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-medium rounded-md border transition ${
                    linkType === 'page' ? 'bg-gray-900 text-white border-gray-900' : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
                  }`}
                >
                  <FiFileText size={12} /> {t('drawer.fields.linkTypePage')}
                </button>
                <button
                  onClick={() => setLinkType('external')}
                  className={`flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-medium rounded-md border transition ${
                    linkType === 'external' ? 'bg-gray-900 text-white border-gray-900' : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
                  }`}
                >
                  <FiExternalLink size={12} /> {t('drawer.fields.linkTypeExternal')}
                </button>
              </div>

              {/* Page selector (shown when linkType is 'page') */}
              {linkType === 'page' ? (
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-semibold text-gray-700">{t('drawer.fields.selectPage')}</label>
                  <select
                    value={pageId}
                    onChange={(e) => setPageId(e.target.value)}
                    className="px-3 py-2 text-sm border border-gray-200 rounded-md bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-300 transition"
                  >
                    <option value="">{t('drawer.fields.selectPagePlaceholder')}</option>
                    {availablePages.map((p) => (
                      <option key={p.id} value={p.id}>{p.name} ({p.slug})</option>
                    ))}
                  </select>
                </div>
              ) : (
                /* External URL input (shown when linkType is 'external') */
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-semibold text-gray-700">
                    {t('drawer.fields.externalUrl')} <span className="text-red-400">*</span>
                  </label>
                  <input
                    value={externalUrl}
                    onChange={(e) => setExternalUrl(e.target.value)}
                    placeholder="https://example.com"
                    className="px-3 py-2 text-sm border border-gray-200 rounded-md bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-300 focus:bg-white transition font-mono"
                  />
                </div>
              )}

              {/* Target tab toggle: Same Tab vs New Tab */}
              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold text-gray-700">{t('drawer.fields.openIn')}</label>
                <div className="flex gap-2">
                  <button
                    onClick={() => setTarget('_self')}
                    className={`flex-1 py-2 text-xs font-medium rounded-md border transition ${
                      target === '_self' ? 'bg-gray-900 text-white border-gray-900' : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
                    }`}
                  >
                    {t('drawer.fields.sameTab')}
                  </button>
                  <button
                    onClick={() => setTarget('_blank')}
                    className={`flex-1 py-2 text-xs font-medium rounded-md border transition ${
                      target === '_blank' ? 'bg-gray-900 text-white border-gray-900' : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
                    }`}
                  >
                    {t('drawer.fields.newTab')}
                  </button>
                </div>
              </div>

            </div>
          </section>

          {/* Section: Icon picker */}
          <section>
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-3">
              {t('drawer.sections.icon')}
            </p>
            <div className="grid grid-cols-5 gap-2">
              {iconOptions.map((opt) => (
                <button
                  key={opt.id}
                  onClick={() => setIcon(opt.id)}
                  title={t(`drawer.icons.${opt.labelKey}`)}
                  className={`flex flex-col items-center gap-1 py-2 rounded-md border text-[10px] transition ${
                    icon === opt.id
                      ? 'bg-gray-900 text-white border-gray-900'
                      : 'bg-white text-gray-500 border-gray-200 hover:bg-gray-50'
                  }`}
                >
                  {opt.icon}
                  <span>{t(`drawer.icons.${opt.labelKey}`)}</span>
                </button>
              ))}
            </div>
          </section>

          {/* Section: Nesting / Parent selection */}
          <section>
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-3">
              {t('drawer.sections.nesting')}
            </p>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold text-gray-700">{t('drawer.fields.parentItem')}</label>
              <select
                value={parentId}
                onChange={(e) => setParentId(e.target.value)}
                className="px-3 py-2 text-sm border border-gray-200 rounded-md bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-300 transition"
              >
                <option value="">{t('drawer.fields.parentItemPlaceholder')}</option>
                {parentOptions
                  .filter((p) => p.id !== existing?.id)
                  .map((p) => (
                    <option key={p.id} value={p.id}>{p.label}</option>
                  ))}
              </select>
              <p className="text-[11px] text-gray-400">{t('drawer.fields.parentItemHint')}</p>
            </div>
          </section>

          {/* Section: Live preview — only shown when a label has been entered */}
          {label && (
            <section>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-3">
                {t('drawer.sections.preview')}
              </p>
              <div className="flex items-center gap-2.5 px-4 py-3 bg-gray-50 border border-gray-200 rounded-md">
                <span className="text-gray-500">{getIcon(icon)}</span>
                <span className="text-sm font-medium text-gray-800">{label}</span>
                {/* "hidden" label shown when visibility is off */}
                {!visible && (
                  <span className="text-[10px] text-gray-400 ml-auto">
                    ({t('drawer.preview.hidden')})
                  </span>
                )}
                {/* External link icon shown for new-tab links */}
                {target === '_blank' && (
                  <FiExternalLink size={11} className="text-gray-400 ml-auto" />
                )}
                {/* Resolved slug / URL shown in monospace */}
                {resolvedSlug && (
                  <span className="text-[10px] text-gray-400 font-mono truncate ml-auto">{resolvedSlug}</span>
                )}
              </div>
            </section>
          )}

        </div>

        {/* ── Drawer Footer: Cancel / Save buttons ── */}
        <div className="shrink-0 px-5 py-4 border-t border-gray-100 flex gap-2">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 bg-white border border-gray-200 text-gray-700 text-sm font-medium rounded-md hover:bg-gray-50 transition"
          >
            {t('drawer.buttons.cancel')}
          </button>
          <button
            onClick={handleSave}
            disabled={!canSave}
            className="flex-1 py-2.5 bg-gray-900 text-white text-sm font-medium rounded-md hover:bg-gray-700 disabled:opacity-40 disabled:cursor-not-allowed transition"
          >
            {existing ? t('drawer.buttons.saveChanges') : t('drawer.buttons.addItem')}
          </button>
        </div>

      </div>
    </>
  );
}

// ─── MenuRow Sub-component ────────────────────────────────────────────────────

/**
 * @component MenuRow
 * @description
 * Renders a single menu item as a row in the "All Items" list.
 *
 * Each row shows:
 *   - A drag handle icon (visual only — drag not implemented yet)
 *   - An indent indicator for child items
 *   - The item's icon and label
 *   - A "hidden" badge if the item is not visible
 *   - The linked page name or "External" badge
 *   - Action buttons (move up/down, toggle visibility, edit, delete)
 *
 * Delete uses a two-step confirmation pattern:
 *   - First click sets `deletingId` to this item's id, showing Confirm/Cancel buttons.
 *   - Clicking Confirm calls onDelete; clicking Cancel resets deletingId to null.
 *
 * Action buttons are hidden by default and appear on row hover using
 * Tailwind's `group` and `group-hover` pattern to reduce visual clutter.
 */
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
  t,
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
  t: (key: string, values?: Record<string, any>) => string;
}) {
  return (
    <div className={`group flex items-center gap-3 px-4 py-3 border-b border-gray-100 last:border-0 hover:bg-gray-50 transition-colors ${isChild ? 'pl-10 bg-gray-50/50' : ''}`}>

      {/* Drag handle — visual only, indicates draggability */}
      <div className="text-gray-300 cursor-grab shrink-0">
        <FiMenu size={14} />
      </div>

      {/* Chevron indent indicator for child items */}
      {isChild && <FiChevronRight size={12} className="text-gray-300 shrink-0 -ml-2" />}

      {/* Item icon — muted when hidden */}
      <span className={`shrink-0 ${item.visible ? 'text-gray-500' : 'text-gray-300'}`}>
        {getIcon(item.icon)}
      </span>

      {/* Label and link slug */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className={`text-sm font-medium truncate ${item.visible ? 'text-gray-800' : 'text-gray-400'}`}>
            {item.label}
          </p>
          {/* "hidden" badge */}
          {!item.visible && (
            <span className="text-[10px] text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded shrink-0">
              {t('row.hidden')}
            </span>
          )}
          {/* External link indicator */}
          {item.target === '_blank' && (
            <FiExternalLink size={11} className="text-gray-400 shrink-0" />
          )}
        </div>
        {/* Slug or external URL shown in monospace below the label */}
        <p className="text-xs text-gray-400 font-mono truncate mt-0.5">
          {item.linkType === 'page' ? pageSlug(item.pageId) : item.externalUrl}
        </p>
      </div>

      {/* Page / External badge */}
      <div className="shrink-0 hidden sm:block">
        {item.linkType === 'page' && item.pageId ? (
          <span className="text-[10px] bg-blue-50 text-blue-600 border border-blue-100 px-2 py-0.5 rounded-full font-medium">
            {pageName(item.pageId)}
          </span>
        ) : item.linkType === 'external' ? (
          <span className="text-[10px] bg-amber-50 text-amber-600 border border-amber-100 px-2 py-0.5 rounded-full font-medium">
            {t('row.external')}
          </span>
        ) : null}
      </div>

      {/* Action buttons */}
      <div className="shrink-0 flex items-center gap-1">
        {deletingId === item.id ? (
          /* Delete confirmation state — shows Confirm and Cancel buttons */
          <>
            <button
              onClick={() => onDelete(item.id)}
              className="flex items-center justify-center w-7 h-7 rounded bg-red-50 text-red-500 hover:bg-red-100 transition"
              title={t('row.actions.confirmDelete')}
            >
              <FiCheck size={13} />
            </button>
            <button
              onClick={() => setDeletingId(null)}
              className="flex items-center justify-center w-7 h-7 rounded bg-gray-100 text-gray-500 hover:bg-gray-200 transition"
              title={t('row.actions.cancelDelete')}
            >
              <FiX size={13} />
            </button>
          </>
        ) : (
          /* Normal state — action buttons hidden until row is hovered */
          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <button onClick={() => onMoveUp(item.id)}   className="flex items-center justify-center w-7 h-7 rounded bg-gray-100 text-gray-500 hover:bg-gray-200 transition" title={t('row.actions.moveUp')}>
              <FiChevronUp size={13} />
            </button>
            <button onClick={() => onMoveDown(item.id)} className="flex items-center justify-center w-7 h-7 rounded bg-gray-100 text-gray-500 hover:bg-gray-200 transition" title={t('row.actions.moveDown')}>
              <FiChevronDown size={13} />
            </button>
            <button onClick={() => onToggleVisible(item.id)} className="flex items-center justify-center w-7 h-7 rounded bg-gray-100 text-gray-500 hover:bg-gray-200 transition" title={t('row.actions.toggleVisibility')}>
              {item.visible ? <FiEye size={13} /> : <FiEyeOff size={13} />}
            </button>
            <button onClick={() => onEdit(item)} className="flex items-center justify-center w-7 h-7 rounded bg-gray-100 text-gray-500 hover:bg-gray-200 transition" title={t('row.actions.edit')}>
              <FiEdit2 size={13} />
            </button>
            <button onClick={() => setDeletingId(item.id)} className="flex items-center justify-center w-7 h-7 rounded bg-gray-100 text-gray-500 hover:bg-red-50 hover:text-red-500 transition" title={t('row.actions.delete')}>
              <FiTrash2 size={13} />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Main Page Component ──────────────────────────────────────────────────────

/**
 * @component MenuPage
 * @description
 * The root menu management page. Manages the full menu items state and
 * coordinates between the list view, nav preview, and the drawer.
 *
 * @returns {JSX.Element}
 */
export default function MenuPage() {
  /**
   * t() is the translation function from next-intl.
   * All keys for this page live under the "menuPage" namespace in en.json.
   */
  const t = useTranslations('menuPage');

  /** The full list of menu items (top-level and children). */
  const [items,      setItems]      = useState<MenuItem[]>(initialItems);

  /** Whether the add/edit drawer is currently open. */
  const [drawerOpen, setDrawerOpen] = useState(false);

  /** The item currently being edited, or null when adding a new item. */
  const [editItem,   setEditItem]   = useState<MenuItem | null>(null);

  /**
   * The id of the item currently pending deletion (first click of delete).
   * Shows Confirm/Cancel buttons on that row. Null when no item is pending.
   */
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // ─── Derived Data ───────────────────────────────────────────────────────────

  /** Top-level items (no parent), sorted by their order field. */
  const topLevel = items
    .filter((i) => !i.parentId)
    .sort((a, b) => a.order - b.order);

  /**
   * @function childrenOf
   * Returns the child items of a given parent, sorted by order.
   * @param {string} parentId - The id of the parent item.
   */
  const childrenOf = (parentId: string) =>
    items.filter((i) => i.parentId === parentId).sort((a, b) => a.order - b.order);

  // ─── Handlers ──────────────────────────────────────────────────────────────

  /**
   * @function handleSave
   * Called by the drawer when the user saves a new or edited item.
   * If the item already exists (by id), it is updated in place.
   * If it is new, it is appended to the list.
   */
  const handleSave = (item: MenuItem) => {
    setItems((prev) => {
      const exists = prev.find((i) => i.id === item.id);
      return exists
        ? prev.map((i) => (i.id === item.id ? item : i))
        : [...prev, item];
    });
    setEditItem(null);
  };

  /**
   * @function handleDelete
   * Removes a menu item and all of its children from the list.
   * Called after the user confirms deletion in the two-step confirm flow.
   */
  const handleDelete = (id: string) => {
    setItems((prev) => prev.filter((i) => i.id !== id && i.parentId !== id));
    setDeletingId(null);
  };

  /**
   * @function handleMoveUp
   * Swaps the order of an item with the item immediately above it in its level.
   * Does nothing if the item is already first in its level.
   */
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

  /**
   * @function handleMoveDown
   * Swaps the order of an item with the item immediately below it in its level.
   * Does nothing if the item is already last in its level.
   */
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

  /**
   * @function handleToggleVisible
   * Flips the `visible` flag on the item with the given id.
   */
  const handleToggleVisible = (id: string) => {
    setItems((prev) => prev.map((i) => (i.id === id ? { ...i, visible: !i.visible } : i)));
  };

  /** Opens the drawer in edit mode for the given item. */
  const openEdit = (item: MenuItem) => {
    setEditItem(item);
    setDrawerOpen(true);
  };

  /** Opens the drawer in create mode (no existing item). */
  const openCreate = () => {
    setEditItem(null);
    setDrawerOpen(true);
  };

  /**
   * Only top-level items can be parents.
   * Child items cannot themselves have children (one level of nesting only).
   */
  const parentOptions = items.filter((i) => !i.parentId);

  // ─── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col h-[calc(100vh-64px)] bg-gray-100 overflow-hidden">

      {/* ── Toolbar ── */}
      <div className="shrink-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
        <div>
          <h1 className="text-base font-bold text-gray-900">{t('toolbar.title')}</h1>
          <p className="text-xs text-gray-400 mt-0.5">
            {t('toolbar.subtitle', { count: items.length })}
          </p>
        </div>
        <button
          onClick={openCreate}
          className="flex items-center gap-1.5 px-4 py-2 bg-gray-900 text-white text-sm font-medium rounded-md hover:bg-gray-700 transition"
        >
          <FiPlus size={15} /> {t('toolbar.addItem')}
        </button>
      </div>

      {/* ── Main Content ── */}
      <div className="flex-1 overflow-y-auto p-6">
        <div className="max-w-3xl mx-auto flex flex-col gap-6">

          {/* ── Nav Preview Bar ── */}
          <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
            <div className="px-4 py-2.5 border-b border-gray-100 bg-gray-50 flex items-center justify-between">
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                {t('preview.title')}
              </p>
              <p className="text-[10px] text-gray-400">{t('preview.subtitle')}</p>
            </div>
            <div className="px-4 py-3 flex items-center gap-1 flex-wrap">
              {topLevel.filter((i) => i.visible).map((item) => {
                const children = childrenOf(item.id).filter((c) => c.visible);
                return (
                  <div key={item.id} className="relative group/nav">
                    {/* Top-level nav item */}
                    <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-md hover:bg-gray-100 cursor-pointer transition">
                      <span className="text-gray-500">{getIcon(item.icon, 13)}</span>
                      <span className="text-sm text-gray-700 font-medium">{item.label}</span>
                      {children.length > 0 && <FiChevronDown size={11} className="text-gray-400" />}
                      {item.target === '_blank' && <FiExternalLink size={10} className="text-gray-400" />}
                    </div>
                    {/* Dropdown for child items — shown on hover */}
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
              {/* Empty state for preview */}
              {topLevel.filter((i) => i.visible).length === 0 && (
                <p className="text-xs text-gray-400">{t('preview.empty')}</p>
              )}
            </div>
          </div>

          {/* ── All Items List ── */}
          <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
            <div className="px-4 py-2.5 border-b border-gray-100 bg-gray-50">
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                {t('list.title')}
              </p>
            </div>

            {items.length === 0 ? (
              /* Empty state */
              <div className="flex flex-col items-center justify-center py-16 gap-3 text-gray-400">
                <FiMenu size={32} className="text-gray-300" />
                <p className="text-sm">{t('list.empty')}</p>
                <button onClick={openCreate} className="text-xs text-blue-500 hover:underline">
                  {t('list.emptyAction')}
                </button>
              </div>
            ) : (
              /* Top-level items followed by their children */
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
                    t={t}
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
                      t={t}
                    />
                  ))}
                </div>
              ))
            )}
          </div>

        </div>
      </div>

      {/* Add / Edit Drawer */}
      <MenuItemDrawer
        open={drawerOpen}
        onClose={() => { setDrawerOpen(false); setEditItem(null); }}
        onSave={handleSave}
        existing={editItem}
        parentOptions={parentOptions}
        t={t}
      />
    </div>
  );
}