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

const RATING_OPTIONS: { value: number | null; label: string }[] = [
  { value: null, label: 'Unrated' },
  { value: 0.5, label: '0.5' },
  { value: 1.0, label: '1' },
  { value: 1.5, label: '1.5' },
  { value: 2.0, label: '2' },
  { value: 2.5, label: '2.5' },
  { value: 3.0, label: '3' },
  { value: 3.5, label: '3.5' },
  { value: 4.0, label: '4' },
  { value: 4.5, label: '4.5' },
  { value: 5.0, label: '5' },
]

const STATUS_LABELS: Record<AnimeShow['status'], string> = {
  WATCHING: 'Watching',
  COMPLETED: 'Completed',
  PLAN_TO_WATCH: 'Plan to Watch',
  DROPPED: 'Dropped',
}

const STATUS_COLORS: Record<AnimeShow['status'], string> = {
  WATCHING: 'bg-blue-600',
  COMPLETED: 'bg-green-600',
  PLAN_TO_WATCH: 'bg-yellow-600',
  DROPPED: 'bg-red-600',
}

export default function WatchlistClient() {
  const [shows, setShows] = useState<AnimeShow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [editing, setEditing] = useState<string | null>(null)
  const [editValues, setEditValues] = useState<Partial<AnimeShow>>({})
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState('')
  const [refreshingId, setRefreshingId] = useState<string | null>(null)

  useEffect(() => {
    fetchWatchlist()
  }, [])

  async function fetchWatchlist() {
    setLoading(true)
    const res = await fetch('/api/watchlist')
    if (res.ok) {
      const data = await res.json()
      setShows(data)
    } else {
      setError('Failed to load watchlist')
    }
    setLoading(false)
  }

  function startEdit(show: AnimeShow) {
    setEditing(show.id)
    setEditValues({
      status: show.status,
      episodesWatched: show.episodesWatched,
      episodesTotal: show.episodesTotal,
      episodeDurationMinutes: show.episodeDurationMinutes,
      rating: show.rating ?? null,
      notes: show.notes ?? '',
    })
    setSaveError('')
  }

  function cancelEdit() {
    setEditing(null)
    setEditValues({})
    setSaveError('')
  }

  async function saveEdit(id: string) {
    setSaving(true)
    setSaveError('')
    const res = await fetch(`/api/watchlist/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(editValues),
    })
    if (res.ok) {
      const updated = await res.json()
      setShows((prev) => prev.map((s) => (s.id === id ? updated : s)))
      setEditing(null)
      setEditValues({})
    } else {
      const data = await res.json()
      setSaveError(data.error ?? 'Save failed')
    }
    setSaving(false)
  }

  async function refreshAiring(id: string) {
    setRefreshingId(id)
    const res = await fetch(`/api/watchlist/${id}/refresh-airing`, { method: 'POST' })
    if (res.ok) {
      await fetchWatchlist()
    }
    setRefreshingId(null)
  }

  async function deleteShow(id: string, title: string) {
    if (!confirm(`Remove "${title}" from your watchlist?`)) return
    const res = await fetch(`/api/watchlist/${id}`, { method: 'DELETE' })
    if (res.ok) {
      setShows((prev) => prev.filter((s) => s.id !== id))
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
    <div className="grid gap-4">
      {shows.map((show) => (
        <div
          key={show.id}
          className="bg-gray-900 rounded-xl p-4 flex gap-4 border border-gray-800"
        >
          {show.posterUrl && (
            <div className="flex-shrink-0">
              <Image
                src={show.posterUrl}
                alt={`${show.title} poster`}
                width={80}
                height={120}
                className="rounded-lg object-cover"
              />
            </div>
          )}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2 flex-wrap">
              <div>
                <h2 className="font-bold text-lg text-white leading-tight">{show.title}</h2>
                {show.originalTitle && (
                  <p className="text-gray-400 text-sm">{show.originalTitle}</p>
                )}
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <span
                  className={`px-2 py-0.5 rounded text-xs font-medium text-white ${STATUS_COLORS[show.status]}`}
                >
                  {STATUS_LABELS[show.status]}
                </span>
                <span className="text-xs text-gray-600 font-mono">
                  {show.metadataProvider}:{show.metadataId}
                </span>
              </div>
            </div>

            {show.genres && (
              <p className="text-xs text-gray-400 mt-1">{show.genres}</p>
            )}
            {show.studios && (
              <p className="text-xs text-gray-500 mt-0.5">{show.studios}</p>
            )}

            <div className="flex items-center gap-4 mt-2 text-sm text-gray-300">
              <span>
                Ep: {show.episodesWatched}
                {show.episodesTotal != null ? `/${show.episodesTotal}` : '/?'}
              </span>
              <span>{show.episodeDurationMinutes}min/ep</span>
              {show.rating != null && (
                <span className="text-yellow-400 font-medium">{show.rating}/5</span>
              )}
            </div>
            {show.notes && (
              <p className="text-gray-400 text-sm mt-1 italic">{show.notes}</p>
            )}

            {show.nextAiringAt && (
              <p className="text-xs text-purple-300 mt-1">
                Next ep{show.nextEpisodeNum != null ? ` ${show.nextEpisodeNum}` : ''}:{' '}
                {new Date(show.nextAiringAt).toLocaleDateString(undefined, {
                  weekday: 'short',
                  month: 'short',
                  day: 'numeric',
                })}
              </p>
            )}

            {editing === show.id ? (
              <div className="mt-3 space-y-2">
                {saveError && <p className="text-red-400 text-sm">{saveError}</p>}
                <div className="flex flex-wrap gap-3">
                  <label className="flex flex-col gap-1 text-sm">
                    <span className="text-gray-400">Status</span>
                    <select
                      value={editValues.status ?? show.status}
                      onChange={(e) =>
                        setEditValues((v) => ({
                          ...v,
                          status: e.target.value as AnimeShow['status'],
                        }))
                      }
                      className="bg-gray-800 border border-gray-700 rounded px-2 py-1 text-white text-sm"
                    >
                      <option value="PLAN_TO_WATCH">Plan to Watch</option>
                      <option value="WATCHING">Watching</option>
                      <option value="COMPLETED">Completed</option>
                      <option value="DROPPED">Dropped</option>
                    </select>
                  </label>
                  <label className="flex flex-col gap-1 text-sm">
                    <span className="text-gray-400">Eps Watched</span>
                    <input
                      type="number"
                      min={0}
                      value={editValues.episodesWatched ?? show.episodesWatched}
                      onChange={(e) =>
                        setEditValues((v) => ({
                          ...v,
                          episodesWatched: parseInt(e.target.value) || 0,
                        }))
                      }
                      className="bg-gray-800 border border-gray-700 rounded px-2 py-1 text-white text-sm w-20"
                    />
                  </label>
                  <label className="flex flex-col gap-1 text-sm">
                    <span className="text-gray-400">Eps Total</span>
                    <input
                      type="number"
                      min={0}
                      value={editValues.episodesTotal ?? show.episodesTotal ?? ''}
                      onChange={(e) =>
                        setEditValues((v) => ({
                          ...v,
                          episodesTotal: e.target.value ? parseInt(e.target.value) : null,
                        }))
                      }
                      className="bg-gray-800 border border-gray-700 rounded px-2 py-1 text-white text-sm w-20"
                    />
                  </label>
                  <label className="flex flex-col gap-1 text-sm">
                    <span className="text-gray-400">Min/Episode</span>
                    <input
                      type="number"
                      min={1}
                      value={editValues.episodeDurationMinutes ?? show.episodeDurationMinutes}
                      onChange={(e) =>
                        setEditValues((v) => ({
                          ...v,
                          episodeDurationMinutes: parseInt(e.target.value) || 24,
                        }))
                      }
                      className="bg-gray-800 border border-gray-700 rounded px-2 py-1 text-white text-sm w-20"
                    />
                  </label>
                  <label className="flex flex-col gap-1 text-sm">
                    <span className="text-gray-400">Rating</span>
                    <select
                      value={editValues.rating ?? ''}
                      onChange={(e) =>
                        setEditValues((v) => ({
                          ...v,
                          rating: e.target.value === '' ? null : parseFloat(e.target.value),
                        }))
                      }
                      className="bg-gray-800 border border-gray-700 rounded px-2 py-1 text-white text-sm"
                    >
                      {RATING_OPTIONS.map((opt) => (
                        <option key={opt.label} value={opt.value ?? ''}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>
                <label className="flex flex-col gap-1 text-sm">
                  <span className="text-gray-400">Notes</span>
                  <textarea
                    value={editValues.notes ?? ''}
                    onChange={(e) =>
                      setEditValues((v) => ({ ...v, notes: e.target.value }))
                    }
                    rows={2}
                    placeholder="Optional notes..."
                    className="bg-gray-800 border border-gray-700 rounded px-2 py-1 text-white text-sm w-full resize-y"
                  />
                </label>
                <div className="flex gap-2 mt-1">
                  <button
                    onClick={() => saveEdit(show.id)}
                    disabled={saving}
                    className="px-3 py-1 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 rounded text-sm font-medium"
                  >
                    {saving ? 'Saving...' : 'Save'}
                  </button>
                  <button
                    onClick={cancelEdit}
                    className="px-3 py-1 bg-gray-700 hover:bg-gray-600 rounded text-sm font-medium"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex gap-2 mt-3 flex-wrap">
                <button
                  onClick={() => startEdit(show)}
                  className="px-3 py-1 bg-gray-700 hover:bg-gray-600 rounded text-sm font-medium"
                >
                  Edit
                </button>
                {show.metadataProvider === 'tmdb' && (
                  <button
                    onClick={() => refreshAiring(show.id)}
                    disabled={refreshingId === show.id}
                    className="px-3 py-1 bg-gray-700 hover:bg-gray-600 disabled:opacity-50 rounded text-sm font-medium"
                  >
                    {refreshingId === show.id ? 'Refreshing...' : 'Refresh Schedule'}
                  </button>
                )}
                <button
                  onClick={() => deleteShow(show.id, show.title)}
                  className="px-3 py-1 bg-red-800 hover:bg-red-700 rounded text-sm font-medium"
                >
                  Remove
                </button>
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  )
}
