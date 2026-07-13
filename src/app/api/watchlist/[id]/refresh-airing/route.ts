import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { refreshShowAiring } from '@/lib/airing'

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await requireAuth()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const result = await refreshShowAiring(id)

  if (!result.success) {
    const status = result.error === 'Show not found' ? 404 : 422
    return NextResponse.json({ error: result.error }, { status })
  }

  return NextResponse.json({ ok: true, title: result.title })
}
