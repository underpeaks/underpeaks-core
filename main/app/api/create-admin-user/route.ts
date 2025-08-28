// app/api/create-admin-user/route.ts
import { NextResponse } from 'next/server';
import { createAdminUserFlow } from '@/app/db-adapter/utils/create-admin-user-flow';

export async function POST(request: Request) {
  try {
    const { config, adminUser, projectName ,subdomain } = await request.json();

    if (!config) {
      return NextResponse.json({ success: false, message: 'Missing DB config' }, { status: 400 });
    }

    if (!adminUser) {
      return NextResponse.json({ success: false, message: 'Missing admin user data' }, { status: 400 });
    }

    console.log('API PASSWORD CHECK '+config.password,+' ----'+ config.password_hash);
    await createAdminUserFlow(config, adminUser,projectName,subdomain);

    return NextResponse.json({ success: true, message: 'Admin user created successfully' });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error.message || 'Failed to create admin user' },
      { status: 500 }
    );
  }
}
