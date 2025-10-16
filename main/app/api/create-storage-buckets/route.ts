import { NextRequest, NextResponse } from 'next/server';
import { getAdapter } from '@/app/db-adapter';

export async function POST(req: NextRequest) {
  try {
    const { dbConfig } = await req.json();

    if (!dbConfig || !dbConfig.type) {
      throw new Error('Missing DB config/type');
    }

    // Dynamically fetch the correct adapter based on dbConfig.type
    const adapter = getAdapter(dbConfig.type, dbConfig);

    // Ensure the adapter supports storage setup
    if (!adapter.setupStorageBuckets) {
      return NextResponse.json(
        { success: false, message: `${dbConfig.type} adapter does not implement storage setup` },
        { status: 400 }
      );
    }

    // Call the adapter's storage setup
    const buckets = await adapter.setupStorageBuckets();

    return NextResponse.json({ success: true, buckets });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error.message },
      { status: 500 }
    );
  }
}
