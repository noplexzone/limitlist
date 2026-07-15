import { prisma } from './db'
import { getConfiguredTvdbProvider } from './tvdb'
import type { ShowStatus } from './status'

export async function importTvdbShowToWatchlist(
  tvdbId: string,
  options: { status?: ShowStatus; plexRatingKey?: string | null } = {}
) {
  const existing = await prisma.animeShow.findUnique({
    where: { metadataProvider_metadataId: { metadataProvider: 'tvdb', metadataId: tvdbId } },
  })
  if (existing) return existing

  const tvdb = await getConfiguredTvdbProvider()
  if (!tvdb) throw new Error('TVDB API key is required before TVDB imports can be monitored.')
  const details = await tvdb.getDetails(tvdbId)
  if (!details) throw new Error('TVDB details could not be loaded')

  return prisma.animeShow.create({
    data: {
      metadataProvider: 'tvdb',
      metadataId: tvdbId,
      sourceProvider: null,
      sourceId: null,
      title: details.title,
      originalTitle: details.originalTitle ?? null,
      overview: details.overview ?? null,
      posterUrl: details.posterUrl ?? null,
      firstAiredAt: details.firstAiredAt ? new Date(details.firstAiredAt) : null,
      genres: details.genres?.join(', ') ?? null,
      studios: details.studios?.join(', ') ?? null,
      episodesTotal: details.episodesTotal ?? null,
      status: options.status ?? 'PLAN_TO_WATCH',
      plexRatingKey: options.plexRatingKey ?? null,
    },
  })
}
