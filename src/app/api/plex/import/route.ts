import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { importWatchedFromPlex } from '@/lib/plex-sync'

export async function POST(req: NextRequest) {
  const user = await requireAuth()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const body = await req.json().catch(() => ({}))
  const ratingKeys = Array.isArray(body.ratingKeys) ? body.ratingKeys.filter((key: unknown): key is string => typeof key === 'string') : []
  if (ratingKeys.length === 0) return NextResponse.json({ error: 'Select at least one Plex show to import' }, { status: 400 })
  try {
    return NextResponse.json(await importWatchedFromPlex(ratingKeys))
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Plex import failed' }, { status: 500 })
  }
}
