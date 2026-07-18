import { prisma } from './db'
import { DEFAULT_THEME_ID, isThemeId } from './themes'

export const TVDB_API_KEY_SETTING = 'tvdbApiKey'
export const TVDB_PIN_SETTING = 'tvdbPin'
export const TVDB_SEASON_TYPE_SETTING = 'tvdbSeasonType'
export const DEFAULT_TVDB_SEASON_TYPE = 'default'
export const DEFAULT_CAST_LANGUAGE_SETTING = 'defaultCastLanguage'
export const DEFAULT_CAST_LANGUAGE = 'japanese'

export const PLEX_BASE_URL_SETTING = 'plexBaseUrl'
export const PLEX_TOKEN_SETTING = 'plexToken'
export const PLEX_LIBRARY_SECTIONS_SETTING = 'plexLibrarySections'
export const PLEX_ACCOUNT_ID_SETTING = 'plexAccountId'
export const PLEX_WATCHED_THRESHOLD_SETTING = 'plexWatchedThreshold'
export const PLEX_AUTO_STATUS_SETTING = 'plexAutoStatus'
export const PLEX_SYNC_ON_REFRESH_SETTING = 'plexSyncOnRefresh'
export const PLEX_WATCHED_THRESHOLDS = ['viewcount', 'partial'] as const
export type PlexWatchedThreshold = (typeof PLEX_WATCHED_THRESHOLDS)[number]

export function isTvdbApiKeyEnvLocked() { return Boolean(process.env.TVDB_API_KEY) }
export function isTvdbPinEnvLocked() { return Boolean(process.env.TVDB_PIN) }
export function isPlexBaseUrlEnvLocked() { return Boolean(process.env.PLEX_BASE_URL) }
export function isPlexTokenEnvLocked() { return Boolean(process.env.PLEX_TOKEN) }
export function isPlexLibrarySectionsEnvLocked() { return Boolean(process.env.PLEX_LIBRARY_SECTIONS) }
export function isPlexAccountIdEnvLocked() { return Boolean(process.env.PLEX_ACCOUNT_ID) }
export function isPlexWatchedThresholdEnvLocked() { return Boolean(process.env.PLEX_WATCHED_THRESHOLD) }
export function isPlexAutoStatusEnvLocked() { return Boolean(process.env.PLEX_AUTO_STATUS) }
export function isPlexSyncOnRefreshEnvLocked() { return Boolean(process.env.PLEX_SYNC_ON_REFRESH) }

export async function getStoredSetting(key: string): Promise<string | null> {
  const setting = await prisma.appSetting.findUnique({ where: { key } })
  return setting?.value ?? null
}

export async function upsertStoredSetting(key: string, value: string) {
  return prisma.appSetting.upsert({ where: { key }, update: { value }, create: { key, value } })
}

export async function getEffectiveTvdbApiKey(): Promise<string | null> { return process.env.TVDB_API_KEY || (await getStoredSetting(TVDB_API_KEY_SETTING)) }
export async function getEffectiveTvdbPin(): Promise<string | null> { return process.env.TVDB_PIN || (await getStoredSetting(TVDB_PIN_SETTING)) }
export async function getConfiguredTvdbSeasonType(): Promise<string> { return process.env.TVDB_SEASON_TYPE || (await getStoredSetting(TVDB_SEASON_TYPE_SETTING)) || DEFAULT_TVDB_SEASON_TYPE }
export async function getEffectivePlexBaseUrl(): Promise<string | null> { return process.env.PLEX_BASE_URL || (await getStoredSetting(PLEX_BASE_URL_SETTING)) }
export async function getEffectivePlexToken(): Promise<string | null> { return process.env.PLEX_TOKEN || (await getStoredSetting(PLEX_TOKEN_SETTING)) }
export async function getConfiguredPlexLibrarySections(): Promise<string[]> {
  const raw = process.env.PLEX_LIBRARY_SECTIONS ?? (await getStoredSetting(PLEX_LIBRARY_SECTIONS_SETTING)) ?? ''
  return raw.split(',').map((part) => part.trim()).filter(Boolean)
}
export async function getConfiguredPlexAccountId(): Promise<string | null> {
  const raw = process.env.PLEX_ACCOUNT_ID ?? (await getStoredSetting(PLEX_ACCOUNT_ID_SETTING)) ?? ''
  const trimmed = raw.trim()
  return trimmed || null
}
export function normalizePlexWatchedThreshold(value?: string | null): PlexWatchedThreshold { return value === 'partial' ? 'partial' : 'viewcount' }
export async function getConfiguredPlexWatchedThreshold(): Promise<PlexWatchedThreshold> { return normalizePlexWatchedThreshold(process.env.PLEX_WATCHED_THRESHOLD ?? (await getStoredSetting(PLEX_WATCHED_THRESHOLD_SETTING))) }
export function parseBooleanSetting(value: string | null | undefined, defaultValue: boolean): boolean {
  if (value == null || value === '') return defaultValue
  return ['1', 'true', 'yes', 'on'].includes(value.toLowerCase())
}
export async function getConfiguredPlexAutoStatus(): Promise<boolean> { return parseBooleanSetting(process.env.PLEX_AUTO_STATUS ?? (await getStoredSetting(PLEX_AUTO_STATUS_SETTING)), true) }
export async function getConfiguredPlexSyncOnRefresh(): Promise<boolean> { return parseBooleanSetting(process.env.PLEX_SYNC_ON_REFRESH ?? (await getStoredSetting(PLEX_SYNC_ON_REFRESH_SETTING)), false) }
export function normalizeCastLanguage(value?: string | null): 'english' | 'japanese' { return value === 'english' || value === 'japanese' ? value : DEFAULT_CAST_LANGUAGE }
export async function getDefaultCastLanguage(): Promise<'english' | 'japanese'> { return normalizeCastLanguage(await getStoredSetting(DEFAULT_CAST_LANGUAGE_SETTING)) }

