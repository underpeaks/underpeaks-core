// ============================================================
// FILE: app/types/dashboard.ts
// ============================================================

import { KpiFormula, KpiFormat, CustomOperator, KpiBlock } from "../kpi/kpi";



// ── Collections ──────────────────────────────────────────────

export interface DashboardCollection {
  key:     string;   // e.g. 'nxf_users' or 'orders'
  label:   string;   // e.g. 'Users (system)' or 'Orders'
  system:  boolean;  // true = nxf_ built-in, false = developer model
  fields?: string[]; // field names — populated for developer models, optional for system
}

// ── KPI bar (top) ─────────────────────────────────────────────

export interface DashboardKpiConfig {
  kpi_id:        string;
  label:         string;
  collection:    string;
  formula:       KpiFormula;
  format:        KpiFormat;
  field?:        string;
  field_a?:      string;
  field_b?:      string;
  operator?:     CustomOperator;
  filter_field?: string;
  filter_value?: string;
  icon?:         string;
  colour?:       string;
  block_colour?: string;
  font_colour?:  string;
}

// ── Custom stat widgets ───────────────────────────────────────

export interface DashboardStatWidget {
  widget_id:     string;
  type:          'stat';
  title:         string;
  collection:    string;
  formula:       KpiFormula;
  format:        KpiFormat;
  field?:        string;
  field_a?:      string;
  field_b?:      string;
  operator?:     CustomOperator;
  filter_field?: string;
  filter_value?: string;
  icon?:         string;
  colour?:       string;
  span?:         1 | 2 | 3;
}

// ── Chart widgets ─────────────────────────────────────────────

export interface DashboardChartWidget {
  widget_id:    string;
  type:         'chart';
  title:        string;
  collection:   string;
  date_field:   string;
  value_field?: string;
  formula:      'COUNT' | 'SUM';
  group_by:     'day' | 'week' | 'month';
  range:        '7d' | '30d' | '90d';
  chart_type?:  'bar' | 'line' | 'area' | 'horizontal_bar' | 'donut';
  colour?:      string;
  span?:        1 | 2 | 3;
}

// ── Union widget type ─────────────────────────────────────────

export type DashboardWidget = DashboardStatWidget | DashboardChartWidget;

// ── Full dashboard layout ─────────────────────────────────────

export interface DashboardLayout {
  config_id:  string;
  page:       'dashboard';
  project_id: string;
  tenant_id:  string;
  kpi_blocks: KpiBlock[];
  widgets:    DashboardWidget[];
  updated_at: string;
}

// ── API response types ────────────────────────────────────────

export interface DashboardStatsResponse {
  counts: {
    users:         number;
    active_users:  number;
    admin_users:   number;
    pages:         number;
    models:        number;
    menu_items:    number;
    media_files:   number;
    storage_bytes: number;
  };
  project: {
    project_id:   string;
    project_name: string;
    db_type:      string;
  } | null;
  recent_activity: ActivityEvent[];
  recent_pages:    RecentPage[];
}

export interface ActivityEvent {
  id:         string;
  user_id:    string;
  user_label: string;
  action:     string;
  context:    Record<string, any>;
  created_at: string;
}

export interface RecentPage {
  id:         string;
  title:      string;
  slug:       string;
  page_type:  string;
  updated_at: string;
}

// ── KPI compute ───────────────────────────────────────────────

export interface KpiComputeRequest {
  user_id:       string;
  collection:    string;
  formula:       KpiFormula;
  format?:       KpiFormat;    // was missing — caused errors in DashboardKpiBar + route
  field?:        string;
  field_a?:      string;
  field_b?:      string;
  operator?:     CustomOperator;
  filter_field?: string;
  filter_value?: string;
}

export interface KpiComputeResponse {
  value:     number | null;
  formatted: string;
}

// ── Chart compute ─────────────────────────────────────────────

export interface ChartComputeRequest {
  user_id:      string;
  collection:   string;
  date_field:   string;
  value_field?: string;
  formula:      'COUNT' | 'SUM';
  group_by:     'day' | 'week' | 'month';
  range:        '7d' | '30d' | '90d';
}

export interface ChartDataPoint {
  label: string;
  date:  string;
  value: number;
}

export interface ChartComputeResponse {
  data:  ChartDataPoint[];
  total: number;
  max:   number;
}