/**
 * uitypes.ts
 *
 * Defines:
 *   FIELD_TYPES              — all valid DB column types
 *   UI_TYPE_OPTIONS          — which ui_types are valid for each field type (ADMIN / editable side)
 *   DISPLAY_UI_TYPE_OPTIONS  — which display variants are valid for each ui_type (PUBLIC / read-only side)
 *   getDefaultUiType         — returns the sensible default ui_type for a given field type
 *   getDefaultDisplayUiType  — returns the sensible default display variant for a given ui_type
 *   ON_DELETE_OPTIONS        — FK on-delete behaviours
 *
 * Rules:
 * - Every field type must have at least one ui_type option
 * - select and multi-select only appear on string and array types
 *   because those are the only types that make sense for option lists
 * - hidden is available on uuid and any system field type
 * - Admin pages (visibility: 'admin') always render every field using its
 *   ui_type as an editable widget — DISPLAY_UI_TYPE_OPTIONS is never consulted there.
 * - Public pages (visibility: 'public') always render every field read-only,
 *   using the field's chosen display_ui_type variant (per ui_type, from the map below).
 */

export const FIELD_TYPES: string[] = [
  'string',
  'text',
  'integer',
  'float',
  'double',
  'boolean',
  'datetime',
  'timestamp',
  'uuid',
  'jsonb',
  'array',
  'image',
]

export const ON_DELETE_OPTIONS: string[] = [
  'CASCADE',
  'SET NULL',
  'RESTRICT',
  'NO ACTION',
]

export const UI_TYPE_OPTIONS: Record<string, string[]> = {
  string: [
    'textfield',
    'textarea',
    'rich-text',
    'select',
    'multi-select',
    'radio',
    'autocomplete',
    'color-picker',
    'url-input',
    'email-input',
    'phone-input',
    'password-input',
    'slug-input',
  ],
  text: [
    'textarea',
    'rich-text',
    'markdown-editor',
    'code-editor',
  ],
  integer: [
    'number-input',
    'slider',
    'rating',
    'stepper',
  ],
  float: [
    'number-input',
    'slider',
    'currency-input',
  ],
  double: [
    'number-input',
    'slider',
    'currency-input',
  ],
  boolean: [
    'toggle',
    'checkbox',
    'radio-yes-no',
  ],
  datetime: [
    'datetime-picker',
    'date-picker',
    'time-picker',
  ],
  timestamp: [
    'datetime-picker',
    'date-picker',
  ],
  uuid: [
    'textfield',
    'hidden',
  ],
  jsonb: [
    'code-editor',
    'key-value-editor',
    'json-viewer',
  ],
  array: [
    'tags-input',
    'multi-select',
    'checklist',
    'list',
  ],
  image: [
    'image-upload',
    'image-gallery-upload',
    'image-url',
    'media-picker',
  ],
}

/**
 * getDefaultUiType
 *
 * Returns the first (most sensible default) ui_type for a given field type.
 * Called whenever a field's type changes so the ui_type resets to a valid value.
 */
export function getDefaultUiType(fieldType: string): string {
  const options = UI_TYPE_OPTIONS[fieldType]
  return options?.[0] ?? 'textfield'
}

/**
 * DISPLAY_UI_TYPE_OPTIONS
 *
 * For public (read-only) pages, each ui_type maps to a set of valid
 * display-only render variants. Keyed by ui_type (not field type), since
 * the edit-side widget is what determines what makes sense to show.
 *
 * Falls back to 'label' for any ui_type not explicitly listed here.
 */
export const DISPLAY_UI_TYPE_OPTIONS: Record<string, string[]> = {
  // Text-ish
  textfield:        ['label', 'heading', 'badge'],
  textarea:         ['paragraph', 'label', 'truncated-text'],
  'rich-text':       ['rendered-html', 'paragraph'],
  'markdown-editor': ['rendered-markdown', 'paragraph'],
  'code-editor':     ['code-block', 'label'],
  'url-input':       ['link', 'label'],
  'email-input':     ['mailto-link', 'label'],
  'phone-input':     ['tel-link', 'label'],
  'password-input':  ['masked-label'],
  'slug-input':      ['label'],
  'color-picker':    ['color-swatch', 'label'],

  // Select-ish
  select:        ['chip', 'dropdown-display', 'radio-display', 'text-button', 'label'],
  'multi-select': ['chip-list', 'checklist-display', 'label'],
  radio:         ['chip', 'radio-display', 'text-button', 'label'],
  autocomplete:  ['chip', 'label'],

  // Numeric
  'number-input':   ['label', 'badge'],
  slider:           ['label', 'progress-bar'],
  rating:           ['star-display', 'label'],
  stepper:          ['label', 'badge'],
  'currency-input': ['formatted-currency', 'label'],

  // Boolean
  toggle:         ['badge', 'icon-check', 'label'],
  checkbox:       ['badge', 'icon-check', 'label'],
  'radio-yes-no':  ['badge', 'icon-check', 'label'],

  // Date/time
  'datetime-picker': ['formatted-datetime', 'relative-time', 'label'],
  'date-picker':     ['formatted-date', 'relative-time', 'label'],
  'time-picker':     ['formatted-time', 'label'],

  // JSON/array
  'key-value-editor': ['key-value-display', 'label'],
  'json-viewer':      ['json-viewer', 'label'],
  'tags-input':       ['chip-list', 'label'],
  checklist:          ['checklist-display', 'label'],
  list:               ['list-display', 'label'],

  // Images — carousel default even for a single image, per product decision
  'image-upload':         ['image-carousel', 'single-image', 'image-grid', 'thumbnail'],
  'image-gallery-upload': ['image-carousel', 'image-grid', 'thumbnail'],
  'image-url':            ['image-carousel', 'single-image', 'thumbnail'],
  'media-picker':         ['image-carousel', 'single-image', 'image-grid', 'thumbnail'],

  // Misc
  hidden: ['label'],
}

/**
 * getDefaultDisplayUiType
 *
 * Returns the first (most sensible default) display variant for a given
 * ui_type, used when a field is switched to a public page context and
 * doesn't yet have a display_ui_type set.
 */
export function getDefaultDisplayUiType(uiType: string): string {
  const options = DISPLAY_UI_TYPE_OPTIONS[uiType]
  return options?.[0] ?? 'label'
}