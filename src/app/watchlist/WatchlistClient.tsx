'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'

interface AnimeShow {
  id: string
  metadataProvider: string
  metadataId: string
  title: string
  originalTitle?: string | null
  overview?: string | null
  posterUrl?: string | null
  firstAiredAt?: string | null
  status: 'WATCHING' | 'COMPLETED' | 'PLAN_TO_WATCH' | 'DROPPED'
  episodesTotal?: number | null
  episodesWatched: number
  episodeDurationMinutes: number
  genres?: string | null
  studios?: string | null
  rating?: number | null
  notes?: string | null
  airingStatus?: string | null
  nextEpisodeNum?: number | null
  nextAiringAt?: string | null
  airingRefreshedAt?: string | null
}

const STATUS_SELECT_CLASSES: Record<AnimeShow['status'], string> = {
  WATCHING: 'bg-blue-700 border-blue-600',
  COMPLETED: 'bg-green-700 border-green-600',
  PLAN_TO_WATCH: 'bg-amber-700 border-amber-600',
  DROPPED: 'bg-red-800 border-red-700',
}

function StarRating({
  rating,
  onRate,
}: {
  rating: number | null
  onRate: (v: number | null) => void
}) {
  const [hov, setHov] = useState<number | null>(null)
  const effective = hov ?? rating ?? 0

  return (
    <div className="flex items-center gap-2">
      <div className="flex" onMouseLeave={() => setHov(null)}>
        {Array.from({ length: 5 }, (_, i) => {
          const full = i + 1
          const half = i + 0.5
          const isFull = effective >= full
          const isHalf = !isFull && effective >= half
          return (
            <div key={i} className="relative w-6 h-6">
              <span className="absolute inset-0 text-gray-600 text-xl leading-none select-none">
                ★
              </span>
              {(isFull || isHalf) && (
                <span
                  className="absolute inset-0 text-yellow-400 text-xl leading-none select-none"
                  style={isHalf ? { clipPath: 'inset(0 50% 0 0)' } : undefined}
                >
                  ★
                </span>
              )}
              <div
                className="absolute left-0 top-0 w-1/2 h-full z-10 cursor-pointer"
                onMouseEnter={() => setHov(half)}
                onClick={() => onRate(half)}
              />
              <div
                className="absolute right-0 top-0 w-1/2 h-full z-10 cursor-pointer"
                onMouseEnter={() => setHov(full)}
                onClick={() => onRate(full)}
              />
            </div>
          )
        })}
      </div>
      {rating != null ? (
        <>
          <span className="text-yellow-400 text-sm font-semibold">{rating}/5</span>
          <button
            onClick={() => onRate(null)}
            className="text-gray-500 hover:text-white text-sm leading-none"
            title="Clear rating"
          >
            ✕
          </button>
        </>
      ) : (
        <span className="text-gray-500 text-xs italic">Unrated</span>
      )}
    </div>
  )
}

