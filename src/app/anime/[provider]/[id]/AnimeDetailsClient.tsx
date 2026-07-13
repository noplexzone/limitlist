'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import PosterImage from '@/components/PosterImage'
import { SHOW_STATUSES, STATUS_LABELS, type ShowStatus } from '@/lib/status'
import type { MetadataCastMember, MetadataSeasonSummary } from '@/lib/providers'

export interface AnimeDetailsData {
  tracked: boolean
  anime: {
    id?: string
    providerId: string
    providerName: string
    title: string
    originalTitle?: string | null
    overview?: string | null
    posterUrl?: string | null
    firstAiredAt?: string | null
    genres?: string[] | string | null
    studios?: string[] | string | null
    episodesTotal?: number | null
    status?: string | null
    rating?: number | null
    airingStatus?: string | null
    nextAiringAt?: string | null
    nextEpisodeNum?: number | null
    lastEpisodeNum?: number | null
    upToDateStale?: boolean | null
    voteAverage?: number | null
    voteCount?: number | null
    popularity?: number | null
    originalLanguage?: string | null
    originCountries?: string[] | null
    contentRating?: string | null
    nextEpisodeName?: string | null
    lastEpisodeName?: string | null
    cast?: MetadataCastMember[] | null
    seasons?: MetadataSeasonSummary[] | null
  }
}

function asTextList(value: string[] | string | null | undefined) {
  if (Array.isArray(value)) return value.join(', ')
  return value ?? ''
}

function formatDate(value?: string | null) {
  if (!value) return ''
  return new Date(value).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })
}

