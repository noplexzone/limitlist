'use client'

import { useState } from 'react'
import PosterImage from '@/components/PosterImage'

interface SearchResult {
  providerId: string
  providerName: string
  title: string
  originalTitle?: string
  overview?: string
  posterUrl?: string
  firstAiredAt?: string
}

export default function SearchClient() {
  const [query, setQuery] = useState('')
  const [animeOnly, setAnimeOnly] = useState(true)
  const [results, setResults] = useState<SearchResult[]>([])
  const [searching, setSearching] = useState(false)
  const [searchError, setSearchError] = useState('')
  const [importing, setImporting] = useState<string | null>(null)
  const [importMessages, setImportMessages] = useState<Record<string, string>>({})

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault()
    if (!query.trim()) return
    setSearching(true)
    setSearchError('')
    setResults([])
    setImportMessages({})

    const params = new URLSearchParams({ q: query.trim(), animeOnly: String(animeOnly) })
    const res = await fetch(`/api/search?${params}`)
    const data = await res.json()

    if (!res.ok) {
      setSearchError(data.error ?? 'Search failed')
    } else {
      setResults(data.results ?? [])
      if ((data.results ?? []).length === 0) {
        setSearchError('No results found.')
      }
    }
    setSearching(false)
  }

  async function handleImport(result: SearchResult) {
    const key = `${result.providerName}:${result.providerId}`
    setImporting(key)
    setImportMessages((prev) => ({ ...prev, [key]: '' }))

    const res = await fetch('/api/watchlist', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        metadataProvider: result.providerName,
        metadataId: result.providerId,
        title: result.title,
        originalTitle: result.originalTitle,
        overview: result.overview,
        posterUrl: result.posterUrl,
        firstAiredAt: result.firstAiredAt,
      }),
    })

    const data = await res.json()
    if (res.status === 409) {
      setImportMessages((prev) => ({ ...prev, [key]: 'Already in watchlist' }))
    } else if (!res.ok) {
      setImportMessages((prev) => ({ ...prev, [key]: data.error ?? 'Import failed' }))
    } else {
      setImportMessages((prev) => ({ ...prev, [key]: 'Added!' }))
    }
    setImporting(null)
  }

  return (
    <div>
      <form onSubmit={handleSearch} className="space-y-3 mb-8">
        <div className="flex gap-3">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search for an anime or TV show…"
            className="flex-1 px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg focus:outline-none focus:border-purple-500 text-gray-100 placeholder-gray-500"
          />
          <button
            type="submit"
            disabled={searching || !query.trim()}
            className="px-5 py-2 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 rounded-lg font-medium transition-colors"
          >
            {searching ? 'Searching…' : 'Search'}
          </button>
        </div>
        <label className="flex items-center gap-2 text-sm text-gray-400 select-none cursor-pointer w-fit">
          <input
            type="checkbox"
            checked={animeOnly}
            onChange={(e) => setAnimeOnly(e.target.checked)}
            className="rounded accent-purple-500"
          />
          Anime-focused
          <span className="text-gray-600 text-xs">(JP/animation only — uncheck for all TV)</span>
        </label>
      </form>

      {searchError && <p className="text-red-400 mb-4">{searchError}</p>}

      {results.length > 0 && (
        <div className="grid grid-cols-2 gap-5 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
          {results.map((result) => {
            const key = `${result.providerName}:${result.providerId}`
            const msg = importMessages[key]
            const isAdded = msg === 'Added!'
            const isDupe = msg === 'Already in watchlist'

            return (
              <article
                key={key}
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

                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/95 via-black/70 to-transparent px-2 pb-2 pt-12">
                  <p className="text-[11px] font-semibold text-white leading-tight line-clamp-2 mb-0.5">
                    {result.title}
                  </p>
                  {result.firstAiredAt && (
                    <p className="text-[10px] text-gray-400 mb-1">
                      {result.firstAiredAt.slice(0, 4)}
                    </p>
                  )}
                  {msg ? (
                    <p
                      className={`text-xs font-medium text-center ${
                        isAdded
                          ? 'text-green-400'
                          : isDupe
                          ? 'text-yellow-400'
                          : 'text-red-400'
                      }`}
                    >
                      {msg}
                    </p>
                  ) : (
                    <button
                      onClick={() => handleImport(result)}
                      disabled={importing === key}
                      className="w-full rounded-full bg-purple-600/90 py-1 text-xs font-semibold text-white hover:bg-purple-500 disabled:opacity-50 transition-colors"
                    >
                      {importing === key ? 'Adding…' : '+ Add'}
                    </button>
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
