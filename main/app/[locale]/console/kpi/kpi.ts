// ============================================================
// FILE: app/types/kpi.ts
// PURPOSE: Type definitions for KPI bar configs, formulas,
//          and display formatting. Used by users page and
//          all future list template pages.
// ============================================================

// All supported formula types
export type KpiFormula =
  | 'COUNT'
  | 'COUNT_DISTINCT'
  | 'SUM'
  | 'AVG'
  | 'MIN'
  | 'MAX'
  | 'PERCENTAGE'
  | 'RATIO'
  | 'CUSTOM';

// Display format for the computed value
export type KpiFormat =
  | 'compact'      // 1.2k, 3.4M
  | 'full'         // 1,234
  | 'percentage'   // 84%
  | 'currency'     // R 1,234 / $ 1,234
  | 'duration';    // "3 days ago" / "5 days"

export type CustomOperator = '=' | '!=' | '>' | '<' | '>=' | '<=';

// Config stored per KPI inside a block
export interface KpiConfig {
  kpi_id: string;
  label: string;
  formula: KpiFormula;
  format: KpiFormat;
  // Field references — which field(s) the formula runs on
  field?: string;           // SUM, AVG, MIN, MAX, COUNT_DISTINCT
  field_a?: string;         // RATIO numerator, CUSTOM field A
  field_b?: string;         // RATIO denominator, CUSTOM field B
  operator?: CustomOperator; // CUSTOM only
  filter_field?: string;    // PERCENTAGE: the field to count against total
  filter_value?: string;    // PERCENTAGE: value to match
  // Display
  icon?: string;            // lucide icon name
  colour?: string;          // optional accent colour override
}

// A block holds 1–4 KPI cards and can be "wide" (2-col span)
export interface KpiBlock {
  block_id: string;
  kpis: KpiConfig[];        // max 4
  is_wide: boolean;         // spans 2 columns when true
}

// The full saved config for one page
export interface KpiPageConfig {
  config_id: string;
  page: string;             // 'users' | 'dashboard' | future page slugs
  project_id: string;
  tenant_id: string;
  blocks: KpiBlock[];       // ordered array — order = display order
  updated_at: string;
}

// What the KPI engine returns after computing
export interface KpiResult {
  kpi_id: string;
  value: number | null;
  formatted: string;
  label: string;
  icon?: string;
  colour?: string;
}