export default function AnimeDetailsClient({ initialData }: { initialData: AnimeDetailsData }) {
  const router = useRouter()
  const [data, setData] = useState(initialData)
  const [busy, setBusy] = useState(false)
  const anime = data.anime

  async function addToWatchlist() {
    setBusy(true)
    const res = await fetch('/api/watchlist', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        metadataProvider: anime.providerName,
        metadataId: anime.providerId,
        title: anime.title,
        originalTitle: anime.originalTitle,
        overview: anime.overview,
        posterUrl: anime.posterUrl,
        firstAiredAt: anime.firstAiredAt,
      }),
    })
    const body = await res.json()
    if (res.ok) {
      setData({ tracked: true, anime: { ...anime, ...body, providerId: body.metadataId, providerName: body.metadataProvider } })
      router.refresh()
    } else if (res.status === 409 && body.existing) {
      setData({ tracked: true, anime: { ...anime, ...body.existing, providerId: body.existing.metadataId, providerName: body.existing.metadataProvider } })
    }
    setBusy(false)
  }

  async function patchTracked(patch: Record<string, unknown>) {
    if (!anime.id) return
    setBusy(true)
    const res = await fetch(`/api/watchlist/${anime.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(patch),
    })
    if (res.ok) {
      const updated = await res.json()
      setData({ tracked: true, anime: { ...anime, ...updated, providerId: updated.metadataId, providerName: updated.metadataProvider } })
      router.refresh()
    }
    setBusy(false)
  }

  return (
    <div className="grid gap-8 lg:grid-cols-[320px_1fr]">
      <div className="relative aspect-[2/3] overflow-hidden rounded-3xl border border-gray-800 bg-gray-900 shadow-2xl shadow-black/40">
        {anime.posterUrl ? (
          <PosterImage src={anime.posterUrl} alt={`${anime.title} poster`} title={anime.title} />
        ) : (
          <div className="flex h-full items-center justify-center px-6 text-center text-gray-500">{anime.title}</div>
        )}
      </div>

      <section className="space-y-6">
        <div>
          <h1 className="text-4xl font-bold text-white">{anime.title}</h1>
          {anime.originalTitle && anime.originalTitle !== anime.title && (
            <p className="mt-1 text-gray-400">{anime.originalTitle}</p>
          )}
          {data.tracked && anime.upToDateStale && (
            <p className="mt-4 rounded-xl border border-orange-500/50 bg-orange-950/60 px-4 py-3 text-sm font-medium text-orange-200">
              New episodes have released since this was marked Up-to-Date.
            </p>
          )}
        </div>

        <div className="flex flex-wrap gap-3 text-sm text-gray-300">
          {anime.firstAiredAt && <span className="rounded-full bg-gray-900 px-3 py-1">First aired {formatDate(anime.firstAiredAt)}</span>}
          {anime.episodesTotal != null && <span className="rounded-full bg-gray-900 px-3 py-1">{anime.episodesTotal} episodes</span>}
          {anime.airingStatus && <span className="rounded-full bg-gray-900 px-3 py-1">TMDB: {anime.airingStatus}</span>}
          {anime.nextAiringAt && <span className="rounded-full bg-purple-900/70 px-3 py-1">Next: Ep {anime.nextEpisodeNum ?? '?'}{anime.nextEpisodeName ? ` — ${anime.nextEpisodeName}` : ''} · {formatDate(anime.nextAiringAt)}</span>}
          {anime.voteAverage != null && <span className="rounded-full bg-yellow-900/60 px-3 py-1">TMDB {anime.voteAverage.toFixed(1)}/10{anime.voteCount ? ` · ${anime.voteCount.toLocaleString()} votes` : ''}</span>}
          {anime.contentRating && <span className="rounded-full bg-gray-900 px-3 py-1">Rated {anime.contentRating}</span>}
          {anime.originalLanguage && <span className="rounded-full bg-gray-900 px-3 py-1">Language {anime.originalLanguage.toUpperCase()}</span>}
        </div>

        {anime.overview && <p className="max-w-3xl text-gray-300 leading-7">{anime.overview}</p>}

        {(asTextList(anime.genres) || asTextList(anime.studios)) && (
          <div className="grid gap-4 sm:grid-cols-2">
            {asTextList(anime.genres) && (
              <div className="rounded-2xl border border-gray-800 bg-gray-900 p-4">
                <p className="mb-1 text-xs uppercase tracking-wide text-gray-500">Genres</p>
                <p className="text-gray-200">{asTextList(anime.genres)}</p>
              </div>
            )}
            {asTextList(anime.studios) && (
              <div className="rounded-2xl border border-gray-800 bg-gray-900 p-4">
                <p className="mb-1 text-xs uppercase tracking-wide text-gray-500">Studios</p>
                <p className="text-gray-200">{asTextList(anime.studios)}</p>
              </div>
            )}
          </div>
        )}

        {anime.cast && anime.cast.length > 0 && (
          <section className="rounded-2xl border border-gray-800 bg-gray-900 p-4">
            <h2 className="mb-3 text-lg font-semibold text-gray-200">Cast</h2>
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {anime.cast.map((actor) => (
                <div key={`${actor.name}-${actor.character ?? ''}`} className="rounded-xl border border-gray-800 bg-gray-950 p-3">
                  <p className="font-medium text-white">{actor.name}</p>
                  {actor.originalName && <p className="text-xs text-gray-500">Japanese/name credit: {actor.originalName}</p>}
                  {actor.character && <p className="mt-1 text-sm text-purple-300">{actor.character}</p>}
                  {actor.episodeCount != null && <p className="text-xs text-gray-500">{actor.episodeCount} episodes</p>}
                </div>
              ))}
            </div>
          </section>
        )}

        {anime.seasons && anime.seasons.length > 0 && (
          <section className="rounded-2xl border border-gray-800 bg-gray-900 p-4">
            <h2 className="mb-3 text-lg font-semibold text-gray-200">Seasons & episodes</h2>
            <div className="space-y-4">
              {anime.seasons.map((season) => (
                <details key={season.seasonNumber} className="rounded-xl border border-gray-800 bg-gray-950 p-4" open={season.episodes && season.seasonNumber === Math.max(...(anime.seasons ?? []).map((s) => s.seasonNumber))}>
                  <summary className="cursor-pointer font-semibold text-gray-100">
                    {season.name} <span className="text-sm font-normal text-gray-500">· {season.episodeCount ?? season.episodes?.length ?? '?'} episodes{season.airDate ? ` · ${formatDate(season.airDate)}` : ''}</span>
                  </summary>
                  {season.overview && <p className="mt-2 text-sm text-gray-400">{season.overview}</p>}
                  {season.episodes && season.episodes.length > 0 && (
                    <ol className="mt-3 max-h-72 space-y-2 overflow-y-auto pr-1">
                      {season.episodes.map((episode) => (
                        <li key={episode.episodeNumber} className="flex items-start justify-between gap-3 rounded-lg bg-gray-900 px-3 py-2 text-sm">
                          <span className="text-gray-200">{episode.episodeNumber}. {episode.name}</span>
                          <span className="shrink-0 text-xs text-gray-500">{episode.voteAverage ? `${episode.voteAverage.toFixed(1)}/10` : episode.airDate ? formatDate(episode.airDate) : ''}</span>
                        </li>
                      ))}
                    </ol>
                  )}
                </details>
              ))}
            </div>
          </section>
        )}

        <div className="rounded-2xl border border-gray-800 bg-gray-900 p-4">
          {data.tracked ? (
            <div className="flex flex-wrap items-center gap-4">
              <label className="text-sm text-gray-400">
                Status{' '}
                <select
                  value={(anime.status as ShowStatus) ?? 'PLAN_TO_WATCH'}
                  disabled={busy}
                  onChange={(e) => patchTracked({ status: e.target.value })}
                  className="ml-2 rounded-lg border border-gray-700 bg-gray-950 px-3 py-2 text-gray-100 outline-none focus:border-purple-500"
                >
                  {SHOW_STATUSES.map((status) => (
                    <option key={status} value={status}>{STATUS_LABELS[status]}</option>
                  ))}
                </select>
              </label>
              <span className="text-sm text-gray-500">Rating: {anime.rating ?? 'Not rated'}</span>
            </div>
          ) : (
            <button
              onClick={addToWatchlist}
              disabled={busy}
              className="rounded-xl bg-purple-600 px-5 py-3 font-semibold text-white transition-colors hover:bg-purple-500 disabled:opacity-50"
            >
              {busy ? 'Adding…' : '+ Add to Watchlist'}
            </button>
          )}
        </div>
      </section>
    </div>
  )
}
