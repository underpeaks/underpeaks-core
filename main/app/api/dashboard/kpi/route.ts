// ============================================================
// FILE: app/api/dashboard/kpi/route.ts
// ============================================================

import { NextRequest, NextResponse } from 'next/server';
import { KpiFormula, KpiFormat } from '@/app/[locale]/console/kpi/kpi';
import { computeKpi } from '@/app/[locale]/console/kpi/kpiEngine';
import { getConfiguredAdapter } from '@/app/lib/getConfiguredAdapter';


type KpiComputeRequest = {
  user_id:       string;
  collection:    string;
  formula:       KpiFormula;
  format?:       KpiFormat;
  field?:        string;
  field_a?:      string;
  field_b?:      string;
  operator?:     string;
  filter_field?: string;
  filter_value?: string;
};

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as KpiComputeRequest;
    const {
      user_id, collection, formula,
      field, field_a, field_b, operator,
      filter_field, filter_value,
    } = body;

    if (!user_id || !collection || !formula) {
      return NextResponse.json(
        { error: 'user_id, collection, and formula are required' },
        { status: 400 }
      );
    }

    const adapter  = getConfiguredAdapter();
    const dbConfig = adapter.config;

    let data: Record<string, unknown>[] = [];
    try {
      data = await adapter.readAll!(dbConfig, collection) as Record<string, unknown>[];
    } catch {
      return NextResponse.json({ value: 0, formatted: '0' });
    }

    const normalised = data.map((row) => {
      const out: Record<string, unknown> = {};
      for (const [k, v] of Object.entries(row)) {
        out[k] = (v as any)?.toMillis
          ? new Date((v as any).toMillis()).toISOString()
          : v;
      }
      return out;
    });

    const kpiConfig = {
      kpi_id:       'dashboard-kpi-compute',
      label:        '',
      formula,
      format:       body.format ?? 'full',
      field,
      field_a,
      field_b,
      operator,
      filter_field,
      filter_value,
    } as any;

    const result = computeKpi(normalised, kpiConfig, 'R');

    return NextResponse.json({
      value:     result.value,
      formatted: result.formatted,
    });
  } catch (err: any) {
    console.error('[dashboard/kpi]', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}