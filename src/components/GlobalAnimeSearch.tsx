'use client'

import { useRouter } from 'next/navigation'
import { FormEvent, MouseEvent, useEffect, useRef, useState } from 'react'

interface SearchResult {
  providerId: string
  providerName: string
  title: string
  originalTitle?: string
  overview?: string
  posterUrl?: string
  firstAiredAt?: string
}

export default function GlobalAnimeSearch() {
  const router = useRouter()
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchResult[]>([])
  const [searching, setSearching] = useState(false)
  const [open, setOpen] = useState(false)
  const [error, setError] = useState('')
  const [adding, setAdding] = useState<string | null>(null)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (timer.current) clearTimeout(timer.current)
    const controller = new AbortController()
    const trimmed = query.trim()
    if (trimmed.length < 2) {
      setResults([])
      setError('')
      setSearching(false)
      return () => controller.abort()
    }

    setSearching(true)
    timer.current = setTimeout(async () => {
      try {
        const params = new URLSearchParams({ q: trimmed, limit: '8' })
        const res = await fetch(`/api/search?${params}`, { signal: controller.signal })
        const data = await res.json()
        if (controller.signal.aborted) return
        if (!res.ok) {
          setError(data.error ?? 'Search failed')
          setResults([])
        } else {
          setResults(data.results ?? [])
          setError('')
        }
        setOpen(true)
      } catch (err) {
        if (controller.signal.aborted) return
        setError(err instanceof Error ? err.message : 'Network error')
        setResults([])
      } finally {
        if (!controller.signal.aborted) setSearching(false)
      }
    }, 250)

    return () => {
      controller.abort()
      if (timer.current) clearTimeout(timer.current)
    }
  }, [query])

  function detailsUrl(result: SearchResult) {
    return `/anime/${encodeURIComponent(result.providerName)}/${encodeURIComponent(result.providerId)}`
  }

  function submit(e: FormEvent) {
    e.preventDefault()
    const first = results[0]
    if (first) {
      setOpen(false)
      router.push(detailsUrl(first))
    }
  }

  async function addResult(e: MouseEvent<HTMLButtonElement>, result: SearchResult) {
    e.preventDefault()
    e.stopPropagation()
    const key = `${result.providerName}:${result.providerId}`
    setAdding(key)
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
    setAdding(null)
    if (res.ok || res.status === 409) {
      setOpen(false)
      router.push(detailsUrl(result))
      router.refresh()
    }
  }

  return (
    <div className="relative w-full max-w-xl">
      <form onSubmit={submit} role="search">
        <label htmlFor="global-anime-search" className="sr-only">Search anime to add</label>
        <input
          id="global-anime-search"
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => setOpen(true)}
          placeholder="Search anime to add…"
          className="w-full rounded-full border border-gray-700 bg-gray-950/80 px-4 py-2 text-sm text-gray-100 placeholder-gray-500 outline-none transition-colors focus:border-purple-500 focus:ring-2 focus:ring-purple-500/30"
        />
      </form>

      {open && query.trim().length >= 2 && (
        <div className="absolute left-0 right-0 top-full z-50 mt-2 overflow-hidden rounded-2xl border border-gray-800 bg-gray-950 shadow-2xl shadow-black/60">
          {searching && <p className="px-4 py-3 text-sm text-gray-400">Searching…</p>}
          {!searching && error && <p className="px-4 py-3 text-sm text-red-400">{error}</p>}
          {!searching && !error && results.length === 0 && (
            <p className="px-4 py-3 text-sm text-gray-500">No results found.</p>
          )}
          {!searching && !error && results.map((result) => {
            const key = `${result.providerName}:${result.providerId}`
            return (
              <div
                key={key}
                className="flex w-full items-center gap-3 border-b border-gray-900 px-3 py-2 text-left last:border-b-0 hover:bg-gray-900"
              >
                <button
                  type="button"
                  onClick={() => {
                    setOpen(false)
                    router.push(detailsUrl(result))
                  }}
                  className="flex min-w-0 flex-1 items-center gap-3 text-left"
                >
                  <span className="h-14 w-10 shrink-0 overflow-hidden rounded bg-gray-800">
                    {result.posterUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={result.posterUrl} alt="" className="h-full w-full object-cover" />
                    ) : null}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium text-white">{result.title}</span>
                    {result.firstAiredAt && <span className="block text-xs text-gray-500">{result.firstAiredAt.slice(0, 4)}</span>}
                  </span>
                </button>
                <button
                  type="button"
                  onClick={(e) => addResult(e, result)}
                  disabled={adding === key}
                  className="rounded-full bg-purple-600 px-3 py-1 text-sm font-semibold text-white hover:bg-purple-500 disabled:opacity-50"
                  aria-label={`Add ${result.title} to watchlist`}
                >
                  {adding === key ? '…' : '+'}
                </button>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
