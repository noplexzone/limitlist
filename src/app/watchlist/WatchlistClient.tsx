'use client'

import { MouseEvent, useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import PosterImage from '@/components/PosterImage'
import { SHOW_STATUSES, STATUS_LABELS, type ShowStatus } from '@/lib/status'

interface AnimeShow {
  id: string
  metadataProvider: string
  metadataId: string
  title: string
  originalTitle?: string | null
  posterUrl?: string | null
  firstAiredAt?: string | null
  updatedAt?: string | null
  status: ShowStatus
  rating?: number | null
  airingStatus?: string | null
  nextAiringAt?: string | null
  lastEpisodeNum?: number | null
  upToDateStale?: boolean
}

type PatchPayload = {
  status?: AnimeShow['status']
  rating?: number | null
}

type StatusFilter = 'ALL' | ShowStatus | 'NEEDS_UPDATE'
type SortMode = 'updated-desc' | 'title-asc' | 'rating-desc' | 'first-aired-desc'

const STATUS_SELECT_CLASSES: Record<ShowStatus, string> = {
  WATCHING: 'bg-blue-700/90 border-blue-500/70',
  UP_TO_DATE: 'bg-cyan-700/90 border-cyan-500/70',
  COMPLETED: 'bg-green-700/90 border-green-500/70',
  PLAN_TO_WATCH: 'bg-amber-700/90 border-amber-500/70',
  DROPPED: 'bg-red-800/90 border-red-600/70',
}

function StarIcon({ fillPct }: { fillPct: number }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="h-5 w-5 drop-shadow sm:h-6 sm:w-6">
      <path
        d="M12 2.25l2.9 5.88 6.49.94-4.7 4.58 1.11 6.46L12 17.06l-5.8 3.05 1.11-6.46-4.7-4.58 6.49-.94L12 2.25z"
        className="fill-gray-500/80"
      />
      <path
        d="M12 2.25l2.9 5.88 6.49.94-4.7 4.58 1.11 6.46L12 17.06l-5.8 3.05 1.11-6.46-4.7-4.58 6.49-.94L12 2.25z"
        className="fill-yellow-400"
        style={{ clipPath: `inset(0 ${100 - fillPct}% 0 0)` }}
      />
    </svg>
  )
}

function StarRating({
  rating,
  onRate,
}: {
  rating: number | null
  onRate: (value: number | null) => void
}) {
  const [hovered, setHovered] = useState<number | null>(null)
  const effective = hovered ?? rating ?? 0

  function click(e: MouseEvent, value: number | null) {
    e.stopPropagation()
    onRate(value)
  }

  return (
    <div className="relative w-full px-5" aria-label="Rating">
      <div className="flex items-center justify-center gap-0.5" onMouseLeave={() => setHovered(null)}>
        {[1, 2, 3, 4, 5].map((star) => {
          const half = star - 0.5
          const fillPct = Math.max(0, Math.min(1, effective - (star - 1))) * 100
          return (
            <div key={star} className="relative h-5 w-5 sm:h-6 sm:w-6">
              <StarIcon fillPct={fillPct} />
              <button
                type="button"
                aria-label={`Rate ${half} out of 5`}
                onMouseEnter={() => setHovered(half)}
                onFocus={() => setHovered(half)}
                onClick={(e) => click(e, half)}
                className="absolute left-0 top-0 z-10 h-full w-1/2 cursor-pointer rounded-l"
              />
              <button
                type="button"
                aria-label={`Rate ${star} out of 5`}
                onMouseEnter={() => setHovered(star)}
                onFocus={() => setHovered(star)}
                onClick={(e) => click(e, star)}
                className="absolute right-0 top-0 z-10 h-full w-1/2 cursor-pointer rounded-r"
              />
            </div>
          )
        })}
      </div>
      {rating != null && (
        <button
          type="button"
          onClick={(e) => click(e, null)}
          aria-label="Clear rating"
          className="absolute right-0 top-1/2 -translate-y-1/2 rounded-full bg-black/60 px-1.5 py-0.5 text-xs font-medium text-gray-200 hover:bg-black/90"
          title="Clear rating"
        >
          ×
        </button>
      )}
    </div>
  )
}

