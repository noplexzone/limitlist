'use client'

import { useCallback, useEffect, useState } from 'react'
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
  linkedTitle?: string
  linkedProviderId?: string
  inWatchlist: boolean
  importable?: boolean
  mappingStatus?: string
}

type FeedType = 'popular' | 'trending'

export default function DiscoverClient() {
  const [feedType, setFeedType] = useState<FeedType>('popular')
  const [results, setResults] = useState<DiscoverResult[]>([])
  const [loading, setLoading] = useState(false)
  const [fetchError, setFetchError] = useState('')
  const [importing, setImporting] = useState<string | null>(null)
  const [importedIds, setImportedIds] = useState<Set<string>>(new Set())

  const fetchDiscover = useCallback(async (type: FeedType) => {
    setLoading(true)
    setFetchError('')
    try {
      const res = await fetch(`/api/discover?type=${type}`)
      const data = await res.json()
      if (!res.ok) {
        setFetchError(data.error ?? 'Failed to load results')
        setResults([])
      } else {
        setResults(data.results ?? [])
      }
    } catch {
      setFetchError('Network error')
      setResults([])
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    fetchDiscover(feedType)
  }, [feedType, fetchDiscover])

  async function handleImport(result: DiscoverResult) {
    if (!result.importable || !result.providerId) return

    setImporting(result.providerId)
    const res = await fetch('/api/watchlist', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        metadataProvider: result.providerName,
        metadataId: result.providerId,
        title: result.linkedTitle ?? result.title,
        originalTitle: result.originalTitle,
        overview: result.overview,
        posterUrl: result.posterUrl,
        firstAiredAt: result.firstAiredAt,
      }),
    })
    if (res.ok || res.status === 409) {
      setImportedIds((prev) => new Set(prev).add(result.providerId))
    }
    setImporting(null)
  }

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex gap-2">
          {(['popular', 'trending'] as FeedType[]).map((t) => (
            <button
              key={t}
              onClick={() => setFeedType(t)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                feedType === t
                  ? 'bg-purple-600 text-white'
                  : 'bg-gray-800 text-gray-400 hover:text-white hover:bg-gray-700'
              }`}
            >
              {t === 'popular' ? 'Popular Anime' : 'Trending This Week'}
            </button>
          ))}
        </div>
        <p className="text-xs text-gray-500">Ranked by AniList · linked to TMDB for tracking</p>
      </div>

      {loading && (
        <div className="flex justify-center py-20 text-gray-400">Loading…</div>
      )}

      {!loading && fetchError && (
        <div className="text-center py-20">
          <p className="text-red-400">{fetchError}</p>
          {fetchError.includes('TMDB_API_KEY') && (
            <p className="text-gray-500 text-sm mt-2">
              AniList supplies Discover rankings, but <code className="text-gray-400">TMDB_API_KEY</code> is still needed to link imports to whole-show TMDB records.
            </p>
          )}
        </div>
      )}

      {!loading && !fetchError && results.length === 0 && (
        <div className="text-center py-20 text-gray-500">No results found.</div>
      )}

      {!loading && results.length > 0 && (
        <div className="grid grid-cols-2 gap-5 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-7">
          {results.map((result) => {
            const cardKey = `${result.sourceProvider ?? result.providerName}:${result.sourceId ?? result.providerId}`
            const isAdded = result.inWatchlist || (!!result.providerId && importedIds.has(result.providerId))
            const isImporting = importing === result.providerId
            const canImport = result.importable !== false && !!result.providerId
            return (
              <article
                key={cardKey}
                className="group relative aspect-[2/3] overflow-hidden rounded-2xl border border-gray-800 bg-gray-900 shadow-lg shadow-black/30 transition-transform hover:-translate-y-1 hover:border-purple-500/70"
              >
                {result.posterUrl ? (
                  <PosterImage
                    src={result.posterUrl}
                    alt={`${result.title} poster`}
                    title={result.title}
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center bg-gray-800 px-3 text-center text-sm text-gray-500">
                    {result.title}
                  </div>
                )}

                {isAdded && (
                  <div className="absolute inset-x-0 top-0 p-2 pointer-events-none">
                    <span className="rounded-full bg-green-700/90 px-2 py-1 text-xs font-semibold text-white">
                      In Watchlist
                    </span>
                  </div>
                )}

                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/95 via-black/70 to-transparent px-2 pb-2 pt-12">
                  <p className="text-[11px] font-semibold text-white leading-tight line-clamp-2 mb-1">
                    {result.title}
                  </p>
                  {result.linkedTitle && result.linkedTitle !== result.title && (
                    <p className="mb-1 line-clamp-1 text-[10px] text-blue-300">
                      Tracks: {result.linkedTitle}
                    </p>
                  )}
                  {isAdded ? (
                    <p className="text-center text-xs text-green-400 font-medium">Added ✓</p>
                  ) : canImport ? (
                    <button
                      onClick={() => handleImport(result)}
                      disabled={isImporting}
                      className="w-full rounded-full bg-purple-600/90 py-1 text-xs font-semibold text-white hover:bg-purple-500 disabled:opacity-50 transition-colors"
                    >
                      {isImporting ? 'Adding…' : '+ Add to Watchlist'}
                    </button>
                  ) : (
                    <p className="text-center text-[10px] text-yellow-300">
                      {result.mappingStatus ?? 'No TMDB match'}
                    </p>
                  )}
                </div>
              </article>
            )
          })}
        </div>
      )}
    </div>
  )
}
