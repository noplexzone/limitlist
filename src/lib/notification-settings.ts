import {
  NOTIFY_DISCORD_ENABLED_SETTING,
  NOTIFY_DISCORD_WEBHOOK_SETTING,
  NOTIFY_ENABLED_SETTING,
  NOTIFY_GOTIFY_ENABLED_SETTING,
  NOTIFY_GOTIFY_TOKEN_SETTING,
  NOTIFY_GOTIFY_URL_SETTING,
  NOTIFY_NTFY_ENABLED_SETTING,
  NOTIFY_NTFY_TOKEN_SETTING,
  NOTIFY_NTFY_URL_SETTING,
  NOTIFY_SMTP_ENABLED_SETTING,
  NOTIFY_SMTP_FROM_SETTING,
  NOTIFY_SMTP_HOST_SETTING,
  NOTIFY_SMTP_PASS_SETTING,
  NOTIFY_SMTP_PORT_SETTING,
  NOTIFY_SMTP_TO_SETTING,
  NOTIFY_SMTP_USER_SETTING,
  NOTIFY_TRIGGER_SETTING,
  NOTIFY_TRIGGER_VALUES,
  getConfiguredNotifyDiscordEnabled,
  getConfiguredNotifyEnabled,
  getConfiguredNotifyGotifyEnabled,
  getConfiguredNotifyNtfyEnabled,
  getConfiguredNotifySmtpEnabled,
  getConfiguredNotifyTrigger,
  getEffectiveNotifyGotifyUrl,
  getEffectiveNotifyNtfyUrl,
  getEffectiveNotifySmtpFrom,
  getEffectiveNotifySmtpHost,
  getEffectiveNotifySmtpPort,
  getEffectiveNotifySmtpTo,
  getEffectiveNotifySmtpUser,
  getStoredSetting,
  isNotifyDiscordEnabledEnvLocked,
  isNotifyDiscordWebhookEnvLocked,
  isNotifyEnabledEnvLocked,
  isNotifyGotifyEnabledEnvLocked,
  isNotifyGotifyTokenEnvLocked,
  isNotifyGotifyUrlEnvLocked,
  isNotifyNtfyEnabledEnvLocked,
  isNotifyNtfyTokenEnvLocked,
  isNotifyNtfyUrlEnvLocked,
  isNotifySmtpEnabledEnvLocked,
  isNotifySmtpFromEnvLocked,
  isNotifySmtpHostEnvLocked,
  isNotifySmtpPassEnvLocked,
  isNotifySmtpPortEnvLocked,
  isNotifySmtpToEnvLocked,
  isNotifySmtpUserEnvLocked,
  isNotifyTriggerEnvLocked,
  maskKey,
  upsertStoredSetting,
} from './settings'

export interface LockedSetting<T> {
  lockedByEnvironment: boolean
  value: T
}

export interface SecretSetting {
  lockedByEnvironment: boolean
  configured: boolean
  masked: string | null
}

export interface NotificationSettingsState {
  notifyEnabled: LockedSetting<boolean>
  notifyTrigger: LockedSetting<'episode-aired' | 'aired-unwatched'>
  notifyDiscordEnabled: LockedSetting<boolean>
  notifyDiscordWebhook: SecretSetting
  notifyNtfyEnabled: LockedSetting<boolean>
  notifyNtfyUrl: LockedSetting<string>
  notifyNtfyToken: SecretSetting
  notifyGotifyEnabled: LockedSetting<boolean>
  notifyGotifyUrl: LockedSetting<string>
  notifyGotifyToken: SecretSetting
  notifySmtpEnabled: LockedSetting<boolean>
  notifySmtpHost: LockedSetting<string>
  notifySmtpPort: LockedSetting<string>
  notifySmtpUser: LockedSetting<string>
  notifySmtpPass: SecretSetting
  notifySmtpFrom: LockedSetting<string>
  notifySmtpTo: LockedSetting<string>
}

function secretState(envLocked: boolean, stored: string | null): SecretSetting {
  return {
    lockedByEnvironment: envLocked,
    configured: envLocked || Boolean(stored),
    masked: envLocked ? 'Set in environment' : maskKey(stored),
  }
}

