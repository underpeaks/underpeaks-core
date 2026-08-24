/**
 * uitypes.ts
 *
 * Defines:
 *   FIELD_TYPES              — all valid DB column types
 *   UI_TYPE_OPTIONS          — flat list of valid ui_types per field type (used for
 *                              validation/defaults — NOT for rendering the dropdown)
 *   UI_TYPE_GROUPS           — the same ui_types grouped under category labels, used
 *                              to render the "UI Type" dropdown as <optgroup> sections
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
 *
 * 'file' — generic binary/media (video, audio, documents, signatures). Stored
 * as a URL/path string in the DB, same storage shape as 'image', but kept as
 * its own field type so it doesn't get mixed into image-specific UI, filters,
 * or generator logic downstream.
 *
 * 'geo' — a location value ({ lat, lng, address }). Stored as JSONB.
 *
 * NOTE: the Postgres/MySQL/Supabase adapters' createTable() type-switch needs
 * cases added for 'image', 'file', and 'geo' before fields of these types can
 * actually be saved on those DBs — tracked separately, not fixed in this file.
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
  'file',
  'geo',
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
    'markdown-editor',
    'select',
    'multi-select',
    'radio',
    'checkbox-group',
    'autocomplete',
    'color-picker',
    'url-input',
    'email-input',
    'phone-input',
    'password-input',
    'slug-input',
    'search-input',
    'otp-input',
    'masked-input',
    'barcode-input',
    'qr-code-input',
  ],
  text: [
    'textarea',
    'rich-text',
    'markdown-editor',
    'code-editor',
    'html-editor',
  ],
  integer: [
    'number-input',
    'slider',
    'range-slider',
    'rating',
    'stepper',
    'counter',
    'percentage-input',
    'currency-input',
  ],
  float: [
    'number-input',
    'slider',
    'range-slider',
    'currency-input',
    'percentage-input',
    'weight-input',
    'distance-input',
  ],
  double: [
    'number-input',
    'slider',
    'range-slider',
    'currency-input',
    'percentage-input',
    'weight-input',
    'distance-input',
  ],
  boolean: [
    'toggle',
    'checkbox',
    'radio-yes-no',
    'switch',
  ],
  datetime: [
    'datetime-picker',
    'date-picker',
    'time-picker',
    'date-range-picker',
    'calendar-picker',
    'week-picker',
    'month-picker',
    'relative-date-input',
  ],
  timestamp: [
    'datetime-picker',
    'date-picker',
    'time-picker',
    'relative-date-input',
  ],
  uuid: [
    'textfield',
    'hidden',
    'qr-code-display',
    'barcode-display',
  ],
  jsonb: [
    'code-editor',
    'key-value-editor',
    'json-viewer',
    'schema-editor',
    'form-builder',
  ],
  array: [
    'tags-input',
    'multi-select',
    'checklist',
    'list',
    'repeater',
    'chip-list-input',
    'file-list-upload',
    'ordered-list-input',
  ],
  image: [
    'image-upload',
    'image-gallery-upload',
    'image-url',
    'media-picker',
    'avatar-upload',
    'cover-image-upload',
    'icon-picker',
  ],
  file: [
    'file-upload',
    'document-upload',
    'video-upload',
    'audio-upload',
    'signature-pad',
  ],
  geo: [
    'location-input',
  ],
}

/**
 * UI_TYPE_GROUPS
 *
 * The same ui_types from UI_TYPE_OPTIONS, grouped under category labels for
 * rendering the "UI Type" dropdown as <optgroup> sections — the flat list per
 * field type got too long (string alone has 20 options) to scan without groups.
 *
 * Every ui_type listed here for a given field type MUST also appear in
 * UI_TYPE_OPTIONS[fieldType], and vice versa — keep both in sync.
 */
