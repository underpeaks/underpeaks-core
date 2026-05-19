'use client';

/**
 * TypographyPage Component
 *
 * This is the settings page that lets users customise the typography (text
 * styling) of components in their generated apps. Specifically it controls:
 *   • Font Families  – which Google Font is used for headings, body text,
 *                      and monospace (code) text.
 *   • Font Weights   – how bold or light the heading and body text appears.
 *   • Font Size Scale – whether text is generally smaller (Compact),
 *                       balanced (Default), or larger (Relaxed) across the app.
 *
 * It is a self-contained page component, meaning it owns its own state and
 * does not rely on a parent to pass data down to it.
 *
 * What this page does:
 * - Renders a live preview so the user can instantly see how their chosen
 *   heading, body, and mono fonts look together.
 * - Lets the user pick a font family for each role via a grouped <select>.
 * - Lets the user pick a font weight for headings and body text via
 *   clickable weight tiles.
 * - Lets the user pick a size scale via three option tiles.
 * - Provides a "Save Typography" button that (currently) simulates a save
 *   with a short delay, then shows a "Saved" confirmation for 2.5 seconds.
 *
 * Component hierarchy (all contained in this single file):
 *   TypographyPage   ← this file (owns all state + layout)
 *   └── SectionCard  ← reusable card wrapper used for each settings section
 */

import { useState }          from 'react';
import { useTranslations }   from 'next-intl';
import { FiCheck }           from 'react-icons/fi';

// ---------------------------------------------------------------------------
// Static data
// ---------------------------------------------------------------------------

/**
 * googleFonts
 *
 * The full list of Google Fonts available in the font-family selects.
 * Each entry contains:
 *   - id       : unique string key used as the <option> value.
 *   - label    : human-readable font name shown in the dropdown and preview.
 *   - category : used to group fonts inside <optgroup> elements so the
 *                user can quickly find Sans-serif, Serif, or Monospace fonts.
 */
const googleFonts = [
  { id: 'inter',        label: 'Inter',              category: 'Sans-serif' },
  { id: 'roboto',       label: 'Roboto',             category: 'Sans-serif' },
  { id: 'poppins',      label: 'Poppins',            category: 'Sans-serif' },
  { id: 'nunito',       label: 'Nunito',             category: 'Sans-serif' },
  { id: 'lato',         label: 'Lato',               category: 'Sans-serif' },
  { id: 'open-sans',    label: 'Open Sans',          category: 'Sans-serif' },
  { id: 'montserrat',   label: 'Montserrat',         category: 'Sans-serif' },
  { id: 'raleway',      label: 'Raleway',            category: 'Sans-serif' },
  { id: 'playfair',     label: 'Playfair Display',   category: 'Serif'      },
  { id: 'merriweather', label: 'Merriweather',       category: 'Serif'      },
  { id: 'lora',         label: 'Lora',               category: 'Serif'      },
  { id: 'source-code',  label: 'Source Code Pro',    category: 'Monospace'  },
  { id: 'fira-code',    label: 'Fira Code',          category: 'Monospace'  },
];

/**
 * fontSizeScales
 *
 * The three size-scale options the user can choose from.
 * Each entry contains:
 *   - id      : unique string key used in state.
 *   - labelKey: translation key for the option name tile.
 *   - descKey : translation key for the short description shown on the tile.
 */
const fontSizeScales = [
  { id: 'compact', labelKey: 'scale.compact.label', descKey: 'scale.compact.desc' },
  { id: 'default', labelKey: 'scale.default.label', descKey: 'scale.default.desc' },
  { id: 'relaxed', labelKey: 'scale.relaxed.label', descKey: 'scale.relaxed.desc' },
];

/**
 * fontWeights
 *
 * The numeric font-weight values the user can assign to headings or body text.
 * Rendered as individual clickable buttons — the button's own font-weight is
 * set to the value it represents so the user can see the visual difference.
 */
const fontWeights = ['300', '400', '500', '600', '700', '800'];

// ---------------------------------------------------------------------------
// SectionCard — reusable layout wrapper
// ---------------------------------------------------------------------------

