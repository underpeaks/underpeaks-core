import { NextRequest, NextResponse } from 'next/server'
import { handleGetPages }   from './getPages'
import { handleCreatePage } from './createPage'
import { handleUpdatePage } from './updatePage'
import { handleDeletePage } from './deletePage'

async function withErrorBoundary(
  label: string,
  fn: () => Promise<NextResponse>,
): Promise<NextResponse> {
  try {
    return await fn()
  } catch (err: any) {
    console.error(`[${label} /api/pages]`, err)
    return NextResponse.json({ success: false, error: err.message }, { status: 500 })
  }
}

export const GET    = (req: NextRequest) => withErrorBoundary('GET',    () => handleGetPages(req))
export const POST   = (req: NextRequest) => withErrorBoundary('POST',   () => handleCreatePage(req))
export const PUT    = (req: NextRequest) => withErrorBoundary('PUT',    () => handleUpdatePage(req))
export const DELETE = (req: NextRequest) => withErrorBoundary('DELETE', () => handleDeletePage(req))