/**
 * ModelsSelectionPage Component
 *
 * This is a step in the multi-step installer wizard where the user selects
 * which default data models to include in their generated project.
 *
 * What this page does:
 * - Displays a list of available data models (e.g. Users, Products, Orders).
 * - Required models (e.g. Users) are always selected and cannot be unchecked.
 * - Optional models can be toggled individually, or all at once with a
 *   "Select All" / "Deselect All" toggle button.
 * - Saves the final list of selected model keys to the global Zustand installer
 *   store, then navigates to the next wizard step (/installer/ecommerce).
 *
 * Component hierarchy:
 *   ModelsSelectionPage   ← this file (owns selection state + navigation)
 *   ├── LocaleSwitcher    ← floating language switcher (top-right corner)
 *   ├── header            ← logo + tagline
 *   └── selection card
 *       ├── Checkbox list ← one row per model in DEFAULT_MODELS
 *       └── Button        ← "Continue" / "Continuing..." with spinner
 */

'use client'

import { useState }           from 'react'
import { useRouter }          from 'next/navigation'
import { useTranslations }    from 'next-intl'
import { Button }             from '@/components/ui/button'
import { Checkbox }           from '@/components/ui/checkbox'
import { Loader2 }            from 'lucide-react'
import { useInstallerStore }  from '../../../store/useInstallerStore'
import LocaleSwitcher         from '@/core/LocaleSwitcher'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/**
 * Model
 *
 * Describes a single selectable data model in the list.
 *
 * Fields:
 * - key         — Unique identifier stored in the installer state (e.g. 'users').
 * - label       — Human-readable display name shown in the UI (e.g. 'Users').
 * - description — Short explanation of what the model does.
 * - required    — If true, the model is always selected and cannot be unchecked.
 */
type Model = {
  key:          string
  label:        string
  description:  string
  required?:    boolean
}

// ---------------------------------------------------------------------------
// Static data
// ---------------------------------------------------------------------------

/**
 * DEFAULT_MODELS
 *
 * The full list of data models offered to the user.
 *
 * This array is defined outside the component so it is created once at module
 * load time, not re-created on every render. Each object follows the Model type.
 *
 * Note: 'users' is marked `required: true` because authentication depends on it.
 * All other models are optional — the user can enable or disable them freely.
 *
 * Important for translators: the `label` and `description` fields below are
 * used as translation key suffixes. Each model maps to:
 *   t('models.<key>.label')
 *   t('models.<key>.description')
 * so all model text is fully translatable without changing this array.
 */
const DEFAULT_MODELS: Model[] = [
  { key: 'users',      label: 'Users',      description: 'Manage application users and authentication', required: true },
  { key: 'products',   label: 'Products',   description: 'Catalog of products or services' },
  { key: 'orders',     label: 'Orders',     description: 'Track customer orders and purchases' },
  { key: 'coupons',    label: 'Coupons',    description: 'Discount coupons and promotions' },
  { key: 'categories', label: 'Categories', description: 'Organize products or content' },
  { key: 'reviews',    label: 'Reviews',    description: 'User feedback and ratings' },
]

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

/**
 * ModelsSelectionPage
 *
 * Wizard step that lets the user choose which data models to scaffold.
 * Required models are pre-selected and locked; optional models can be toggled.
 */
