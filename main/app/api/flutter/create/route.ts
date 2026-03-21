import { NextRequest, NextResponse } from 'next/server';
import { execaCommand } from 'execa';
import path from 'path';
import fs from 'fs-extra';

export async function POST(req: NextRequest) {
  try {
    const { projectName } = await req.json();

    if (!projectName || typeof projectName !== 'string') {
      return NextResponse.json({ error: 'Missing projectName' }, { status: 400 });
    }

    const rootPath = path.join(process.cwd(), '..', 'flutter');
    const installPath = path.join(rootPath, projectName);

    // Ensure base folder exists
    await fs.ensureDir(rootPath);

    // 1️⃣ Check if Flutter is installed
    try {
      await execaCommand('flutter --version', { shell: true });
    } catch {
      return NextResponse.json({
        success: false,
        skipped: false,
        error: 'Flutter is not installed or not in PATH.',
      }, { status: 400 });
    }

    // 2️⃣ Check if project already exists
    const projectExists = await fs.pathExists(installPath);
    if (projectExists) {
      console.log(`Flutter project "${projectName}" already exists. Skipping creation.`);
      return NextResponse.json({
        success: true,
        skipped: true,
        output: `Flutter project "${projectName}" already exists.`,
      });
    }

    // 3️⃣ Create Flutter project
    const createCmd = `flutter create --project-name ${projectName.toLowerCase()} ${installPath}`;
    const { stdout, stderr } = await execaCommand(createCmd, { shell: true });

    if (stderr) console.warn('Flutter stderr:', stderr);

    return NextResponse.json({ success: true, skipped: false, output: stdout });
  } catch (error: any) {
    console.error('Flutter create failed:', error);

    return NextResponse.json({
      success: false,
      error: `Step failed: Creating Flutter project - ${error.message || error}`,
      details: error.stderr || error.stdout || error,
    }, { status: 500 });
  }
}
