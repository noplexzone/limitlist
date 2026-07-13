import { prisma } from './db'
import { getTmdbProvider } from './tmdb'

export interface RefreshResult {
  showId: string
  title: string
  success: boolean
  error?: string
}

export async function refreshShowAiring(showId: string): Promise<RefreshResult> {
  const show = await prisma.animeShow.findUnique({ where: { id: showId } })
  if (!show) return { showId, title: '', success: false, error: 'Show not found' }

  if (show.metadataProvider !== 'tmdb') {
    return { showId, title: show.title, success: false, error: 'Not a TMDB show' }
  }

  const provider = getTmdbProvider()
  if (!provider) {
    return { showId, title: show.title, success: false, error: 'TMDB_API_KEY not configured' }
  }

  let airingInfo
  try {
    airingInfo = await provider.getAiringDetails(show.metadataId)
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Unknown error'
    return { showId, title: show.title, success: false, error: `TMDB fetch failed: ${msg}` }
  }

  if (!airingInfo) {
    return { showId, title: show.title, success: false, error: 'TMDB returned no data' }
  }

  const upToDateBecameStale =
    show.status === 'UP_TO_DATE' &&
    !show.upToDateStale &&
    typeof airingInfo.lastEpisodeNum === 'number' &&
    airingInfo.lastEpisodeNum > (show.upToDateEpisodeNum ?? 0)

  await prisma.animeShow.update({
    where: { id: showId },
    data: {
      airingStatus: airingInfo.airingStatus,
      nextEpisodeNum: airingInfo.nextEpisodeNum,
      nextAiringAt: airingInfo.nextAiringAt,
      lastEpisodeNum: airingInfo.lastEpisodeNum,
      lastAiredAt: airingInfo.lastAiredAt,
      airingRefreshedAt: new Date(),
      ...(upToDateBecameStale ? { upToDateStale: true } : {}),
    },
  })

  // Auto-create a reminder for the next episode if it airs in the future
  if (airingInfo.nextAiringAt && airingInfo.nextAiringAt > new Date()) {
    await prisma.episodeReminder.upsert({
      where: {
        animeShowId_airsAt: {
          animeShowId: showId,
          airsAt: airingInfo.nextAiringAt,
        },
      },
      create: {
        animeShowId: showId,
        episodeNumber: airingInfo.nextEpisodeNum,
        airsAt: airingInfo.nextAiringAt,
      },
      update: {
        episodeNumber: airingInfo.nextEpisodeNum,
      },
    })
  }

  return { showId, title: show.title, success: true }
}

export async function refreshAllShowsAiring(): Promise<RefreshResult[]> {
  const shows = await prisma.animeShow.findMany({
    where: { metadataProvider: 'tmdb' },
    select: { id: true },
  })

  const results: RefreshResult[] = []
  for (const show of shows) {
    const result = await refreshShowAiring(show.id)
    results.push(result)
  }
  return results
}
