import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { prisma } from '@/lib/db'

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await requireAuth()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const body = await req.json()

  // Validation
  if (body.episodesWatched !== undefined && body.episodesWatched < 0) {
    return NextResponse.json({ error: 'Episodes watched cannot be negative' }, { status: 400 })
  }
  if (body.episodesTotal !== undefined && body.episodesTotal !== null && body.episodesTotal < 0) {
    return NextResponse.json({ error: 'Episodes total cannot be negative' }, { status: 400 })
  }
  if (
    body.episodesWatched !== undefined &&
    body.episodesTotal !== undefined &&
    body.episodesTotal !== null &&
    body.episodesWatched > body.episodesTotal
  ) {
    return NextResponse.json(
      { error: 'Episodes watched cannot exceed total episodes' },
      { status: 400 }
    )
  }
  if (body.episodeDurationMinutes !== undefined && body.episodeDurationMinutes <= 0) {
    return NextResponse.json({ error: 'Episode duration must be positive' }, { status: 400 })
  }

  const validStatuses = ['WATCHING', 'COMPLETED', 'PLAN_TO_WATCH', 'DROPPED']
  if (body.status && !validStatuses.includes(body.status)) {
    return NextResponse.json({ error: 'Invalid status' }, { status: 400 })
  }

  if (body.rating !== undefined && body.rating !== null) {
    const r = body.rating
    if (
      typeof r !== 'number' ||
      !Number.isFinite(r) ||
      r < 0.5 ||
      r > 5.0 ||
      Math.abs(r * 2 - Math.round(r * 2)) > 0.001
    ) {
      return NextResponse.json(
        { error: 'Rating must be a half-star value between 0.5 and 5.0' },
        { status: 400 }
      )
    }
  }

  const allowedFields = [
    'status',
    'episodesWatched',
    'episodesTotal',
    'episodeDurationMinutes',
    'rating',
    'notes',
  ]
  const updateData: Record<string, unknown> = {}
  for (const field of allowedFields) {
    if (field in body) {
      if (field === 'notes') {
        const trimmed = typeof body.notes === 'string' ? body.notes.trim() : null
        updateData.notes = trimmed || null
      } else {
        updateData[field] = body[field]
      }
    }
  }

  try {
    const show = await prisma.animeShow.update({
      where: { id },
      data: updateData,
    })
    return NextResponse.json(show)
  } catch {
    return NextResponse.json({ error: 'Show not found' }, { status: 404 })
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await requireAuth()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params

  try {
    await prisma.animeShow.delete({ where: { id } })
    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ error: 'Show not found' }, { status: 404 })
  }
}