export default function ModelsSelectionPage() {
  /**
   * router — Next.js router used to navigate to the next wizard step.
   */
  const router = useRouter()

  /**
   * t — Translation function scoped to the 'modelsSelectionPage' namespace.
   * Use t('someKey') to retrieve the translated string for that key.
   */
  const t = useTranslations('modelsSelectionPage')

  /**
   * setInstallerValue — Action from the global Zustand installer store.
   * Calling setInstallerValue('models', [...]) persists the selection so
   * later wizard steps (and the final save-config call) can read it.
   */
  const setInstallerValue = useInstallerStore((state) => state.setInstallerValue)

  // -------------------------------------------------------------------------
  // Derived lists (computed once, not state)
  // -------------------------------------------------------------------------

  /**
   * requiredKeys — Keys of models that must always be selected.
   * Computed once from DEFAULT_MODELS. Used to guard the toggle logic.
   */
  const requiredKeys = DEFAULT_MODELS.filter((m) => m.required).map((m) => m.key)

  /**
   * optionalKeys — Keys of models the user can freely toggle on or off.
   * Used by toggleAll() to determine whether to select or deselect everything.
   */
  const optionalKeys = DEFAULT_MODELS.filter((m) => !m.required).map((m) => m.key)

  // -------------------------------------------------------------------------
  // State
  // -------------------------------------------------------------------------

  /**
   * selectedModels — Array of model keys the user has currently selected.
   * Initialised with ALL models selected (required + optional) so the user
   * starts with everything on and can deselect what they don't need.
   */
  const [selectedModels, setSelectedModels] = useState<string[]>([
    ...requiredKeys,
    ...optionalKeys,
  ])

  /**
   * loading — True while the navigation delay after "Continue" is running.
   * Prevents double-clicks and shows a spinner on the button.
   */
  const [loading, setLoading] = useState(false)

  // -------------------------------------------------------------------------
  // Handlers
  // -------------------------------------------------------------------------

  /**
   * toggleModel
   *
   * Toggles a single optional model in or out of the selectedModels list.
   * Required models are silently ignored — they can never be deselected.
   *
   * @param key - The model key to toggle (e.g. 'products').
   */
  function toggleModel(key: string) {
    // Guard: do nothing if this model is required
    if (requiredKeys.includes(key)) return

    setSelectedModels((prev) =>
      prev.includes(key)
        ? prev.filter((k) => k !== key)   // Already selected → remove it
        : [...prev, key]                   // Not selected → add it
    )
  }

  /**
   * toggleAll
   *
   * Selects or deselects all optional models at once.
   *
   * - If every optional model is currently selected → deselect all optionals
   *   (keeps required models selected since they can never be removed).
   * - Otherwise → select all optional models.
   */
  function toggleAll() {
    const allOptionalSelected = optionalKeys.every((k) => selectedModels.includes(k))
    setSelectedModels(
      allOptionalSelected
        ? [...requiredKeys]                    // Keep only required models
        : [...requiredKeys, ...optionalKeys]   // Select everything
    )
  }

  /**
   * handleContinue
   *
   * Called when the user clicks "Continue".
   *
   * Steps:
   * 1. Sets `loading` to true so the spinner appears and the button is disabled.
   * 2. Saves the selected model keys to the global installer store.
   * 3. After a short simulated delay (1 second), navigates to /installer/ecommerce.
   *
   * Note: The setTimeout mimics an async operation. Replace with a real
   * async/await call if validation or an API request is needed here.
   */
  function handleContinue() {
    setLoading(true)
    setInstallerValue('models', selectedModels)

    setTimeout(() => {
      router.push('/installer/ecommerce')
    }, 1000)
  }

  // -------------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------------

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-white px-6 py-12">

      {/* ----------------------------------------------------------------
        * Locale Switcher
        * Fixed to the top-right corner so the user can switch language
        * at any point during the installer wizard.
        * ---------------------------------------------------------------- */}
      <div className="fixed top-4 right-4 z-50">
        <LocaleSwitcher />
      </div>

      {/* ----------------------------------------------------------------
        * Page Header
        * Logo and tagline consistent with all other installer wizard steps.
        * ---------------------------------------------------------------- */}
      <header className="mb-8 text-center flex flex-col items-center">
        <img
          src="/images/logo/NXT_Flutter_logo.png"
          alt={t('logoAlt')}
          className="h-16 w-auto mb-4"
        />
        <p className="text-xl text-gray-700">{t('tagline')}</p>
      </header>

      {/* ----------------------------------------------------------------
        * Selection Card
        * Contains the heading, description, checkbox list, and action button.
        * ---------------------------------------------------------------- */}
      <div className="w-full max-w-md p-8 bg-gray-50 rounded-2xl shadow-xl border space-y-6">

        {/* Header row: title + Select All / Deselect All toggle */}
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold text-gray-900">
            {t('heading')}
          </h2>
          <button
            type="button"
            className="text-sm font-medium text-blue-600 hover:underline"
            onClick={toggleAll}
          >
            {/* Label flips between "Deselect All" and "Select All" based on state */}
            {optionalKeys.every((k) => selectedModels.includes(k))
              ? t('toggleAll.deselect')
              : t('toggleAll.select')}
          </button>
        </div>

        {/* Subheading description */}
        <p className="text-sm text-gray-600 mb-4">
          {t('subheading')}
        </p>

        {/* --------------------------------------------------------------
          * Model Checkboxes
          * One row per entry in DEFAULT_MODELS.
          * Required models are visually dimmed and their checkbox disabled.
          * -------------------------------------------------------------- */}
        <div className="space-y-4">
          {DEFAULT_MODELS.map(({ key, required }) => (
            <div key={key} className="flex items-start space-x-3">
              <Checkbox
                id={key}
                checked={selectedModels.includes(key)}
                onCheckedChange={() => toggleModel(key)}
                disabled={!!required}
                className={required ? 'cursor-not-allowed opacity-50' : ''}
              />
              <div>
                <label
                  htmlFor={key}
                  className={`font-semibold text-gray-900 cursor-pointer ${
                    required ? 'cursor-not-allowed' : ''
                  }`}
                >
                  {/* Model label pulled from translations via its key */}
                  {t(`models.${key}.label`)}
                  {/* "(required)" badge shown next to locked models */}
                  {required && (
                    <span className="text-xs text-gray-500 ml-1">
                      {t('required')}
                    </span>
                  )}
                </label>
                {/* Model description pulled from translations via its key */}
                <p className="text-sm text-gray-600 max-w-md">
                  {t(`models.${key}.description`)}
                </p>
              </div>
            </div>
          ))}
        </div>

        {/* --------------------------------------------------------------
          * Continue Button
          * Disabled and shows a spinner while the navigation delay runs.
          * -------------------------------------------------------------- */}
        <div className="pt-6">
          <Button className="w-full" onClick={handleContinue} disabled={loading}>
            {loading && <Loader2 className="animate-spin mr-2 h-4 w-4" />}
            {loading ? t('button.continuing') : t('button.continue')}
          </Button>
        </div>

      </div>
    </div>
  )
}