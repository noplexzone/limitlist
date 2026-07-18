import { prisma } from "../db"
import { getConfiguredNotifyEnabled, getConfiguredNotifyTrigger } from "../settings"
import { detectPendingNotifications } from "./detect"
import { dispatch, getEnabledChannels } from "./index"
import type { NotificationChannel } from "./types"

const DELIVERY_CLAIM_STALE_MS = 30 * 60 * 1000

export interface NotificationTaskResult {
  status: "success" | "skipped"
  message: string
}

interface NotificationIdentity {
  animeShowId: string
  seasonNumber: number
  episodeNumber: number
  trigger: string
}

interface DeliveryClaim {
  id: string
  channel: NotificationChannel
  claimedAt: Date
}

function isUniqueConstraintError(error: unknown): boolean {
  return typeof error === "object" && error !== null && "code" in error && error.code === "P2002"
}

async function claimDelivery(
  notification: NotificationIdentity,
  channel: NotificationChannel,
  now: Date = new Date(),
): Promise<DeliveryClaim | null> {
  const key = {
    animeShowId: notification.animeShowId,
    seasonNumber: notification.seasonNumber,
    episodeNumber: notification.episodeNumber,
    trigger: notification.trigger,
    channel,
  }
  const existing = await prisma.notificationLog.findUnique({
    where: { animeShowId_seasonNumber_episodeNumber_trigger_channel: key },
  })
  if (existing?.status === "sent") return null

  if (!existing) {
    try {
      const created = await prisma.notificationLog.create({
        data: { ...key, status: "sending", message: "Delivery in progress", sentAt: now },
      })
      return { id: created.id, channel, claimedAt: now }
    } catch (error) {
      if (isUniqueConstraintError(error)) return null
      throw error
    }
  }

  const staleBefore = new Date(now.getTime() - DELIVERY_CLAIM_STALE_MS)
  const retryable = existing.status === "failed" ||
    (existing.status === "sending" && existing.sentAt <= staleBefore)
  if (!retryable) return null

  const claimed = await prisma.notificationLog.updateMany({
    where: { id: existing.id, status: existing.status, sentAt: existing.sentAt },
    data: { status: "sending", message: "Delivery in progress", sentAt: now },
  })
  return claimed.count === 1 ? { id: existing.id, channel, claimedAt: now } : null
}

export async function runNotificationTask(): Promise<NotificationTaskResult> {
  if (!await getConfiguredNotifyEnabled()) {
    return { status: "skipped", message: "Notifications are disabled" }
  }

  const channels = await getEnabledChannels()
  if (!channels.length) {
    return { status: "skipped", message: "No notification channels are enabled" }
  }

  const trigger = await getConfiguredNotifyTrigger()
  const detection = await detectPendingNotifications(trigger, channels)
  let successfulDeliveries = 0
  let failedDeliveries = 0
  let claimedElsewhere = 0

  for (const notification of detection.notifications) {
    const claims = (await Promise.all(
      notification.channels.map((channel) => claimDelivery(notification, channel)),
    )).filter((claim): claim is DeliveryClaim => claim !== null)
    claimedElsewhere += notification.channels.length - claims.length
    if (!claims.length) continue

    const results = await dispatch(notification.payload, claims.map((claim) => claim.channel))
    const claimsByChannel = new Map(claims.map((claim) => [claim.channel, claim]))
    await Promise.all(results.map(async (result) => {
      if (result.ok) successfulDeliveries += 1
      else failedDeliveries += 1
      const claim = claimsByChannel.get(result.channel)
      if (!claim) return
      await prisma.notificationLog.updateMany({
        where: { id: claim.id, status: "sending", sentAt: claim.claimedAt },
        data: {
          status: result.ok ? "sent" : "failed",
          message: result.ok ? "Delivered" : "Delivery failed",
          sentAt: new Date(),
        },
      })
    }))
  }

  return {
    status: "success",
    message: `Sent ${successfulDeliveries} notifications across ${channels.length} enabled channels, ${failedDeliveries} failed; ${detection.skippedCandidateCount} candidates skipped (${detection.dataLimitedCount} data-limited), ${claimedElsewhere} deliveries already claimed`,
  }
}
