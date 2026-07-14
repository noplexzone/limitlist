import { redirect } from 'next/navigation'
import { requireAuth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import {
  getConfiguredTvdbSeasonType,
  getStoredSetting,
  isTmdbApiKeyEnvLocked,
  isTvdbApiKeyEnvLocked,
  isTvdbPinEnvLocked,
  TMDB_API_KEY_SETTING,
  TVDB_API_KEY_SETTING,
  TVDB_PIN_SETTING,
} from '@/lib/settings'
import Nav from '@/components/Nav'
import SettingsClient from './SettingsClient'

function maskKey(value: string | null) {
  if (!value) return null
  if (value.length <= 8) return '••••'
  return `${value.slice(0, 4)}…${value.slice(-4)}`
}

export default async function SettingsPage() {
  const user = await requireAuth()
  if (!user) redirect('/login')

  const appUser = await prisma.appUser.findUnique({ where: { username: user.username } })
  const storedTmdbKey = await getStoredSetting(TMDB_API_KEY_SETTING)
  const storedTvdbKey = await getStoredSetting(TVDB_API_KEY_SETTING)
  const storedTvdbPin = await getStoredSetting(TVDB_PIN_SETTING)
  const lockedByEnvironment = isTmdbApiKeyEnvLocked()
  const tvdbKeyLocked = isTvdbApiKeyEnvLocked()
  const tvdbPinLocked = isTvdbPinEnvLocked()
  const tvdbSeasonType = await getConfiguredTvdbSeasonType()

  return (
    <div className="min-h-screen bg-gray-950">
      <Nav />
      <main className="max-w-2xl mx-auto px-4 py-12">
        <h1 className="text-3xl font-bold mb-2 text-purple-400">Settings</h1>
        <p className="text-gray-400 text-sm mb-10">Manage your LimitList account and metadata provider settings.</p>
        <SettingsClient
          initialSettings={{
            username: appUser?.username ?? user.username,
            profileImageData: appUser?.profileImageData ?? null,
            tmdbApiKey: {
              lockedByEnvironment,
              configured: lockedByEnvironment || Boolean(storedTmdbKey),
              masked: lockedByEnvironment ? 'Set in environment' : maskKey(storedTmdbKey),
            },
            tvdbApiKey: {
              lockedByEnvironment: tvdbKeyLocked,
              configured: tvdbKeyLocked || Boolean(storedTvdbKey),
              masked: tvdbKeyLocked ? 'Set in environment' : maskKey(storedTvdbKey),
            },
            tvdbPin: {
              lockedByEnvironment: tvdbPinLocked,
              configured: tvdbPinLocked || Boolean(storedTvdbPin),
              masked: tvdbPinLocked ? 'Set in environment' : maskKey(storedTvdbPin),
            },
            tvdbSeasonType,
          }}
        />
      </main>
    </div>
  )
}
