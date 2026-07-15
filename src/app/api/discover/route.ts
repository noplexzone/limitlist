import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import {
  fetchAniListDiscover,
  getAniListDisplayTitle,
  getAniListOriginalTitle,
  getAniListStartDate,
  getAniListTitles,
  type AniListFeedType,
} from '@/lib/anilist'
import { getAnimeRootTitle } from '@/lib/anime-title'

const VALID_FEED_TYPES = new Set<AniListFeedType>(['popular', 'trending', 'top-rated', 'upcoming'])

function feedTypeFromRequest(req: NextRequest): AniListFeedType {
  const type = req.nextUrl.searchParams.get('type')
  return (type && VALID_FEED_TYPES.has(type as AniListFeedType)) ? (type as AniListFeedType) : 'popular'
}

function pageFromRequest(req: NextRequest): number {
  const raw = Number(req.nextUrl.searchParams.get('page') ?? '1')
  return Number.isFinite(raw) ? Math.min(Math.max(Math.floor(raw), 1), 25) : 1
}

export async function GET(req: NextRequest) {
  const user = await requireAuth()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const existing = await prisma.animeShow.findMany({
    select: {
      metadataProvider: true,
      metadataId: true,
      sourceProvider: true,
      sourceId: true,
      title: true,
      originalTitle: true,
    },
  })
  const existingProviderIds = new Set(existing.map((s) => `${s.metadataProvider}:${s.metadataId}`))
  const existingSourceIds = new Set(
    existing
      .filter((s) => s.sourceProvider && s.sourceId)
      .map((s) => `${s.sourceProvider}:${s.sourceId}`)
  )
  const existingRootTitles = new Set(
    existing.flatMap((s) => [getAnimeRootTitle(s.title), getAnimeRootTitle(s.originalTitle)]).filter(Boolean)
  )

  try {
    const page = pageFromRequest(req)
    const pageSize = 42
    const discoverPage = await fetchAniListDiscover(feedTypeFromRequest(req), page, pageSize)
    const results = discoverPage.media.map((item) => {
      const title = getAniListDisplayTitle(item)
      const rootTitles = getAniListTitles(item).map(getAnimeRootTitle).filter(Boolean)
      const inWatchlist =
        existingProviderIds.has(`anilist:${item.id}`) ||
        existingSourceIds.has(`anilist:${item.id}`) ||
        rootTitles.some((rootTitle) => existingRootTitles.has(rootTitle))

      return {
        sourceProvider: 'anilist',
        sourceId: String(item.id),
        providerId: String(item.id),
        providerName: 'anilist',
        title,
        titles: getAniListTitles(item),
        originalTitle: getAniListOriginalTitle(item),
        overview: item.description || undefined,
        posterUrl: item.coverImage?.extraLarge || item.coverImage?.large || undefined,
        firstAiredAt: getAniListStartDate(item),
        genres: item.genres ?? [],
        episodesTotal: item.episodes ?? undefined,
        averageScore: item.averageScore ?? undefined,
        popularity: item.popularity ?? undefined,
        inWatchlist,
        importable: true,
        mappingStatus: 'TVDB link resolved on import',
      }
    })

    return NextResponse.json({
      provider: 'anilist',
      linkedProvider: 'tvdb-on-import',
      page,
      pageSize,
      hasNextPage: discoverPage.hasNextPage,
      results,
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'AniList request failed'
    return NextResponse.json({ error: message, results: [] }, { status: 502 })
  }
}
