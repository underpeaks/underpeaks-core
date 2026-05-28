import { NextRequest, NextResponse } from 'next/server'
import { handleGetMenu }    from './getMenu'
import { handleCreateMenu } from './createMenu'
import { handleUpdateMenu } from './updateMenu'
import { handleDeleteMenu } from './deleteMenu'

async function withErrorBoundary(
  label: string,
  fn: () => Promise<NextResponse>,
): Promise<NextResponse> {
  try {
    return await fn()
  } catch (err: any) {
    console.error(`[${label} /api/menu]`, err)
    return NextResponse.json({ success: false, error: err.message }, { status: 500 })
  }
}

export const GET    = (req: NextRequest) => withErrorBoundary('GET',    () => handleGetMenu(req))
export const POST   = (req: NextRequest) => withErrorBoundary('POST',   () => handleCreateMenu(req))
export const PUT    = (req: NextRequest) => withErrorBoundary('PUT',    () => handleUpdateMenu(req))
export const DELETE = (req: NextRequest) => withErrorBoundary('DELETE', () => handleDeleteMenu(req))