import { NextRequest, NextResponse } from 'next/server';
import { ChartComputeRequest, ChartDataPoint } from '@/app/[locale]/console/types/dashboard';
import { getConfiguredAdapter } from '@/app/lib/getConfiguredAdapter';


// ── Date helpers ──────────────────────────────────────────────

function getBucketKey(ts: number, groupBy: 'day' | 'week' | 'month'): string {
  const d = new Date(ts);
  if (groupBy === 'day') {
    return d.toISOString().split('T')[0]; // YYYY-MM-DD
  }
  if (groupBy === 'week') {
    // ISO week start (Monday)
    const day  = d.getDay() || 7;
    const mon  = new Date(d);
    mon.setDate(d.getDate() - day + 1);
    return mon.toISOString().split('T')[0];
  }
  // month
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

function formatBucketLabel(
  key: string,
  groupBy: 'day' | 'week' | 'month'
): string {
  if (groupBy === 'month') {
    const [year, month] = key.split('-');
    return new Date(Number(year), Number(month) - 1, 1)
      .toLocaleDateString('en-ZA', { month: 'short', year: '2-digit' });
  }
  const d = new Date(key);
  return d.toLocaleDateString('en-ZA', { day: 'numeric', month: 'short' });
}

function getRangeMs(range: '7d' | '30d' | '90d'): number {
  const days = range === '7d' ? 7 : range === '30d' ? 30 : 90;
  return days * 24 * 60 * 60 * 1000;
}

function buildEmptyBuckets(
  now: number,
  range: '7d' | '30d' | '90d',
  groupBy: 'day' | 'week' | 'month'
): Map<string, number> {
  const map = new Map<string, number>();
  const days = range === '7d' ? 7 : range === '30d' ? 30 : 90;

  for (let i = days - 1; i >= 0; i--) {
    const d   = new Date(now - i * 24 * 60 * 60 * 1000);
    const key = getBucketKey(d.getTime(), groupBy);
    if (!map.has(key)) map.set(key, 0);
  }
  return map;
}

// ── Route ─────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as ChartComputeRequest;
    const { user_id, collection, date_field, value_field, formula, group_by, range } = body;

    if (!user_id || !collection || !date_field) {
      return NextResponse.json(
        { error: 'user_id, collection, and date_field are required' },
        { status: 400 }
      );
    }

    const adapter  = getConfiguredAdapter();
    const dbConfig = adapter.config;

    let data: Record<string, unknown>[] = [];
    try {
      data = await adapter.readAll!(dbConfig, collection) as Record<string, unknown>[];
    } catch {
      return NextResponse.json({ data: [], total: 0, max: 0 });
    }

    const now    = Date.now();
    const cutoff = now - getRangeMs(range ?? '30d');

    // Build buckets (pre-filled with 0 so every period shows even if empty)
    const buckets = buildEmptyBuckets(now, range ?? '30d', group_by ?? 'day');

    // Aggregate
    for (const row of data) {
      const raw = row[date_field];
      const ts  = (raw as any)?.toMillis
        ? (raw as any).toMillis()
        : new Date(raw as string).getTime();

      if (isNaN(ts) || ts < cutoff || ts > now) continue;

      const key = getBucketKey(ts, group_by ?? 'day');
      if (!buckets.has(key)) continue;

      if (formula === 'SUM' && value_field) {
        const val = Number(row[value_field] ?? 0);
        buckets.set(key, (buckets.get(key) ?? 0) + (isNaN(val) ? 0 : val));
      } else {
        // COUNT
        buckets.set(key, (buckets.get(key) ?? 0) + 1);
      }
    }

    const chartData: ChartDataPoint[] = Array.from(buckets.entries()).map(([date, value]) => ({
      date,
      label: formatBucketLabel(date, group_by ?? 'day'),
      value,
    }));

    const total = chartData.reduce((s, d) => s + d.value, 0);
    const max   = Math.max(...chartData.map((d) => d.value), 1);

    return NextResponse.json({ data: chartData, total, max });
  } catch (err: any) {
    console.error('[dashboard/chart]', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}