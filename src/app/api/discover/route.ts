import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import {
  fetchAniListDiscover,
  getAniListDisplayTitle,
  getAniListOriginalTitle,
  getAniListStartDate,
  getAniListTitles,
  getAniListYear,
} from '@/lib/anilist'
import { getAnimeRootTitle } from '@/lib/anime-title'
import { getTmdbProvider } from '@/lib/tmdb'

type FeedType = 'popular' | 'trending'

function feedTypeFromRequest(req: NextRequest): FeedType {
  return req.nextUrl.searchParams.get('type') === 'trending' ? 'trending' : 'popular'
}

export async function GET(req: NextRequest) {
  const user = await requireAuth()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const tmdb = getTmdbProvider()
  if (!tmdb) {
    return NextResponse.json(
      {
        error:
          'TMDB_API_KEY not configured. Discover now uses AniList for rankings, but TMDB linking is required before imported shows can be monitored.',
        results: [],
      },
      { status: 422 }
    )
  }

  const existing = await prisma.animeShow.findMany({
    select: {
      metadataProvider: true,
      metadataId: true,
      title: true,
      originalTitle: true,
    },
  })
  const existingTmdbIds = new Set(
    existing.filter((s) => s.metadataProvider === 'tmdb').map((s) => s.metadataId)
  )
  const existingRootTitles = new Set(
    existing.flatMap((s) => [getAnimeRootTitle(s.title), getAnimeRootTitle(s.originalTitle)]).filter(Boolean)
  )

  try {
    const media = await fetchAniListDiscover(feedTypeFromRequest(req))
    const results = []
    for (const item of media) {
      const anilistTitle = getAniListDisplayTitle(item)
      const originalTitle = getAniListOriginalTitle(item)
      const startDate = getAniListStartDate(item)
      const sourceRootTitles = getAniListTitles(item).map(getAnimeRootTitle).filter(Boolean)
      const titleAlreadyTracked = sourceRootTitles.some((title) => existingRootTitles.has(title))

      const tmdbMatch = await tmdb.findShowForAnime(getAniListTitles(item), getAniListYear(item))
      if (!tmdbMatch) {
        results.push({
          sourceProvider: 'anilist',
          sourceId: String(item.id),
          providerId: '',
          providerName: 'tmdb',
          title: anilistTitle,
          originalTitle,
          overview: item.description || undefined,
          posterUrl: item.coverImage?.extraLarge || item.coverImage?.large || undefined,
          firstAiredAt: startDate,
          inWatchlist: titleAlreadyTracked,
          importable: false,
          mappingStatus: 'No TMDB show match',
        })
        continue
      }

      const rootTitles = [
        ...sourceRootTitles,
        getAnimeRootTitle(tmdbMatch.title),
        getAnimeRootTitle(tmdbMatch.originalTitle),
      ].filter(Boolean)
      const inWatchlist =
        existingTmdbIds.has(tmdbMatch.providerId) || rootTitles.some((title) => existingRootTitles.has(title))

      // Keep multiple AniList seasons visible, but all of them point at the same TMDB show
      // for import/monitoring. The client marks every card with the same TMDB id as added.
      results.push({
        sourceProvider: 'anilist',
        sourceId: String(item.id),
        providerId: tmdbMatch.providerId,
        providerName: 'tmdb',
        title: anilistTitle,
        originalTitle: originalTitle ?? tmdbMatch.originalTitle,
        overview: item.description || tmdbMatch.overview,
        posterUrl: item.coverImage?.extraLarge || item.coverImage?.large || tmdbMatch.posterUrl,
        firstAiredAt: startDate ?? tmdbMatch.firstAiredAt,
        linkedTitle: tmdbMatch.title,
        linkedProviderId: tmdbMatch.providerId,
        inWatchlist,
        importable: true,
      })
      if (results.filter((r) => r.importable).length >= 24) break
    }

    return NextResponse.json({ provider: 'anilist', linkedProvider: 'tmdb', results })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'AniList request failed'
    return NextResponse.json({ error: message, results: [] }, { status: 502 })
  }
}
