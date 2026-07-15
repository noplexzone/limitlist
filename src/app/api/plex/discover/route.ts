import { NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { discoverWatchedFromPlex } from '@/lib/plex-sync'

export async function GET() {
  const user = await requireAuth()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  try {
    return NextResponse.json(await discoverWatchedFromPlex())
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Plex discovery failed' }, { status: 500 })
  }
}
