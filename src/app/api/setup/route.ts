import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { hashPassword } from '@/lib/password'
import { isSetupComplete } from '@/lib/setup'
import { getSession } from '@/lib/auth'
import { getTvdbProvider } from '@/lib/tvdb'
import {
  DEFAULT_TVDB_SEASON_TYPE,
  TVDB_API_KEY_SETTING,
  TVDB_PIN_SETTING,
  TVDB_SEASON_TYPE_SETTING,
  isTvdbApiKeyEnvLocked,
  isTvdbPinEnvLocked,
  upsertStoredSetting,
} from '@/lib/settings'

export async function POST(req: NextRequest) {
  if (await isSetupComplete()) {
    return NextResponse.json({ error: 'Setup already complete' }, { status: 409 })
  }

  const body = await req.json()
  const { username, password, confirmPassword } = body

  if (!username || typeof username !== 'string' || username.trim().length === 0) {
    return NextResponse.json({ error: 'Username is required' }, { status: 400 })
  }

  if (!password || typeof password !== 'string' || password.length < 8) {
    return NextResponse.json({ error: 'Password must be at least 8 characters' }, { status: 400 })
  }

  if (password !== confirmPassword) {
    return NextResponse.json({ error: 'Passwords do not match' }, { status: 400 })
  }

  const tvdbSeasonType = typeof body.tvdbSeasonType === 'string' && body.tvdbSeasonType.trim()
    ? body.tvdbSeasonType.trim()
    : DEFAULT_TVDB_SEASON_TYPE

  let tvdbWarning: string | null = null
  let validatedTvdbKey: string | null = null
  let validatedTvdbPin = ''

  if (!isTvdbApiKeyEnvLocked() && typeof body.tvdbApiKey === 'string' && body.tvdbApiKey.trim()) {
    const trimmedTvdbKey = body.tvdbApiKey.trim()
    const trimmedTvdbPin = !isTvdbPinEnvLocked() && typeof body.tvdbPin === 'string' ? body.tvdbPin.trim() : undefined
    const candidateTvdb = getTvdbProvider(trimmedTvdbKey, trimmedTvdbPin)
    try {
      const validTvdbKey = candidateTvdb ? await candidateTvdb.validateApiKey() : false
      if (validTvdbKey) {
        validatedTvdbKey = trimmedTvdbKey
        validatedTvdbPin = trimmedTvdbPin ?? ''
      } else {
        tvdbWarning = 'TVDB key could not be validated — you can add it later in Settings.'
      }
    } catch {
      tvdbWarning = 'TVDB key could not be validated — you can add it later in Settings.'
    }
  }

  const trimmedUsername = username.trim()
  const passwordHash = await hashPassword(password)

  await prisma.appUser.create({
    data: { username: trimmedUsername, passwordHash },
  })

  await upsertStoredSetting(TVDB_SEASON_TYPE_SETTING, tvdbSeasonType)
  if (validatedTvdbKey) {
    await upsertStoredSetting(TVDB_API_KEY_SETTING, validatedTvdbKey)
    if (!isTvdbPinEnvLocked()) {
      await upsertStoredSetting(TVDB_PIN_SETTING, validatedTvdbPin)
    }
  }

  const session = await getSession()
  session.user = { username: trimmedUsername }
  await session.save()

  return NextResponse.json({ ok: true, warning: tvdbWarning })
}