export default function WatchlistClient() {
  const router = useRouter()
  const [shows, setShows] = useState<AnimeShow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('ALL')
  const [sortMode, setSortMode] = useState<SortMode>('updated-desc')

  useEffect(() => {
    fetchWatchlist()
  }, [])

  async function fetchWatchlist() {
    setLoading(true)
    const res = await fetch('/api/watchlist')
    if (res.ok) {
      setShows(await res.json())
    } else {
      setError('Failed to load watchlist')
    }
    setLoading(false)
  }

  async function patchShow(id: string, patch: PatchPayload) {
    const previous = shows
    setShows((prev) => prev.map((show) => (show.id === id ? { ...show, ...patch } : show)))
    const res = await fetch(`/api/watchlist/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(patch),
    })
    if (res.ok) {
      const updated: AnimeShow = await res.json()
      setShows((prev) => prev.map((show) => (show.id === id ? updated : show)))
    } else {
      setShows(previous)
    }
  }

  const visibleShows = useMemo(() => {
    const filtered = shows.filter((show) => {
      if (statusFilter === 'ALL') return true
      if (statusFilter === 'NEEDS_UPDATE') return !!show.upToDateStale
      return show.status === statusFilter
    })
    return [...filtered].sort((a, b) => {
      if (sortMode === 'title-asc') return a.title.localeCompare(b.title)
      if (sortMode === 'rating-desc') return (b.rating ?? -1) - (a.rating ?? -1)
      if (sortMode === 'first-aired-desc') {
        return new Date(b.firstAiredAt ?? 0).getTime() - new Date(a.firstAiredAt ?? 0).getTime()
      }
      return new Date(b.updatedAt ?? 0).getTime() - new Date(a.updatedAt ?? 0).getTime()
    })
  }, [shows, sortMode, statusFilter])

  if (loading) return <p className="text-gray-400">Loading watchlist...</p>
  if (error) return <p className="text-red-400">{error}</p>
  if (shows.length === 0)
    return (
      <div className="text-center py-16">
        <p className="text-gray-400 text-lg mb-2">Your watchlist is empty.</p>
        <p className="text-gray-500">Use the search bar above to find and import anime.</p>
      </div>
    )

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-gray-800 bg-gray-900/70 p-3">
        <label className="text-sm text-gray-400">
          Status{' '}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
            className="ml-2 rounded-lg border border-gray-700 bg-gray-950 px-3 py-1.5 text-sm text-gray-100 outline-none focus:border-purple-500"
          >
            <option value="ALL">All</option>
            <option value="NEEDS_UPDATE">Needs update</option>
            {SHOW_STATUSES.map((status) => (
              <option key={status} value={status}>{STATUS_LABELS[status]}</option>
            ))}
          </select>
        </label>
        <label className="text-sm text-gray-400">
          Sort{' '}
          <select
            value={sortMode}
            onChange={(e) => setSortMode(e.target.value as SortMode)}
            className="ml-2 rounded-lg border border-gray-700 bg-gray-950 px-3 py-1.5 text-sm text-gray-100 outline-none focus:border-purple-500"
          >
            <option value="updated-desc">Recently updated</option>
            <option value="title-asc">Title A–Z</option>
            <option value="rating-desc">Highest rated</option>
            <option value="first-aired-desc">Newest first aired</option>
          </select>
        </label>
        <p className="ml-auto text-xs text-gray-500">{visibleShows.length} of {shows.length} shown</p>
      </div>

      {visibleShows.length === 0 ? (
        <div className="py-16 text-center text-gray-500">No shows match those filters.</div>
      ) : (
        <div className="grid grid-cols-2 gap-5 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-7">
          {visibleShows.map((show) => (
            <article
              key={show.id}
              role="button"
              tabIndex={0}
              onClick={() => router.push(`/anime/${show.metadataProvider}/${show.metadataId}`)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') router.push(`/anime/${show.metadataProvider}/${show.metadataId}`)
              }}
              className="group relative aspect-[2/3] cursor-pointer overflow-hidden rounded-2xl border border-gray-800 bg-gray-900 shadow-lg shadow-black/30 transition-transform hover:-translate-y-1 hover:border-purple-500/70 focus:border-purple-500/70 focus:outline-none"
              title={show.title}
            >
              {show.posterUrl ? (
                <PosterImage src={show.posterUrl} alt={`${show.title} poster`} title={show.title} />
              ) : (
                <div className="flex h-full w-full items-center justify-center bg-gray-800 px-3 text-center text-sm text-gray-500">
                  {show.title}
                </div>
              )}

              {show.upToDateStale && (
                <div className="absolute inset-x-0 top-12 z-10 px-2 pointer-events-none">
                  <span className="block rounded-full bg-orange-600/95 px-2 py-1 text-center text-[10px] font-bold uppercase tracking-wide text-white shadow-lg">
                    New episodes
                  </span>
                </div>
              )}

              <div className="absolute inset-x-0 top-0 bg-gradient-to-b from-black/80 via-black/45 to-transparent p-2">
                <label className="sr-only" htmlFor={`status-${show.id}`}>Status for {show.title}</label>
                <select
                  id={`status-${show.id}`}
                  value={show.status}
                  onClick={(e) => e.stopPropagation()}
                  onChange={(e) => patchShow(show.id, { status: e.target.value as AnimeShow['status'] })}
                  className={`w-full cursor-pointer rounded-full border px-2 py-1.5 text-center text-[11px] font-semibold text-white outline-none transition-colors focus:ring-2 focus:ring-white/50 sm:px-3 sm:text-xs ${STATUS_SELECT_CLASSES[show.status]}`}
                >
                  {SHOW_STATUSES.map((status) => (
                    <option key={status} value={status}>{STATUS_LABELS[status]}</option>
                  ))}
                </select>
              </div>

              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/85 to-transparent px-2 pb-2 pt-8 pointer-events-none">
                <p className="text-[11px] font-medium text-white leading-tight line-clamp-2">{show.title}</p>
              </div>

              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/95 via-black/70 to-transparent px-2 pb-3 pt-16 opacity-0 transition-opacity duration-150 group-hover:opacity-100 group-focus-within:opacity-100">
                <StarRating rating={show.rating ?? null} onRate={(value) => patchShow(show.id, { rating: value })} />
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  )
}
