import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { testChannel } from '@/lib/notify'
import type { NotificationChannel } from '@/lib/notify/types'

const CHANNELS: NotificationChannel[] = ['discord', 'ntfy', 'gotify', 'smtp']

export async function POST(req: NextRequest) {
  const user = await requireAuth()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ ok: false, message: 'Invalid request body' }, { status: 400 })
  }
  if (
    !body ||
    typeof body !== 'object' ||
    Array.isArray(body) ||
    Object.keys(body).length !== 1 ||
    !('channel' in body) ||
    typeof body.channel !== 'string' ||
    !CHANNELS.includes(body.channel as NotificationChannel)
  ) {
    return NextResponse.json({ ok: false, message: 'Unknown notification channel' }, { status: 400 })
  }

  const result = await testChannel(body.channel as NotificationChannel)
  return NextResponse.json(result, { status: result.ok ? 200 : 400 })
}
