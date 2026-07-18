import { getEffectiveNotifyGotifyToken, getEffectiveNotifyGotifyUrl } from '../settings'
import type { ChannelResult, NotificationPayload } from './types'
import { isSafeHttpUrl, safeHttpError } from './http'

function normalizeBaseUrl(raw: string): string {
  return raw.endsWith('/') ? raw.slice(0, -1) : raw
}

export async function sendGotify(payload: NotificationPayload): Promise<ChannelResult> {
  const channel = 'gotify' as const

  try {
    const [gotifyUrl, token] = await Promise.all([
      getEffectiveNotifyGotifyUrl(),
      getEffectiveNotifyGotifyToken(),
    ])

    if (!gotifyUrl || !isSafeHttpUrl(gotifyUrl)) {
      return { channel, ok: false, message: 'Gotify URL is not configured' }
    }
    if (!token) return { channel, ok: false, message: 'Gotify token is not configured' }

    const base = normalizeBaseUrl(gotifyUrl)
    const endpoint = `${base}/message?token=${encodeURIComponent(token)}`

    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), 8_000)

    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: payload.title, message: payload.body, priority: 5 }),
        signal: controller.signal,
      })

      if (res.ok) return { channel, ok: true, message: 'Notification sent' }
      return { channel, ok: false, message: safeHttpError(res.status) }
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
