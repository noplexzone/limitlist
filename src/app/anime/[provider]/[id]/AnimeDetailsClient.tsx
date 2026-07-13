'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import PosterImage from '@/components/PosterImage'
import { SHOW_STATUSES, STATUS_LABELS, type ShowStatus } from '@/lib/status'
import type { MetadataCastMember, MetadataSeasonSummary, MetadataVoiceCastGroup } from '@/lib/providers'

export interface AnimeDetailsData {
  tracked: boolean
  anime: {
    id?: string
    providerId: string
    providerName: string
    sourceProvider?: string | null
    sourceId?: string | null
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
    voiceCast?: MetadataVoiceCastGroup | null
    seasons?: MetadataSeasonSummary[] | null
  }
}

const RATING_VALUES = [0.5, 1, 1.5, 2, 2.5, 3, 3.5, 4, 4.5, 5]

function asTextList(value: string[] | string | null | undefined) {
  if (Array.isArray(value)) return value.join(', ')
  return value ?? ''
}

function formatDate(value?: string | null) {
  if (!value) return ''
  return new Date(value).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })
}

function CastImage({ member }: { member: MetadataCastMember }) {
  const imageUrl = member.profileUrl ?? member.characterImageUrl
  if (!imageUrl) {
    return (
      <div className="flex h-16 w-12 shrink-0 items-center justify-center rounded-lg bg-gray-800 text-xs text-gray-500">
        {member.name.slice(0, 2)}
      </div>
    )
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={imageUrl} alt="" className="h-16 w-12 shrink-0 rounded-lg object-cover bg-gray-800" loading="lazy" />
  )
}

function CastCard({ member }: { member: MetadataCastMember }) {
  return (
    <div className="flex gap-3 rounded-xl border border-gray-800 bg-gray-950 p-3">
      <CastImage member={member} />
      <div className="min-w-0">
        <p className="truncate font-medium text-white" title={member.name}>{member.name}</p>
        {member.originalName && <p className="truncate text-xs text-gray-500" title={member.originalName}>{member.originalName}</p>}
        {member.character && <p className="mt-1 line-clamp-2 text-sm text-purple-300">{member.character}</p>}
        {member.episodeCount != null && <p className="text-xs text-gray-500">{member.episodeCount} episodes</p>}
      </div>
    </div>
  )
}

