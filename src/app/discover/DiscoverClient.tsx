'use client'

import Link from 'next/link'
import { useCallback, useEffect, useRef, useState } from 'react'
import PosterImage from '@/components/PosterImage'

interface DiscoverResult {
  sourceProvider?: string
  sourceId?: string
  providerId: string
  providerName: string
  title: string
  originalTitle?: string
  overview?: string
  posterUrl?: string
  firstAiredAt?: string
  titles?: string[]
  genres?: string[]
  episodesTotal?: number
  averageScore?: number
  popularity?: number
  linkedTitle?: string
  linkedProviderId?: string
  inWatchlist: boolean
  importable?: boolean
  mappingStatus?: string
}

type FeedType = 'popular' | 'trending' | 'top-rated' | 'upcoming'

const TABS: { type: FeedType; label: string }[] = [
  { type: 'popular', label: 'Popular Anime' },
  { type: 'trending', label: 'Trending This Week' },
  { type: 'top-rated', label: 'Top Rated' },
  { type: 'upcoming', label: 'Upcoming' },
]

export default function DiscoverClient() {
  const [feedType, setFeedType] = useState<FeedType>('popular')
  const [page, setPage] = useState(1)
  const [results, setResults] = useState<DiscoverResult[]>([])
  const [loading, setLoading] = useState(false)
  const [fetchError, setFetchError] = useState('')
  const [importing, setImporting] = useState<string | null>(null)
  const [importedIds, setImportedIds] = useState<Set<string>>(new Set())
  const [importErrors, setImportErrors] = useState<Map<string, string>>(new Map())
  const [hasNextPage, setHasNextPage] = useState(false)

  // cursor history: page number → cursor needed to fetch that page (page 1 is always null)
  const cursorHistoryRef = useRef<Map<number, string | null>>(new Map([[1, null]]))
  const abortRef = useRef<AbortController | null>(null)

  const fetchDiscover = useCallback(async (type: FeedType, pageNum: number) => {
    abortRef.current?.abort()
    const controller = new AbortController()
    abortRef.current = controller

    const cursor = cursorHistoryRef.current.get(pageNum) ?? null

    setLoading(true)
    setFetchError('')
    try {
      let url = `/api/discover?type=${type}&page=${pageNum}`
      if (cursor !== null) url += `&cursor=${encodeURIComponent(cursor)}`
      const res = await fetch(url, { signal: controller.signal })
      const data = await res.json() as { error?: string; results?: DiscoverResult[]; hasNextPage?: boolean; nextCursor?: string | null }
      if (!res.ok) {
        setFetchError(data.error ?? 'Failed to load results')
        setResults([])
        setHasNextPage(false)
      } else {
        setResults(data.results ?? [])
        setHasNextPage(Boolean(data.hasNextPage))
        const nc = data.nextCursor ?? null
        if (nc !== null) {
          cursorHistoryRef.current = new Map(cursorHistoryRef.current).set(pageNum + 1, nc)
        }
      }
      setLoading(false)
    } catch (err) {
      if ((err as Error).name === 'AbortError') return
      setFetchError('Network error')
      setResults([])
      setHasNextPage(false)
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchDiscover(feedType, page)
  }, [feedType, page, fetchDiscover])

  async function handleImport(result: DiscoverResult) {
    if (!result.importable || !result.providerId) return

    setImporting(result.providerId)
    setImportErrors((prev) => {
      const next = new Map(prev)
      next.delete(result.providerId)
      return next
    })
    try {
      const res = await fetch('/api/watchlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          metadataProvider: result.providerName,
          metadataId: result.providerId,
          title: result.linkedTitle ?? result.title,
          titles: result.titles,
          originalTitle: result.originalTitle,
          overview: result.overview,
          posterUrl: result.posterUrl,
          firstAiredAt: result.firstAiredAt,
          genres: result.genres,
          episodesTotal: result.episodesTotal,
        }),
      })
      const body = await res.json().catch(() => ({}))
      if (res.ok || res.status === 409) {
        setImportedIds((prev) => new Set(prev).add(result.providerId))
      } else {
        setImportErrors((prev) => new Map(prev).set(result.providerId, body.error ?? 'Import failed'))
      }
    } catch {
      setImportErrors((prev) => new Map(prev).set(result.providerId, 'Network error while importing'))
    } finally {
      setImporting(null)
    }
  }

  const pager = (
    <div className="mt-8 flex items-center justify-center gap-3">
      <button
        type="button"
        onClick={() => setPage((p) => Math.max(1, p - 1))}
        disabled={page === 1 || loading}
        className="min-h-11 rounded-lg bg-surface-800 px-4 py-2 text-sm font-medium text-surface-200 hover:bg-surface-700 disabled:opacity-40"
      >
        Previous
      </button>
      <span className="text-sm text-surface-500">Page {page}</span>
      <button
        type="button"
        onClick={() => setPage((p) => p + 1)}
        disabled={!hasNextPage || loading}
        className="min-h-11 rounded-lg bg-surface-800 px-4 py-2 text-sm font-medium text-surface-200 hover:bg-surface-700 disabled:opacity-40"
      >
        Next
      </button>
    </div>
  )

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {TABS.map(({ type: t, label }) => (
            <button
              key={t}
              onClick={() => {
                if (t === feedType) return
                cursorHistoryRef.current = new Map([[1, null]])
                setFeedType(t)
                setPage(1)
                setResults([])
                setFetchError('')
                setHasNextPage(false)
              }}
              className={`min-h-11 shrink-0 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                feedType === t
                  ? 'bg-accent-600 text-white'
                  : 'bg-surface-800 text-surface-400 hover:text-white hover:bg-surface-700'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
        <p className="text-xs text-surface-500">Ranked by AniList · page {page} · TVDB matching happens on import</p>
      </div>

      {loading && <div className="flex justify-center py-20 text-surface-400">Loading…</div>}

      {!loading && fetchError && (
        <div className="text-center py-20">
          <p className="text-red-400">{fetchError}</p>
          
        </div>
      )}

      {!loading && !fetchError && results.length === 0 && (
        <div className="text-center py-20 text-surface-500">No results found.</div>
      )}

      {!loading && !fetchError && results.length > 0 && (
        <>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-5 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-6 2xl:grid-cols-7">
            {results.map((result) => {
              const cardKey = `${result.sourceProvider ?? result.providerName}:${result.sourceId ?? result.providerId}`
              const isAdded = result.inWatchlist || (!!result.providerId && importedIds.has(result.providerId))
              const isImporting = importing === result.providerId
              const importError = result.providerId ? importErrors.get(result.providerId) : undefined
              const canImport = result.importable !== false && !!result.providerId
              const detailHref = result.providerId
                ? `/anime/${encodeURIComponent(result.providerName)}/${encodeURIComponent(result.providerId)}`
                : null
              return (
                <article
                  key={cardKey}
                  className="group relative aspect-[2/3] overflow-hidden rounded-2xl border border-surface-800 bg-surface-900 shadow-lg shadow-black/30 transition-transform hover:-translate-y-1 hover:border-accent-500/70"
                >
                  {detailHref ? (
                    <Link href={detailHref} aria-label={`View details for ${result.title}`} className="absolute inset-0 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-accent-300">
                      {result.posterUrl ? (
                        <PosterImage src={result.posterUrl} alt={`${result.title} poster`} title={result.title} />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center bg-surface-800 px-3 text-center text-sm text-surface-500">
                          {result.title}
                        </div>
                      )}
                    </Link>
                  ) : result.posterUrl ? (
                    <PosterImage src={result.posterUrl} alt={`${result.title} poster`} title={result.title} />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center bg-surface-800 px-3 text-center text-sm text-surface-500">
                      {result.title}
                    </div>
                  )}

                  {isAdded && (
                    <div className="absolute inset-x-0 top-0 p-2 pointer-events-none">
                      <span className="rounded-full bg-green-700/90 px-2 py-1 text-xs font-semibold text-white">In Watchlist</span>
                    </div>
                  )}

                  <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/95 via-black/70 to-transparent px-2 pb-2 pt-12">
                    {detailHref ? (
                      <Link href={detailHref} className="relative z-10 mb-1 block text-[11px] font-semibold leading-tight text-white line-clamp-2 hover:text-accent-200 focus:outline-none focus:ring-2 focus:ring-accent-300" aria-label={`View details for ${result.title}`}>
                        {result.title}
                      </Link>
                    ) : (
                      <p className="mb-1 text-[11px] font-semibold leading-tight text-white line-clamp-2">{result.title}</p>
                    )}
                    {result.averageScore != null && (
                      <p className="mb-1 line-clamp-1 text-[10px] text-blue-300">AniList {result.averageScore}/100{result.episodesTotal ? ` · ${result.episodesTotal} eps` : ''}</p>
                    )}
                    {isAdded ? (
                      <p className="text-center text-xs text-green-400 font-medium">Added ✓</p>
                    ) : canImport ? (
                      <button
                        onClick={(event) => { event.stopPropagation(); void handleImport(result) }}
                        disabled={isImporting}
                        className="min-h-11 w-full rounded-full bg-accent-600/90 py-2 text-xs font-semibold text-white hover:bg-accent-500 disabled:opacity-50 transition-colors"
                      >
                        {isImporting ? 'Adding…' : '+ Add to Watchlist'}
                      </button>
                    ) : (
                      <p className="text-center text-[10px] text-yellow-300">{result.mappingStatus ?? 'No TVDB match'}</p>
                    )}
                    {importError && <p className="mt-1 line-clamp-3 text-center text-[10px] font-medium text-red-300">{importError}</p>}
                  </div>
                </article>
              )
            })}
          </div>
          {pager}
        </>
      )}
    </div>
  )
}