export async function getNotificationSettingsState(): Promise<NotificationSettingsState> {
  const [
    notifyEnabled,
    notifyTrigger,
    notifyDiscordEnabled,
    storedDiscordWebhook,
    notifyNtfyEnabled,
    notifyNtfyUrl,
    storedNtfyToken,
    notifyGotifyEnabled,
    notifyGotifyUrl,
    storedGotifyToken,
    notifySmtpEnabled,
    notifySmtpHost,
    notifySmtpPort,
    notifySmtpUser,
    storedSmtpPass,
    notifySmtpFrom,
    notifySmtpTo,
  ] = await Promise.all([
    getConfiguredNotifyEnabled(),
    getConfiguredNotifyTrigger(),
    getConfiguredNotifyDiscordEnabled(),
    getStoredSetting(NOTIFY_DISCORD_WEBHOOK_SETTING),
    getConfiguredNotifyNtfyEnabled(),
    getEffectiveNotifyNtfyUrl(),
    getStoredSetting(NOTIFY_NTFY_TOKEN_SETTING),
    getConfiguredNotifyGotifyEnabled(),
    getEffectiveNotifyGotifyUrl(),
    getStoredSetting(NOTIFY_GOTIFY_TOKEN_SETTING),
    getConfiguredNotifySmtpEnabled(),
    getEffectiveNotifySmtpHost(),
    getEffectiveNotifySmtpPort(),
    getEffectiveNotifySmtpUser(),
    getStoredSetting(NOTIFY_SMTP_PASS_SETTING),
    getEffectiveNotifySmtpFrom(),
    getEffectiveNotifySmtpTo(),
  ])

  return {
    notifyEnabled: { lockedByEnvironment: isNotifyEnabledEnvLocked(), value: notifyEnabled },
    notifyTrigger: { lockedByEnvironment: isNotifyTriggerEnvLocked(), value: notifyTrigger },
    notifyDiscordEnabled: { lockedByEnvironment: isNotifyDiscordEnabledEnvLocked(), value: notifyDiscordEnabled },
    notifyDiscordWebhook: secretState(isNotifyDiscordWebhookEnvLocked(), storedDiscordWebhook),
    notifyNtfyEnabled: { lockedByEnvironment: isNotifyNtfyEnabledEnvLocked(), value: notifyNtfyEnabled },
    notifyNtfyUrl: { lockedByEnvironment: isNotifyNtfyUrlEnvLocked(), value: notifyNtfyUrl ?? '' },
    notifyNtfyToken: secretState(isNotifyNtfyTokenEnvLocked(), storedNtfyToken),
    notifyGotifyEnabled: { lockedByEnvironment: isNotifyGotifyEnabledEnvLocked(), value: notifyGotifyEnabled },
    notifyGotifyUrl: { lockedByEnvironment: isNotifyGotifyUrlEnvLocked(), value: notifyGotifyUrl ?? '' },
    notifyGotifyToken: secretState(isNotifyGotifyTokenEnvLocked(), storedGotifyToken),
    notifySmtpEnabled: { lockedByEnvironment: isNotifySmtpEnabledEnvLocked(), value: notifySmtpEnabled },
    notifySmtpHost: { lockedByEnvironment: isNotifySmtpHostEnvLocked(), value: notifySmtpHost ?? '' },
    notifySmtpPort: { lockedByEnvironment: isNotifySmtpPortEnvLocked(), value: notifySmtpPort ?? '' },
    notifySmtpUser: { lockedByEnvironment: isNotifySmtpUserEnvLocked(), value: notifySmtpUser ?? '' },
    notifySmtpPass: secretState(isNotifySmtpPassEnvLocked(), storedSmtpPass),
    notifySmtpFrom: { lockedByEnvironment: isNotifySmtpFromEnvLocked(), value: notifySmtpFrom ?? '' },
    notifySmtpTo: { lockedByEnvironment: isNotifySmtpToEnvLocked(), value: notifySmtpTo ?? '' },
  }
}

export class NotificationSettingsInputError extends Error {}

type Write = readonly [key: string, value: string]

function readBoolean(body: Record<string, unknown>, field: string): boolean {
  if (typeof body[field] !== 'boolean') throw new NotificationSettingsInputError(`${field} must be a boolean`)
  return body[field]
}

function readString(body: Record<string, unknown>, field: string): string {
  if (typeof body[field] !== 'string') throw new NotificationSettingsInputError(`${field} must be a string`)
  return body[field].trim()
}

