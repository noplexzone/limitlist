import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { TASK_DEFINITIONS, ensureScheduledTasks, validateCronExpr, rescheduleTask } from '@/lib/scheduler'

const VALID_TASK_KEYS = new Set(TASK_DEFINITIONS.map((d) => d.taskKey))

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ taskKey: string }> }) {
  const user = await requireAuth()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  await ensureScheduledTasks()

  const { taskKey } = await params

  if (!VALID_TASK_KEYS.has(taskKey)) {
    return NextResponse.json({ error: 'Unknown task' }, { status: 404 })
  }

  const body = await req.json().catch(() => ({}))
  const data: { enabled?: boolean; cronExpr?: string; nextRunAt?: Date | null } = {}

  if ('enabled' in body) {
    if (typeof body.enabled !== 'boolean') {
      return NextResponse.json({ error: 'enabled must be a boolean' }, { status: 400 })
    }
    data.enabled = body.enabled
  }

  if ('cronExpr' in body) {
    if (typeof body.cronExpr !== 'string' || !body.cronExpr.trim()) {
      return NextResponse.json({ error: 'cronExpr must be a non-empty string' }, { status: 400 })
    }
    const expr = body.cronExpr.trim()
    if (!validateCronExpr(expr)) {
      return NextResponse.json({ error: 'Invalid cron expression' }, { status: 400 })
    }
    data.cronExpr = expr
  }

  const task = await prisma.scheduledTask.update({ where: { taskKey }, data })

  await rescheduleTask(taskKey)

  const updatedTask = await prisma.scheduledTask.findUnique({ where: { taskKey } })
  const def = TASK_DEFINITIONS.find((d) => d.taskKey === taskKey)

  return NextResponse.json({
    taskKey: task.taskKey,
    name: def?.name ?? task.taskKey,
    description: def?.description ?? '',
    enabled: updatedTask?.enabled ?? task.enabled,
    cronExpr: updatedTask?.cronExpr ?? task.cronExpr,
    lastRunAt: updatedTask?.lastRunAt?.toISOString() ?? null,
    lastStatus: updatedTask?.lastStatus ?? null,
    lastMessage: updatedTask?.lastMessage ?? null,
    nextRunAt: updatedTask?.nextRunAt?.toISOString() ?? null,
  })
}
