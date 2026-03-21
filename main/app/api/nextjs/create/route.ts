import { NextResponse } from "next/server";
import { execaCommand } from "execa";
import path from "path";
import os from "os";
import fs from "fs/promises";
import fsSync from "fs";
import { mkdirp } from "mkdirp";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { projectName } = body;

    if (!projectName || typeof projectName !== "string") {
      return NextResponse.json({ error: "Invalid project name." }, { status: 400 });
    }

    const installDir = path.join(process.cwd(), '..', "nextjs");
    await mkdirp(installDir);
    const projectPath = path.join(installDir, projectName);

    // ✅ Skip creation if project already exists
    if (fsSync.existsSync(projectPath)) {
      return NextResponse.json({
        success: true,
        skipped: true,
        message: `Next.js project "${projectName}" already exists. Skipping.`,
        path: projectPath,
      });
    }

    // Clear npx cache to avoid ENOTEMPTY errors
    const npxCache = path.join(os.homedir(), ".npm", "_npx");
    try {
      await fs.rm(npxCache, { recursive: true, force: true });
    } catch (err) {
      console.warn("Failed to clear npx cache folder:", err);
    }
    await execaCommand("npm cache clean --force");

    // Create the Next.js project
    const { stdout } = await execaCommand(`npx create-next-app@latest ${projectName} --yes`, {
      cwd: installDir,
      shell: true,
    });

   if (fsSync.existsSync(projectPath)) {
  return NextResponse.json({
    success: true,
    skipped: true,
    message: `Next.js project "${projectName}" already exists. Skipping.`,
    path: projectPath,
  });
}


  } catch (error: any) {
    console.error('NextJS create failed:', error);
    return NextResponse.json({
      error: `Step failed: Creating NextJS project - ${error.message || error}`,
      details: error.stderr || error.stdout || error,
    }, { status: 500 });
  }
}
