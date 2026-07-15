import { prisma } from './db'

export const TVDB_API_KEY_SETTING = 'tvdbApiKey'
export const TVDB_PIN_SETTING = 'tvdbPin'
export const TVDB_SEASON_TYPE_SETTING = 'tvdbSeasonType'
export const DEFAULT_TVDB_SEASON_TYPE = 'default'
export const DEFAULT_CAST_LANGUAGE_SETTING = 'defaultCastLanguage'
export const DEFAULT_CAST_LANGUAGE = 'japanese'


export function isTvdbApiKeyEnvLocked() {
  return Boolean(process.env.TVDB_API_KEY)
}

export function isTvdbPinEnvLocked() {
  return Boolean(process.env.TVDB_PIN)
}

export async function getStoredSetting(key: string): Promise<string | null> {
  const setting = await prisma.appSetting.findUnique({ where: { key } })
  return setting?.value ?? null
}

export async function upsertStoredSetting(key: string, value: string) {
  return prisma.appSetting.upsert({
    where: { key },
    update: { value },
    create: { key, value },
  })
}


export async function getEffectiveTvdbApiKey(): Promise<string | null> {
  return process.env.TVDB_API_KEY || (await getStoredSetting(TVDB_API_KEY_SETTING))
}

export async function getEffectiveTvdbPin(): Promise<string | null> {
  return process.env.TVDB_PIN || (await getStoredSetting(TVDB_PIN_SETTING))
}

export async function getConfiguredTvdbSeasonType(): Promise<string> {
  return process.env.TVDB_SEASON_TYPE || (await getStoredSetting(TVDB_SEASON_TYPE_SETTING)) || DEFAULT_TVDB_SEASON_TYPE
}

export const PLEX_BASE_URL_SETTING = 'plexBaseUrl'
export const PLEX_TOKEN_SETTING = 'plexToken'

export function isPlexTokenEnvLocked() {
  return Boolean(process.env.PLEX_TOKEN)
}

export async function getEffectivePlexBaseUrl(): Promise<string | null> {
  return process.env.PLEX_BASE_URL || (await getStoredSetting(PLEX_BASE_URL_SETTING))
}

export async function getEffectivePlexToken(): Promise<string | null> {
  return process.env.PLEX_TOKEN || (await getStoredSetting(PLEX_TOKEN_SETTING))
}

export function normalizeCastLanguage(value?: string | null): 'english' | 'japanese' {
  return value === 'english' || value === 'japanese' ? value : DEFAULT_CAST_LANGUAGE
}

export async function getDefaultCastLanguage(): Promise<'english' | 'japanese'> {
  return normalizeCastLanguage(await getStoredSetting(DEFAULT_CAST_LANGUAGE_SETTING))
}
