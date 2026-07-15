import { prisma } from './db'
import { getConfiguredTvdbProvider } from './tvdb'

export interface RefreshResult {
  showId: string
  title: string
  success: boolean
  error?: string
}

export async function refreshShowAiring(showId: string): Promise<RefreshResult> {
  const show = await prisma.animeShow.findUnique({ where: { id: showId } })
  if (!show) return { showId, title: '', success: false, error: 'Show not found' }

  const provider = show.metadataProvider === 'tvdb' ? await getConfiguredTvdbProvider() : null
  if (!provider?.getAiringDetails) {
    return { showId, title: show.title, success: false, error: `No airing provider configured for ${show.metadataProvider}` }
  }

  let airingInfo
  try {
    airingInfo = await provider.getAiringDetails(show.metadataId)
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Unknown error'
    return { showId, title: show.title, success: false, error: `${show.metadataProvider.toUpperCase()} fetch failed: ${msg}` }
  }

  if (!airingInfo) {
    return { showId, title: show.title, success: false, error: `${show.metadataProvider.toUpperCase()} returned no data` }
  }

  const providerLastAiredAt = airingInfo.lastAiredAt?.getTime() ?? null
  const baselineAiredAt = show.upToDateAiredAt?.getTime() ?? null
  const hasBaseline = baselineAiredAt !== null || show.upToDateEpisodeNum !== null
  const upToDateBecameStale =
    show.status === 'UP_TO_DATE' &&
    !show.upToDateStale &&
    hasBaseline &&
    ((providerLastAiredAt !== null && baselineAiredAt !== null && providerLastAiredAt > baselineAiredAt) ||
      (baselineAiredAt === null &&
        typeof airingInfo.lastEpisodeNum === 'number' &&
        typeof show.upToDateEpisodeNum === 'number' &&
        airingInfo.lastEpisodeNum > show.upToDateEpisodeNum))
  const initializeUpToDateBaseline = show.status === 'UP_TO_DATE' && !hasBaseline

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
      ...(initializeUpToDateBaseline
        ? { upToDateEpisodeNum: airingInfo.lastEpisodeNum, upToDateAiredAt: airingInfo.lastAiredAt }
        : {}),
    },
  })

  return { showId, title: show.title, success: true }
}

export async function refreshAllShowsAiring(): Promise<RefreshResult[]> {
  const shows = await prisma.animeShow.findMany({
    where: { metadataProvider: { in: ['tvdb'] } },
    select: { id: true },
  })

  const results: RefreshResult[] = []
  for (const show of shows) {
    const result = await refreshShowAiring(show.id)
    results.push(result)
  }
  return results
}
