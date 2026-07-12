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

  // animeOnly defaults to true; pass ?animeOnly=false for broad TV results
  const animeOnly = req.nextUrl.searchParams.get('animeOnly') !== 'false'

  try {
    const results = await tmdb.search(query.trim(), { animeOnly })
    return NextResponse.json({ results })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Search failed'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
