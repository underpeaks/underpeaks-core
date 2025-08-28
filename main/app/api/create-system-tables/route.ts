import { NextResponse } from 'next/server';
import { createSystemTables, createUsersTables } from '../../db-adapter/utils/create-system-tables';

export async function POST(request: Request) {
  try {
    const { config } = await request.json();

    if (!config) {
      return NextResponse.json({ success: false, message: 'Missing DB config' }, { status: 400 });
    }

    await createSystemTables(config);
    await createUsersTables(config);

    return NextResponse.json({ success: true, message: 'All system and user tables created' });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error.message || 'Failed to create tables' },
      { status: 500 }
    );
  }
}
