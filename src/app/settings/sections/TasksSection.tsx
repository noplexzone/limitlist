'use client'

import { useEffect, useState } from 'react'

interface ScheduledTask {
  taskKey: string
  name: string
  description: string
  enabled: boolean
  cronExpr: string
  lastRunAt: string | null
  lastStatus: string | null
  lastMessage: string | null
  nextRunAt: string | null
}

const PRESETS = [
  { label: 'Hourly', cron: '0 * * * *' },
  { label: 'Every 6h', cron: '0 */6 * * *' },
  { label: 'Daily 3am', cron: '0 3 * * *' },
  { label: 'Weekly', cron: '0 3 * * 0' },
]

function formatRelative(iso: string | null): string {
  if (!iso) return '—'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return '—'
  return d.toLocaleString()
}

function StatusBadge({ status }: { status: string | null }) {
  if (!status || status === 'running') {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-blue-950 border border-blue-500/40 px-2 py-0.5 text-xs font-medium text-blue-300">
        {status === 'running' ? 'Running' : 'Never run'}
      </span>
    )
  }
  if (status === 'success') {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-green-950 border border-green-500/40 px-2 py-0.5 text-xs font-medium text-green-300">
        Success
      </span>
    )
  }
  if (status === 'skipped') {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-yellow-950 border border-yellow-500/40 px-2 py-0.5 text-xs font-medium text-yellow-300">
        Skipped
      </span>
    )
  }
  if (status === 'interrupted') {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-orange-950 border border-orange-500/40 px-2 py-0.5 text-xs font-medium text-orange-300">
        Interrupted
      </span>
    )
  }
  if (status === 'error') {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-red-950 border border-red-500/40 px-2 py-0.5 text-xs font-medium text-red-300">
        Error
      </span>
    )
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-surface-800 border border-surface-600 px-2 py-0.5 text-xs font-medium text-surface-400">
      {status}
    </span>
  )
}

