import { NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { prisma } from '@/lib/db'

export async function GET() {
  const user = await requireAuth()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const count = await prisma.episodeReminder.count({
    where: { dismissedAt: null },
  })

  return NextResponse.json({ count })
}
