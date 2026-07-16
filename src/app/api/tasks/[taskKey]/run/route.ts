import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { TASK_DEFINITIONS, ensureScheduledTasks, runTaskNow } from '@/lib/scheduler'

const VALID_TASK_KEYS = new Set(TASK_DEFINITIONS.map((d) => d.taskKey))

export async function POST(_req: NextRequest, { params }: { params: Promise<{ taskKey: string }> }) {
  const user = await requireAuth()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  await ensureScheduledTasks()

  const { taskKey } = await params

  if (!VALID_TASK_KEYS.has(taskKey)) {
    return NextResponse.json({ error: 'Unknown task' }, { status: 404 })
  }

  const exists = await prisma.scheduledTask.findUnique({ where: { taskKey } })
  if (!exists) {
    return NextResponse.json({ error: 'Task not found in database' }, { status: 404 })
  }

  const result = await runTaskNow(taskKey)

  // "already running" is a concurrency guard — return 409 so the UI can show a distinct message.
  if (result.message === 'Task is already running') {
    return NextResponse.json({ status: 'skipped', message: result.message }, { status: 409 })
  }

  const updated = await prisma.scheduledTask.findUnique({ where: { taskKey } })

  return NextResponse.json({
    status: result.status,
    message: result.message,
    lastRunAt: updated?.lastRunAt?.toISOString() ?? null,
    lastStatus: updated?.lastStatus ?? null,
    lastMessage: updated?.lastMessage ?? null,
    nextRunAt: updated?.nextRunAt?.toISOString() ?? null,
  })
}
