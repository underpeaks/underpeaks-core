// /api/flutter/detect/route.ts
import { NextResponse } from 'next/server';
import { execa } from 'execa';

export async function GET() {
  try {
    const { stdout } = await execa('flutter', ['--version']);
    return NextResponse.json({ found: true, version: stdout });
  } catch {
    return NextResponse.json({ found: false, version: null });
  }
}
