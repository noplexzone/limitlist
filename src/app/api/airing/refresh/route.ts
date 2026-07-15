import { NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { refreshAllShowsAiring } from '@/lib/airing'
import { getConfiguredPlexSyncOnRefresh } from '@/lib/settings'
import { syncAllShowsFromPlex } from '@/lib/plex-sync'

export async function POST() {
  const user = await requireAuth()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const results = await refreshAllShowsAiring()
  const succeeded = results.filter((r) => r.success).length
  const failed = results.filter((r) => !r.success)

  const plexSyncOnRefresh = await getConfiguredPlexSyncOnRefresh()
  const plex = plexSyncOnRefresh ? await syncAllShowsFromPlex() : null

  return NextResponse.json({
    total: results.length,
    succeeded,
    failed: failed.map((r) => ({ showId: r.showId, title: r.title, error: r.error })),
    plex,
  })
}
