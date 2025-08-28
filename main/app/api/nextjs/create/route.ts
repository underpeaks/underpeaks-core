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

    // Create the install directory — here you want to install under your project folder, e.g. inside your repo
    // Adjust this path to where you want projects installed — **absolute path, writable**
    const installDir = path.join(process.cwd(),'..', "nextjs");

    // Ensure installDir exists
    await mkdirp(installDir);

    // Destination project folder
    const projectPath = path.join(installDir, projectName);

    if (fsSync.existsSync(projectPath)) {
      return NextResponse.json(
        { error: `Project folder "${projectName}" already exists.` },
        { status: 400 }
      );
    }

    // FIX: Delete npm _npx cache folder to avoid ENOTEMPTY errors
    const npxCache = path.join(os.homedir(), ".npm", "_npx");
    try {
      await fs.rm(npxCache, { recursive: true, force: true });
    } catch (err) {
      console.warn("Failed to clear npx cache folder:", err);
    }

    // FIX: Clean npm cache forcibly
    await execaCommand("npm cache clean --force");

    // Run create-next-app in the installDir
    const { stdout } = await execaCommand(`npx create-next-app@latest ${projectName} --yes`, {
      cwd: installDir,
      shell: true,
    });

    return NextResponse.json({
  success: true,
  message: `Project "${projectName}" created successfully.`,
  stdout,
  path: projectPath,
});

   } catch (error: any) {
    console.error('NextJS create failed:', error);

    // Send back detailed error info
    return NextResponse.json({
      error: `Step failed: Creating NextJS project - ${error.message || error}`,
      details: error.stderr || error.stdout || error,
    }, { status: 500 });
  }
}
