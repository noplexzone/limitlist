export type NotificationChannel = 'discord' | 'ntfy' | 'gotify' | 'smtp'

export interface NotificationPayload {
  title: string
  body: string
  showTitle: string
  episodeLabel: string
  url?: string
  posterUrl?: string | null
}

export interface ChannelResult {
  channel: NotificationChannel
  ok: boolean
  message: string
}
