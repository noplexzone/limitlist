export interface PlexDiscoveryShow {
  ratingKey: string
  title: string
  year: number | null
  tvdbId: string | null
  viewedLeafCount: number
  leafCount: number
  alreadyTracked: boolean
  warning?: string
}

export interface SettingsState {
  username: string
  profileImageData: string | null
  tvdbApiKey: {
    lockedByEnvironment: boolean
    configured: boolean
    masked: string | null
  }
  tvdbPin: {
    lockedByEnvironment: boolean
    configured: boolean
    masked: string | null
  }
  plexBaseUrl: {
    lockedByEnvironment: boolean
    configured: boolean
    value: string | null
  }
  plexToken: {
    lockedByEnvironment: boolean
    configured: boolean
    masked: string | null
  }
  tvdbSeasonType: string
  defaultCastLanguage: 'english' | 'japanese'
  plexLibrarySections: { lockedByEnvironment: boolean; value: string[] }
  plexAccountId: { lockedByEnvironment: boolean; value: string }
  plexWatchedThreshold: { lockedByEnvironment: boolean; value: 'viewcount' | 'partial' }
  plexAutoStatus: { lockedByEnvironment: boolean; value: boolean }
  plexSyncOnRefresh: { lockedByEnvironment: boolean; value: boolean }

  notifyEnabled: { lockedByEnvironment: boolean; value: boolean }
  notifyTrigger: { lockedByEnvironment: boolean; value: 'episode-aired' | 'aired-unwatched' }
  notifyDiscordEnabled: { lockedByEnvironment: boolean; value: boolean }
  notifyDiscordWebhook: { lockedByEnvironment: boolean; configured: boolean; masked: string | null }
  notifyNtfyEnabled: { lockedByEnvironment: boolean; value: boolean }
  notifyNtfyUrl: { lockedByEnvironment: boolean; value: string }
  notifyNtfyToken: { lockedByEnvironment: boolean; configured: boolean; masked: string | null }
  notifyGotifyEnabled: { lockedByEnvironment: boolean; value: boolean }
  notifyGotifyUrl: { lockedByEnvironment: boolean; value: string }
  notifyGotifyToken: { lockedByEnvironment: boolean; configured: boolean; masked: string | null }
  notifySmtpEnabled: { lockedByEnvironment: boolean; value: boolean }
  notifySmtpHost: { lockedByEnvironment: boolean; value: string }
  notifySmtpPort: { lockedByEnvironment: boolean; value: string }
  notifySmtpUser: { lockedByEnvironment: boolean; value: string }
  notifySmtpPass: { lockedByEnvironment: boolean; configured: boolean; masked: string | null }
  notifySmtpFrom: { lockedByEnvironment: boolean; value: string }
  notifySmtpTo: { lockedByEnvironment: boolean; value: string }
  theme: string
}
