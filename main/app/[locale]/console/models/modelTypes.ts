/**
 * modelTypes.ts
 *
 * Shared types for the model editor (create and edit pages).
 * Both pages import from here to keep Field, ForeignKey,
 * OptionsSource, and ModelSummary in sync.
 */

import { getDefaultUiType } from '@/app/api/models/uitypes'

export interface ForeignKey {
  references: string
  on_delete?: string
}

export interface OptionsSource {
  table:        string
  label_column: string
  value_column: string
}

export interface Field {
  name:             string
  type:             string
  nullable:         boolean
  unique:           boolean
  is_primary:       boolean
  foreign_key?:     ForeignKey
  ui_type?:         string
  // Read-only render variant used on public pages. Independent of ui_type
  // (which is the ADMIN/editable widget). Defaults via getDefaultDisplayUiType
  // when the field's ui_type is set/changed and this hasn't been chosen yet.
  display_ui_type?: string
  hidden:           boolean
  options_mode?:    'manual' | 'dynamic'
  options?:         string[]
  options_source?:  OptionsSource
  order?:           number
}

export interface ModelSummary {
  sm_id:  string
  name:   string
  schema: {
    name:         string
    type:         string
    is_primary?:  boolean
    foreign_key?: any
  }[]
}

export function defaultField(): Field {
  const ui_type = getDefaultUiType('string')
  return {
    name:            '',
    type:            'string',
    nullable:        true,
    unique:          false,
    is_primary:      false,
    hidden:          false,
    ui_type,
    display_ui_type: undefined,
    order:           0,
  }
}