export const UI_TYPE_GROUPS: Record<string, { label: string; options: string[] }[]> = {
  string: [
    { label: 'Text',       options: ['textfield', 'textarea', 'rich-text', 'markdown-editor'] },
    { label: 'Choice',     options: ['select', 'multi-select', 'radio', 'checkbox-group', 'autocomplete'] },
    { label: 'Formatted',  options: ['color-picker', 'url-input', 'email-input', 'phone-input', 'password-input', 'slug-input', 'search-input', 'otp-input', 'masked-input'] },
    { label: 'Codes',      options: ['barcode-input', 'qr-code-input'] },
  ],
  text: [
    { label: 'Long Text', options: ['textarea', 'rich-text', 'markdown-editor', 'code-editor', 'html-editor'] },
  ],
  integer: [
    { label: 'Number',    options: ['number-input', 'slider', 'range-slider', 'stepper', 'counter'] },
    { label: 'Rating',    options: ['rating'] },
    { label: 'Formatted', options: ['percentage-input', 'currency-input'] },
  ],
  float: [
    { label: 'Number',    options: ['number-input', 'slider', 'range-slider'] },
    { label: 'Formatted', options: ['currency-input', 'percentage-input', 'weight-input', 'distance-input'] },
  ],
  double: [
    { label: 'Number',    options: ['number-input', 'slider', 'range-slider'] },
    { label: 'Formatted', options: ['currency-input', 'percentage-input', 'weight-input', 'distance-input'] },
  ],
  boolean: [
    { label: 'Boolean', options: ['toggle', 'checkbox', 'radio-yes-no', 'switch'] },
  ],
  datetime: [
    { label: 'Date & Time', options: ['datetime-picker', 'date-picker', 'time-picker', 'date-range-picker', 'calendar-picker', 'week-picker', 'month-picker', 'relative-date-input'] },
  ],
  timestamp: [
    { label: 'Date & Time', options: ['datetime-picker', 'date-picker', 'time-picker', 'relative-date-input'] },
  ],
  uuid: [
    { label: 'Identifier', options: ['textfield', 'hidden'] },
    { label: 'Codes',      options: ['qr-code-display', 'barcode-display'] },
  ],
  jsonb: [
    { label: 'Structured Data', options: ['code-editor', 'key-value-editor', 'json-viewer', 'schema-editor', 'form-builder'] },
  ],
  array: [
    { label: 'Lists', options: ['tags-input', 'multi-select', 'checklist', 'list', 'repeater', 'chip-list-input', 'ordered-list-input'] },
    { label: 'Files', options: ['file-list-upload'] },
  ],
  image: [
    { label: 'Upload',    options: ['image-upload', 'image-gallery-upload', 'avatar-upload', 'cover-image-upload'] },
    { label: 'Reference', options: ['image-url', 'media-picker', 'icon-picker'] },
  ],
  file: [
    { label: 'Documents', options: ['file-upload', 'document-upload'] },
    { label: 'Media',     options: ['video-upload', 'audio-upload'] },
    { label: 'Other',     options: ['signature-pad'] },
  ],
  geo: [
    { label: 'Location', options: ['location-input'] },
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
  textfield:         ['label', 'heading', 'badge'],
  textarea:          ['paragraph', 'label', 'truncated-text'],
  'rich-text':        ['rendered-html', 'paragraph'],
  'markdown-editor':  ['rendered-markdown', 'paragraph'],
  'code-editor':      ['code-block', 'label'],
  'html-editor':      ['rendered-html', 'paragraph'],
  'url-input':        ['link', 'label'],
  'email-input':      ['mailto-link', 'label'],
  'phone-input':      ['tel-link', 'label'],
  'password-input':   ['masked-label'],
  'slug-input':       ['label'],
  'color-picker':     ['color-swatch', 'label'],
  'search-input':     ['label'],
  'otp-input':        ['masked-label'],
  'masked-input':     ['masked-label', 'label'],
  'barcode-input':    ['barcode-display', 'label'],
  'qr-code-input':    ['qr-code-display', 'label'],

  // Select-ish
  select:           ['chip', 'dropdown-display', 'radio-display', 'text-button', 'label'],
  'multi-select':    ['chip-list', 'checklist-display', 'label'],
  radio:            ['chip', 'radio-display', 'text-button', 'label'],
  'checkbox-group':  ['chip-list', 'checklist-display', 'label'],
  autocomplete:     ['chip', 'label'],

  // Numeric
  'number-input':      ['label', 'badge'],
  slider:              ['label', 'progress-bar'],
  'range-slider':       ['label', 'progress-bar'],
  rating:              ['star-display', 'label'],
  stepper:             ['label', 'badge'],
  counter:             ['label', 'badge'],
  'percentage-input':   ['formatted-percentage', 'progress-bar', 'label'],
  'currency-input':     ['formatted-currency', 'label'],
  'weight-input':       ['formatted-unit', 'label'],
  'distance-input':     ['formatted-unit', 'label'],

  // Boolean
  toggle:          ['badge', 'icon-check', 'label'],
  checkbox:        ['badge', 'icon-check', 'label'],
  'radio-yes-no':   ['badge', 'icon-check', 'label'],
  switch:          ['badge', 'icon-check', 'label'],

  // Date/time
  'datetime-picker':     ['formatted-datetime', 'relative-time', 'label'],
  'date-picker':         ['formatted-date', 'relative-time', 'label'],
  'time-picker':         ['formatted-time', 'label'],
  'date-range-picker':    ['formatted-date-range', 'label'],
  'calendar-picker':     ['formatted-date', 'label'],
  'week-picker':         ['formatted-date', 'label'],
  'month-picker':        ['formatted-date', 'label'],
  'relative-date-input':  ['relative-time', 'formatted-date', 'label'],

  // uuid
  'qr-code-display':  ['qr-code-display', 'label'],
  'barcode-display':  ['barcode-display', 'label'],

  // JSON/array
  'key-value-editor':   ['key-value-display', 'label'],
  'json-viewer':        ['json-viewer', 'label'],
  'schema-editor':      ['json-viewer', 'label'],
  'form-builder':       ['json-viewer', 'label'],
  'tags-input':         ['chip-list', 'label'],
  checklist:            ['checklist-display', 'label'],
  list:                 ['list-display', 'label'],
  repeater:             ['list-display', 'label'],
  'chip-list-input':     ['chip-list', 'label'],
  'file-list-upload':    ['file-list-display', 'label'],
  'ordered-list-input':  ['ordered-list-display', 'label'],

  // Images — carousel default even for a single image, per product decision
  'image-upload':          ['image-carousel', 'single-image', 'image-grid', 'thumbnail'],
  'image-gallery-upload':  ['image-carousel', 'image-grid', 'thumbnail'],
  'image-url':             ['image-carousel', 'single-image', 'thumbnail'],
  'media-picker':          ['image-carousel', 'single-image', 'image-grid', 'thumbnail'],
  'avatar-upload':         ['avatar-display', 'thumbnail'],
  'cover-image-upload':    ['single-image', 'thumbnail'],
  'icon-picker':           ['icon-display', 'label'],

  // File / media
  'file-upload':      ['file-download-link', 'label'],
  'document-upload':  ['file-download-link', 'label'],
  'video-upload':     ['video-player', 'thumbnail', 'label'],
  'audio-upload':     ['audio-player', 'label'],
  'signature-pad':    ['signature-display', 'label'],

  // Geo
  'location-input':  ['map-preview', 'address-label', 'label'],

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