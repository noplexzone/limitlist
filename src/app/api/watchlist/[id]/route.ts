import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { isShowStatus } from '@/lib/status'

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await requireAuth()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const show = await prisma.animeShow.findUnique({ where: { id } })
  if (!show) return NextResponse.json({ error: 'Show not found' }, { status: 404 })
  return NextResponse.json(show)
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await requireAuth()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const body = await req.json()

  // Validation
  if (body.status && !isShowStatus(body.status)) {
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
    'rating',
    'notes',
  ]
  const current = await prisma.animeShow.findUnique({ where: { id } })
  if (!current) return NextResponse.json({ error: 'Show not found' }, { status: 404 })

  const updateData: Record<string, unknown> = {}
  for (const field of allowedFields) {
    if (field in body) {
      if (field === 'notes') {
        const trimmed = typeof body.notes === 'string' ? body.notes.trim() : null
        updateData.notes = trimmed || null
      } else {
        updateData[field] = body[field]
        if (field === 'status') {
          if (body.status === 'UP_TO_DATE') {
            updateData.upToDateEpisodeNum = current.lastEpisodeNum ?? 0
            updateData.upToDateStale = false
          } else {
            updateData.upToDateEpisodeNum = null
            updateData.upToDateStale = false
          }
        }
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
