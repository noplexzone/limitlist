'use client'

import { useState } from 'react'
import { isShowStatus, STATUS_BADGE_CLASSES, STATUS_LABELS } from '@/lib/status'

interface ScheduleEntry {
  showId: string
  title: string
  status: string
  episodeNumber: number | null
  airsAt: string
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

// ---- Calendar component ----

function buildCalendar(year: number, month: number) {
  const firstDay = new Date(year, month, 1).getDay() // 0=Sun
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const cells: (number | null)[] = Array(firstDay).fill(null)
  for (let d = 1; d <= daysInMonth; d++) cells.push(d)
  while (cells.length % 7 !== 0) cells.push(null)
  return cells
}

const MONTH_NAMES = [
  'January','February','March','April','May','June',
  'July','August','September','October','November','December',
]
const DAY_ABBRS = ['Su','Mo','Tu','We','Th','Fr','Sa']

function AiringCalendar({
  entries,
  selectedDate,
  onSelectDate,
}: {
  entries: ScheduleEntry[]
  selectedDate: string | null
  onSelectDate: (dateKey: string | null) => void
}) {
  const today = new Date()
  const [viewYear, setViewYear] = useState(today.getFullYear())
  const [viewMonth, setViewMonth] = useState(today.getMonth())

  // Build a set of date keys (YYYY-MM-DD) that have entries
  const airingDates = new Set<string>()
  for (const e of entries) {
    const d = new Date(e.airsAt)
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
    airingDates.add(key)
  }

  const cells = buildCalendar(viewYear, viewMonth)
  const todayKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`

  function prevMonth() {
    if (viewMonth === 0) { setViewYear(viewYear - 1); setViewMonth(11) }
    else setViewMonth(viewMonth - 1)
  }
  function nextMonth() {
    if (viewMonth === 11) { setViewYear(viewYear + 1); setViewMonth(0) }
    else setViewMonth(viewMonth + 1)
  }

  function cellKey(day: number) {
    return `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
  }

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 select-none">
      {/* Month header */}
      <div className="flex items-center justify-between mb-3">
        <button
          onClick={prevMonth}
          aria-label="Previous month"
          className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-gray-800 transition-colors"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <span className="text-sm font-semibold text-gray-200">
          {MONTH_NAMES[viewMonth]} {viewYear}
        </span>
        <button
          onClick={nextMonth}
          aria-label="Next month"
          className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-gray-800 transition-colors"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>

      {/* Day-of-week headers */}
      <div className="grid grid-cols-7 mb-1">
        {DAY_ABBRS.map((d) => (
          <div key={d} className="text-center text-[10px] font-medium text-gray-500 py-1">{d}</div>
        ))}
      </div>

      {/* Date cells */}
      <div className="grid grid-cols-7 gap-y-0.5">
        {cells.map((day, i) => {
          if (day === null) return <div key={`empty-${i}`} />
          const key = cellKey(day)
          const hasAiring = airingDates.has(key)
          const isToday = key === todayKey
          const isSelected = key === selectedDate

          return (
            <button
              key={key}
              onClick={() => onSelectDate(isSelected ? null : key)}
              aria-label={`${MONTH_NAMES[viewMonth]} ${day}${hasAiring ? ' — has airing episodes' : ''}`}
              aria-pressed={isSelected}
              className={`
                relative flex flex-col items-center justify-center h-8 w-full rounded-lg text-xs font-medium transition-colors
                ${isSelected ? 'bg-purple-600 text-white' : isToday ? 'bg-slate-700 text-white' : 'text-gray-300 hover:bg-gray-800'}
              `}
            >
              {day}
              {hasAiring && (
                <span
                  className={`absolute bottom-1 left-1/2 -translate-x-1/2 h-1 w-1 rounded-full ${isSelected ? 'bg-white' : 'bg-purple-400'}`}
                  aria-hidden="true"
                />
              )}
            </button>
          )
        })}
      </div>

      {selectedDate && (
        <p className="mt-3 text-center text-xs text-gray-500">
          Showing episodes for{' '}
          <span className="text-purple-400 font-medium">
            {new Date(selectedDate + 'T12:00:00').toLocaleDateString(undefined, { month: 'long', day: 'numeric' })}
          </span>
          {' '}—{' '}
          <button
            onClick={() => onSelectDate(null)}
            className="text-gray-400 underline hover:text-white"
          >
            show all
          </button>
        </p>
      )}
    </div>
  )
}

// ---- Main component ----

export default function UpcomingReleases({ initialEntries, compact = false }: { initialEntries: ScheduleEntry[]; compact?: boolean }) {
  const [entries, setEntries] = useState(initialEntries)
  const [refreshing, setRefreshing] = useState(false)
  const [refreshMsg, setRefreshMsg] = useState('')
  const [selectedDate, setSelectedDate] = useState<string | null>(null)

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

  const hasEntries = entries.length > 0

  // Filter by selected calendar date if one is chosen
  const filtered = selectedDate
    ? entries.filter((e) => {
        const d = new Date(e.airsAt)
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
        return key === selectedDate
      })
    : entries

  return (
    <div>
      <div className={`flex ${compact ? 'flex-col items-stretch gap-2' : 'items-center justify-between'} mb-6`}>
        <div>
          {refreshMsg && <p className="text-sm text-gray-400">{refreshMsg}</p>}
        </div>
        <button
          onClick={refreshAll}
          disabled={refreshing}
          className="px-4 py-2 bg-purple-700 hover:bg-purple-600 disabled:opacity-50 rounded-lg text-sm font-medium transition-colors"
        >
          {refreshing ? 'Refreshing…' : 'Refresh All Schedules'}
        </button>
      </div>

      <div className={compact ? 'flex flex-col-reverse gap-5' : 'grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-8 items-start'}>
        {/* Episode list */}
        <div>
          {!hasEntries ? (
            <div className="text-center py-16">
              <p className="text-gray-400 text-lg mb-2">No upcoming episodes known.</p>
              <p className="text-gray-500 text-sm">
                Use &ldquo;Refresh All Schedules&rdquo; to fetch airing info from TVDB, or add shows with upcoming episodes to your watchlist.
              </p>
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-400">No episodes on this date.</p>
            </div>
          ) : (
            <div className="grid gap-3">
              {filtered.map((entry) => (
                <div
                  key={`${entry.showId}-${entry.airsAt}`}
                  className={`bg-gray-900 border border-gray-800 rounded-xl ${compact ? 'p-3 flex-col items-start' : 'p-4 items-center'} flex justify-between gap-4`}
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-white truncate">{entry.title}</span>
                      <span
                        className={`px-2 py-0.5 rounded text-xs font-medium text-white flex-shrink-0 ${isShowStatus(entry.status) ? STATUS_BADGE_CLASSES[entry.status] : 'bg-gray-600'}`}
                      >
                        {isShowStatus(entry.status) ? STATUS_LABELS[entry.status] : entry.status}
                      </span>
                    </div>
                    <div className="mt-1 flex items-center gap-3 text-sm text-gray-400">
                      {entry.episodeNumber != null && (
                        <span>Episode {entry.episodeNumber}</span>
                      )}
                      <span className="text-purple-300">{formatAirDate(entry.airsAt)}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Calendar sidebar */}
        <div className="lg:sticky lg:top-[5rem]">
          <AiringCalendar
            entries={entries}
            selectedDate={selectedDate}
            onSelectDate={setSelectedDate}
          />
        </div>
      </div>
    </div>
  )
}
