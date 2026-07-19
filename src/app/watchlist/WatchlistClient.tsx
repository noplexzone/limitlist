'use client'

import { KeyboardEvent, MouseEvent, useEffect, useMemo, useState } from 'react'
import { useRouter, usePathname, useSearchParams } from 'next/navigation'
import PosterImage from '@/components/PosterImage'
import { SHOW_STATUSES, STATUS_LABELS, STATUS_SELECT_CLASSES, type ShowStatus } from '@/lib/status'
import { applyShowPatch } from '@/lib/apply-show-patch'

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
  watchedCount?: number
  airedCount?: number
}

type PatchPayload = {
  status?: AnimeShow['status']
  rating?: number | null
}

type StatusFilter = 'ALL' | ShowStatus | 'NEEDS_UPDATE'
type SortField = 'updated' | 'title' | 'rating' | 'first-aired'
type SortDir = 'asc' | 'desc'

const VALID_STATUS_FILTERS: string[] = ['ALL', 'NEEDS_UPDATE', ...SHOW_STATUSES]
const VALID_SORT_FIELDS: SortField[] = ['updated', 'title', 'rating', 'first-aired']
const VALID_SORT_DIRS: SortDir[] = ['asc', 'desc']

const LEGACY_SORT_MAP: Record<string, { field: SortField; dir: SortDir }> = {
  'updated-desc': { field: 'updated', dir: 'desc' },
  'title-asc': { field: 'title', dir: 'asc' },
  'rating-desc': { field: 'rating', dir: 'desc' },
  'first-aired-desc': { field: 'first-aired', dir: 'desc' },
}

function StarIcon({ fillPct }: { fillPct: number }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="h-5 w-5 drop-shadow sm:h-6 sm:w-6">
      <path
        d="M12 2.25l2.9 5.88 6.49.94-4.7 4.58 1.11 6.46L12 17.06l-5.8 3.05 1.11-6.46-4.7-4.58 6.49-.94L12 2.25z"
        className="fill-surface-500/80"
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

  function stopKeyNavigation(e: KeyboardEvent) {
    e.stopPropagation()
  }

  return (
    <div className="w-full px-0 sm:px-3" aria-label="Rating">
      <div className="flex flex-wrap items-center justify-center gap-1 sm:flex-nowrap" onMouseLeave={() => setHovered(null)}>
        {[1, 2, 3, 4, 5].map((star) => {
          const half = star - 0.5
          const fillPct = Math.max(0, Math.min(1, effective - (star - 1))) * 100
          return (
            <div key={star} className="relative h-8 w-8 shrink-0 sm:h-5 sm:w-5">
              <StarIcon fillPct={fillPct} />
              <button
                type="button"
                aria-label={`Rate ${half} out of 5`}
                onMouseEnter={() => setHovered(half)}
                onFocus={() => setHovered(half)}
                onClick={(e) => click(e, half)}
                onKeyDown={stopKeyNavigation}
                className="absolute left-0 top-0 z-10 h-full w-1/2 cursor-pointer rounded-l hidden sm:block"
              />
              <button
                type="button"
                aria-label={`Rate ${star} out of 5`}
                onMouseEnter={() => setHovered(star)}
                onFocus={() => setHovered(star)}
                onClick={(e) => click(e, star)}
                onKeyDown={stopKeyNavigation}
                className="absolute right-0 top-0 z-10 h-full w-full sm:w-1/2 cursor-pointer rounded sm:rounded-r"
              />
            </div>
          )
        })}
      </div>
      {rating != null && (
        <button
          type="button"
          onClick={(e) => click(e, null)}
          onKeyDown={stopKeyNavigation}
          aria-label="Clear rating"
          className="mx-auto mt-1 block rounded-full bg-black/60 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-surface-200 hover:bg-black/90 focus:outline-none focus:ring-2 focus:ring-accent-300"
          title="Clear rating"
        >
          Clear
        </button>
      )}
    </div>
  )
}

