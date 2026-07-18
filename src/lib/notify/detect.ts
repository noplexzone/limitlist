import { prisma } from "../db"
import type { NotifyTrigger } from "../settings"
import { getConfiguredTvdbProvider } from "../tvdb"
import { getEnabledChannels } from "./index"
import { deriveLatestEpisode, pendingChannelsForEpisode } from "./detect-logic"
import type { NotificationChannel, NotificationPayload } from "./types"

const FIRST_RUN_LOOKBACK_MS = 14 * 24 * 60 * 60 * 1000

export interface PendingNotification {
  animeShowId: string
  metadataId: string
  seasonNumber: number
  episodeNumber: number
  trigger: NotifyTrigger
  channels: NotificationChannel[]
  payload: NotificationPayload
}

export interface PendingNotificationDetection {
  notifications: PendingNotification[]
  candidateCount: number
  skippedCandidateCount: number
  dataLimitedCount: number
}

function episodeLabel(seasonNumber: number, episodeNumber: number): string {
  return `S${String(seasonNumber).padStart(2, "0")}E${String(episodeNumber).padStart(2, "0")}`
}

function appEpisodeUrl(metadataId: string): string | undefined {
  const configuredBase = process.env.APP_URL?.trim() || process.env.NEXT_PUBLIC_APP_URL?.trim()
  if (!configuredBase) return undefined
  try {
    const base = new URL(configuredBase)
    if (base.protocol !== "http:" && base.protocol !== "https:") return undefined
    return new URL(`/anime/tvdb/${encodeURIComponent(metadataId)}`, base).toString()
  } catch {
    return undefined
  }
}

export async function detectPendingNotifications(
  trigger: NotifyTrigger,
  enabledChannels?: NotificationChannel[],
  now: Date = new Date(),
): Promise<PendingNotificationDetection> {
  const channels = enabledChannels ?? await getEnabledChannels()
  if (!channels.length) {
    return { notifications: [], candidateCount: 0, skippedCandidateCount: 0, dataLimitedCount: 0 }
  }

  // The bounded 14-day query is the deliberate first-run backfill guard.
  const candidates = await prisma.animeShow.findMany({
    where: {
      metadataProvider: "tvdb",
      status: { notIn: ["PLAN_TO_WATCH", "DROPPED"] },
      lastAiredAt: { gte: new Date(now.getTime() - FIRST_RUN_LOOKBACK_MS), lte: now },
    },
    include: {
      episodeWatches: { where: { watched: true } },
      notificationLogs: { where: { trigger, channel: { in: channels } } },
    },
  })

  const tvdb = await getConfiguredTvdbProvider()
  const notifications: PendingNotification[] = []
  let dataLimitedCount = 0
  let skippedCandidateCount = 0

  for (const show of candidates) {
    let details = null
    if (tvdb?.getDetails) {
      try {
        details = await tvdb.getDetails(show.metadataId)
      } catch {
        details = null
      }
    }
    const episode = show.lastAiredAt
      ? deriveLatestEpisode(details?.seasons, show.lastAiredAt, show.lastEpisodeNum)
      : null
    if (!episode) {
      dataLimitedCount += 1
      skippedCandidateCount += 1
      continue
    }

    if (
      trigger === "aired-unwatched" &&
      show.episodeWatches.some((watch) =>
        watch.watched &&
        watch.seasonNumber === episode.seasonNumber &&
        watch.episodeNumber === episode.episodeNumber,
      )
    ) {
      skippedCandidateCount += 1
      continue
    }

    const event = {
      animeShowId: show.id,
      seasonNumber: episode.seasonNumber,
      episodeNumber: episode.episodeNumber,
      trigger,
    }
    const pendingChannels = pendingChannelsForEpisode(channels, show.notificationLogs, event)
    if (!pendingChannels.length) {
      skippedCandidateCount += 1
      continue
    }

    const label = episodeLabel(episode.seasonNumber, episode.episodeNumber)
    notifications.push({
      ...event,
      metadataId: show.metadataId,
      channels: pendingChannels,
      payload: {
        title: `New episode: ${show.title}`,
        body: episode.title
          ? `${label} — ${episode.title} has aired.`
          : `${label} has aired.`,
        showTitle: show.title,
        episodeLabel: label,
        url: appEpisodeUrl(show.metadataId),
        posterUrl: show.posterUrl ?? undefined,
      },
    })
  }

  return {
    notifications,
    candidateCount: candidates.length,
    skippedCandidateCount,
    dataLimitedCount,
  }
}

export async function findPendingNotifications(trigger: NotifyTrigger): Promise<PendingNotification[]> {
  return (await detectPendingNotifications(trigger)).notifications
}
