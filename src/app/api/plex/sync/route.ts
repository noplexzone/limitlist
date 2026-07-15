import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { syncShowFromPlex, syncAllShowsFromPlex } from '@/lib/plex-sync'

export async function POST(req: NextRequest) {
  const user = await requireAuth()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const body: unknown = await req.json().catch(() => ({}))
    const showId =
      body !== null && typeof body === 'object' && 'showId' in body && typeof (body as Record<string, unknown>).showId === 'string'
        ? (body as Record<string, unknown>).showId as string
        : null

    if (showId) {
      const result = await syncShowFromPlex(showId)
      const succeeded = result.success ? 1 : 0
      const failed = !result.success && !result.skipped
        ? [{ showId: result.showId, title: result.title, error: result.error, warning: result.warning }]
        : []
      const skipped = result.skipped
        ? [{ showId: result.showId, title: result.title, skipReason: result.skipReason, warning: result.warning }]
        : []
      return NextResponse.json({ total: 1, succeeded, failed, skipped, results: [result] })
    }

    const { results, totalMatched, totalUnmatched, totalWatched, failedCount } = await syncAllShowsFromPlex()
    const succeeded = results.filter((r) => r.success).length
    const failed = results
      .filter((r) => !r.success && !r.skipped)
      .map((r) => ({ showId: r.showId, title: r.title, error: r.error, warning: r.warning }))
    const skipped = results
      .filter((r) => r.skipped)
      .map((r) => ({ showId: r.showId, title: r.title, skipReason: r.skipReason, warning: r.warning }))

    return NextResponse.json({ total: results.length, succeeded, failed, skipped, totalMatched, totalUnmatched, totalWatched, failedCount })
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Unexpected error during Plex sync' },
      { status: 500 }
    )
  }
}