export default function WatchlistClient() {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [shows, setShows] = useState<AnimeShow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [removeConfirmId, setRemoveConfirmId] = useState<string | null>(null)
  const [removingId, setRemovingId] = useState<string | null>(null)
  const [syncingAll, setSyncingAll] = useState(false)
  const [syncSummary, setSyncSummary] = useState('')

  const rawStatus = searchParams.get('status') ?? ''
  const statusFilter: StatusFilter = VALID_STATUS_FILTERS.includes(rawStatus) ? (rawStatus as StatusFilter) : 'ALL'

  const rawField = searchParams.get('sortField') ?? ''
  const rawDir = searchParams.get('sortDir') ?? ''
  const legacy = !rawField ? LEGACY_SORT_MAP[searchParams.get('sort') ?? ''] : undefined
  const sortField: SortField = VALID_SORT_FIELDS.includes(rawField as SortField)
    ? (rawField as SortField)
    : (legacy?.field ?? 'updated')
  const sortDir: SortDir = VALID_SORT_DIRS.includes(rawDir as SortDir)
    ? (rawDir as SortDir)
    : (legacy?.dir ?? 'desc')

  function applyParams(updates: { status?: StatusFilter; sortField?: SortField; sortDir?: SortDir }) {
    const newStatus = updates.status ?? statusFilter
    const newField = updates.sortField ?? sortField
    const newDir = updates.sortDir ?? sortDir

    const params = new URLSearchParams(searchParams.toString())
    params.delete('sort')

    if (newStatus === 'ALL') params.delete('status')
    else params.set('status', newStatus)

    if (newField === 'updated') params.delete('sortField')
    else params.set('sortField', newField)

    if (newDir === 'desc') params.delete('sortDir')
    else params.set('sortDir', newDir)

    const query = params.toString()
    router.replace(query ? `${pathname}?${query}` : pathname)
  }

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

  async function syncAllWithPlex() {
    setSyncingAll(true)
    setSyncSummary('')
    const res = await fetch('/api/plex/sync', { method: 'POST' })
    const body = await res.json().catch(() => ({}))
    if (res.ok) {
      setSyncSummary(`Plex sync: ${body.succeeded ?? 0} succeeded, ${body.skipped?.length ?? 0} skipped, ${body.failed?.length ?? 0} failed.`)
      await fetchWatchlist()
    } else {
      setSyncSummary(body.error ?? 'Plex sync failed')
    }
    setSyncingAll(false)
  }

  async function removeShow(id: string) {
    const previous = shows
    setRemovingId(id)
    setRemoveConfirmId(null)
    setError('')
    setShows((prev) => prev.filter((show) => show.id !== id))
    const res = await fetch(`/api/watchlist/${id}`, { method: 'DELETE' })
    if (!res.ok) {
      setShows(previous)
      const body = await res.json().catch(() => ({}))
      setError(body.error ?? 'Failed to remove show')
    }
    setRemovingId(null)
  }

  function stopCardActivation(e: MouseEvent | KeyboardEvent) {
    e.stopPropagation()
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
      const updated: Record<string, unknown> = await res.json()
      setShows((prev) => prev.map((show) => (show.id === id ? applyShowPatch(show, updated) : show)))
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
    const dirMul = sortDir === 'asc' ? 1 : -1
    return [...filtered].sort((a, b) => {
      let cmp: number
      if (sortField === 'title') cmp = a.title.localeCompare(b.title)
      else if (sortField === 'rating') cmp = (a.rating ?? -1) - (b.rating ?? -1)
      else if (sortField === 'first-aired') {
        cmp = new Date(a.firstAiredAt ?? 0).getTime() - new Date(b.firstAiredAt ?? 0).getTime()
      } else {
        cmp = new Date(a.updatedAt ?? 0).getTime() - new Date(b.updatedAt ?? 0).getTime()
      }
      return cmp * dirMul
    })
  }, [shows, sortField, sortDir, statusFilter])

  if (loading) return <p className="text-surface-400">Loading watchlist...</p>
  if (error) return <p className="text-red-400">{error}</p>
  if (shows.length === 0)
    return (
      <div className="text-center py-16">
        <p className="text-surface-400 text-lg mb-2">Your watchlist is empty.</p>
        <p className="text-surface-500">Use the search bar above to find and import anime.</p>
      </div>
    )

  return (
    <div className="space-y-5">
      <div className="flex flex-row flex-wrap items-center gap-2 rounded-2xl border border-surface-800 bg-surface-900/70 p-2 sm:gap-3 sm:p-3">
        <select
          aria-label="Filter by status"
          value={statusFilter}
          onChange={(e) => applyParams({ status: e.target.value as StatusFilter })}
          className="min-h-[44px] flex-1 rounded-lg border border-surface-700 bg-surface-950 px-2 py-1 text-xs text-surface-100 outline-none focus:border-accent-500 sm:flex-none sm:px-3 sm:py-1.5 sm:text-sm"
        >
          <option value="ALL">All</option>
          <option value="NEEDS_UPDATE">Needs update</option>
          {SHOW_STATUSES.map((status) => (
            <option key={status} value={status}>{STATUS_LABELS[status]}</option>
          ))}
        </select>
        <select
          aria-label="Sort by"
          value={sortField}
          onChange={(e) => {
            const newField = e.target.value as SortField
            applyParams({ sortField: newField, sortDir: newField === 'title' ? 'asc' : 'desc' })
          }}
          className="min-h-[44px] flex-1 rounded-lg border border-surface-700 bg-surface-950 px-2 py-1 text-xs text-surface-100 outline-none focus:border-accent-500 sm:flex-none sm:px-3 sm:py-1.5 sm:text-sm"
        >
          <option value="updated">Last updated</option>
          <option value="title">Title</option>
          <option value="rating">Rating</option>
          <option value="first-aired">First aired</option>
        </select>
        <button
          type="button"
          aria-label={sortDir === 'asc' ? 'Sort ascending' : 'Sort descending'}
          title={sortDir === 'asc' ? 'Ascending' : 'Descending'}
          onClick={() => applyParams({ sortDir: sortDir === 'asc' ? 'desc' : 'asc' })}
          className="min-h-[44px] min-w-[44px] shrink-0 rounded-lg border border-surface-700 bg-surface-950 px-3 py-1 text-sm text-surface-100 outline-none transition-colors hover:border-accent-500 focus:border-accent-500"
        >
          {sortDir === 'asc' ? '↑' : '↓'}
        </button>
        <button
          type="button"
          disabled={syncingAll}
          onClick={syncAllWithPlex}
          className="min-h-[44px] shrink-0 rounded-lg border border-accent-500/60 px-2 py-1 text-xs font-semibold text-accent-100 hover:bg-accent-950 disabled:opacity-50 sm:px-3 sm:text-sm"
          aria-label="Sync all with Plex"
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4 sm:hidden" aria-hidden="true">
            <path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
            <path d="M3 3v5h5" />
            <path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16" />
            <path d="M16 16h5v5" />
          </svg>
          <span className="hidden sm:inline">{syncingAll ? 'Syncing…' : 'Sync with Plex'}</span>
          <span className="sm:hidden sr-only">{syncingAll ? 'Syncing…' : 'Sync with Plex'}</span>
        </button>
        <p className="w-full text-xs text-surface-500 sm:ml-auto sm:w-auto">{visibleShows.length} of {shows.length} shown</p>
      </div>

      {syncSummary && <p className="rounded-xl border border-accent-500/30 bg-accent-950/30 px-4 py-3 text-sm text-accent-100">{syncSummary}</p>}

      {visibleShows.length === 0 ? (
        <div className="py-16 text-center text-surface-500">No shows match those filters.</div>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-5 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-7">
          {visibleShows.map((show) => (
            <article
              key={show.id}
              role="button"
              tabIndex={0}
              onClick={() => router.push(`/anime/${show.metadataProvider}/${show.metadataId}`)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') router.push(`/anime/${show.metadataProvider}/${show.metadataId}`)
              }}
              className="group relative aspect-[2/3] cursor-pointer overflow-hidden rounded-2xl border border-surface-800 bg-surface-900 shadow-lg shadow-black/30 transition-transform hover:-translate-y-1 hover:border-accent-500/70 focus:border-accent-500/70 focus:outline-none"
              title={show.title}
            >
              {show.posterUrl ? (
                <PosterImage src={show.posterUrl} alt={`${show.title} poster`} title={show.title} />
              ) : (
                <div className="flex h-full w-full items-center justify-center bg-surface-800 px-3 text-center text-sm text-surface-500">
                  {show.title}
                </div>
              )}

              {show.upToDateStale && (
                <div className="absolute left-2 top-2 z-10 max-w-[calc(100%-3.25rem)] pointer-events-none">
                  <span className="block rounded-full bg-orange-600/95 px-2 py-1 text-center text-[10px] font-bold uppercase tracking-wide text-white shadow-lg">
                    New episodes
                  </span>
                </div>
              )}

              {removeConfirmId === show.id && (
                <div className="absolute inset-x-2 top-14 z-40 rounded-xl border border-red-400/50 bg-surface-950/95 p-3 text-center shadow-2xl" onClick={(e) => e.stopPropagation()} onKeyDown={stopCardActivation}>
                  <p className="mb-2 text-xs font-medium text-surface-100">Remove?</p>
                  <div className="flex justify-center gap-2">
                    <button type="button" className="rounded bg-surface-800 px-2 py-1 text-xs text-surface-200 hover:bg-surface-700" onClick={(e) => { e.stopPropagation(); setRemoveConfirmId(null) }}>Cancel</button>
                    <button type="button" className="rounded bg-red-700 px-2 py-1 text-xs font-semibold text-white hover:bg-red-600" onClick={(e) => { e.stopPropagation(); void removeShow(show.id) }}>Remove</button>
                  </div>
                </div>
              )}

              {/* Top overlay: status pill + remove button in one flex row so they can never overlap */}
              <div className="absolute inset-x-0 top-0 z-20 flex items-start gap-1 bg-gradient-to-b from-black/85 via-black/45 to-transparent p-1.5">
                <label className="sr-only" htmlFor={`status-${show.id}`}>Status for {show.title}</label>
                <select
                  id={`status-${show.id}`}
                  value={show.status}
                  onClick={(e) => e.stopPropagation()}
                  onKeyDown={(e) => e.stopPropagation()}
                  onChange={(e) => patchShow(show.id, { status: e.target.value as AnimeShow['status'] })}
                  className={`min-h-[44px] flex-1 cursor-pointer rounded-full border px-2 py-1 text-center text-[11px] font-semibold text-white outline-none transition-colors focus:ring-2 focus:ring-white/50 sm:text-xs ${STATUS_SELECT_CLASSES[show.status]}`}
                >
                  {SHOW_STATUSES.map((status) => (
                    <option key={status} value={status}>{STATUS_LABELS[status]}</option>
                  ))}
                </select>
                <button
                  type="button"
                  aria-label={`Remove ${show.title} from watchlist`}
                  onClick={(e) => { e.stopPropagation(); setRemoveConfirmId(show.id) }}
                  onKeyDown={stopCardActivation}
                  disabled={removingId === show.id}
                  className="z-30 flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-red-400/50 bg-black/80 text-lg font-bold text-red-100 shadow-lg transition-opacity hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-300 md:opacity-0 md:focus:opacity-100 md:group-hover:opacity-100 md:group-focus-within:opacity-100"
                >
                  ×
                </button>
              </div>

              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/95 via-black/75 to-transparent px-2 pb-3 pt-12 pointer-events-none">
                <div className="space-y-2">
                  <p className="text-[11px] font-medium leading-tight text-white line-clamp-2">{show.title}</p>
                  {show.airedCount ? (
                    <div className="mt-1">
                      <div className="h-1 overflow-hidden rounded-full bg-surface-800"><div className="h-full bg-accent-500" style={{ width: `${Math.min(100, Math.round(((show.watchedCount ?? 0) / show.airedCount) * 100))}%` }} /></div>
                      <p className="mt-1 text-[10px] text-surface-300">{show.watchedCount ?? 0}/{show.airedCount} watched</p>
                    </div>
                  ) : null}
                  {/* Stars: always visible on mobile, hover-reveal on desktop */}
                  <div className="pointer-events-auto block md:hidden">
                    <StarRating rating={show.rating ?? null} onRate={(value) => patchShow(show.id, { rating: value })} />
                  </div>
                  <div className="hidden pointer-events-auto md:group-hover:block md:group-focus-within:block">
                    <StarRating rating={show.rating ?? null} onRate={(value) => patchShow(show.id, { rating: value })} />
                  </div>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  )
}