// Notification settings
export const NOTIFY_ENABLED_SETTING = 'notifyEnabled'
export const NOTIFY_TRIGGER_SETTING = 'notifyTrigger'
export const NOTIFY_TRIGGER_VALUES = ['episode-aired', 'aired-unwatched'] as const
export type NotifyTrigger = (typeof NOTIFY_TRIGGER_VALUES)[number]
export const DEFAULT_NOTIFY_TRIGGER: NotifyTrigger = 'episode-aired'

export const NOTIFY_DISCORD_ENABLED_SETTING = 'notifyDiscordEnabled'
export const NOTIFY_DISCORD_WEBHOOK_SETTING = 'notifyDiscordWebhook'

export const NOTIFY_NTFY_ENABLED_SETTING = 'notifyNtfyEnabled'
export const NOTIFY_NTFY_URL_SETTING = 'notifyNtfyUrl'
export const NOTIFY_NTFY_TOKEN_SETTING = 'notifyNtfyToken'

export const NOTIFY_GOTIFY_ENABLED_SETTING = 'notifyGotifyEnabled'
export const NOTIFY_GOTIFY_URL_SETTING = 'notifyGotifyUrl'
export const NOTIFY_GOTIFY_TOKEN_SETTING = 'notifyGotifyToken'

export const NOTIFY_SMTP_ENABLED_SETTING = 'notifySmtpEnabled'
export const NOTIFY_SMTP_HOST_SETTING = 'notifySmtpHost'
export const NOTIFY_SMTP_PORT_SETTING = 'notifySmtpPort'
export const NOTIFY_SMTP_USER_SETTING = 'notifySmtpUser'
export const NOTIFY_SMTP_PASS_SETTING = 'notifySmtpPass'
export const NOTIFY_SMTP_FROM_SETTING = 'notifySmtpFrom'
export const NOTIFY_SMTP_TO_SETTING = 'notifySmtpTo'

export function isNotifyEnabledEnvLocked() { return Boolean(process.env.NOTIFY_ENABLED) }
export function isNotifyTriggerEnvLocked() { return Boolean(process.env.NOTIFY_TRIGGER) }
export function isNotifyDiscordEnabledEnvLocked() { return Boolean(process.env.NOTIFY_DISCORD_ENABLED) }
export function isNotifyDiscordWebhookEnvLocked() { return Boolean(process.env.NOTIFY_DISCORD_WEBHOOK) }
export function isNotifyNtfyEnabledEnvLocked() { return Boolean(process.env.NOTIFY_NTFY_ENABLED) }
export function isNotifyNtfyUrlEnvLocked() { return Boolean(process.env.NOTIFY_NTFY_URL) }
export function isNotifyNtfyTokenEnvLocked() { return Boolean(process.env.NOTIFY_NTFY_TOKEN) }
export function isNotifyGotifyEnabledEnvLocked() { return Boolean(process.env.NOTIFY_GOTIFY_ENABLED) }
export function isNotifyGotifyUrlEnvLocked() { return Boolean(process.env.NOTIFY_GOTIFY_URL) }
export function isNotifyGotifyTokenEnvLocked() { return Boolean(process.env.NOTIFY_GOTIFY_TOKEN) }
export function isNotifySmtpEnabledEnvLocked() { return Boolean(process.env.NOTIFY_SMTP_ENABLED) }
export function isNotifySmtpHostEnvLocked() { return Boolean(process.env.NOTIFY_SMTP_HOST) }
export function isNotifySmtpPortEnvLocked() { return Boolean(process.env.NOTIFY_SMTP_PORT) }
export function isNotifySmtpUserEnvLocked() { return Boolean(process.env.NOTIFY_SMTP_USER) }
export function isNotifySmtpPassEnvLocked() { return Boolean(process.env.NOTIFY_SMTP_PASS) }
export function isNotifySmtpFromEnvLocked() { return Boolean(process.env.NOTIFY_SMTP_FROM) }
export function isNotifySmtpToEnvLocked() { return Boolean(process.env.NOTIFY_SMTP_TO) }

