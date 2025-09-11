import { NextResponse } from 'next/server';
import { getAdapter } from '@/app/db-adapter';
import { DBAdapter } from '@/app/db-adapter/types';

export async function POST(request: Request) {
  try {
    const { config, adminUser } = await request.json();

    if (!config || !adminUser?.email) {
      return NextResponse.json(
        { success: false, message: 'Missing DB config or admin user email' },
        { status: 400 }
      );
    }

    const adapter: DBAdapter = getAdapter(config.type, config);
    const result = await adapter.createDataModelsFromUserEmail(adminUser.email);

    return NextResponse.json(
      { success: true, message: 'Data models inserted successfully', data: result },
      { status: 200 }
    );
  } catch (error: any) {
    console.error('Error in create-data-models API:', error);
    return NextResponse.json(
      { success: false, message: error.message || 'Failed to insert data models' },
      { status: 500 }
    );
  }
}
