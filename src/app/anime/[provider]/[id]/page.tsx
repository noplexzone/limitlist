import { redirect } from 'next/navigation'
import { requireAuth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { getConfiguredTmdbProvider } from '@/lib/tmdb'
import type { MetadataSeasonSummary, MetadataVoiceCastGroup } from '@/lib/providers'
import { fetchJikanVoiceCast } from '@/lib/jikan'
import {
  buildAniListRecommendations,
  buildAniListRelatedMovies,
  buildAniListSeasons,
  buildAniListVoiceCast,
  fetchAniListDetailById,
  findAniListDetailForAnime,
  mapAniListDetailToMetadata,
  mergeVoiceCast,
  type AniListDetailMedia,
} from '@/lib/anilist'
import Nav from '@/components/Nav'
import AnimeDetailsClient, { type AnimeDetailsData } from './AnimeDetailsClient'

async function enrichSeasonEpisodes(
  tmdb: Awaited<ReturnType<typeof getConfiguredTmdbProvider>>,
  id: string,
  seasons?: MetadataSeasonSummary[]
): Promise<MetadataSeasonSummary[] | undefined> {
  if (!tmdb || !seasons?.length) return seasons
  const nonSpecials = seasons.filter((season) => season.seasonNumber > 0)
  const prioritized = nonSpecials
    .slice()
    .sort((a, b) => b.seasonNumber - a.seasonNumber)
    .slice(0, 2)
  const episodeMaps = await Promise.all(
    prioritized.map(async (season) => ({
      seasonNumber: season.seasonNumber,
      episodes: await tmdb.getSeasonEpisodes(id, season.seasonNumber).catch(() => null),
    }))
  )
  const bySeason = new Map(episodeMaps.map((item) => [item.seasonNumber, item.episodes]))
  return seasons.map((season) => ({
    ...season,
    episodes: bySeason.get(season.seasonNumber) ?? undefined,
  }))
}

function mergeVoiceCastPreferJikan(jikan?: MetadataVoiceCastGroup | null, anilist?: MetadataVoiceCastGroup | null): MetadataVoiceCastGroup | undefined {
  return mergeVoiceCast(jikan, anilist)
}

async function getAniListDetailForPage(options: {
  provider: string
  id: string
  sourceProvider?: string | null
  sourceId?: string | null
  titles: Array<string | null | undefined>
  year?: number | null
}): Promise<AniListDetailMedia | null> {
  if (options.provider === 'anilist') return fetchAniListDetailById(options.id)
  if (options.sourceProvider === 'anilist' && options.sourceId) return fetchAniListDetailById(options.sourceId)
  return findAniListDetailForAnime(options.titles, options.year)
}

export default async function AnimeDetailsPage({
  params,
}: {
  params: Promise<{ provider: string; id: string }>
}) {
  const user = await requireAuth()
  if (!user) redirect('/login')

  const { provider, id } = await params
  const tracked = provider === 'anilist'
    ? await prisma.animeShow.findFirst({
        where: { OR: [{ metadataProvider: 'anilist', metadataId: id }, { sourceProvider: 'anilist', sourceId: id }] },
        include: { childRatings: true },
      })
    : await prisma.animeShow.findUnique({
        where: { metadataProvider_metadataId: { metadataProvider: provider, metadataId: id } },
        include: { childRatings: true },
      })

  let data: AnimeDetailsData | null = null
  if (tracked) {
    let enrichedDetails = null
    const tmdb = tracked.metadataProvider === 'tmdb' ? await getConfiguredTmdbProvider() : null
    if (tmdb) {
      enrichedDetails = await tmdb.getDetails(tracked.metadataId)
      if (enrichedDetails?.seasons) {
        enrichedDetails.seasons = await enrichSeasonEpisodes(tmdb, tracked.metadataId, enrichedDetails.seasons)
      }
    }

    const anilistDetail = await getAniListDetailForPage({
      provider,
      id,
      sourceProvider: tracked.sourceProvider,
      sourceId: tracked.sourceId,
      titles: [tracked.title, tracked.originalTitle, enrichedDetails?.title, enrichedDetails?.originalTitle],
      year: tracked.firstAiredAt?.getFullYear(),
    }).catch(() => null)

    const [jikanVoiceCast] = await Promise.all([
      fetchJikanVoiceCast(
        [tracked.title, tracked.originalTitle, enrichedDetails?.title, enrichedDetails?.originalTitle],
        tracked.firstAiredAt?.getFullYear()
      ),
    ])
    const anilistVoiceCast = anilistDetail ? buildAniListVoiceCast(anilistDetail) : undefined
    const voiceCast = mergeVoiceCastPreferJikan(jikanVoiceCast, anilistVoiceCast)
    const anilistSeasons = anilistDetail ? buildAniListSeasons(anilistDetail) : undefined
    const recommendations = anilistDetail ? buildAniListRecommendations(anilistDetail) : []
    const relatedMovies = anilistDetail ? buildAniListRelatedMovies(anilistDetail) : []

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
        overview: tracked.overview,
        posterUrl: tracked.posterUrl,
        firstAiredAt: tracked.firstAiredAt?.toISOString(),
        genres: anilistDetail?.genres ?? enrichedDetails?.genres ?? tracked.genres,
        studios: enrichedDetails?.studios ?? tracked.studios,
        episodesTotal: anilistSeasons?.reduce((sum, season) => sum + (season.episodeCount ?? 0), 0) ?? enrichedDetails?.episodesTotal ?? tracked.episodesTotal,
        voteAverage: enrichedDetails?.voteAverage ?? (anilistDetail?.averageScore ? anilistDetail.averageScore / 10 : undefined),
        voteCount: enrichedDetails?.voteCount,
        popularity: enrichedDetails?.popularity ?? anilistDetail?.popularity ?? undefined,
        originalLanguage: enrichedDetails?.originalLanguage,
        originCountries: enrichedDetails?.originCountries,
        contentRating: enrichedDetails?.contentRating,
        cast: enrichedDetails?.cast,
        voiceCast,
        seasons: anilistSeasons?.length ? anilistSeasons : enrichedDetails?.seasons,
        recommendations,
        relatedMovies,
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
  } else if (provider === 'tmdb') {
    const tmdb = await getConfiguredTmdbProvider()
    const details = tmdb ? await tmdb.getDetails(id) : null
    if (tmdb && details) {
      const anilistDetail = await findAniListDetailForAnime([details.title, details.originalTitle], details.firstAiredAt ? Number(details.firstAiredAt.slice(0, 4)) : null).catch(() => null)
      const [tmdbSeasons, jikanVoiceCast] = await Promise.all([
        enrichSeasonEpisodes(tmdb, id, details.seasons),
        fetchJikanVoiceCast(
          [details.title, details.originalTitle],
          details.firstAiredAt ? Number(details.firstAiredAt.slice(0, 4)) : null
        ),
      ])
      const anilistSeasons = anilistDetail ? buildAniListSeasons(anilistDetail) : undefined
      const voiceCast = mergeVoiceCastPreferJikan(jikanVoiceCast, anilistDetail ? buildAniListVoiceCast(anilistDetail) : undefined)
      data = {
        tracked: false,
        anime: {
          ...details,
          seasons: anilistSeasons?.length ? anilistSeasons : tmdbSeasons,
          voiceCast,
          recommendations: anilistDetail ? buildAniListRecommendations(anilistDetail) : [],
          relatedMovies: anilistDetail ? buildAniListRelatedMovies(anilistDetail) : [],
          childRatings: [],
        },
      }
    }
  } else if (provider === 'anilist') {
    const anilistDetail = await fetchAniListDetailById(id)
    if (anilistDetail) {
      const details = mapAniListDetailToMetadata(anilistDetail)
      data = { tracked: false, anime: { ...details, childRatings: [] } }
    }
  }

  return (
    <div className="min-h-screen bg-gray-950">
      <Nav />
      <main className="mx-auto max-w-7xl px-4 py-8">
        {data ? (
          <AnimeDetailsClient initialData={data} />
        ) : (
          <div className="rounded-2xl border border-gray-800 bg-gray-900 p-8 text-center text-gray-400">
            Anime not found or provider unavailable.
          </div>
        )}
      </main>
    </div>
  )
}
