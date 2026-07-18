import { getEffectiveNotifyDiscordWebhook } from '../settings'
import type { ChannelResult, NotificationPayload } from './types'
import { isSafeHttpUrl, isSuccessStatus, remainingMs, safeHttpError } from './http'

interface DiscordEmbed {
  title: string
  description: string
  url?: string
  thumbnail?: { url: string }
}

async function postEmbed(
  webhookUrl: string,
  embed: DiscordEmbed,
  signal: AbortSignal,
): Promise<{ status: number; retryAfter?: number }> {
  const res = await fetch(webhookUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ embeds: [embed] }),
    signal,
  })
  let retryAfter: number | undefined
  if (res.status === 429) {
    try {
      const json = await res.json()
      const ra = Number(json?.retry_after)
      if (Number.isFinite(ra) && ra > 0) retryAfter = ra * 1000
    } catch {
      // ignore parse failures
    }
  }
  return { status: res.status, retryAfter }
}

export async function sendDiscord(payload: NotificationPayload): Promise<ChannelResult> {
  const channel = 'discord' as const

  try {
    const webhookUrl = await getEffectiveNotifyDiscordWebhook()
    if (!webhookUrl || !isSafeHttpUrl(webhookUrl)) {
      return { channel, ok: false, message: 'Discord webhook is not configured' }
    }

    const embed: DiscordEmbed = {
      title: payload.title,
      description: payload.body,
    }
    if (payload.url && isSafeHttpUrl(payload.url)) embed.url = payload.url
    if (payload.posterUrl && isSafeHttpUrl(payload.posterUrl)) embed.thumbnail = { url: payload.posterUrl }

    const start = Date.now()

    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), 8_000)

    try {
      const first = await postEmbed(webhookUrl, embed, controller.signal)

      if (isSuccessStatus(first.status)) {
        return { channel, ok: true, message: 'Notification sent' }
      }

      if (first.status === 429 && first.retryAfter !== undefined) {
        const left = remainingMs(start)
        if (first.retryAfter < left - 200) {
          await new Promise<void>((resolve) => setTimeout(resolve, first.retryAfter))
          const retry = await postEmbed(webhookUrl, embed, controller.signal)
          if (isSuccessStatus(retry.status)) {
            return { channel, ok: true, message: 'Notification sent' }
          }
          return { channel, ok: false, message: safeHttpError(retry.status) }
        }
        return { channel, ok: false, message: 'Rate limited' }
      }

      return { channel, ok: false, message: safeHttpError(first.status) }
    } finally {
      clearTimeout(timer)
    }
  } catch (err) {
    if (err instanceof Error && err.name === 'AbortError') {
      return { channel, ok: false, message: 'Request timed out' }
    }
    return { channel, ok: false, message: 'Failed to send notification' }
  }
}
