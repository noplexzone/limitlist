import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { getTmdbProvider } from '@/lib/tmdb'

export async function GET(req: NextRequest) {
  const user = await requireAuth()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const query = req.nextUrl.searchParams.get('q')
  if (!query || !query.trim()) {
    return NextResponse.json({ results: [] })
  }

  const tmdb = getTmdbProvider()
  if (!tmdb) {
    return NextResponse.json(
      { error: 'TMDB_API_KEY is not configured. Add it to your environment variables.' },
      { status: 503 }
    )
  }

  const rawLimit = Number(req.nextUrl.searchParams.get('limit') ?? '10')
  const limit = Number.isFinite(rawLimit) ? Math.min(Math.max(rawLimit, 1), 20) : 10

  try {
    const results = await tmdb.search(query.trim(), { animeOnly: true, limit })
    return NextResponse.json({ results })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Search failed'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
