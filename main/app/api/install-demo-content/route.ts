import { NextRequest, NextResponse } from 'next/server';
import { getAdapter } from '@/app/db-adapter';

export async function POST(req: NextRequest) {
  try {
    const { config, selectedProjectType } = await req.json();

    if (!config) throw new Error('Missing DB config');
    if (!selectedProjectType) throw new Error('Missing project type');

    const adapter = getAdapter(config.type, config);

    if (!adapter.installDemoContent) {
      throw new Error('installDemoContent not implemented for this adapter');
    }

    const result = await adapter.installDemoContent(
      config,
      selectedProjectType
    );

    return NextResponse.json({
      success: true,
      result,
    });

  } catch (err: any) {
    console.error('❌ install-demo-content error:', err);

    return NextResponse.json(
      { success: false, message: err.message },
      { status: 500 }
    );
  }
}