export default function AnimeDetailsClient({ initialData }: { initialData: AnimeDetailsData }) {
  const router = useRouter()
  const [data, setData] = useState(initialData)
  const [busy, setBusy] = useState(false)
  const [voiceLanguage, setVoiceLanguage] = useState<'english' | 'japanese'>('english')
  const anime = data.anime
  const voiceCast = anime.voiceCast?.[voiceLanguage] ?? []

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
    <div className="space-y-8">
      <div className="grid gap-8 lg:grid-cols-[340px_1fr]">
        <div className="relative aspect-[2/3] overflow-hidden rounded-3xl border border-gray-800 bg-gray-900 shadow-2xl shadow-black/40">
          {anime.posterUrl ? (
            <PosterImage src={anime.posterUrl} alt={`${anime.title} poster`} title={anime.title} />
          ) : (
            <div className="flex h-full items-center justify-center px-6 text-center text-gray-500">{anime.title}</div>
          )}

          <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/95 via-black/85 to-transparent p-4 pt-16">
            {data.tracked ? (
              <div className="space-y-3">
                <label className="block text-xs font-semibold uppercase tracking-wide text-gray-300">
                  Status
                  <select
                    value={(anime.status as ShowStatus) ?? 'PLAN_TO_WATCH'}
                    disabled={busy}
                    onChange={(e) => patchTracked({ status: e.target.value })}
                    className="mt-1 w-full rounded-lg border border-gray-700 bg-gray-950/95 px-3 py-2 text-sm normal-case text-gray-100 outline-none focus:border-purple-500"
                  >
                    {SHOW_STATUSES.map((status) => (
                      <option key={status} value={status}>{STATUS_LABELS[status]}</option>
                    ))}
                  </select>
                </label>
                <label className="block text-xs font-semibold uppercase tracking-wide text-gray-300">
                  Rating
                  <select
                    value={anime.rating ?? ''}
                    disabled={busy}
                    onChange={(e) => patchTracked({ rating: e.target.value ? Number(e.target.value) : null })}
                    className="mt-1 w-full rounded-lg border border-gray-700 bg-gray-950/95 px-3 py-2 text-sm normal-case text-gray-100 outline-none focus:border-purple-500"
                  >
                    <option value="">Unrated</option>
                    {RATING_VALUES.map((rating) => (
                      <option key={rating} value={rating}>{rating.toFixed(1)} / 5</option>
                    ))}
                  </select>
                </label>
              </div>
            ) : (
              <button
                onClick={addToWatchlist}
                disabled={busy}
                className="w-full rounded-xl bg-purple-600 px-5 py-3 font-semibold text-white transition-colors hover:bg-purple-500 disabled:opacity-50"
              >
                {busy ? 'Adding…' : '+ Add to Watchlist'}
              </button>
            )}
          </div>
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
            {data.tracked && anime.rating != null && <span className="rounded-full bg-purple-900/70 px-3 py-1">Your rating {anime.rating.toFixed(1)}/5</span>}
          </div>

          {anime.overview && <p className="max-w-4xl text-gray-300 leading-7">{anime.overview}</p>}

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
        </section>
      </div>

      {anime.voiceCast && (anime.voiceCast.english.length > 0 || anime.voiceCast.japanese.length > 0) && (
        <section className="rounded-2xl border border-gray-800 bg-gray-900 p-5">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold text-gray-200">Voice cast</h2>
              <p className="text-sm text-gray-500">Switch between English dub and Japanese cast.</p>
            </div>
            <div className="rounded-full border border-gray-700 bg-gray-950 p-1">
              {(['english', 'japanese'] as const).map((language) => (
                <button
                  key={language}
                  type="button"
                  onClick={() => setVoiceLanguage(language)}
                  className={`rounded-full px-4 py-1.5 text-sm font-medium capitalize transition-colors ${
                    voiceLanguage === language ? 'bg-purple-600 text-white' : 'text-gray-400 hover:text-white'
                  }`}
                >
                  {language}
                </button>
              ))}
            </div>
          </div>
          {voiceCast.length > 0 ? (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {voiceCast.map((actor) => <CastCard key={`${voiceLanguage}-${actor.name}-${actor.character ?? ''}`} member={actor} />)}
            </div>
          ) : (
            <p className="text-sm text-gray-500">No {voiceLanguage} voice cast found.</p>
          )}
        </section>
      )}

      {anime.cast && anime.cast.length > 0 && (
        <section className="rounded-2xl border border-gray-800 bg-gray-900 p-5">
          <h2 className="mb-4 text-lg font-semibold text-gray-200">TMDB cast</h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {anime.cast.map((actor) => <CastCard key={`${actor.name}-${actor.character ?? ''}`} member={actor} />)}
          </div>
        </section>
      )}

      {anime.seasons && anime.seasons.length > 0 && (
        <section className="rounded-2xl border border-gray-800 bg-gray-900 p-5">
          <h2 className="mb-4 text-lg font-semibold text-gray-200">Seasons & episodes</h2>
          <div className="grid gap-4 xl:grid-cols-2">
            {anime.seasons.map((season) => (
              <details key={season.seasonNumber} className="rounded-xl border border-gray-800 bg-gray-950 p-4" open={Boolean(season.episodes && season.seasonNumber === Math.max(...(anime.seasons ?? []).map((s) => s.seasonNumber)))}>
                <summary className="cursor-pointer font-semibold text-gray-100">
                  {season.name} <span className="text-sm font-normal text-gray-500">· {season.episodeCount ?? season.episodes?.length ?? '?'} episodes{season.airDate ? ` · ${formatDate(season.airDate)}` : ''}</span>
                </summary>
                {season.overview && <p className="mt-2 text-sm text-gray-400">{season.overview}</p>}
                {season.episodes && season.episodes.length > 0 && (
                  <ol className="mt-3 max-h-96 space-y-2 overflow-y-auto pr-1">
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
    </div>
  )
}
