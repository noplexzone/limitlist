export interface ContinueEpisode {
  seasonNumber: number
  episodeNumber: number
  episodeName: string | null
  furthestWatchedAt: Date | null
}

/**
 * Given a show's EpisodeWatch rows, finds the first unwatched episode after the
 * furthest watched episode. Season-0 (specials) rows are ignored. Unwatched gaps
 * before the furthest watched episode are also ignored — only the hole immediately
 * after matters. Returns null when there is no watch progress or the show is fully
 * watched (no unwatched rows after the furthest watched row).
 */
export function nextContinueEpisode(
  watches: ReadonlyArray<{
    seasonNumber: number
    episodeNumber: number
    watched: boolean
    watchedAt?: Date | null
    episodeName?: string | null
  }>
): ContinueEpisode | null {
  const mainSeason = watches.filter((w) => w.seasonNumber > 0)
  const sorted = mainSeason.slice().sort((a, b) =>
    a.seasonNumber !== b.seasonNumber
      ? a.seasonNumber - b.seasonNumber
      : a.episodeNumber - b.episodeNumber
  )

  let furthestIdx = -1
  for (let i = 0; i < sorted.length; i++) {
    if (sorted[i].watched) furthestIdx = i
  }
  if (furthestIdx === -1) return null

  const furthest = sorted[furthestIdx]

  for (let i = furthestIdx + 1; i < sorted.length; i++) {
    if (!sorted[i].watched) {
      return {
        seasonNumber: sorted[i].seasonNumber,
        episodeNumber: sorted[i].episodeNumber,
        episodeName: sorted[i].episodeName ?? null,
        furthestWatchedAt: furthest.watchedAt ?? null,
      }
    }
  }

  return null
}
