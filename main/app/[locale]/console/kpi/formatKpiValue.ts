// ============================================================
// FILE: app/lib/formatKpiValue.ts
// PURPOSE: Format a raw numeric KPI value into a display
//          string. Supports compact, full, percentage,
//          currency, and duration formats.
// ============================================================

import { KpiFormat } from "./kpi";



// Compact: 1200 → "1.2k", 1400000 → "1.4M"
function formatCompact(value: number): string {
  const abs = Math.abs(value);
  const sign = value < 0 ? '-' : '';

  if (abs >= 1_000_000_000) {
    return `${sign}${(abs / 1_000_000_000).toFixed(1).replace(/\.0$/, '')}B`;
  }
  if (abs >= 1_000_000) {
    return `${sign}${(abs / 1_000_000).toFixed(1).replace(/\.0$/, '')}M`;
  }
  if (abs >= 1_000) {
    return `${sign}${(abs / 1_000).toFixed(1).replace(/\.0$/, '')}k`;
  }
  return `${sign}${abs.toFixed(0)}`;
}

// Full: 1234567 → "1,234,567"
function formatFull(value: number): string {
  return value.toLocaleString(undefined, { maximumFractionDigits: 2 });
}

// Percentage: 84.333 → "84.3%"
function formatPercentage(value: number): string {
  return `${value.toFixed(1)}%`;
}

// Currency: 1234 → "R 1,234" or "$ 1,234"
function formatCurrency(value: number, symbol: string): string {
  return `${symbol} ${value.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

// Duration: value is treated as a number of days (or ms timestamp diff)
// If value > 10000 we treat it as milliseconds, otherwise as days
function formatDuration(value: number): string {
  const days =
    value > 10_000
      ? Math.floor(value / (1000 * 60 * 60 * 24))
      : Math.floor(value);

  if (days === 0) return 'Today';
  if (days === 1) return '1 day';
  if (days < 30) return `${days} days`;
  if (days < 365) {
    const months = Math.floor(days / 30);
    return `${months} month${months > 1 ? 's' : ''}`;
  }
  const years = Math.floor(days / 365);
  return `${years} year${years > 1 ? 's' : ''}`;
}

export function formatKpiValue(
  value: number,
  format: KpiFormat,
  currencySymbol = 'R'
): string {
  switch (format) {
    case 'compact':
      return formatCompact(value);
    case 'full':
      return formatFull(value);
    case 'percentage':
      return formatPercentage(value);
    case 'currency':
      return formatCurrency(value, currencySymbol);
    case 'duration':
      return formatDuration(value);
    default:
      return String(value);
  }
}