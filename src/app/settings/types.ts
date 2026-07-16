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
}
