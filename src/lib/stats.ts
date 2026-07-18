import type { AnimeShow } from '@prisma/client'

export interface StatusCounts {
  WATCHING: number
  PAUSED: number
  UP_TO_DATE: number
  COMPLETED: number
  PLAN_TO_WATCH: number
  DROPPED: number
}

export interface TokenCount {
  name: string
  count: number
}

export interface WatchStats {
  totalShows: number
  byStatus: StatusCounts
  completionRate: number
  topGenres: TokenCount[]
  topStudios: TokenCount[]
  averageRating: number | null
}

const GENRE_SKIP = new Set(['anime', 'animation', 'n/a'])
const STUDIO_SKIP = new Set(['n/a'])

function countTokens(
  shows: AnimeShow[],
  field: 'genres' | 'studios',
  topN: number
): TokenCount[] {
  const skipSet = field === 'genres' ? GENRE_SKIP : STUDIO_SKIP
  const counts = new Map<string, { display: string; count: number }>()
  for (const show of shows) {
    const raw = show[field]
    if (!raw) continue
    for (const token of raw.split(',')) {
      const trimmed = token.trim()
      if (!trimmed) continue
      const key = trimmed.toLowerCase()
      if (skipSet.has(key)) continue
      const entry = counts.get(key)
      if (entry) {
        entry.count++
      } else {
        counts.set(key, { display: trimmed, count: 1 })
      }
    }
  }
  return Array.from(counts.values())
    .sort((a, b) => b.count - a.count)
    .slice(0, topN)
    .map(({ display, count }) => ({ name: display, count }))
}

export function computeStats(shows: AnimeShow[]): WatchStats {
  const totalShows = shows.length

  const byStatus: StatusCounts = {
    WATCHING: 0,
    PAUSED: 0,
    UP_TO_DATE: 0,
    COMPLETED: 0,
    PLAN_TO_WATCH: 0,
    DROPPED: 0,
  }

  let ratingSum = 0
  let ratingCount = 0

  for (const show of shows) {
    const status = show.status as keyof StatusCounts
    if (status in byStatus) byStatus[status]++

    if (show.rating != null) {
      ratingSum += show.rating
      ratingCount++
    }
  }

  const completionRate = totalShows === 0 ? 0 : (byStatus.COMPLETED / totalShows) * 100
  const averageRating = ratingCount === 0 ? null : ratingSum / ratingCount

  return {
    totalShows,
    byStatus,
    completionRate,
    topGenres: countTokens(shows, 'genres', 10),
    topStudios: countTokens(shows, 'studios', 10),
    averageRating,
  }
}
