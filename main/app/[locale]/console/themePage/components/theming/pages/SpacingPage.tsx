'use client';

/**
 * SpacingPage Component
 *
 * This is the settings page that lets users customise the visual "feel" of
 * components in their generated apps — specifically:
 *   • Border Radius  – how rounded corners are (e.g. sharp, pill-shaped).
 *   • Spacing Density – how much padding sits inside components.
 *   • Elevation / Shadow – how much drop-shadow depth components have.
 *
 * It is a self-contained page component, meaning it owns its own state and
 * does not rely on a parent to pass data down to it.
 *
 * What this page does:
 * - Renders a live preview so the user can instantly see how their chosen
 *   radius, density, and shadow settings look on a real button, card, and
 *   input field.
 * - Lets the user pick one option from each category by clicking a tile.
 * - Provides a "Save Spacing" button that (currently) simulates a save with
 *   a short delay, then shows a "Saved" confirmation for 2.5 seconds.
 *
 * Component hierarchy (all contained in this single file):
 *   SpacingPage        ← this file (owns all state + layout)
 *   └── SectionCard    ← reusable card wrapper used for each settings section
 */

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { FiCheck } from 'react-icons/fi';

// ---------------------------------------------------------------------------
// Static option lists
// ---------------------------------------------------------------------------

/**
 * radiusOptions
 *
 * Defines every border-radius choice the user can pick from.
 * Each entry contains:
 *   - id      : unique string key used in state (e.g. 'md').
 *   - labelKey: translation key for the human-readable label.
 *   - preview : the raw CSS value shown beneath the label as a hint.
 *   - class   : the Tailwind utility class applied to the preview elements.
 */
const radiusOptions = [
  { id: 'none', labelKey: 'radius.none',   preview: '0px',    class: 'rounded-none' },
  { id: 'sm',   labelKey: 'radius.sm',     preview: '4px',    class: 'rounded'      },
  { id: 'md',   labelKey: 'radius.md',     preview: '8px',    class: 'rounded-md'   },
  { id: 'lg',   labelKey: 'radius.lg',     preview: '12px',   class: 'rounded-lg'   },
  { id: 'xl',   labelKey: 'radius.xl',     preview: '16px',   class: 'rounded-xl'   },
  { id: 'full', labelKey: 'radius.full',   preview: '9999px', class: 'rounded-full' },
];

/**
 * densityOptions
 *
 * Defines the three spacing-density modes a user can choose.
 * Each entry contains:
 *   - id         : unique string key used in state.
 *   - labelKey   : translation key for the option name.
 *   - descKey    : translation key for the short description shown on the tile.
 */
const densityOptions = [
  { id: 'compact',  labelKey: 'density.compact.label',  descKey: 'density.compact.desc'  },
  { id: 'default',  labelKey: 'density.default.label',  descKey: 'density.default.desc'  },
  { id: 'relaxed',  labelKey: 'density.relaxed.label',  descKey: 'density.relaxed.desc'  },
];

/**
 * shadowOptions
 *
 * Defines the four shadow-depth levels the user can apply.
 * Each entry contains:
 *   - id      : unique string key used in state.
 *   - labelKey: translation key for the human-readable label.
 */
const shadowOptions = [
  { id: 'none', labelKey: 'shadow.none'   },
  { id: 'sm',   labelKey: 'shadow.sm'     },
  { id: 'md',   labelKey: 'shadow.md'     },
  { id: 'lg',   labelKey: 'shadow.lg'     },
];

// ---------------------------------------------------------------------------
// SectionCard — reusable layout wrapper
// ---------------------------------------------------------------------------

