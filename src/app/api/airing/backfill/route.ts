import { NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { backfillAiredEpisodeCounts } from '@/lib/airing'

export async function POST() {
  const user = await requireAuth()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const results = await backfillAiredEpisodeCounts()
  const succeeded = results.filter((r) => r.success).length
  const failed = results.filter((r) => !r.success)

  return NextResponse.json({
    total: results.length,
    succeeded,
    failed: failed.map((r) => ({ showId: r.showId, title: r.title, error: r.error })),
  })
}
