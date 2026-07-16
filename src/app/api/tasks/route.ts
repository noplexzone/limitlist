import { NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { TASK_DEFINITIONS, ensureScheduledTasks } from '@/lib/scheduler'

export async function GET() {
  const user = await requireAuth()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  await ensureScheduledTasks()

  const tasks = await prisma.scheduledTask.findMany({ orderBy: { taskKey: 'asc' } })

  const definitions = Object.fromEntries(TASK_DEFINITIONS.map((d) => [d.taskKey, d]))

  return NextResponse.json(
    tasks.map((t) => ({
      taskKey: t.taskKey,
      name: definitions[t.taskKey]?.name ?? t.taskKey,
      description: definitions[t.taskKey]?.description ?? '',
      enabled: t.enabled,
      cronExpr: t.cronExpr,
      lastRunAt: t.lastRunAt?.toISOString() ?? null,
      lastStatus: t.lastStatus,
      lastMessage: t.lastMessage,
      nextRunAt: t.nextRunAt?.toISOString() ?? null,
    }))
  )
}
