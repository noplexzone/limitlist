import { redirect } from 'next/navigation'
import { requireAuth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { getTmdbProvider } from '@/lib/tmdb'
import Nav from '@/components/Nav'
import AnimeDetailsClient, { type AnimeDetailsData } from './AnimeDetailsClient'

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
  })

  let data: AnimeDetailsData | null = null
  if (tracked) {
    data = {
      tracked: true,
      anime: {
        id: tracked.id,
        providerId: tracked.metadataId,
        providerName: tracked.metadataProvider,
        title: tracked.title,
        originalTitle: tracked.originalTitle,
        overview: tracked.overview,
        posterUrl: tracked.posterUrl,
        firstAiredAt: tracked.firstAiredAt?.toISOString(),
        genres: tracked.genres,
        studios: tracked.studios,
        episodesTotal: tracked.episodesTotal,
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
    const tmdb = getTmdbProvider()
    const details = tmdb ? await tmdb.getDetails(id) : null
    if (details) {
      data = { tracked: false, anime: details }
    }
  }

  return (
    <div className="min-h-screen bg-gray-950">
      <Nav />
      <main className="mx-auto max-w-6xl px-4 py-8">
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
