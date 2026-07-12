'use client'

import { useState } from 'react'
import Image from 'next/image'

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

    const res = await fetch(`/api/search?q=${encodeURIComponent(query.trim())}`)
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
      setImportMessages((prev) => ({
        ...prev,
        [key]: 'Already in your watchlist.',
      }))
    } else if (!res.ok) {
      setImportMessages((prev) => ({
        ...prev,
        [key]: data.error ?? 'Import failed',
      }))
    } else {
      setImportMessages((prev) => ({
        ...prev,
        [key]: 'Added to watchlist!',
      }))
    }
    setImporting(null)
  }

  return (
    <div>
      <form onSubmit={handleSearch} className="flex gap-3 mb-8">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search for an anime or TV show..."
          className="flex-1 px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg focus:outline-none focus:border-purple-500 text-gray-100 placeholder-gray-500"
        />
        <button
          type="submit"
          disabled={searching || !query.trim()}
          className="px-5 py-2 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 rounded-lg font-medium transition-colors"
        >
          {searching ? 'Searching...' : 'Search'}
        </button>
      </form>

      {searchError && <p className="text-red-400 mb-4">{searchError}</p>}

      <div className="grid gap-4">
        {results.map((result) => {
          const key = `${result.providerName}:${result.providerId}`
          const msg = importMessages[key]
          const isAdded = msg === 'Added to watchlist!'
          const isDupe = msg === 'Already in your watchlist.'

          return (
            <div
              key={key}
              className="bg-gray-900 rounded-xl p-4 flex gap-4 border border-gray-800"
            >
              {result.posterUrl && (
                <div className="flex-shrink-0">
                  <Image
                    src={result.posterUrl}
                    alt={`${result.title} poster`}
                    width={70}
                    height={105}
                    className="rounded-lg object-cover"
                  />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h3 className="font-bold text-white">{result.title}</h3>
                    {result.originalTitle && (
                      <p className="text-gray-400 text-sm">{result.originalTitle}</p>
                    )}
                    {result.firstAiredAt && (
                      <p className="text-gray-500 text-xs mt-0.5">
                        {result.firstAiredAt.slice(0, 4)}
                      </p>
                    )}
                  </div>
                  <div className="flex-shrink-0 text-right">
                    {msg ? (
                      <p
                        className={`text-sm font-medium ${
                          isAdded ? 'text-green-400' : isDupe ? 'text-yellow-400' : 'text-red-400'
                        }`}
                      >
                        {msg}
                      </p>
                    ) : (
                      <button
                        onClick={() => handleImport(result)}
                        disabled={importing === key}
                        className="px-3 py-1 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 rounded text-sm font-medium"
                      >
                        {importing === key ? 'Adding...' : '+ Add'}
                      </button>
                    )}
                  </div>
                </div>
                {result.overview && (
                  <p className="text-gray-400 text-sm mt-2 line-clamp-2">{result.overview}</p>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
