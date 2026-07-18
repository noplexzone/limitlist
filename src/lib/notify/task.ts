import { prisma } from "../db"
import { getConfiguredNotifyEnabled, getConfiguredNotifyTrigger } from "../settings"
import { detectPendingNotifications } from "./detect"
import { dispatch, getEnabledChannels } from "./index"

export interface NotificationTaskResult {
  status: "success" | "skipped"
  message: string
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

  for (const notification of detection.notifications) {
    const results = await dispatch(notification.payload, notification.channels)
    await Promise.all(results.map(async (result) => {
      if (result.ok) successfulDeliveries += 1
      else failedDeliveries += 1
      const status = result.ok ? "sent" : "failed"
      const message = result.ok ? "Delivered" : "Delivery failed"
      await prisma.notificationLog.upsert({
        where: {
          animeShowId_seasonNumber_episodeNumber_trigger_channel: {
            animeShowId: notification.animeShowId,
            seasonNumber: notification.seasonNumber,
            episodeNumber: notification.episodeNumber,
            trigger: notification.trigger,
            channel: result.channel,
          },
        },
        update: { status, message, sentAt: new Date() },
        create: {
          animeShowId: notification.animeShowId,
          seasonNumber: notification.seasonNumber,
          episodeNumber: notification.episodeNumber,
          trigger: notification.trigger,
          channel: result.channel,
          status,
          message,
        },
      })
    }))
  }

  return {
    status: "success",
    message: `Sent ${successfulDeliveries} notifications across ${channels.length} enabled channels, ${failedDeliveries} failed; ${detection.skippedCandidateCount} candidates skipped (${detection.dataLimitedCount} data-limited)`,
  }
}
