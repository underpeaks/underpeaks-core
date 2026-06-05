/**
 * uitypes.ts
 *
 * Defines:
 *   FIELD_TYPES      — all valid DB column types
 *   UI_TYPE_OPTIONS  — which ui_types are valid for each field type
 *   getDefaultUiType — returns the sensible default ui_type for a given field type
 *   ON_DELETE_OPTIONS — FK on-delete behaviours
 *
 * Rules:
 * - Every field type must have at least one ui_type option
 * - select and multi-select only appear on string and array types
 *   because those are the only types that make sense for option lists
 * - hidden is available on uuid and any system field type
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