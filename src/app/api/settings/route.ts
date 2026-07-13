import { NextRequest, NextResponse } from 'next/server'
import { getSession, requireAuth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { hashPassword, verifyPassword } from '@/lib/password'
import { getTmdbProvider } from '@/lib/tmdb'
import {
  TMDB_API_KEY_SETTING,
  getStoredSetting,
  isTmdbApiKeyEnvLocked,
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
  const storedTmdbKey = await getStoredSetting(TMDB_API_KEY_SETTING)

  return NextResponse.json({
    username: appUser?.username ?? user.username,
    profileImageData: appUser?.profileImageData ?? null,
    tmdbApiKey: {
      lockedByEnvironment: isTmdbApiKeyEnvLocked(),
      configured: isTmdbApiKeyEnvLocked() || Boolean(storedTmdbKey),
      masked: isTmdbApiKeyEnvLocked() ? 'Set in environment' : maskKey(storedTmdbKey),
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

  if (!isTmdbApiKeyEnvLocked() && 'tmdbApiKey' in body) {
    if (typeof body.tmdbApiKey !== 'string' || body.tmdbApiKey.trim().length === 0) {
      return NextResponse.json({ error: 'TMDB API key cannot be blank' }, { status: 400 })
    }
    const trimmedTmdbKey = body.tmdbApiKey.trim()
    const candidateTmdb = getTmdbProvider(trimmedTmdbKey)
    const validTmdbKey = candidateTmdb ? await candidateTmdb.validateApiKey() : false
    if (!validTmdbKey) {
      return NextResponse.json({ error: 'TMDB API key could not be validated' }, { status: 400 })
    }
    await upsertStoredSetting(TMDB_API_KEY_SETTING, trimmedTmdbKey)
  }

  if (updated.username !== user.username) {
    const session = await getSession()
    session.user = { username: updated.username }
    await session.save()
  }

  const storedTmdbKey = await getStoredSetting(TMDB_API_KEY_SETTING)
  return NextResponse.json({
    username: updated.username,
    profileImageData: updated.profileImageData ?? null,
    tmdbApiKey: {
      lockedByEnvironment: isTmdbApiKeyEnvLocked(),
      configured: isTmdbApiKeyEnvLocked() || Boolean(storedTmdbKey),
      masked: isTmdbApiKeyEnvLocked() ? 'Set in environment' : maskKey(storedTmdbKey),
    },
  })
}
