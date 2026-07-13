'use client'

import { useState } from 'react'

interface ScheduleEntry {
  showId: string
  title: string
  status: string
  episodeNumber: number | null
  airsAt: string
  reminderId: string | null
  reminderDismissed: boolean
}

const STATUS_COLORS: Record<string, string> = {
  WATCHING: 'bg-blue-600',
  UP_TO_DATE: 'bg-cyan-600',
  COMPLETED: 'bg-green-600',
  PLAN_TO_WATCH: 'bg-yellow-600',
  DROPPED: 'bg-red-600',
}
const STATUS_LABELS: Record<string, string> = {
  WATCHING: 'Watching',
  UP_TO_DATE: 'Up-to-Date',
  COMPLETED: 'Completed',
  PLAN_TO_WATCH: 'Plan to Watch',
  DROPPED: 'Dropped',
}

function formatAirDate(iso: string): string {
  const d = new Date(iso)
  const now = new Date()
  const diffMs = d.getTime() - now.getTime()
  const diffDays = Math.ceil(diffMs / 86400000)

  const dateStr = d.toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  })

  if (diffDays === 0) return `Today — ${dateStr}`
  if (diffDays === 1) return `Tomorrow — ${dateStr}`
  if (diffDays > 0 && diffDays < 7) return `In ${diffDays} days — ${dateStr}`
  return dateStr
}

export default function ScheduleClient({ initialEntries }: { initialEntries: ScheduleEntry[] }) {
  const [entries, setEntries] = useState(initialEntries)
  const [dismissing, setDismissing] = useState<string | null>(null)
  const [refreshing, setRefreshing] = useState(false)
  const [refreshMsg, setRefreshMsg] = useState('')

  async function dismiss(reminderId: string) {
    setDismissing(reminderId)
    const res = await fetch(`/api/reminders/${reminderId}/dismiss`, { method: 'POST' })
    if (res.ok) {
      setEntries((prev) =>
        prev.map((e) =>
          e.reminderId === reminderId ? { ...e, reminderDismissed: true } : e
        )
      )
    }
    setDismissing(null)
  }

  async function refreshAll() {
    setRefreshing(true)
    setRefreshMsg('')
    const res = await fetch('/api/airing/refresh', { method: 'POST' })
    if (res.ok) {
      const data = await res.json()
      setRefreshMsg(`Refreshed ${data.succeeded}/${data.total} shows. Reload to see updates.`)
    } else {
      setRefreshMsg('Refresh failed.')
    }
    setRefreshing(false)
  }

  const upcoming = entries.filter((e) => !e.reminderDismissed)

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          {refreshMsg && <p className="text-sm text-gray-400">{refreshMsg}</p>}
        </div>
        <button
          onClick={refreshAll}
          disabled={refreshing}
          className="px-4 py-2 bg-purple-700 hover:bg-purple-600 disabled:opacity-50 rounded-lg text-sm font-medium transition-colors"
        >
          {refreshing ? 'Refreshing...' : 'Refresh All Schedules'}
        </button>
      </div>

      {upcoming.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-gray-400 text-lg mb-2">No upcoming episodes known.</p>
          <p className="text-gray-500 text-sm">
            Use &ldquo;Refresh All Schedules&rdquo; to fetch airing info from TMDB, or add shows with upcoming episodes to your watchlist.
          </p>
        </div>
      ) : (
        <div className="grid gap-3">
          {upcoming.map((entry) => (
            <div
              key={`${entry.showId}-${entry.airsAt}`}
              className="bg-gray-900 border border-gray-800 rounded-xl p-4 flex items-center justify-between gap-4"
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-semibold text-white truncate">{entry.title}</span>
                  <span
                    className={`px-2 py-0.5 rounded text-xs font-medium text-white flex-shrink-0 ${STATUS_COLORS[entry.status] ?? 'bg-gray-600'}`}
                  >
                    {STATUS_LABELS[entry.status] ?? entry.status}
                  </span>
                </div>
                <div className="mt-1 flex items-center gap-3 text-sm text-gray-400">
                  {entry.episodeNumber != null && (
                    <span>Episode {entry.episodeNumber}</span>
                  )}
                  <span className="text-purple-300">{formatAirDate(entry.airsAt)}</span>
                </div>
              </div>
              <div className="flex-shrink-0">
                {entry.reminderId && !entry.reminderDismissed && (
                  <button
                    onClick={() => dismiss(entry.reminderId!)}
                    disabled={dismissing === entry.reminderId}
                    className="px-3 py-1.5 bg-gray-700 hover:bg-gray-600 disabled:opacity-50 rounded-lg text-xs font-medium transition-colors"
                  >
                    {dismissing === entry.reminderId ? 'Dismissing...' : 'Dismiss'}
                  </button>
                )}
                {entry.reminderDismissed && (
                  <span className="text-xs text-gray-600">Dismissed</span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
