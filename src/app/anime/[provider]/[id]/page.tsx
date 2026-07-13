import { redirect } from 'next/navigation'
import { requireAuth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { getConfiguredTmdbProvider } from '@/lib/tmdb'
import type { MetadataSeasonSummary } from '@/lib/providers'
import { fetchJikanVoiceCast } from '@/lib/jikan'
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

export default async function AnimeDetailsPage({
  params,
}: {
  params: Promise<{ provider: string; id: string }>
}) {
  const user = await requireAuth()
  if (!user) redirect('/login')

  const { provider, id } = await params
  const tracked = await prisma.animeShow.findUnique({
    where: { metadataProvider_metadataId: { metadataProvider: provider, metadataId: id } },
    include: { childRatings: true },
  })

  let data: AnimeDetailsData | null = null
  if (tracked) {
    let enrichedDetails = null
    const tmdb = provider === 'tmdb' ? await getConfiguredTmdbProvider() : null
    if (tmdb) {
      enrichedDetails = await tmdb.getDetails(id)
      if (enrichedDetails?.seasons) {
        enrichedDetails.seasons = await enrichSeasonEpisodes(tmdb, id, enrichedDetails.seasons)
      }
    }
    const [voiceCast, recommendations, relatedMovies] = await Promise.all([
      fetchJikanVoiceCast(
        [tracked.title, tracked.originalTitle, enrichedDetails?.title, enrichedDetails?.originalTitle],
        tracked.firstAiredAt?.getFullYear()
      ),
      provider === 'tmdb' && tmdb ? tmdb.getRecommendations(id).catch(() => []) : Promise.resolve([]),
      provider === 'tmdb' && tmdb ? tmdb.getRelatedMovies([tracked.title, tracked.originalTitle, enrichedDetails?.title, enrichedDetails?.originalTitle]).catch(() => []) : Promise.resolve([]),
    ])
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
        genres: enrichedDetails?.genres ?? tracked.genres,
        studios: enrichedDetails?.studios ?? tracked.studios,
        episodesTotal: enrichedDetails?.episodesTotal ?? tracked.episodesTotal,
        voteAverage: enrichedDetails?.voteAverage,
        voteCount: enrichedDetails?.voteCount,
        popularity: enrichedDetails?.popularity,
        originalLanguage: enrichedDetails?.originalLanguage,
        originCountries: enrichedDetails?.originCountries,
        contentRating: enrichedDetails?.contentRating,
        cast: enrichedDetails?.cast,
        voiceCast,
        seasons: enrichedDetails?.seasons,
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
        airingStatus: tracked.airingStatus,
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
      const [seasons, voiceCast, recommendations, relatedMovies] = await Promise.all([
        enrichSeasonEpisodes(tmdb, id, details.seasons),
        fetchJikanVoiceCast(
          [details.title, details.originalTitle],
          details.firstAiredAt ? Number(details.firstAiredAt.slice(0, 4)) : null
        ),
        tmdb.getRecommendations(id).catch(() => []),
        tmdb.getRelatedMovies([details.title, details.originalTitle]).catch(() => []),
      ])
      data = { tracked: false, anime: { ...details, seasons, voiceCast, recommendations, relatedMovies, childRatings: [] } }
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
