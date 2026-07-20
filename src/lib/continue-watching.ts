export interface CanonicalEpisode {
  seasonNumber: number
  episodeNumber: number
  name: string | null
  airDate: string | null
}

export interface ContinueEpisode {
  seasonNumber: number
  episodeNumber: number
  episodeName: string | null
  furthestWatchedAt: Date | null
}

/**
 * Finds the first unwatched episode after the furthest watched episode.
 *
 * Canonical mode (canonicalEpisodes provided): TVDB episode list is the ground
 * truth. Season-0 specials and future/unaired episodes are excluded. Watch state
 * is derived from watches keyed by season+episode, so manual-only progress
 * (watched=true rows with no following unwatched row) produces the correct next
 * canonical episode.
 *
 * Ledger-only fallback (no canonicalEpisodes): uses watches directly, ignoring
 * season-0 rows. Unwatched gaps before the furthest watched episode are ignored.
 * Use this when TVDB is unavailable.
 */
export function nextContinueEpisode(
  watches: ReadonlyArray<{
    seasonNumber: number
    episodeNumber: number
    watched: boolean
    watchedAt?: Date | null
    episodeName?: string | null
  }>,
  canonicalEpisodes?: ReadonlyArray<CanonicalEpisode>,
  now: Date = new Date()
): ContinueEpisode | null {
  if (canonicalEpisodes !== undefined) {
    // Filter out season-0 specials and future/unaired episodes.
    const aired = canonicalEpisodes.filter((ep) => {
      if (ep.seasonNumber <= 0) return false
      if (!ep.airDate) return false
      const d = new Date(ep.airDate)
      return !Number.isNaN(d.getTime()) && d.getTime() <= now.getTime()
    })

    const sorted = aired.slice().sort((a, b) =>
      a.seasonNumber !== b.seasonNumber
        ? a.seasonNumber - b.seasonNumber
        : a.episodeNumber - b.episodeNumber
    )

    // Build watch-state map; keep most recent watchedAt per episode.
    const watchMap = new Map<string, { watched: boolean; watchedAt: Date | null }>()
    for (const w of watches) {
      const key = `${w.seasonNumber}:${w.episodeNumber}`
      const existing = watchMap.get(key)
      const wAt = w.watchedAt ?? null
      if (
        !existing ||
        (w.watched && !existing.watched) ||
        (w.watched && existing.watched && wAt && existing.watchedAt && wAt > existing.watchedAt)
      ) {
        watchMap.set(key, { watched: w.watched, watchedAt: wAt })
      }
    }

    let furthestIdx = -1
    for (let i = 0; i < sorted.length; i++) {
      if (watchMap.get(`${sorted[i].seasonNumber}:${sorted[i].episodeNumber}`)?.watched) {
        furthestIdx = i
      }
    }
    if (furthestIdx === -1) return null

    const furthestKey = `${sorted[furthestIdx].seasonNumber}:${sorted[furthestIdx].episodeNumber}`
    const furthestWatchedAt = watchMap.get(furthestKey)?.watchedAt ?? null

    for (let i = furthestIdx + 1; i < sorted.length; i++) {
      if (!watchMap.get(`${sorted[i].seasonNumber}:${sorted[i].episodeNumber}`)?.watched) {
        return {
          seasonNumber: sorted[i].seasonNumber,
          episodeNumber: sorted[i].episodeNumber,
          episodeName: sorted[i].name ?? null,
          furthestWatchedAt,
        }
      }
    }

    return null
  }

  // Ledger-only fallback: derive next episode directly from watch rows.
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
