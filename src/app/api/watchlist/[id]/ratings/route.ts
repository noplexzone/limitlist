import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { prisma } from '@/lib/db'

const CHILD_KINDS = new Set(['EPISODE', 'MOVIE'])

function validateRating(value: unknown) {
  if (value == null) return true
  if (
    typeof value !== 'number' ||
    !Number.isFinite(value) ||
    value < 0.5 ||
    value > 5.0 ||
    Math.abs(value * 2 - Math.round(value * 2)) > 0.001
  ) {
    return false
  }
  return true
}

function childKey(body: Record<string, unknown>) {
  if (body.kind === 'EPISODE') {
    const seasonNumber = body.seasonNumber
    const episodeNumber = body.episodeNumber
    if (!Number.isInteger(seasonNumber) || !Number.isInteger(episodeNumber)) return null
    return `${seasonNumber}:${episodeNumber}`
  }

  if (body.kind === 'MOVIE') {
    const providerName = typeof body.providerName === 'string' ? body.providerName.trim() : ''
    const providerId = typeof body.providerId === 'string' ? body.providerId.trim() : ''
    if (!providerName || !providerId) return null
    return `${providerName}:${providerId}`
  }

  return null
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await requireAuth()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const show = await prisma.animeShow.findUnique({ where: { id }, select: { id: true } })
  if (!show) return NextResponse.json({ error: 'Show not found' }, { status: 404 })

  const ratings = await prisma.animeChildRating.findMany({
    where: { animeShowId: id },
    orderBy: [{ kind: 'asc' }, { seasonNumber: 'asc' }, { episodeNumber: 'asc' }, { title: 'asc' }],
  })
  return NextResponse.json(ratings)
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await requireAuth()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const show = await prisma.animeShow.findUnique({ where: { id }, select: { id: true } })
  if (!show) return NextResponse.json({ error: 'Show not found' }, { status: 404 })

  const body = await req.json()
  if (!CHILD_KINDS.has(body.kind)) {
    return NextResponse.json({ error: 'Invalid child rating kind' }, { status: 400 })
  }
  if (!validateRating(body.rating)) {
    return NextResponse.json({ error: 'Rating must be a half-star value between 0.5 and 5.0' }, { status: 400 })
  }

  const key = childKey(body)
  if (!key) return NextResponse.json({ error: 'Invalid child rating key' }, { status: 400 })

  const title = typeof body.title === 'string' && body.title.trim() ? body.title.trim() : body.kind === 'EPISODE' ? `Episode ${body.episodeNumber}` : 'Movie'
  const airDate = typeof body.airDate === 'string' && body.airDate ? new Date(body.airDate) : null

  const rating = await prisma.animeChildRating.upsert({
    where: { animeShowId_kind_key: { animeShowId: id, kind: body.kind, key } },
    create: {
      animeShowId: id,
      kind: body.kind,
      key,
      providerName: typeof body.providerName === 'string' ? body.providerName : null,
      providerId: typeof body.providerId === 'string' ? body.providerId : null,
      seasonNumber: Number.isInteger(body.seasonNumber) ? body.seasonNumber : null,
      episodeNumber: Number.isInteger(body.episodeNumber) ? body.episodeNumber : null,
      title,
      posterUrl: typeof body.posterUrl === 'string' ? body.posterUrl : null,
      airDate: airDate && !Number.isNaN(airDate.getTime()) ? airDate : null,
      rating: body.rating ?? null,
    },
    update: {
      title,
      posterUrl: typeof body.posterUrl === 'string' ? body.posterUrl : null,
      airDate: airDate && !Number.isNaN(airDate.getTime()) ? airDate : null,
      rating: body.rating ?? null,
    },
  })

  return NextResponse.json(rating)
}
