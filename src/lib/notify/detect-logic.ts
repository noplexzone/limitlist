import type { MetadataSeasonSummary } from "../providers"
import type { NotificationChannel } from "./types"

export interface DerivedEpisode {
  seasonNumber: number
  episodeNumber: number
  title: string | null
}

interface NotificationIdentity {
  animeShowId: string
  seasonNumber: number
  episodeNumber: number
  trigger: string
}

interface NotificationLogIdentity {
  animeShowId: string
  seasonNumber: number | null
  episodeNumber: number | null
  trigger: string
  channel: string
  status: string
}

interface EpisodeCandidate extends DerivedEpisode {
  airedAt: number
}

const DAY_MS = 24 * 60 * 60 * 1000

function utcDay(value: string | Date): number | null {
  const date = value instanceof Date ? value : new Date(value)
  if (Number.isNaN(date.getTime())) return null
  return Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate())
}

export function deriveLatestEpisode(
  seasons: MetadataSeasonSummary[] | null | undefined,
  lastAiredAt: Date,
  lastEpisodeNum: number | null,
): DerivedEpisode | null {
  const targetDay = utcDay(lastAiredAt)
  if (targetDay == null) return null

  const candidates: EpisodeCandidate[] = []
  for (const season of seasons ?? []) {
    if (!Number.isInteger(season.seasonNumber) || season.seasonNumber < 0) continue
    for (const episode of season.episodes ?? []) {
      if (!Number.isInteger(episode.episodeNumber) || episode.episodeNumber < 1 || !episode.airDate) continue
      const airedAt = utcDay(episode.airDate)
      if (airedAt == null) continue
      candidates.push({
        seasonNumber: season.seasonNumber,
        episodeNumber: episode.episodeNumber,
        title: episode.name?.trim() || null,
        airedAt,
      })
    }
  }

  const exactDate = candidates.filter((episode) => episode.airedAt === targetDay)
  const exactDateAndNumber = exactDate.filter((episode) => episode.episodeNumber === lastEpisodeNum)
  const exact = lastEpisodeNum == null
    ? (exactDate.length === 1 ? exactDate[0] : null)
    : (exactDateAndNumber.length === 1 ? exactDateAndNumber[0] : null)
  if (exact) {
    const { seasonNumber, episodeNumber, title } = exact
    return { seasonNumber, episodeNumber, title }
  }

  if (lastEpisodeNum == null) return null
  const nearest = candidates
    .filter((episode) => episode.episodeNumber === lastEpisodeNum && Math.abs(episode.airedAt - targetDay) <= DAY_MS)
    .sort((a, b) => Math.abs(a.airedAt - targetDay) - Math.abs(b.airedAt - targetDay))
  if (!nearest.length) return null
  const closestDistance = Math.abs(nearest[0].airedAt - targetDay)
  if (nearest.filter((episode) => Math.abs(episode.airedAt - targetDay) === closestDistance).length !== 1) return null
  const { seasonNumber, episodeNumber, title } = nearest[0]
  return { seasonNumber, episodeNumber, title }
}

export function pendingChannelsForEpisode(
  enabledChannels: NotificationChannel[],
  logs: NotificationLogIdentity[],
  event: NotificationIdentity,
): NotificationChannel[] {
  const sentChannels = new Set(
    logs
      .filter((log) =>
        log.status === "sent" &&
        log.animeShowId === event.animeShowId &&
        log.seasonNumber === event.seasonNumber &&
        log.episodeNumber === event.episodeNumber &&
        log.trigger === event.trigger,
      )
      .map((log) => log.channel),
  )
  return enabledChannels.filter((channel) => !sentChannels.has(channel))
}