function validateHttpUrl(value: string, label: string): void {
  if (!value) return
  try {
    const url = new URL(value)
    if (url.protocol !== 'http:' && url.protocol !== 'https:') throw new Error()
  } catch {
    throw new NotificationSettingsInputError(`${label} must be an HTTP or HTTPS URL`)
  }
}

export async function updateNotificationSettings(body: Record<string, unknown>): Promise<void> {
  const writes: Write[] = []
  const has = (field: string) => Object.prototype.hasOwnProperty.call(body, field)
  const booleanField = (field: string, key: string, locked: boolean) => {
    if (has(field) && !locked) writes.push([key, readBoolean(body, field) ? 'true' : 'false'])
  }
  const stringField = (field: string, key: string, locked: boolean) => {
    if (has(field) && !locked) writes.push([key, readString(body, field)])
  }
  const secretField = (field: string, key: string, locked: boolean, validate?: (value: string) => void) => {
    if (!has(field) || locked) return
    const value = readString(body, field)
    if (!value) return
    validate?.(value)
    writes.push([key, value])
  }

  booleanField('notifyEnabled', NOTIFY_ENABLED_SETTING, isNotifyEnabledEnvLocked())
  if (has('notifyTrigger') && !isNotifyTriggerEnvLocked()) {
    const trigger = readString(body, 'notifyTrigger')
    if (!(NOTIFY_TRIGGER_VALUES as readonly string[]).includes(trigger)) {
      throw new NotificationSettingsInputError('notifyTrigger must be episode-aired or aired-unwatched')
    }
    writes.push([NOTIFY_TRIGGER_SETTING, trigger])
  }

  booleanField('notifyDiscordEnabled', NOTIFY_DISCORD_ENABLED_SETTING, isNotifyDiscordEnabledEnvLocked())
  secretField('notifyDiscordWebhook', NOTIFY_DISCORD_WEBHOOK_SETTING, isNotifyDiscordWebhookEnvLocked(), (value) => validateHttpUrl(value, 'Discord webhook'))

  booleanField('notifyNtfyEnabled', NOTIFY_NTFY_ENABLED_SETTING, isNotifyNtfyEnabledEnvLocked())
  if (has('notifyNtfyUrl') && !isNotifyNtfyUrlEnvLocked()) {
    const value = readString(body, 'notifyNtfyUrl')
    validateHttpUrl(value, 'ntfy URL')
    writes.push([NOTIFY_NTFY_URL_SETTING, value])
  }
  secretField('notifyNtfyToken', NOTIFY_NTFY_TOKEN_SETTING, isNotifyNtfyTokenEnvLocked())

  booleanField('notifyGotifyEnabled', NOTIFY_GOTIFY_ENABLED_SETTING, isNotifyGotifyEnabledEnvLocked())
  if (has('notifyGotifyUrl') && !isNotifyGotifyUrlEnvLocked()) {
    const value = readString(body, 'notifyGotifyUrl')
    validateHttpUrl(value, 'Gotify URL')
    writes.push([NOTIFY_GOTIFY_URL_SETTING, value])
  }
  secretField('notifyGotifyToken', NOTIFY_GOTIFY_TOKEN_SETTING, isNotifyGotifyTokenEnvLocked())

  booleanField('notifySmtpEnabled', NOTIFY_SMTP_ENABLED_SETTING, isNotifySmtpEnabledEnvLocked())
  stringField('notifySmtpHost', NOTIFY_SMTP_HOST_SETTING, isNotifySmtpHostEnvLocked())
  if (has('notifySmtpPort') && !isNotifySmtpPortEnvLocked()) {
    const value = readString(body, 'notifySmtpPort')
    if (value && (!/^\d+$/.test(value) || Number(value) < 1 || Number(value) > 65535)) {
      throw new NotificationSettingsInputError('SMTP port must be between 1 and 65535')
    }
    writes.push([NOTIFY_SMTP_PORT_SETTING, value])
  }
  stringField('notifySmtpUser', NOTIFY_SMTP_USER_SETTING, isNotifySmtpUserEnvLocked())
  secretField('notifySmtpPass', NOTIFY_SMTP_PASS_SETTING, isNotifySmtpPassEnvLocked())
  stringField('notifySmtpFrom', NOTIFY_SMTP_FROM_SETTING, isNotifySmtpFromEnvLocked())
  stringField('notifySmtpTo', NOTIFY_SMTP_TO_SETTING, isNotifySmtpToEnvLocked())

  await Promise.all(writes.map(([key, value]) => upsertStoredSetting(key, value)))
}
