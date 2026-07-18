import { redirect } from 'next/navigation'
import { requireAuth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import {
  getConfiguredTvdbSeasonType,
  getDefaultCastLanguage,
  getStoredSetting,
  isTvdbApiKeyEnvLocked,
  isTvdbPinEnvLocked,
  isPlexTokenEnvLocked,
  isPlexBaseUrlEnvLocked,
  isPlexLibrarySectionsEnvLocked,
  isPlexAccountIdEnvLocked,
  isPlexWatchedThresholdEnvLocked,
  isPlexAutoStatusEnvLocked,
  isPlexSyncOnRefreshEnvLocked,
  getConfiguredPlexLibrarySections,
  getConfiguredPlexAccountId,
  getConfiguredPlexWatchedThreshold,
  getConfiguredPlexAutoStatus,
  getConfiguredPlexSyncOnRefresh,
  getConfiguredTheme,
  TVDB_API_KEY_SETTING,
  TVDB_PIN_SETTING,
  PLEX_TOKEN_SETTING,
  getEffectivePlexBaseUrl,
  maskKey,
} from '@/lib/settings'
import { getNotificationSettingsState } from '@/lib/notification-settings'
import Nav from '@/components/Nav'
import SettingsClient from './SettingsClient'
import pkg from '../../../package.json'

export default async function SettingsPage() {
  const user = await requireAuth()
  if (!user) redirect('/login')

  const appUser = await prisma.appUser.findUnique({ where: { username: user.username } })
  const storedTvdbKey = await getStoredSetting(TVDB_API_KEY_SETTING)
  const storedTvdbPin = await getStoredSetting(TVDB_PIN_SETTING)
  const storedPlexToken = await getStoredSetting(PLEX_TOKEN_SETTING)
  const effectivePlexBaseUrl = await getEffectivePlexBaseUrl()
  const plexTokenLocked = isPlexTokenEnvLocked()
  const tvdbKeyLocked = isTvdbApiKeyEnvLocked()
  const tvdbPinLocked = isTvdbPinEnvLocked()
  const tvdbSeasonType = await getConfiguredTvdbSeasonType()
  const defaultCastLanguage = await getDefaultCastLanguage()
  const plexLibrarySections = await getConfiguredPlexLibrarySections()
  const plexAccountId = await getConfiguredPlexAccountId()
  const plexWatchedThreshold = await getConfiguredPlexWatchedThreshold()
  const plexAutoStatus = await getConfiguredPlexAutoStatus()
  const plexSyncOnRefresh = await getConfiguredPlexSyncOnRefresh()
  const theme = await getConfiguredTheme()
  const notificationSettings = await getNotificationSettingsState()

  return (
    <div className="min-h-screen bg-surface-950">
      <Nav />
      <main className="max-w-4xl mx-auto px-4 py-12">
        <h1 className="text-3xl font-bold mb-2 text-accent-400">Settings</h1>
        <p className="text-surface-400 text-sm mb-10">Manage your LimitList account and metadata provider settings.</p>
        <SettingsClient
          version={pkg.version}
          initialSettings={{
            username: appUser?.username ?? user.username,
            profileImageData: appUser?.profileImageData ?? null,
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
            defaultCastLanguage,
            plexBaseUrl: {
              lockedByEnvironment: isPlexBaseUrlEnvLocked(),
              configured: Boolean(effectivePlexBaseUrl),
              value: effectivePlexBaseUrl,
            },
            plexToken: {
              lockedByEnvironment: plexTokenLocked,
              configured: plexTokenLocked || Boolean(storedPlexToken),
              masked: plexTokenLocked ? 'Set in environment' : maskKey(storedPlexToken),
            },
            plexLibrarySections: { lockedByEnvironment: isPlexLibrarySectionsEnvLocked(), value: plexLibrarySections },
            plexAccountId: { lockedByEnvironment: isPlexAccountIdEnvLocked(), value: plexAccountId ?? '' },
            plexWatchedThreshold: { lockedByEnvironment: isPlexWatchedThresholdEnvLocked(), value: plexWatchedThreshold },
            plexAutoStatus: { lockedByEnvironment: isPlexAutoStatusEnvLocked(), value: plexAutoStatus },
            plexSyncOnRefresh: { lockedByEnvironment: isPlexSyncOnRefreshEnvLocked(), value: plexSyncOnRefresh },
            ...notificationSettings,
            theme,
          }}
        />
      </main>
    </div>
  )
}
