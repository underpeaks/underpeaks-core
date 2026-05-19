/**
 * uiTypes.ts
 *
 * Centralised reference for all UI type options available per field type,
 * all available base field types, and foreign key on-delete options.
 *
 * Both CreateModelPage and EditModelPage import from here so the lists
 * are defined in exactly one place and never get out of sync.
 *
 * What is a UI type?
 * When a field is used on a Page (e.g. a product form or a listing card),
 * the UI type tells the page builder how to render that field — as a text
 * input, a dropdown, a date picker, etc. This is stored in the model schema
 * alongside the data type so the Pages builder can consume it later.
 */

// ---------------------------------------------------------------------------
// Field types
// ---------------------------------------------------------------------------

/**
 * FIELD_TYPES
 * All available base field types shown in the Type dropdown.
 * Covers all types seen across existing schema files.
 */
export const FIELD_TYPES = [
  'string',
  'text',
  'integer',
  'float',
  'double',
  'boolean',
  'datetime',
  'timestamp',
  'jsonb',
  'uuid',
  'array',
  'image',
]

// ---------------------------------------------------------------------------
// UI type options per field type
// ---------------------------------------------------------------------------

/**
 * UI_TYPE_OPTIONS
 *
 * Maps each field type to the list of UI components that make sense
 * for rendering that type on a page. Stored in the model schema as
 * `ui_type` so the Pages builder knows how to render each field.
 *
 * Key   — the field's data type (must match a value in FIELD_TYPES)
 * Value — array of UI type strings the user can choose from
 */
export const UI_TYPE_OPTIONS: Record<string, string[]> = {
  string: [
    'textfield',
    'textarea',
    'rich-text',
    'select',
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
    'date-picker',
    'datetime-picker',
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
    'list',
    'tags-input',
    'multi-select',
    'checklist',
  ],
  image: [
    'image-upload',
    'image-url',
    'media-picker',
  ],
}

// ---------------------------------------------------------------------------
// Foreign key on-delete options
// ---------------------------------------------------------------------------

/**
 * ON_DELETE_OPTIONS
 * The behaviour when a referenced row is deleted.
 * Shown in the On Delete dropdown when a foreign key is configured.
 */
export const ON_DELETE_OPTIONS = [
  'CASCADE',
  'SET NULL',
  'RESTRICT',
  'NO ACTION',
]

// ---------------------------------------------------------------------------
// Helper
// ---------------------------------------------------------------------------

/**
 * getDefaultUiType
 *
 * Returns the first (default) UI type for a given field type.
 * Used when a new field is created or the type is changed so the
 * ui_type is always initialised to a sensible value.
 *
 * @param fieldType - The data type of the field (e.g. 'string', 'boolean').
 * @returns The default UI type string for that field type.
 */
export function getDefaultUiType(fieldType: string): string {
  return UI_TYPE_OPTIONS[fieldType]?.[0] ?? 'textfield'
}