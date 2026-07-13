import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { prisma } from '@/lib/db'

const TMDB_BASE = 'https://api.themoviedb.org/3'
const POSTER_BASE = 'https://image.tmdb.org/t/p/w500'
const ANIMATION_GENRE_ID = 16

interface TmdbTvItem {
  id: number
  name: string
  original_name?: string
  overview?: string
  poster_path?: string | null
  first_air_date?: string
  genre_ids?: number[]
  original_language?: string
  origin_country?: string[]
}

function isAnime(item: TmdbTvItem) {
  return (
    item.genre_ids?.includes(ANIMATION_GENRE_ID) ||
    item.original_language === 'ja' ||
    item.origin_country?.includes('JP')
  )
}

function toResult(item: TmdbTvItem, watchlistIds: Set<string>) {
  return {
    providerId: String(item.id),
    providerName: 'tmdb',
    title: item.name,
    originalTitle: item.original_name !== item.name ? item.original_name : undefined,
    overview: item.overview || undefined,
    posterUrl: item.poster_path ? `${POSTER_BASE}${item.poster_path}` : undefined,
    firstAiredAt: item.first_air_date || undefined,
    inWatchlist: watchlistIds.has(String(item.id)),
  }
}

export async function GET(req: NextRequest) {
  const user = await requireAuth()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const apiKey = process.env.TMDB_API_KEY
  if (!apiKey) {
    return NextResponse.json(
      { error: 'TMDB_API_KEY not configured', results: [] },
      { status: 422 }
    )
  }

  const type = new URL(req.url).searchParams.get('type') ?? 'popular'

  const existing = await prisma.animeShow.findMany({
    where: { metadataProvider: 'tmdb' },
    select: { metadataId: true },
  })
  const watchlistIds = new Set(existing.map((s) => s.metadataId))

  let items: TmdbTvItem[] = []

  if (type === 'trending') {
    const url = new URL(`${TMDB_BASE}/trending/tv/week`)
    url.searchParams.set('api_key', apiKey)
    const res = await fetch(url.toString(), { next: { revalidate: 3600 } })
    if (!res.ok)
      return NextResponse.json({ error: 'TMDB request failed', results: [] }, { status: 502 })
    const data = await res.json()
    items = (data.results ?? []).filter(isAnime)
  } else {
    const url = new URL(`${TMDB_BASE}/discover/tv`)
    url.searchParams.set('api_key', apiKey)
    url.searchParams.set('with_genres', String(ANIMATION_GENRE_ID))
    url.searchParams.set('with_original_language', 'ja')
    url.searchParams.set('sort_by', 'popularity.desc')
    url.searchParams.set('include_adult', 'false')
    const res = await fetch(url.toString(), { next: { revalidate: 3600 } })
    if (!res.ok)
      return NextResponse.json({ error: 'TMDB request failed', results: [] }, { status: 502 })
    const data = await res.json()
    items = data.results ?? []
  }

  const results = items.slice(0, 20).map((item) => toResult(item, watchlistIds))
  return NextResponse.json({ results })
}
