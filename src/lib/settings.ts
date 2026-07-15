import { prisma } from './db'

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
