// ============================================================
// FILE: app/lib/kpiEngine.ts
// PURPOSE: Pure formula engine. Takes a dataset (array of
//          records) + a KpiConfig and returns a numeric result.
//          Field B in CUSTOM formula can be a field name OR a
//          literal value prefixed with "__value__:"
// ============================================================


import { formatKpiValue } from './formatKpiValue';
import { KpiConfig, KpiResult } from './kpi';

type DataRecord = Record<string, unknown>;

function readField(record: DataRecord, field: string): unknown {
  if (field.includes('.')) {
    return field.split('.').reduce<unknown>((acc, key) => {
      if (acc && typeof acc === 'object') return (acc as DataRecord)[key];
      return undefined;
    }, record);
  }
  return record[field];
}

function toNumber(value: unknown): number | null {
  const n = Number(value);
  return isNaN(n) ? null : n;
}

function computeCount(data: DataRecord[]): number {
  return data.length;
}

function computeCountDistinct(data: DataRecord[], field: string): number {
  const seen = new Set<unknown>();
  for (const row of data) {
    const val = readField(row, field);
    if (val !== undefined && val !== null) seen.add(val);
  }
  return seen.size;
}

function computeSum(data: DataRecord[], field: string): number {
  return data.reduce((acc, row) => {
    const n = toNumber(readField(row, field));
    return acc + (n ?? 0);
  }, 0);
}

function computeAvg(data: DataRecord[], field: string): number | null {
  const nums = data
    .map((row) => toNumber(readField(row, field)))
    .filter((n): n is number => n !== null);
  if (nums.length === 0) return null;
  return nums.reduce((a, b) => a + b, 0) / nums.length;
}

function computeMin(data: DataRecord[], field: string): number | null {
  const nums = data
    .map((row) => toNumber(readField(row, field)))
    .filter((n): n is number => n !== null);
  if (nums.length === 0) return null;
  return Math.min(...nums);
}

function computeMax(data: DataRecord[], field: string): number | null {
  const nums = data
    .map((row) => toNumber(readField(row, field)))
    .filter((n): n is number => n !== null);
  if (nums.length === 0) return null;
  return Math.max(...nums);
}

function computePercentage(
  data: DataRecord[],
  filterField: string,
  filterValue: string
): number | null {
  if (data.length === 0) return null;
  const matching = data.filter(
    (row) => String(readField(row, filterField)) === filterValue
  ).length;
  return (matching / data.length) * 100;
}

function computeRatio(
  data: DataRecord[],
  fieldA: string,
  fieldB: string
): number | null {
  const sumA = computeSum(data, fieldA);
  const sumB = computeSum(data, fieldB);
  if (sumB === 0) return null;
  return sumA / sumB;
}

// Resolve field B — either a field reference or a literal value
// Literal values are stored with the "__value__:" prefix by the modal
function resolveB(record: DataRecord, fieldB: string): unknown {
  if (fieldB.startsWith('__value__:')) {
    return fieldB.slice('__value__:'.length);
  }
  return readField(record, fieldB);
}

function computeCustom(
  data: DataRecord[],
  fieldA: string,
  fieldB: string,
  operator: string
): number {
  return data.filter((row) => {
    const a = readField(row, fieldA);
    const b = resolveB(row, fieldB);
    const na = toNumber(a);
    const nb = toNumber(b);

    // Prefer numeric comparison, fall back to string
    const av = na !== null ? na : String(a);
    const bv = nb !== null ? nb : String(b);

    switch (operator) {
      case '=':  return av === bv;
      case '!=': return av !== bv;
      case '>':  return av > bv;
      case '<':  return av < bv;
      case '>=': return av >= bv;
      case '<=': return av <= bv;
      default:   return false;
    }
  }).length;
}

export function computeKpi(
  data: DataRecord[],
  config: KpiConfig,
  currencySymbol = 'R'
): KpiResult {
  let rawValue: number | null = null;

  try {
    switch (config.formula) {
      case 'COUNT':
        rawValue = computeCount(data);
        break;
      case 'COUNT_DISTINCT':
        if (!config.field) break;
        rawValue = computeCountDistinct(data, config.field);
        break;
      case 'SUM':
        if (!config.field) break;
        rawValue = computeSum(data, config.field);
        break;
      case 'AVG':
        if (!config.field) break;
        rawValue = computeAvg(data, config.field);
        break;
      case 'MIN':
        if (!config.field) break;
        rawValue = computeMin(data, config.field);
        break;
      case 'MAX':
        if (!config.field) break;
        rawValue = computeMax(data, config.field);
        break;
      case 'PERCENTAGE':
        if (!config.filter_field || config.filter_value === undefined) break;
        rawValue = computePercentage(data, config.filter_field, config.filter_value);
        break;
      case 'RATIO':
        if (!config.field_a || !config.field_b) break;
        rawValue = computeRatio(data, config.field_a, config.field_b);
        break;
      case 'CUSTOM':
        if (!config.field_a || !config.field_b || !config.operator) break;
        rawValue = computeCustom(data, config.field_a, config.field_b, config.operator);
        break;
    }
  } catch {
    rawValue = null;
  }

  const formatted =
    rawValue !== null
      ? formatKpiValue(rawValue, config.format, currencySymbol)
      : '—';

  return {
    kpi_id:    config.kpi_id,
    value:     rawValue,
    formatted,
    label:     config.label,
    icon:      config.icon,
    colour:    config.colour,
  };
}

export function computeAllKpis(
  data: DataRecord[],
  configs: KpiConfig[],
  currencySymbol = 'R'
): KpiResult[] {
  return configs.map((c) => computeKpi(data, c, currencySymbol));
}