import { prisma } from './db'

export const TMDB_API_KEY_SETTING = 'tmdbApiKey'

export function isTmdbApiKeyEnvLocked() {
  return Boolean(process.env.TMDB_API_KEY)
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

export async function getEffectiveTmdbApiKey(): Promise<string | null> {
  return process.env.TMDB_API_KEY || (await getStoredSetting(TMDB_API_KEY_SETTING))
}
