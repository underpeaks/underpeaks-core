import { NextResponse } from 'next/server';
import { createSystemTables, createUsersTables } from '../../db-adapter/utils/create-system-tables';
//import { createProjectTables } from '@/app/db-adapter/utils/create-project-tables';
 // new

export async function POST(request: Request) {
  try {
    const { config,selectedProjectType  } = await request.json();

    if (!config) {
      return NextResponse.json({ success: false, message: 'Missing DB config' }, { status: 400 });
    }

    // 1️⃣ Always create core system tables
    await createSystemTables(config);

    // 2️⃣ Always create fundamental user tables
    await createUsersTables(config);

    // 3️⃣ Install project-specific models (skip if blank project)
    // console.log(`INSTALLING SELECTED MODELS - ${selectedProjectType }`);
    // if (config.selectedProjectType !== 'blank') {
    //   await createProjectTables(config,selectedProjectType );
    // }

    return NextResponse.json({ success: true, message: 'All system, user, and project tables created' });
  } catch (error: any) {
    console.error('[CREATE TABLES ERROR]', error);
    return NextResponse.json(
      { success: false, message: error.message || 'Failed to create tables' },
      { status: 500 }
    );
  }
}