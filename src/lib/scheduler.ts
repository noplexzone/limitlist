import { Cron } from 'croner'
import { prisma } from './db'
import { refreshAllShowsAiring } from './airing'
import { syncAllShowsFromPlex } from './plex-sync'
import { getConfiguredPlexClient } from './plex'

export interface TaskDefinition {
  taskKey: string
  name: string
  description: string
  defaultCronExpr: string
}

export const TASK_DEFINITIONS: TaskDefinition[] = [
  {
    taskKey: 'airing-refresh',
    name: 'Airing refresh',
    description: 'Fetches the latest episode schedule from TVDB for all tracked shows.',
    defaultCronExpr: '0 3 * * *',
  },
  {
    taskKey: 'plex-sync',
    name: 'Plex sync',
    description: 'Syncs watched state from your Plex library for all tracked shows. When enabled, this can make the manual "Sync after schedule refresh" setting redundant.',
    defaultCronExpr: '0 4 * * *',
  },
]

declare global {
  // eslint-disable-next-line no-var
  var __schedulerJobs: Map<string, Cron> | undefined
  // eslint-disable-next-line no-var
  var __schedulerRunning: Set<string> | undefined
  // eslint-disable-next-line no-var
  var __schedulerStarted: boolean | undefined
}

function getJobsMap(): Map<string, Cron> {
  if (!globalThis.__schedulerJobs) globalThis.__schedulerJobs = new Map()
  return globalThis.__schedulerJobs
}

function getRunningSet(): Set<string> {
  if (!globalThis.__schedulerRunning) globalThis.__schedulerRunning = new Set()
  return globalThis.__schedulerRunning
}

export function computeNextRunAt(cronExpr: string): Date | null {
  try {
    const tmp = new Cron(cronExpr, { paused: true }, () => {})
    const next = tmp.nextRun()
    tmp.stop()
    return next
  } catch {
    return null
  }
}

export function validateCronExpr(cronExpr: string): boolean {
  try {
    const tmp = new Cron(cronExpr, { paused: true }, () => {})
    tmp.stop()
    return true
  } catch {
    return false
  }
}

async function runTaskFn(taskKey: string): Promise<{ status: 'success' | 'skipped'; message: string }> {
  if (taskKey === 'airing-refresh') {
    const results = await refreshAllShowsAiring()
    const succeeded = results.filter((r) => r.success).length
    const failed = results.filter((r) => !r.success).length
    return { status: 'success', message: `Refreshed ${results.length} shows: ${succeeded} succeeded, ${failed} failed` }
  }
  if (taskKey === 'plex-sync') {
    const client = await getConfiguredPlexClient()
    if (!client) return { status: 'skipped', message: 'Plex is not configured' }
    const result = await syncAllShowsFromPlex()
    const succeeded = result.results.filter((r) => r.success).length
    const skipped = result.results.filter((r) => r.skipped).length
    return { status: 'success', message: `Synced ${succeeded} shows, ${skipped} skipped, ${result.failedCount} failed` }
  }
  return { status: 'skipped', message: 'Unknown task' }
}

async function executeTask(taskKey: string): Promise<{ status: string; message: string }> {
  const running = getRunningSet()
  if (running.has(taskKey)) {
    return { status: 'skipped', message: 'Task is already running' }
  }

  running.add(taskKey)
  const startedAt = new Date()

  try {
    // Mark running without touching lastRunAt — skipped tasks should not bump it.
    await prisma.scheduledTask.update({
      where: { taskKey },
      data: { lastStatus: 'running', lastMessage: 'Running…' },
    })

    const result = await runTaskFn(taskKey)

    const task = await prisma.scheduledTask.findUnique({ where: { taskKey } })
    const nextRunAt = task ? computeNextRunAt(task.cronExpr) : null

    if (result.status === 'skipped') {
      // Don't update lastRunAt — skipped means no work was done.
      await prisma.scheduledTask.update({
        where: { taskKey },
        data: { lastStatus: 'skipped', lastMessage: result.message, nextRunAt },
      })
    } else {
      await prisma.scheduledTask.update({
        where: { taskKey },
        data: { lastRunAt: startedAt, lastStatus: result.status, lastMessage: result.message, nextRunAt },
      })
    }

    return result
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Unknown error'
    const task = await prisma.scheduledTask.findUnique({ where: { taskKey } }).catch(() => null)
    const nextRunAt = task ? computeNextRunAt(task.cronExpr) : null
    await prisma.scheduledTask
      .update({ where: { taskKey }, data: { lastRunAt: startedAt, lastStatus: 'error', lastMessage: message, nextRunAt } })
      .catch(() => {})
    return { status: 'error', message }
  } finally {
    running.delete(taskKey)
  }
}

export async function runTaskNow(taskKey: string): Promise<{ status: string; message: string }> {
  return executeTask(taskKey)
}

function scheduleTask(taskKey: string, cronExpr: string) {
  const jobs = getJobsMap()
  const existing = jobs.get(taskKey)
  if (existing) {
    existing.stop()
    jobs.delete(taskKey)
  }

  const job = new Cron(cronExpr, async () => {
    await executeTask(taskKey).catch(() => {})
  })
  jobs.set(taskKey, job)
}

function unscheduleTask(taskKey: string) {
  const jobs = getJobsMap()
  const existing = jobs.get(taskKey)
  if (existing) {
    existing.stop()
    jobs.delete(taskKey)
  }
}

export async function rescheduleTask(taskKey: string): Promise<void> {
  const task = await prisma.scheduledTask.findUnique({ where: { taskKey } })
  if (!task) {
    unscheduleTask(taskKey)
    return
  }

  if (task.enabled) {
    scheduleTask(taskKey, task.cronExpr)
    const nextRunAt = computeNextRunAt(task.cronExpr)
    await prisma.scheduledTask.update({ where: { taskKey }, data: { nextRunAt } })
  } else {
    unscheduleTask(taskKey)
    await prisma.scheduledTask.update({ where: { taskKey }, data: { nextRunAt: null } })
  }
}

export async function ensureScheduledTasks() {
  for (const def of TASK_DEFINITIONS) {
    await prisma.scheduledTask.upsert({
      where: { taskKey: def.taskKey },
      update: {},
      create: {
        taskKey: def.taskKey,
        enabled: false,
        cronExpr: def.defaultCronExpr,
      },
    })
  }
}

export async function startScheduler(): Promise<void> {
  if (globalThis.__schedulerStarted) return
  globalThis.__schedulerStarted = true

  try {
    await ensureScheduledTasks()

    // Any task still marked 'running' at boot cannot have survived the restart.
    await prisma.scheduledTask.updateMany({
      where: { lastStatus: 'running' },
      data: { lastStatus: 'interrupted', lastMessage: 'Interrupted by server restart' },
    })

    const tasks = await prisma.scheduledTask.findMany({ where: { enabled: true } })
    for (const task of tasks) {
      scheduleTask(task.taskKey, task.cronExpr)
    }

    const updateNextRuns = tasks.map((task) =>
      prisma.scheduledTask.update({
        where: { taskKey: task.taskKey },
        data: { nextRunAt: computeNextRunAt(task.cronExpr) },
      })
    )
    await Promise.all(updateNextRuns)
  } catch (e) {
    globalThis.__schedulerStarted = false
    console.error('[scheduler] Failed to start:', e)
  }
}
