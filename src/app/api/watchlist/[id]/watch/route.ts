import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { prisma } from '@/lib/db'

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireAuth()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id } = await params
  const body = await req.json().catch(() => ({}))
  const seasonNumber = Number(body.seasonNumber)
  const episodeNumber = Number(body.episodeNumber)
  if (!Number.isInteger(seasonNumber) || !Number.isInteger(episodeNumber)) {
    return NextResponse.json({ error: 'seasonNumber and episodeNumber are required' }, { status: 400 })
  }
  const watched = Boolean(body.watched)
  const show = await prisma.animeShow.findUnique({ where: { id } })
  if (!show) return NextResponse.json({ error: 'Show not found' }, { status: 404 })
  const row = await prisma.episodeWatch.upsert({
    where: { animeShowId_seasonNumber_episodeNumber: { animeShowId: id, seasonNumber, episodeNumber } },
    update: { watched, watchedAt: watched ? new Date() : null, source: 'manual' },
    create: { animeShowId: id, seasonNumber, episodeNumber, watched, watchedAt: watched ? new Date() : null, source: 'manual' },
  })
  return NextResponse.json({
    key: `${row.seasonNumber}:${row.episodeNumber}`,
    seasonNumber: row.seasonNumber,
    episodeNumber: row.episodeNumber,
    watched: row.watched,
    watchedAt: row.watchedAt?.toISOString() ?? null,
    source: row.source,
  })
}