/**
 * SectionCard
 *
 * A simple presentational wrapper component used to group related settings
 * inside a visually consistent card. It renders:
 *   - A light grey header bar containing the section title and an optional
 *     description subtitle.
 *   - A white body area where the children (dropdowns, tiles, etc.) live.
 *
 * Props:
 *   - title       {string}           — Bold section title shown in the header.
 *   - description {string?}          — Optional subtitle beneath the title.
 *   - children    {React.ReactNode}  — Any JSX placed inside the card body.
 *
 * Example usage:
 *   <SectionCard title="Font Families" description="Loaded from Google Fonts">
 *     <select>...</select>
 *   </SectionCard>
 */
function SectionCard({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
      {/* Card header — grey strip with title and optional description */}
      <div className="px-5 py-3.5 border-b border-gray-100 bg-gray-50">
        <h3 className="text-sm font-semibold text-gray-800">{title}</h3>
        {description && (
          <p className="text-xs text-gray-400 mt-0.5">{description}</p>
        )}
      </div>
      {/* Card body — stacks children vertically with a gap between them */}
      <div className="px-5 py-4 flex flex-col gap-4">{children}</div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// TypographyPage — main page component
// ---------------------------------------------------------------------------

/**
 * TypographyPage
 *
 * The top-level page component for the Typography settings screen.
 *
 * State managed here:
 *   - headingFont   : id of the selected heading font (default 'poppins').
 *   - bodyFont      : id of the selected body font (default 'inter').
 *   - monoFont      : id of the selected monospace font (default 'fira-code').
 *   - scale         : id of the selected font size scale (default 'default').
 *   - headingWeight : numeric weight string for headings (default '700').
 *   - bodyWeight    : numeric weight string for body text (default '400').
 *   - saving        : true while the simulated save request is in progress.
 *   - saved         : true for 2.5 seconds after a successful save, to show
 *                     the green "Saved" confirmation message.
 */
export default function TypographyPage() {
  /**
   * t — Translation function scoped to the 'typographyPage' namespace.
   * Call t('some.key') to get the translated string for that key.
   */
  const t = useTranslations('typographyPage');

  // -------------------------------------------------------------------------
  // State
  // -------------------------------------------------------------------------

  /** Currently selected heading font id. */
  const [headingFont,   setHeadingFont]   = useState('poppins');

  /** Currently selected body font id. */
  const [bodyFont,      setBodyFont]      = useState('inter');

  /** Currently selected monospace font id. */
  const [monoFont,      setMonoFont]      = useState('fira-code');

  /** Currently selected font size scale id. */
  const [scale,         setScale]         = useState('default');

  /** Currently selected font weight for headings (as a numeric string). */
  const [headingWeight, setHeadingWeight] = useState('700');

  /** Currently selected font weight for body text (as a numeric string). */
  const [bodyWeight,    setBodyWeight]    = useState('400');

  /**
   * True while the save animation/request is running.
   * Disables the Save button and shows a spinner inside it.
   */
  const [saving, setSaving] = useState(false);

  /**
   * True for a short window (2.5 s) after a successful save.
   * Causes the green "Saved ✓" message to appear next to the button.
   */
  const [saved,  setSaved]  = useState(false);

  // -------------------------------------------------------------------------
  // Helpers
  // -------------------------------------------------------------------------

  /**
   * getFontLabel
   *
   * Looks up the human-readable font name for a given font id.
   * Used in the live preview to display the font name as sample text.
   *
   * @param id — The font id string (e.g. 'poppins').
   * @returns   The matching label (e.g. 'Poppins'), or the raw id if not found.
   *
   * Example:
   *   getFontLabel('fira-code') // → 'Fira Code'
   */
  const getFontLabel = (id: string) =>
    googleFonts.find((f) => f.id === id)?.label ?? id;

  // -------------------------------------------------------------------------
  // Handlers
  // -------------------------------------------------------------------------

  /**
   * handleSave
   *
   * Simulates saving the typography settings to a server.
   *
   * Current behaviour (mock):
   * 1. Sets `saving` to true — the button enters its loading state.
   * 2. After 800 ms, sets `saving` false and `saved` true — the button
   *    returns to normal and the green "Saved" label appears.
   * 3. After a further 2 500 ms, sets `saved` false — the confirmation
   *    label disappears.
   *
   * When wiring this up to a real API, replace the inner setTimeout body
   * with an actual fetch/POST call and handle errors appropriately.
   */
  const handleSave = () => {
    setSaving(true);
    setTimeout(() => {
      setSaving(false);
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    }, 800);
  };

  // -------------------------------------------------------------------------
  // Font-row configuration
  // -------------------------------------------------------------------------

  /**
   * fontRows
   *
   * Defines the three font-family selector rows rendered inside the
   * "Font Families" section card. Each row contains:
   *   - labelKey  : translation key for the row label (e.g. "Heading Font").
   *   - value     : the currently selected font id for this role.
   *   - set       : the state setter to call when the user picks a new font.
   *   - categories: which font categories to include in the grouped <select>.
   *
   * Keeping this as data (rather than copy-pasted JSX three times) makes it
   * easy to add or remove font roles in the future.
   */
  const fontRows = [
    {
      labelKey:   'fonts.headingFont',
      value:      headingFont,
      set:        setHeadingFont,
      categories: ['Sans-serif', 'Serif'],
    },
    {
      labelKey:   'fonts.bodyFont',
      value:      bodyFont,
      set:        setBodyFont,
      categories: ['Sans-serif', 'Serif'],
    },
    {
      labelKey:   'fonts.monoFont',
      value:      monoFont,
      set:        setMonoFont,
      categories: ['Monospace'],
    },
  ];

  /**
   * weightRows
   *
   * Defines the two font-weight selector rows rendered inside the
   * "Font Weights" section card. Each row contains:
   *   - labelKey : translation key for the row label.
   *   - value    : currently selected weight string.
   *   - set      : the state setter to call when the user picks a weight.
   */
  const weightRows = [
    { labelKey: 'weights.headingWeight', value: headingWeight, set: setHeadingWeight },
    { labelKey: 'weights.bodyWeight',    value: bodyWeight,    set: setBodyWeight    },
  ];

  // -------------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------------

  return (
    <div className="flex flex-col gap-5">

      {/* ----------------------------------------------------------------
        * Page heading and description
        * ---------------------------------------------------------------- */}
      <div>
        <h2 className="text-lg font-bold text-gray-900">
          {t('heading')}
        </h2>
        <p className="text-sm text-gray-500 mt-0.5">
          {t('subheading')}
        </p>
      </div>

      {/* ----------------------------------------------------------------
        * Live Preview Card
        * Shows sample heading text, body text, and a monospace code snippet
        * so the user can immediately see how their chosen fonts look together.
        * ---------------------------------------------------------------- */}
      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
        {/* Preview header */}
        <div className="px-5 py-3.5 border-b border-gray-100 bg-gray-50">
          <p className="text-xs font-semibold text-gray-700">
            {t('preview.title')}
          </p>
        </div>

        {/* Preview samples */}
        <div className="px-5 py-4 flex flex-col gap-2">

          {/* Heading preview — shows the selected heading font name */}
          <p className="text-2xl font-bold text-gray-900">
            {getFontLabel(headingFont)} {t('preview.headingSuffix')}
          </p>

          {/* Body text preview — shows the selected body font name + sample sentence */}
          <p className="text-base text-gray-600">
            {getFontLabel(bodyFont)} — {t('preview.bodySample')}
          </p>

          {/* Monospace preview — shows the selected mono font name + sample code */}
          <p className="text-xs font-mono text-gray-500 bg-gray-50 px-2 py-1 rounded w-fit">
            {getFontLabel(monoFont)} — {t('preview.monoSample')}
          </p>

        </div>
      </div>

      {/* ----------------------------------------------------------------
        * Font Families Section
        * Renders one labelled <select> per font role (heading, body, mono).
        * Fonts are grouped by category using <optgroup> so the user can
        * quickly navigate to the style they want.
        * ---------------------------------------------------------------- */}
      <SectionCard
        title={t('sections.fonts.title')}
        description={t('sections.fonts.description')}
      >
        {fontRows.map((row) => (
          <div key={row.labelKey} className="flex flex-col gap-1">
            {/* Row label, e.g. "Heading Font" */}
            <label className="text-xs font-semibold text-gray-700">
              {t(row.labelKey)}
            </label>

            {/* Grouped font select — each category becomes an <optgroup> */}
            <select
              value={row.value}
              onChange={(e) => row.set(e.target.value)}
              className="px-3 py-2 text-sm border border-gray-200 rounded-md bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-300 transition"
            >
              {row.categories.map((cat) => (
                <optgroup key={cat} label={cat}>
                  {googleFonts
                    .filter((f) => f.category === cat)
                    .map((f) => (
                      <option key={f.id} value={f.id}>
                        {f.label}
                      </option>
                    ))}
                </optgroup>
              ))}
            </select>
          </div>
        ))}
      </SectionCard>

      {/* ----------------------------------------------------------------
        * Font Weights Section
        * Renders a row of clickable weight buttons for headings and body text.
        * Each button renders itself in its own font-weight so the user can
        * see at a glance how bold or light each option is.
        * ---------------------------------------------------------------- */}
      <SectionCard title={t('sections.weights.title')}>
        {weightRows.map((row) => (
          <div key={row.labelKey} className="flex flex-col gap-1">
            {/* Row label, e.g. "Heading Weight" */}
            <label className="text-xs font-semibold text-gray-700">
              {t(row.labelKey)}
            </label>

            {/* Weight tiles — one button per numeric weight value */}
            <div className="flex gap-2 flex-wrap">
              {fontWeights.map((w) => (
                <button
                  key={w}
                  onClick={() => row.set(w)}
                  style={{ fontWeight: parseInt(w) }}
                  className={`px-3 py-1.5 text-sm rounded-md border transition ${
                    row.value === w
                      ? 'bg-gray-900 text-white border-gray-900'
                      : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
                  }`}
                >
                  {w}
                </button>
              ))}
            </div>
          </div>
        ))}
      </SectionCard>

      {/* ----------------------------------------------------------------
        * Font Size Scale Section
        * Three tiles: Compact, Default, Relaxed. Clicking a tile updates
        * the `scale` state. The selected scale is saved alongside the fonts
        * when the user clicks "Save Typography".
        * ---------------------------------------------------------------- */}
      <SectionCard
        title={t('sections.scale.title')}
        description={t('sections.scale.description')}
      >
        <div className="grid grid-cols-3 gap-3">
          {fontSizeScales.map((s) => (
            <button
              key={s.id}
              onClick={() => setScale(s.id)}
              className={`flex flex-col gap-1 p-3 rounded-lg border text-left transition ${
                scale === s.id
                  ? 'bg-gray-900 text-white border-gray-900'
                  : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
              }`}
            >
              {/* Scale name, e.g. "Compact" */}
              <p className="text-sm font-semibold">{t(s.labelKey)}</p>
              {/* Short description beneath the name */}
              <p className={`text-[11px] ${scale === s.id ? 'text-gray-300' : 'text-gray-400'}`}>
                {t(s.descKey)}
              </p>
            </button>
          ))}
        </div>
      </SectionCard>

      {/* ----------------------------------------------------------------
        * Save Row
        * Right-aligned. Shows a green "Saved ✓" confirmation for 2.5 s
        * after a successful save, then hides it automatically.
        * ---------------------------------------------------------------- */}
      <div className="flex items-center justify-end gap-3 pt-1">

        {/* Temporary "Saved" confirmation — only visible after a save */}
        {saved && (
          <p className="text-xs text-green-600 flex items-center gap-1">
            <FiCheck size={13} />
            {t('save.savedConfirmation')}
          </p>
        )}

        {/* Save button — disabled and shows a spinner while saving */}
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 px-5 py-2 bg-gray-900 text-white text-sm font-medium rounded-md hover:bg-gray-700 disabled:opacity-50 transition"
        >
          {/* Spinner — only visible while saving is true */}
          {saving && (
            <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          )}
          {saving ? t('save.saving') : t('save.button')}
        </button>

      </div>
    </div>
  );
}