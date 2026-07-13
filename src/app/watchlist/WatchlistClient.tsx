'use client'

import { useEffect, useState } from 'react'
import PosterImage from '@/components/PosterImage'

interface AnimeShow {
  id: string
  metadataProvider: string
  metadataId: string
  title: string
  originalTitle?: string | null
  posterUrl?: string | null
  status: 'WATCHING' | 'COMPLETED' | 'PLAN_TO_WATCH' | 'DROPPED'
  rating?: number | null
}

type PatchPayload = {
  status?: AnimeShow['status']
  rating?: number | null
}

const STATUS_LABELS: Record<AnimeShow['status'], string> = {
  WATCHING: 'Watching',
  COMPLETED: 'Completed',
  PLAN_TO_WATCH: 'Plan to Watch',
  DROPPED: 'Dropped',
}

const STATUS_SELECT_CLASSES: Record<AnimeShow['status'], string> = {
  WATCHING: 'bg-blue-700/90 border-blue-500/70',
  COMPLETED: 'bg-green-700/90 border-green-500/70',
  PLAN_TO_WATCH: 'bg-amber-700/90 border-amber-500/70',
  DROPPED: 'bg-red-800/90 border-red-600/70',
}

function StarIcon({ fillPct }: { fillPct: number }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="h-7 w-7 drop-shadow">
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

  return (
    <div
      className="flex items-center justify-center gap-1"
      onMouseLeave={() => setHovered(null)}
      aria-label="Rating"
    >
      {[1, 2, 3, 4, 5].map((star) => {
        const half = star - 0.5
        const fillPct = Math.max(0, Math.min(1, effective - (star - 1))) * 100

        return (
          <div key={star} className="relative h-7 w-7">
            <StarIcon fillPct={fillPct} />
            <button
              type="button"
              aria-label={`Rate ${half} out of 5`}
              onMouseEnter={() => setHovered(half)}
              onFocus={() => setHovered(half)}
              onClick={() => onRate(half)}
              className="absolute left-0 top-0 z-10 h-full w-1/2 cursor-pointer rounded-l"
            />
            <button
              type="button"
              aria-label={`Rate ${star} out of 5`}
              onMouseEnter={() => setHovered(star)}
              onFocus={() => setHovered(star)}
              onClick={() => onRate(star)}
              className="absolute right-0 top-0 z-10 h-full w-1/2 cursor-pointer rounded-r"
            />
          </div>
        )
      })}
      {rating != null && (
        <button
          type="button"
          onClick={() => onRate(null)}
          aria-label="Clear rating"
          className="ml-0.5 rounded-full bg-black/50 px-1.5 py-0.5 text-xs font-medium text-gray-200 hover:bg-black/80"
          title="Clear rating"
        >
          ×
        </button>
      )}
    </div>
  )
}

export default function WatchlistClient() {
  const [shows, setShows] = useState<AnimeShow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

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
    <div className="grid grid-cols-2 gap-5 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-7">
      {shows.map((show) => {
        return (
          <article
            key={show.id}
            className="group relative aspect-[2/3] overflow-hidden rounded-2xl border border-gray-800 bg-gray-900 shadow-lg shadow-black/30 transition-transform hover:-translate-y-1 hover:border-purple-500/70 focus-within:border-purple-500/70"
          >
            {/* Poster */}
            {show.posterUrl ? (
              <PosterImage
                src={show.posterUrl}
                alt={`${show.title} poster`}
                title={show.title}
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center bg-gray-800 px-3 text-center text-sm text-gray-500">
                {show.title}
              </div>
            )}

            {/* Status dropdown — top */}
            <div className="absolute inset-x-0 top-0 bg-gradient-to-b from-black/80 via-black/45 to-transparent p-2">
              <label className="sr-only" htmlFor={`status-${show.id}`}>
                Status for {show.title}
              </label>
              <select
                id={`status-${show.id}`}
                value={show.status}
                onChange={(e) =>
                  patchShow(show.id, { status: e.target.value as AnimeShow['status'] })
                }
                className={`w-full cursor-pointer rounded-full border px-3 py-1.5 text-center text-xs font-semibold text-white outline-none transition-colors focus:ring-2 focus:ring-white/50 ${STATUS_SELECT_CLASSES[show.status]}`}
              >
                <option value="PLAN_TO_WATCH">{STATUS_LABELS.PLAN_TO_WATCH}</option>
                <option value="WATCHING">{STATUS_LABELS.WATCHING}</option>
                <option value="COMPLETED">{STATUS_LABELS.COMPLETED}</option>
                <option value="DROPPED">{STATUS_LABELS.DROPPED}</option>
              </select>
            </div>

            {/* Title strip — always visible at bottom */}
            <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/85 to-transparent px-2 pb-2 pt-8 pointer-events-none">
              <p className="text-[11px] font-medium text-white leading-tight line-clamp-2">
                {show.title}
              </p>
            </div>

            {/* Hover overlay — rating */}
            <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/95 via-black/70 to-transparent px-2 pb-3 pt-16 opacity-0 transition-opacity duration-150 group-hover:opacity-100 group-focus-within:opacity-100">
              <StarRating
                rating={show.rating ?? null}
                onRate={(value) => patchShow(show.id, { rating: value })}
              />
            </div>
          </article>
        )
      })}
    </div>
  )
}