export function normalizeNotifyTrigger(value?: string | null): NotifyTrigger {
  return value === 'aired-unwatched' ? 'aired-unwatched' : DEFAULT_NOTIFY_TRIGGER
}

export async function getConfiguredNotifyEnabled(): Promise<boolean> { return parseBooleanSetting(process.env.NOTIFY_ENABLED ?? (await getStoredSetting(NOTIFY_ENABLED_SETTING)), false) }
export async function getConfiguredNotifyTrigger(): Promise<NotifyTrigger> { return normalizeNotifyTrigger(process.env.NOTIFY_TRIGGER ?? (await getStoredSetting(NOTIFY_TRIGGER_SETTING))) }

export async function getConfiguredNotifyDiscordEnabled(): Promise<boolean> { return parseBooleanSetting(process.env.NOTIFY_DISCORD_ENABLED ?? (await getStoredSetting(NOTIFY_DISCORD_ENABLED_SETTING)), false) }
export async function getEffectiveNotifyDiscordWebhook(): Promise<string | null> { return process.env.NOTIFY_DISCORD_WEBHOOK || (await getStoredSetting(NOTIFY_DISCORD_WEBHOOK_SETTING)) }

export async function getConfiguredNotifyNtfyEnabled(): Promise<boolean> { return parseBooleanSetting(process.env.NOTIFY_NTFY_ENABLED ?? (await getStoredSetting(NOTIFY_NTFY_ENABLED_SETTING)), false) }
export async function getEffectiveNotifyNtfyUrl(): Promise<string | null> { return process.env.NOTIFY_NTFY_URL || (await getStoredSetting(NOTIFY_NTFY_URL_SETTING)) }
export async function getEffectiveNotifyNtfyToken(): Promise<string | null> { return process.env.NOTIFY_NTFY_TOKEN || (await getStoredSetting(NOTIFY_NTFY_TOKEN_SETTING)) }

export async function getConfiguredNotifyGotifyEnabled(): Promise<boolean> { return parseBooleanSetting(process.env.NOTIFY_GOTIFY_ENABLED ?? (await getStoredSetting(NOTIFY_GOTIFY_ENABLED_SETTING)), false) }
export async function getEffectiveNotifyGotifyUrl(): Promise<string | null> { return process.env.NOTIFY_GOTIFY_URL || (await getStoredSetting(NOTIFY_GOTIFY_URL_SETTING)) }
export async function getEffectiveNotifyGotifyToken(): Promise<string | null> { return process.env.NOTIFY_GOTIFY_TOKEN || (await getStoredSetting(NOTIFY_GOTIFY_TOKEN_SETTING)) }

export async function getConfiguredNotifySmtpEnabled(): Promise<boolean> { return parseBooleanSetting(process.env.NOTIFY_SMTP_ENABLED ?? (await getStoredSetting(NOTIFY_SMTP_ENABLED_SETTING)), false) }
export async function getEffectiveNotifySmtpHost(): Promise<string | null> { return process.env.NOTIFY_SMTP_HOST || (await getStoredSetting(NOTIFY_SMTP_HOST_SETTING)) }
export async function getEffectiveNotifySmtpPort(): Promise<string | null> { return process.env.NOTIFY_SMTP_PORT || (await getStoredSetting(NOTIFY_SMTP_PORT_SETTING)) }
export async function getEffectiveNotifySmtpUser(): Promise<string | null> { return process.env.NOTIFY_SMTP_USER || (await getStoredSetting(NOTIFY_SMTP_USER_SETTING)) }
export async function getEffectiveNotifySmtpPass(): Promise<string | null> { return process.env.NOTIFY_SMTP_PASS || (await getStoredSetting(NOTIFY_SMTP_PASS_SETTING)) }
export async function getEffectiveNotifySmtpFrom(): Promise<string | null> { return process.env.NOTIFY_SMTP_FROM || (await getStoredSetting(NOTIFY_SMTP_FROM_SETTING)) }
export async function getEffectiveNotifySmtpTo(): Promise<string | null> { return process.env.NOTIFY_SMTP_TO || (await getStoredSetting(NOTIFY_SMTP_TO_SETTING)) }

export const THEME_SETTING = 'theme'
export const DEFAULT_THEME = DEFAULT_THEME_ID
export async function getConfiguredTheme(): Promise<string> {
  if (!process.env.DATABASE_URL) return DEFAULT_THEME
  try {
    const storedTheme = await getStoredSetting(THEME_SETTING)
    return isThemeId(storedTheme) ? storedTheme : DEFAULT_THEME
  } catch (error) {
    // Root layout also renders during static build paths where DATABASE_URL may not be present.
    // Fall back to the default theme rather than failing the whole build.
    return DEFAULT_THEME
  }
}
