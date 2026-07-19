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
import { decodeCursor } from '@/lib/discover-pagination'
import { getAnimeRootTitle } from '@/lib/anime-title'

const DISCOVER_TARGET = 35
const VALID_FEED_TYPES = new Set<AniListFeedType>(['popular', 'trending', 'top-rated', 'upcoming'])

function feedTypeFromRequest(req: NextRequest): AniListFeedType {
  const type = req.nextUrl.searchParams.get('type')
  return (type && VALID_FEED_TYPES.has(type as AniListFeedType)) ? (type as AniListFeedType) : 'popular'
}

function displayPageFromRequest(req: NextRequest): number {
  const raw = Number(req.nextUrl.searchParams.get('page') ?? '1')
  return Number.isFinite(raw) ? Math.min(Math.max(Math.floor(raw), 1), 9999) : 1
}

export async function GET(req: NextRequest) {
  const user = await requireAuth()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const rawCursor = req.nextUrl.searchParams.get('cursor') ?? ''
  if (rawCursor) {
    const parsed = decodeCursor(rawCursor)
    if (!parsed) return NextResponse.json({ error: 'Invalid cursor' }, { status: 400 })
  }

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
    const page = displayPageFromRequest(req)
    const discoverPage = await fetchAniListDiscover(feedTypeFromRequest(req), rawCursor || null)
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
      pageSize: DISCOVER_TARGET,
      hasNextPage: discoverPage.hasNextPage,
      nextCursor: discoverPage.nextCursor,
      results,
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'AniList request failed'
    return NextResponse.json({ error: message, results: [] }, { status: 502 })
  }
}