/**
 * SectionCard
 *
 * A simple presentational wrapper component used to group related settings
 * inside a visually consistent card. It renders:
 *   - A light grey header bar containing the section title and optional
 *     description text.
 *   - A white body area where the children (option tiles, etc.) are placed.
 *
 * Props:
 *   - title       {string}           — Bold section title displayed in the header.
 *   - description {string?}          — Optional subtitle shown beneath the title.
 *   - children    {React.ReactNode}  — Any JSX content placed inside the card body.
 *
 * Example usage:
 *   <SectionCard title="Border Radius" description="Applied to buttons and cards">
 *     <p>Content goes here</p>
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
// SpacingPage — main page component
// ---------------------------------------------------------------------------

/**
 * SpacingPage
 *
 * The top-level page component for the Spacing & Radius settings screen.
 *
 * State managed here:
 *   - radius  : which border-radius option is currently selected (default 'md').
 *   - density : which spacing-density option is selected (default 'default').
 *   - shadow  : which shadow level is selected (default 'sm').
 *   - saving  : true while the simulated save request is in progress.
 *   - saved   : true for 2.5 seconds after a successful save, to show the
 *               green "Saved" confirmation message.
 */
export default function SpacingPage() {
  /**
   * t — Translation function scoped to the 'spacingPage' namespace.
   * Call t('some.key') to get the translated string for that key.
   */
  const t = useTranslations('spacingPage');

  // -------------------------------------------------------------------------
  // State
  // -------------------------------------------------------------------------

  /** Currently selected border-radius option id. */
  const [radius, setRadius] = useState('md');

  /** Currently selected spacing-density option id. */
  const [density, setDensity] = useState('default');

  /** Currently selected shadow-depth option id. */
  const [shadow, setShadow] = useState('sm');

  /**
   * True while the save animation/request is running.
   * Disables the Save button and shows a spinner inside it.
   */
  const [saving, setSaving] = useState(false);

  /**
   * True for a short window (2.5 s) after a successful save.
   * Causes the green "Saved ✓" message to appear next to the button.
   */
  const [saved, setSaved] = useState(false);

  // -------------------------------------------------------------------------
  // Derived values
  // -------------------------------------------------------------------------

  /**
   * selectedRadius
   *
   * The full option object for whichever radius id is currently active.
   * We use this to apply the correct Tailwind class to the live preview.
   * The non-null assertion (!) is safe because `radius` is always initialised
   * to a valid id from the radiusOptions array.
   */
  const selectedRadius = radiusOptions.find((r) => r.id === radius)!;

  // -------------------------------------------------------------------------
  // Handlers
  // -------------------------------------------------------------------------

  /**
   * handleSave
   *
   * Simulates saving the spacing settings to a server.
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
        * Shows a real button, card, and input field so the user can see
        * exactly how their chosen radius and shadow settings look.
        * ---------------------------------------------------------------- */}
      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
        {/* Preview header */}
        <div className="px-5 py-3.5 border-b border-gray-100 bg-gray-50">
          <p className="text-xs font-semibold text-gray-700">
            {t('preview.title')}
          </p>
        </div>

        {/* Preview elements — each uses the currently selected radius + shadow */}
        <div className="px-5 py-6 flex items-center gap-4 flex-wrap">

          {/* Example button */}
          <button
            className={`px-5 py-2.5 bg-gray-900 text-white text-sm font-medium transition-all ${selectedRadius.class} ${
              shadow === 'sm' ? 'shadow-sm'
              : shadow === 'md' ? 'shadow-md'
              : shadow === 'lg' ? 'shadow-lg'
              : ''
            }`}
          >
            {t('preview.button')}
          </button>

          {/* Example card */}
          <div
            className={`px-4 py-3 bg-white border border-gray-200 text-sm text-gray-700 w-40 transition-all ${selectedRadius.class} ${
              shadow === 'sm' ? 'shadow-sm'
              : shadow === 'md' ? 'shadow-md'
              : shadow === 'lg' ? 'shadow-lg'
              : ''
            }`}
          >
            {t('preview.card')}
          </div>

          {/* Example input field (read-only, for display purposes only) */}
          <input
            readOnly
            value={t('preview.input')}
            className={`px-3 py-2 border border-gray-200 text-sm text-gray-500 bg-gray-50 w-36 outline-none ${selectedRadius.class}`}
          />
        </div>
      </div>

      {/* ----------------------------------------------------------------
        * Border Radius Section
        * Renders a grid of tiles, one per radiusOption. Clicking a tile
        * updates the `radius` state and re-renders the live preview.
        * ---------------------------------------------------------------- */}
      <SectionCard
        title={t('sections.radius.title')}
        description={t('sections.radius.description')}
      >
        <div className="grid grid-cols-3 gap-3">
          {radiusOptions.map((r) => (
            <button
              key={r.id}
              onClick={() => setRadius(r.id)}
              className={`flex flex-col items-center gap-2 p-3 border rounded-lg transition ${
                radius === r.id
                  ? 'bg-gray-900 border-gray-900 text-white'
                  : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50'
              }`}
            >
              {/*
               * Visual shape preview — a small square whose corners reflect
               * the border-radius class for this option.
               */}
              <div
                className={`w-8 h-8 border-2 ${
                  radius === r.id ? 'border-white' : 'border-gray-300'
                } ${r.class}`}
              />
              <div>
                {/* Option label, e.g. "Medium" */}
                <p className="text-xs font-semibold">{t(r.labelKey)}</p>
                {/* CSS value hint, e.g. "8px" */}
                <p className={`text-[10px] ${radius === r.id ? 'text-gray-300' : 'text-gray-400'}`}>
                  {r.preview}
                </p>
              </div>
            </button>
          ))}
        </div>
      </SectionCard>

      {/* ----------------------------------------------------------------
        * Spacing Density Section
        * Three tiles (Compact / Default / Relaxed). Clicking one updates
        * the `density` state. The selection is currently stored in state
        * only — wire it to a save call in handleSave when ready.
        * ---------------------------------------------------------------- */}
      <SectionCard
        title={t('sections.density.title')}
        description={t('sections.density.description')}
      >
        <div className="grid grid-cols-3 gap-3">
          {densityOptions.map((d) => (
            <button
              key={d.id}
              onClick={() => setDensity(d.id)}
              className={`flex flex-col gap-1 p-3 rounded-lg border text-left transition ${
                density === d.id
                  ? 'bg-gray-900 text-white border-gray-900'
                  : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
              }`}
            >
              <p className="text-sm font-semibold">{t(d.labelKey)}</p>
              <p className={`text-[11px] ${density === d.id ? 'text-gray-300' : 'text-gray-400'}`}>
                {t(d.descKey)}
              </p>
            </button>
          ))}
        </div>
      </SectionCard>

      {/* ----------------------------------------------------------------
        * Elevation / Shadow Section
        * Four tiles representing shadow depth. Clicking one updates the
        * `shadow` state which is immediately reflected in the live preview.
        * ---------------------------------------------------------------- */}
      <SectionCard
        title={t('sections.shadow.title')}
        description={t('sections.shadow.description')}
      >
        <div className="grid grid-cols-4 gap-3">
          {shadowOptions.map((s) => (
            <button
              key={s.id}
              onClick={() => setShadow(s.id)}
              className={`flex flex-col items-center gap-2 p-3 border rounded-lg transition ${
                shadow === s.id
                  ? 'bg-gray-900 border-gray-900 text-white'
                  : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50'
              }`}
            >
              {/*
               * Shadow swatch — a small white square that demonstrates
               * the shadow depth for this option.
               */}
              <div
                className={`w-10 h-10 bg-white border border-gray-200 rounded-md ${
                  s.id === 'sm' ? 'shadow-sm'
                  : s.id === 'md' ? 'shadow-md'
                  : s.id === 'lg' ? 'shadow-lg'
                  : ''
                }`}
              />
              <p className="text-xs font-semibold">{t(s.labelKey)}</p>
            </button>
          ))}
        </div>
      </SectionCard>

      {/* ----------------------------------------------------------------
        * Save Row
        * Sits at the bottom, right-aligned. Shows a green "Saved ✓"
        * confirmation for 2.5 seconds after a successful save.
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