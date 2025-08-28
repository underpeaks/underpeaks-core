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

   const rootPath = path.join(process.cwd(), "..", "flutter");
const installPath = path.join(rootPath, projectName);


    await fs.ensureDir(installPath);

    // Just use "flutter" and assume it is in PATH
    const flutterExecutable = 'flutter';
    const createCmd = `${flutterExecutable} create --project-name ${projectName.toLowerCase()} ${installPath}`;

    const { stdout, stderr } = await execaCommand(createCmd, { shell: true });

    if (stderr) console.warn('Flutter stderr:', stderr);

    return NextResponse.json({ success: true, output: stdout });
  } catch (error: any) {
    console.error('Flutter create failed:', error);

    // Send back detailed error info
    return NextResponse.json({
      error: `Step failed: Creating Flutter project - ${error.message || error}`,
      details: error.stderr || error.stdout || error,
    }, { status: 500 });
  }
}
