import { redirect } from 'next/navigation'
import { requireAuth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { getConfiguredTvdbProvider } from '@/lib/tvdb'
import { fetchAniListDetailById, findAniListDetailForAnime, mapAniListDetailToMetadata, stripAniListHtml } from '@/lib/anilist'
import { getDefaultCastLanguage } from '@/lib/settings'
import Nav from '@/components/Nav'
import AnimeDetailsClient, { type AnimeDetailsData } from './AnimeDetailsClient'

function pickRicherOverview(a: string | null | undefined, b: string | null | undefined): string | null | undefined {
  const sa = (a ?? '').trim()
  const sb = (b ?? '').trim()
  if (!sb) return sa || a
  if (!sa) return sb
  return sb.length > sa.length ? sb : sa
}

async function resolveAniListOverview(titles: (string | null | undefined)[], year: number | null): Promise<string | undefined> {
  try {
    const timer = new Promise<null>((resolve) => setTimeout(() => resolve(null), 5000))
    const detail = await Promise.race([findAniListDetailForAnime(titles, year), timer])
    return detail ? (stripAniListHtml(detail.description) || undefined) : undefined
  } catch {
    return undefined
  }
}


export default async function AnimeDetailsPage({
  params,
}: {
  params: Promise<{ provider: string; id: string }>
}) {
  const user = await requireAuth()
  if (!user) redirect('/login')

  const { provider, id } = await params
  const defaultCastLanguage = await getDefaultCastLanguage()
  const tracked = provider === 'anilist'
    ? await prisma.animeShow.findFirst({
        where: { OR: [{ metadataProvider: 'anilist', metadataId: id }, { sourceProvider: 'anilist', sourceId: id }] },
        include: { childRatings: true, episodeWatches: true },
      })
    : await prisma.animeShow.findUnique({
        where: { metadataProvider_metadataId: { metadataProvider: provider, metadataId: id } },
        include: { childRatings: true, episodeWatches: true },
      })

  let data: AnimeDetailsData | null = null
  if (tracked) {
    let enrichedDetails = null
    const metadata = tracked.metadataProvider === 'tvdb' ? await getConfiguredTvdbProvider() : null
    if (metadata?.getDetails) {
      enrichedDetails = await metadata.getDetails(tracked.metadataId)
    }


    const tvdbOverview = enrichedDetails?.overview ?? tracked.overview
    const anilistOverview = tracked.metadataProvider === 'tvdb'
      ? await resolveAniListOverview([tracked.title, tracked.originalTitle], tracked.firstAiredAt?.getFullYear() ?? null)
      : undefined
    const resolvedOverview = pickRicherOverview(tvdbOverview, anilistOverview) ?? tvdbOverview

    data = {
      tracked: true,
      anime: {
        id: tracked.id,
        providerId: tracked.metadataId,
        providerName: tracked.metadataProvider,
        sourceProvider: tracked.sourceProvider ?? undefined,
        sourceId: tracked.sourceId ?? undefined,
        title: tracked.title,
        originalTitle: tracked.originalTitle,
        overview: resolvedOverview,
        posterUrl: tracked.posterUrl,
        firstAiredAt: tracked.firstAiredAt?.toISOString(),
        genres: enrichedDetails?.genres ?? tracked.genres,
        studios: enrichedDetails?.studios ?? tracked.studios,
        episodesTotal: enrichedDetails?.episodesTotal ?? tracked.episodesTotal,
        voteAverage: enrichedDetails?.voteAverage,
        voteCount: enrichedDetails?.voteCount,
        popularity: enrichedDetails?.popularity,
        originalLanguage: enrichedDetails?.originalLanguage,
        originCountries: enrichedDetails?.originCountries,
        contentRating: enrichedDetails?.contentRating,
        voiceCast: undefined,
        seasons: enrichedDetails?.seasons,
        recommendations: [],
        relatedMovies: [],
        childRatings: tracked.childRatings.map((rating) => ({
          id: rating.id,
          kind: rating.kind,
          key: rating.key,
          providerName: rating.providerName,
          providerId: rating.providerId,
          seasonNumber: rating.seasonNumber,
          episodeNumber: rating.episodeNumber,
          title: rating.title,
          posterUrl: rating.posterUrl,
          airDate: rating.airDate?.toISOString(),
          rating: rating.rating,
        })),
        episodeWatches: tracked.episodeWatches.map((watch) => ({
          key: `${watch.seasonNumber}:${watch.episodeNumber}`,
          seasonNumber: watch.seasonNumber,
          episodeNumber: watch.episodeNumber,
          watched: watch.watched,
          watchedAt: watch.watchedAt?.toISOString(),
          source: watch.source,
        })),
        plexSyncedAt: tracked.plexSyncedAt?.toISOString(),
        nextEpisodeName: enrichedDetails?.nextEpisodeName,
        lastEpisodeName: enrichedDetails?.lastEpisodeName,
        status: tracked.status,
        rating: tracked.rating,
        airingStatus: enrichedDetails?.airingStatus ?? tracked.airingStatus,
        nextAiringAt: tracked.nextAiringAt?.toISOString(),
        nextEpisodeNum: tracked.nextEpisodeNum,
        lastEpisodeNum: tracked.lastEpisodeNum,
        upToDateStale: tracked.upToDateStale,
      },
    }
  } else if (provider === 'tvdb') {
    const tvdb = await getConfiguredTvdbProvider()
    const details = tvdb ? await tvdb.getDetails(id) : null
    if (tvdb && details) {
      const year = details.firstAiredAt ? new Date(details.firstAiredAt).getFullYear() : null
      const anilistOverview = await resolveAniListOverview([details.title, details.originalTitle], year)
      const overview = pickRicherOverview(details.overview, anilistOverview) ?? details.overview
      data = {
        tracked: false,
        anime: {
          ...details,
          overview,
          seasons: details.seasons,
          voiceCast: undefined,
          recommendations: [],
          relatedMovies: [],
          childRatings: [],
        },
      }
    }
  } else if (provider === 'anilist') {
    const anilistDetail = await fetchAniListDetailById(id)
    if (anilistDetail) {
      const details = mapAniListDetailToMetadata(anilistDetail)
      // Degraded fallback only: direct AniList detail pages have no TVDB record yet, so they keep AniList relation-synthesized seasons.
      data = { tracked: false, anime: { ...details, childRatings: [] } }
    }
  }

  return (
    <div className="min-h-screen bg-surface-950">
      <Nav />
      <main className="mx-auto max-w-7xl px-4 py-8">
        {data ? (
          <AnimeDetailsClient initialData={data} defaultCastLanguage={defaultCastLanguage} />
        ) : (
          <div className="rounded-2xl border border-surface-800 bg-surface-900 p-8 text-center text-surface-400">
            Anime not found or provider unavailable.
          </div>
        )}
      </main>
    </div>
  )
}