export default function WatchlistClient() {
  const [shows, setShows] = useState<AnimeShow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [refreshingId, setRefreshingId] = useState<string | null>(null)
  const [notesMap, setNotesMap] = useState<Record<string, string>>({})

  useEffect(() => {
    fetchWatchlist()
  }, [])

  async function fetchWatchlist() {
    setLoading(true)
    const res = await fetch('/api/watchlist')
    if (res.ok) {
      const data: AnimeShow[] = await res.json()
      setShows(data)
      setNotesMap(Object.fromEntries(data.map((s) => [s.id, s.notes ?? ''])))
    } else {
      setError('Failed to load watchlist')
    }
    setLoading(false)
  }

  async function patchShow(
    id: string,
    patch: { status?: AnimeShow['status']; rating?: number | null; notes?: string | null }
  ) {
    setShows((prev) => prev.map((s) => (s.id === id ? ({ ...s, ...patch } as AnimeShow) : s)))
    const res = await fetch(`/api/watchlist/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(patch),
    })
    if (res.ok) {
      const updated: AnimeShow = await res.json()
      setShows((prev) => prev.map((s) => (s.id === id ? updated : s)))
    }
  }

  async function refreshAiring(id: string) {
    setRefreshingId(id)
    const res = await fetch(`/api/watchlist/${id}/refresh-airing`, { method: 'POST' })
    if (res.ok) await fetchWatchlist()
    setRefreshingId(null)
  }

  async function deleteShow(id: string, title: string) {
    if (!confirm(`Remove "${title}" from your watchlist?`)) return
    const res = await fetch(`/api/watchlist/${id}`, { method: 'DELETE' })
    if (res.ok) setShows((prev) => prev.filter((s) => s.id !== id))
  }

  if (loading) return <p className="text-gray-400">Loading watchlist...</p>
  if (error) return <p className="text-red-400">{error}</p>
  if (shows.length === 0)
    return (
      <div className="text-center py-16">
        <p className="text-gray-400 text-lg mb-2">Your watchlist is empty.</p>
        <p className="text-gray-500">
          Go to{' '}
          <a href="/search" className="text-purple-400 underline">
            Search
          </a>{' '}
          to find and import anime.
        </p>
      </div>
    )

  return (
    <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
      {shows.map((show) => {
        const year = show.firstAiredAt
          ? new Date(show.firstAiredAt).getFullYear()
          : null
        return (
          <div
            key={show.id}
            className="bg-gray-900 rounded-2xl p-5 flex gap-5 border border-gray-800 hover:border-gray-700 transition-colors"
          >
            {show.posterUrl ? (
              <div className="flex-shrink-0">
                <Image
                  src={show.posterUrl}
                  alt={`${show.title} poster`}
                  width={120}
                  height={180}
                  className="rounded-xl object-cover"
                />
              </div>
            ) : (
              <div className="flex-shrink-0 w-[120px] h-[180px] rounded-xl bg-gray-800 flex items-center justify-center">
                <span className="text-gray-600 text-3xl">?</span>
              </div>
            )}

            <div className="flex-1 min-w-0 flex flex-col gap-3">
              {/* Title block */}
              <div>
                <h2 className="font-bold text-xl text-white leading-tight">{show.title}</h2>
                {show.originalTitle && show.originalTitle !== show.title && (
                  <p className="text-gray-400 text-sm mt-0.5">{show.originalTitle}</p>
                )}
                {(year || show.genres || show.studios) && (
                  <p className="text-xs text-gray-500 mt-1.5 leading-relaxed">
                    {[year, show.genres, show.studios].filter(Boolean).join(' · ')}
                  </p>
                )}
              </div>

              {/* Status tag dropdown */}
              <select
                value={show.status}
                onChange={(e) =>
                  patchShow(show.id, { status: e.target.value as AnimeShow['status'] })
                }
                className={`self-start rounded-full px-4 py-1 text-xs font-semibold text-white border appearance-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-white/20 transition-colors ${STATUS_SELECT_CLASSES[show.status]}`}
              >
                <option value="PLAN_TO_WATCH">Plan to Watch</option>
                <option value="WATCHING">Watching</option>
                <option value="COMPLETED">Completed</option>
                <option value="DROPPED">Dropped</option>
              </select>

              {/* Star rating */}
              <StarRating
                rating={show.rating ?? null}
                onRate={(v) => patchShow(show.id, { rating: v })}
              />

              {/* Notes */}
              <textarea
                value={notesMap[show.id] ?? ''}
                onChange={(e) =>
                  setNotesMap((m) => ({ ...m, [show.id]: e.target.value }))
                }
                onBlur={() => {
                  const v = notesMap[show.id] ?? ''
                  if (v !== (show.notes ?? '')) {
                    patchShow(show.id, { notes: v || null })
                  }
                }}
                rows={2}
                placeholder="Add notes…"
                className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-300 placeholder-gray-600 resize-none w-full focus:outline-none focus:border-gray-500 transition-colors"
              />

              {/* Next airing */}
              {show.nextAiringAt && (
                <p className="text-xs text-purple-300">
                  Next ep{show.nextEpisodeNum != null ? ` ${show.nextEpisodeNum}` : ''}:{' '}
                  {new Date(show.nextAiringAt).toLocaleDateString(undefined, {
                    weekday: 'short',
                    month: 'short',
                    day: 'numeric',
                  })}
                </p>
              )}

              {/* Actions */}
              <div className="flex gap-2 flex-wrap mt-auto pt-1">
                {show.metadataProvider === 'tmdb' && (
                  <button
                    onClick={() => refreshAiring(show.id)}
                    disabled={refreshingId === show.id}
                    className="px-3 py-1.5 bg-gray-700 hover:bg-gray-600 disabled:opacity-50 rounded-lg text-sm font-medium transition-colors"
                  >
                    {refreshingId === show.id ? 'Refreshing…' : 'Refresh Schedule'}
                  </button>
                )}
                <button
                  onClick={() => deleteShow(show.id, show.title)}
                  className="px-3 py-1.5 bg-red-900 hover:bg-red-800 rounded-lg text-sm font-medium transition-colors"
                >
                  Remove
                </button>
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}
