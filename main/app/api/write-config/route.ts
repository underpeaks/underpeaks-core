import { NextRequest, NextResponse } from "next/server";
import { InstallerState } from "@/app/store/useInstallerStore";
import { writeConfigFromStore } from "@/app/db-adapter/utils/writeConfigFiles";

export async function POST(req: NextRequest) {
  try {
    const body: InstallerState = await req.json();
    
    const result = await writeConfigFromStore(body);
    return NextResponse.json(result);
  } catch (err: any) {
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}
