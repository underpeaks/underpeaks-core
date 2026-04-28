// app/api/system-config/route.ts
import { getSystemConfig } from "@/server/getSystemConfig"


export async function GET() {
  const config = getSystemConfig()

  return Response.json({
    faviconUrl: config.faviconUrl,
    projectName: config.projectName,
    logoUrl: config.logoUrl,
  })
}