function TaskCard({ task: initialTask }: { task: ScheduledTask }) {
  const [task, setTask] = useState(initialTask)
  const [cronInput, setCronInput] = useState(initialTask.cronExpr)
  const [showAdvanced, setShowAdvanced] = useState(false)
  const [toggling, setToggling] = useState(false)
  const [savingCron, setSavingCron] = useState(false)
  const [running, setRunning] = useState(false)
  const [cronError, setCronError] = useState('')
  const [runMessage, setRunMessage] = useState('')
  const [runError, setRunError] = useState('')

  const activePreset = PRESETS.find((p) => p.cron === task.cronExpr)

  async function toggleEnabled() {
    if (toggling) return
    setToggling(true)
    const res = await fetch(`/api/tasks/${task.taskKey}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ enabled: !task.enabled }),
    })
    const data = await res.json().catch(() => ({}))
    if (res.ok) {
      setTask(data)
    }
    setToggling(false)
  }

  async function selectPreset(cron: string) {
    setCronInput(cron)
    setCronError('')
    setSavingCron(true)
    const res = await fetch(`/api/tasks/${task.taskKey}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ cronExpr: cron }),
    })
    const data = await res.json().catch(() => ({}))
    if (res.ok) {
      setTask(data)
    } else {
      setCronError(data.error ?? 'Failed to save schedule')
    }
    setSavingCron(false)
  }

  async function saveCronExpr() {
    if (savingCron) return
    setCronError('')
    setSavingCron(true)
    const res = await fetch(`/api/tasks/${task.taskKey}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ cronExpr: cronInput.trim() }),
    })
    const data = await res.json().catch(() => ({}))
    if (res.ok) {
      setTask(data)
    } else {
      setCronError(data.error ?? 'Invalid cron expression')
    }
    setSavingCron(false)
  }

  async function runNow() {
    if (running) return
    setRunning(true)
    setRunMessage('')
    setRunError('')
    const res = await fetch(`/api/tasks/${task.taskKey}/run`, { method: 'POST' })
    const data = await res.json().catch(() => ({}))
    if (res.status === 409) {
      setRunError(data.message ?? 'Task is already running')
    } else if (!res.ok) {
      setRunError(data.error ?? 'Run failed')
    } else {
      setTask((prev) => ({
        ...prev,
        lastRunAt: data.lastRunAt ?? prev.lastRunAt,
        lastStatus: data.lastStatus ?? prev.lastStatus,
        lastMessage: data.lastMessage ?? prev.lastMessage,
        nextRunAt: data.nextRunAt ?? prev.nextRunAt,
      }))
      setRunMessage(data.message ?? 'Done')
    }
    setRunning(false)
  }

  return (
    <div className="rounded-xl border border-surface-800 bg-surface-950/70 p-4 space-y-4">
      {/* Header row */}
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="text-sm font-semibold text-accent-100">{task.name}</h3>
          <p className="text-xs text-surface-500 mt-0.5">{task.description}</p>
        </div>
        <button
          type="button"
          onClick={toggleEnabled}
          disabled={toggling}
          aria-label={task.enabled ? 'Disable task' : 'Enable task'}
          className={`relative shrink-0 inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200 focus:outline-none disabled:opacity-50 ${task.enabled ? 'bg-accent-600' : 'bg-surface-700'}`}
        >
          <span
            className={`inline-block h-4 w-4 rounded-full bg-white shadow transition-transform duration-200 ${task.enabled ? 'translate-x-6' : 'translate-x-1'}`}
          />
        </button>
      </div>

      {/* Schedule presets */}
      <div>
        <p className="mb-2 text-xs font-medium text-surface-400 uppercase tracking-wide">Schedule</p>
        <div className="flex flex-wrap gap-2">
          {PRESETS.map((preset) => (
            <button
              key={preset.cron}
              type="button"
              disabled={savingCron}
              onClick={() => selectPreset(preset.cron)}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors disabled:opacity-50 ${
                activePreset?.cron === preset.cron && !showAdvanced
                  ? 'bg-accent-700 text-white border border-accent-500'
                  : 'border border-surface-700 text-surface-300 hover:border-accent-500/60 hover:text-accent-200'
              }`}
            >
              {preset.label}
            </button>
          ))}
          <button
            type="button"
            onClick={() => setShowAdvanced((v) => !v)}
            className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors border ${
              showAdvanced || (!activePreset && task.cronExpr)
                ? 'bg-accent-700 text-white border-accent-500'
                : 'border-surface-700 text-surface-300 hover:border-accent-500/60 hover:text-accent-200'
            }`}
          >
            Advanced
          </button>
        </div>

        {(showAdvanced || (!activePreset && task.cronExpr)) && (
          <div className="mt-2 flex gap-2">
            <input
              type="text"
              value={cronInput}
              onChange={(e) => { setCronInput(e.target.value); setCronError('') }}
              placeholder="e.g. 0 3 * * *"
              className="flex-1 rounded-lg border border-surface-700 bg-surface-950 px-3 py-2 text-sm text-surface-100 outline-none focus:border-accent-500 font-mono"
            />
            <button
              type="button"
              disabled={savingCron || cronInput.trim() === task.cronExpr}
              onClick={saveCronExpr}
              className="rounded-lg bg-accent-600 px-3 py-2 text-sm font-semibold text-white hover:bg-accent-500 disabled:opacity-50"
            >
              {savingCron ? 'Saving…' : 'Save'}
            </button>
          </div>
        )}

        {cronError && (
          <p className="mt-1 text-xs text-red-400">{cronError}</p>
        )}

        {task.nextRunAt && task.enabled && (
          <p className="mt-1 text-xs text-surface-500">Next run: {formatRelative(task.nextRunAt)}</p>
        )}
      </div>

      {/* Status row */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-surface-500">
        <span className="flex items-center gap-1.5">
          Status: <StatusBadge status={task.lastStatus} />
        </span>
        {task.lastRunAt && (
          <span>Last run: {formatRelative(task.lastRunAt)}</span>
        )}
        {task.lastMessage && task.lastStatus !== null && (
          <span className="w-full text-surface-500 truncate">{task.lastMessage}</span>
        )}
      </div>

      {/* Run now */}
      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          disabled={running}
          onClick={runNow}
          className="rounded-lg border border-accent-500/60 px-4 py-2 text-sm font-semibold text-accent-100 hover:bg-accent-950 disabled:opacity-50"
        >
          {running ? 'Running…' : 'Run now'}
        </button>
        {runMessage && (
          <span className="text-sm text-green-300">{runMessage}</span>
        )}
        {runError && (
          <span className="text-sm text-red-400">{runError}</span>
        )}
      </div>
    </div>
  )
}

export default function TasksSection() {
  const [backfillingAiredCounts, setBackfillingAiredCounts] = useState(false)
  const [airedBackfillSummary, setAiredBackfillSummary] = useState('')
  const [tasks, setTasks] = useState<ScheduledTask[]>([])
  const [tasksLoading, setTasksLoading] = useState(true)

  useEffect(() => {
    fetch('/api/tasks')
      .then((res) => (res.ok ? res.json() : []))
      .then((data) => setTasks(Array.isArray(data) ? data : []))
      .catch(() => setTasks([]))
      .finally(() => setTasksLoading(false))
  }, [])

  async function backfillAiredEpisodeCounts() {
    setBackfillingAiredCounts(true)
    setAiredBackfillSummary('')
    const res = await fetch('/api/airing/backfill', { method: 'POST' })
    const body = await res.json().catch(() => ({}))
    if (res.ok) {
      const failedCount = body.failed?.length ?? 0
      setAiredBackfillSummary(`Backfill finished: ${body.succeeded ?? 0} succeeded, ${failedCount} failed, ${body.total ?? 0} eligible.`)
    } else {
      setAiredBackfillSummary(body.error ?? 'Aired episode count backfill failed')
    }
    setBackfillingAiredCounts(false)
  }

  return (
    <div className="space-y-6">
      <section className="bg-surface-900 border border-surface-800 rounded-xl p-4 sm:p-6">
        <h2 className="text-lg font-semibold text-surface-200 mb-1">Tasks</h2>
        <p className="mb-4 text-sm text-surface-400">Data maintenance operations.</p>
        <div className="space-y-4">
          <div className="rounded-xl border border-surface-800 bg-surface-950/70 p-4 space-y-3">
            <div>
              <h3 className="text-sm font-semibold text-accent-100">Aired episode counts</h3>
              <p className="text-xs text-surface-500">Populates aired-episode counts for shows added before the v1.2.2 update. Only needed once.</p>
            </div>
            <button
              type="button"
              disabled={backfillingAiredCounts}
              onClick={backfillAiredEpisodeCounts}
              className="rounded-lg border border-accent-500/60 px-4 py-2 text-sm font-semibold text-accent-100 hover:bg-accent-950 disabled:opacity-50"
            >
              {backfillingAiredCounts ? 'Backfilling…' : 'Backfill episode counts'}
            </button>
            {airedBackfillSummary && (
              <p className="rounded-lg border border-accent-500/30 bg-accent-950/30 px-3 py-2 text-sm text-accent-100">{airedBackfillSummary}</p>
            )}
          </div>
        </div>
      </section>

      <section className="bg-surface-900 border border-surface-800 rounded-xl p-4 sm:p-6">
        <h2 className="text-lg font-semibold text-surface-200 mb-1">Scheduled tasks</h2>
        <p className="mb-4 text-sm text-surface-400">
          Recurring tasks that run automatically on a schedule. Tasks run in the server process and restart with the server.
        </p>
        {tasksLoading ? (
          <p className="text-sm text-surface-500">Loading…</p>
        ) : tasks.length === 0 ? (
          <p className="text-sm text-surface-500">No scheduled tasks found.</p>
        ) : (
          <div className="space-y-4">
            {tasks.map((task) => (
              <TaskCard key={task.taskKey} task={task} />
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
