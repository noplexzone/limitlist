import {
  getConfiguredNotifyDiscordEnabled,
  getConfiguredNotifyNtfyEnabled,
  getConfiguredNotifyGotifyEnabled,
  getConfiguredNotifySmtpEnabled,
} from '../settings'
import { sendDiscord } from './discord'
import { sendGotify } from './gotify'
import { sendNtfy } from './ntfy'
import { sendSmtp } from './smtp'
import type { ChannelResult, NotificationChannel, NotificationPayload } from './types'

export type { ChannelResult, NotificationChannel, NotificationPayload }

const TEST_PAYLOAD: NotificationPayload = {
  title: 'LimitList test notification',
  body: 'This is a test notification from LimitList.',
  showTitle: 'Test Show',
  episodeLabel: 'S01E01',
}

export async function getEnabledChannels(): Promise<NotificationChannel[]> {
  const [discord, ntfy, gotify, smtp] = await Promise.all([
    getConfiguredNotifyDiscordEnabled(),
    getConfiguredNotifyNtfyEnabled(),
    getConfiguredNotifyGotifyEnabled(),
    getConfiguredNotifySmtpEnabled(),
  ])
  const channels: NotificationChannel[] = []
  if (discord) channels.push('discord')
  if (ntfy) channels.push('ntfy')
  if (gotify) channels.push('gotify')
  if (smtp) channels.push('smtp')
  return channels
}

async function sendChannel(
  channel: NotificationChannel,
  payload: NotificationPayload,
): Promise<ChannelResult> {
  try {
    switch (channel) {
      case 'discord': return await sendDiscord(payload)
      case 'ntfy':    return await sendNtfy(payload)
      case 'gotify':  return await sendGotify(payload)
      case 'smtp':    return await sendSmtp(payload)
    }
  } catch {
    return { channel, ok: false, message: 'Unexpected sender error' }
  }
}

export async function dispatch(
  payload: NotificationPayload,
  enabledChannels: NotificationChannel[],
): Promise<ChannelResult[]> {
  const results = await Promise.allSettled(
    enabledChannels.map((channel) => sendChannel(channel, payload)),
  )
  return results.map((r, i) =>
    r.status === 'fulfilled'
      ? r.value
      : { channel: enabledChannels[i], ok: false, message: 'Unexpected sender error' },
  )
}

export async function testChannel(channel: NotificationChannel): Promise<ChannelResult> {
  return sendChannel(channel, TEST_PAYLOAD)
}
