import { NextRequest, NextResponse } from 'next/server'
import { getSession, requireAuth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { hashPassword, verifyPassword } from '@/lib/password'
import { getTvdbProvider } from '@/lib/tvdb'
import { PlexClient } from '@/lib/plex'
import {
  TVDB_API_KEY_SETTING,
  TVDB_PIN_SETTING,
  TVDB_SEASON_TYPE_SETTING,
  DEFAULT_CAST_LANGUAGE_SETTING,
  PLEX_BASE_URL_SETTING,
  PLEX_TOKEN_SETTING,
  getConfiguredTvdbSeasonType,
  getDefaultCastLanguage,
  getStoredSetting,
  normalizeCastLanguage,
  isTvdbApiKeyEnvLocked,
  isTvdbPinEnvLocked,
  isPlexTokenEnvLocked,
  getEffectivePlexBaseUrl,
  getEffectivePlexToken,
  upsertStoredSetting,
} from '@/lib/settings'

const MAX_PROFILE_IMAGE_BYTES = 2 * 1024 * 1024

function maskKey(value: string | null) {
  if (!value) return null
  if (value.length <= 8) return '••••'
  return `${value.slice(0, 4)}…${value.slice(-4)}`
}

function validateProfileImageData(value: unknown): string | null {
  if (value === null || value === '') return null
  if (typeof value !== 'string') throw new Error('Profile image must be a data URL')
  if (!/^data:image\/(png|jpeg|jpg|webp|gif);base64,/i.test(value)) {
    throw new Error('Profile image must be PNG, JPEG, WebP, or GIF')
  }
  const base64 = value.split(',', 2)[1] ?? ''
  const approxBytes = Math.floor((base64.length * 3) / 4)
  if (approxBytes > MAX_PROFILE_IMAGE_BYTES) {
    throw new Error('Profile image must be 2 MB or smaller')
  }
  return value
}

export async function GET() {
  const user = await requireAuth()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const appUser = await prisma.appUser.findUnique({ where: { username: user.username } })
  const [storedTvdbKey, storedTvdbPin, effectivePlexBaseUrl, storedPlexToken, tvdbSeasonType, defaultCastLanguage] =
    await Promise.all([
      getStoredSetting(TVDB_API_KEY_SETTING),
      getStoredSetting(TVDB_PIN_SETTING),
      getEffectivePlexBaseUrl(),
      getStoredSetting(PLEX_TOKEN_SETTING),
      getConfiguredTvdbSeasonType(),
      getDefaultCastLanguage(),
    ])

  return NextResponse.json({
    username: appUser?.username ?? user.username,
    profileImageData: appUser?.profileImageData ?? null,
    tvdbApiKey: {
      lockedByEnvironment: isTvdbApiKeyEnvLocked(),
      configured: isTvdbApiKeyEnvLocked() || Boolean(storedTvdbKey),
      masked: isTvdbApiKeyEnvLocked() ? 'Set in environment' : maskKey(storedTvdbKey),
    },
    tvdbPin: {
      lockedByEnvironment: isTvdbPinEnvLocked(),
      configured: isTvdbPinEnvLocked() || Boolean(storedTvdbPin),
      masked: isTvdbPinEnvLocked() ? 'Set in environment' : maskKey(storedTvdbPin),
    },
    tvdbSeasonType,
    defaultCastLanguage,
    plexBaseUrl: {
      lockedByEnvironment: Boolean(process.env.PLEX_BASE_URL),
      configured: Boolean(effectivePlexBaseUrl),
      value: effectivePlexBaseUrl,
    },
    plexToken: {
      lockedByEnvironment: isPlexTokenEnvLocked(),
      configured: isPlexTokenEnvLocked() || Boolean(storedPlexToken),
      masked: isPlexTokenEnvLocked() ? 'Set in environment' : maskKey(storedPlexToken),
    },
  })
}

export async function PATCH(req: NextRequest) {
  const user = await requireAuth()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const appUser = await prisma.appUser.findUnique({ where: { username: user.username } })
  if (!appUser) return NextResponse.json({ error: 'Account not found' }, { status: 404 })

  const data: { username?: string; passwordHash?: string; profileImageData?: string | null } = {}

  const usernameChangeRequested =
    'username' in body && typeof body.username === 'string' && body.username.trim() !== appUser.username
  const passwordChangeRequested = Boolean(body.newPassword || body.currentPassword)
  const requiresCurrentPassword = usernameChangeRequested || passwordChangeRequested

  if (requiresCurrentPassword) {
    if (typeof body.currentPassword !== 'string' || !(await verifyPassword(body.currentPassword, appUser.passwordHash))) {
      return NextResponse.json({ error: 'Current password is incorrect' }, { status: 400 })
    }
  }

  if ('username' in body) {
    if (typeof body.username !== 'string' || body.username.trim().length === 0) {
      return NextResponse.json({ error: 'Username is required' }, { status: 400 })
    }
    const username = body.username.trim()
    if (username !== appUser.username) {
      const existing = await prisma.appUser.findUnique({ where: { username } })
      if (existing) return NextResponse.json({ error: 'Username is already taken' }, { status: 409 })
      data.username = username
    }
  }

  if (passwordChangeRequested) {
    if (typeof body.newPassword !== 'string' || body.newPassword.length < 8) {
      return NextResponse.json({ error: 'New password must be at least 8 characters' }, { status: 400 })
    }
    data.passwordHash = await hashPassword(body.newPassword)
  }

  if ('profileImageData' in body) {
    try {
      data.profileImageData = validateProfileImageData(body.profileImageData)
    } catch (err) {
      return NextResponse.json({ error: err instanceof Error ? err.message : 'Invalid profile image' }, { status: 400 })
    }
  }

  const updated = Object.keys(data).length
    ? await prisma.appUser.update({ where: { id: appUser.id }, data })
    : appUser


  if (!isTvdbApiKeyEnvLocked() && 'tvdbApiKey' in body) {
    if (typeof body.tvdbApiKey !== 'string' || body.tvdbApiKey.trim().length === 0) {
      return NextResponse.json({ error: 'TVDB API key cannot be blank' }, { status: 400 })
    }
    const trimmedTvdbKey = body.tvdbApiKey.trim()
    const trimmedTvdbPin = typeof body.tvdbPin === 'string' ? body.tvdbPin.trim() : await getStoredSetting(TVDB_PIN_SETTING)
    const candidateTvdb = getTvdbProvider(trimmedTvdbKey, trimmedTvdbPin || undefined)
    const validTvdbKey = candidateTvdb ? await candidateTvdb.validateApiKey() : false
    if (!validTvdbKey) {
      return NextResponse.json({ error: 'TVDB API key could not be validated' }, { status: 400 })
    }
    await upsertStoredSetting(TVDB_API_KEY_SETTING, trimmedTvdbKey)
    if (!isTvdbPinEnvLocked() && typeof body.tvdbPin === 'string') {
      await upsertStoredSetting(TVDB_PIN_SETTING, body.tvdbPin.trim())
    }
  }

  if (!isTvdbPinEnvLocked() && 'tvdbPin' in body && !('tvdbApiKey' in body)) {
    await upsertStoredSetting(TVDB_PIN_SETTING, typeof body.tvdbPin === 'string' ? body.tvdbPin.trim() : '')
  }

  if ('tvdbSeasonType' in body) {
    if (typeof body.tvdbSeasonType !== 'string' || body.tvdbSeasonType.trim().length === 0) {
      return NextResponse.json({ error: 'TVDB season type cannot be blank' }, { status: 400 })
    }
    await upsertStoredSetting(TVDB_SEASON_TYPE_SETTING, body.tvdbSeasonType.trim())
  }

  if ('defaultCastLanguage' in body) {
    if (body.defaultCastLanguage !== 'english' && body.defaultCastLanguage !== 'japanese') {
      return NextResponse.json({ error: 'Default cast language must be English or Japanese' }, { status: 400 })
    }
    await upsertStoredSetting(DEFAULT_CAST_LANGUAGE_SETTING, normalizeCastLanguage(body.defaultCastLanguage))
  }

  // Plex settings
  const candidatePlexBaseUrl =
    'plexBaseUrl' in body && typeof body.plexBaseUrl === 'string' ? body.plexBaseUrl.trim() : null
  const candidatePlexToken =
    !isPlexTokenEnvLocked() && 'plexToken' in body && typeof body.plexToken === 'string'
      ? body.plexToken.trim()
      : null

  const storePlexBaseUrl = candidatePlexBaseUrl !== null && candidatePlexBaseUrl !== ''
  const storePlexToken = candidatePlexToken !== null && candidatePlexToken !== ''

  if (storePlexBaseUrl || storePlexToken) {
    const validateBaseUrl = (storePlexBaseUrl ? candidatePlexBaseUrl : null) ?? (await getEffectivePlexBaseUrl())
    const validateToken = (storePlexToken ? candidatePlexToken : null) ?? (await getEffectivePlexToken())

    if (validateBaseUrl && validateToken) {
      const valid = await new PlexClient(validateBaseUrl, validateToken).validate()
      if (!valid) {
        return NextResponse.json({ error: 'Plex credentials could not be validated' }, { status: 400 })
      }
    } else if (storePlexToken && !validateBaseUrl) {
      return NextResponse.json({ error: 'Plex base URL must be configured to validate the token' }, { status: 400 })
    }

    if (storePlexBaseUrl) await upsertStoredSetting(PLEX_BASE_URL_SETTING, candidatePlexBaseUrl!)
    if (storePlexToken) await upsertStoredSetting(PLEX_TOKEN_SETTING, candidatePlexToken!)
  }

  if (updated.username !== user.username) {
    const session = await getSession()
    session.user = { username: updated.username }
    await session.save()
  }

  const [storedTvdbKey, storedTvdbPin, effectivePlexBaseUrl, storedPlexToken, tvdbSeasonType, defaultCastLanguage] =
    await Promise.all([
      getStoredSetting(TVDB_API_KEY_SETTING),
      getStoredSetting(TVDB_PIN_SETTING),
      getEffectivePlexBaseUrl(),
      getStoredSetting(PLEX_TOKEN_SETTING),
      getConfiguredTvdbSeasonType(),
      getDefaultCastLanguage(),
    ])
  return NextResponse.json({
    username: updated.username,
    profileImageData: updated.profileImageData ?? null,
    tvdbApiKey: {
      lockedByEnvironment: isTvdbApiKeyEnvLocked(),
      configured: isTvdbApiKeyEnvLocked() || Boolean(storedTvdbKey),
      masked: isTvdbApiKeyEnvLocked() ? 'Set in environment' : maskKey(storedTvdbKey),
    },
    tvdbPin: {
      lockedByEnvironment: isTvdbPinEnvLocked(),
      configured: isTvdbPinEnvLocked() || Boolean(storedTvdbPin),
      masked: isTvdbPinEnvLocked() ? 'Set in environment' : maskKey(storedTvdbPin),
    },
    tvdbSeasonType,
    defaultCastLanguage,
    plexBaseUrl: {
      lockedByEnvironment: Boolean(process.env.PLEX_BASE_URL),
      configured: Boolean(effectivePlexBaseUrl),
      value: effectivePlexBaseUrl,
    },
    plexToken: {
      lockedByEnvironment: isPlexTokenEnvLocked(),
      configured: isPlexTokenEnvLocked() || Boolean(storedPlexToken),
      masked: isPlexTokenEnvLocked() ? 'Set in environment' : maskKey(storedPlexToken),
    },
  })
}
