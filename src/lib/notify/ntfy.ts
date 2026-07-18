import { getEffectiveNotifyNtfyToken, getEffectiveNotifyNtfyUrl } from '../settings'
import type { ChannelResult, NotificationPayload } from './types'
import { isSafeHttpUrl, safeHttpError } from './http'

export async function sendNtfy(payload: NotificationPayload): Promise<ChannelResult> {
  const channel = 'ntfy' as const

  try {
    const [ntfyUrl, token] = await Promise.all([
      getEffectiveNotifyNtfyUrl(),
      getEffectiveNotifyNtfyToken(),
    ])

    if (!ntfyUrl || !isSafeHttpUrl(ntfyUrl)) {
      return { channel, ok: false, message: 'ntfy URL is not configured' }
    }

    const headers: Record<string, string> = { 'Content-Type': 'application/json' }
    if (token) headers['Authorization'] = `Bearer ${token}`
    const body = {
      title: payload.title.replace(/[\r\n]+/g, ' '),
      message: payload.body,
      ...(payload.url && isSafeHttpUrl(payload.url) ? { click: payload.url } : {}),
    }

    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), 8_000)

    try {
      const res = await fetch(ntfyUrl, {
        method: 'POST',
        headers,
        body: JSON.stringify(body),
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
