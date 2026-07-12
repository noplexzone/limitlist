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

  const allowedFields = [
    'status',
    'episodesWatched',
    'episodesTotal',
    'episodeDurationMinutes',
  ]
  const updateData: Record<string, unknown> = {}
  for (const field of allowedFields) {
    if (field in body) updateData[field] = body[field]
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
