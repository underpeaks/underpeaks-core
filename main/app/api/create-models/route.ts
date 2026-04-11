import { NextResponse } from 'next/server';
import { getAdapter } from '@/app/db-adapter';
import { DBAdapter } from '@/app/db-adapter/types';

export async function POST(request: Request) {
  try {
    const { config, adminUser,selectedProjectType } = await request.json();

    if (!config || !adminUser?.email) {
      return NextResponse.json(
        { success: false, message: 'Missing DB config or admin user email' },
        { status: 400 }
      );
    }

    const adapter: DBAdapter = getAdapter(config.type, config);

if (!adapter.createDataModelsFromUserEmail) {
  return NextResponse.json(
    {
      success: false,
      message: 'This database adapter does not support data model creation',
    },
    { status: 400 }
  );
}
console.log(`API(create-models) - SELECTED PROJECT TYPE - ${selectedProjectType}`);
const result = await adapter.createDataModelsFromUserEmail(adminUser.email,selectedProjectType);

return NextResponse.json(
  {
    success: true,
    skipped: result.skipped || false,
    message: result.message,
    data: result.data || null,
  },
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
