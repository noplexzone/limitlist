'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { KeyboardEvent, MouseEvent, useEffect, useMemo, useState } from 'react'
import PosterImage from '@/components/PosterImage'
import { SHOW_STATUSES, STATUS_LABELS, type ShowStatus } from '@/lib/status'
import type { MetadataCastMember, MetadataRelatedItem, MetadataSeasonSummary, MetadataVoiceCastGroup } from '@/lib/providers'

interface ChildRating {
  id?: string
  kind: string
  key: string
  providerName?: string | null
  providerId?: string | null
  seasonNumber?: number | null
  episodeNumber?: number | null
  title: string
  posterUrl?: string | null
  airDate?: string | null
  rating?: number | null
}

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
    recommendations?: MetadataRelatedItem[] | null
    relatedMovies?: MetadataRelatedItem[] | null
    childRatings?: ChildRating[] | null
  }
}


function StarIcon({ fillPct, small = false }: { fillPct: number; small?: boolean }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className={`${small ? 'h-4 w-4' : 'h-5 w-5 sm:h-6 sm:w-6'} drop-shadow`}>
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

function StarRating({ rating, onRate, compact = false }: { rating: number | null; onRate: (value: number | null) => void; compact?: boolean }) {
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
    <div className={`relative ${compact ? 'w-32 px-3' : 'w-full px-5'}`} aria-label="Rating">
      <div className="flex items-center justify-center gap-0.5" onMouseLeave={() => setHovered(null)}>
        {[1, 2, 3, 4, 5].map((star) => {
          const half = star - 0.5
          const fillPct = Math.max(0, Math.min(1, effective - (star - 1))) * 100
          return (
            <div key={star} className={`relative ${compact ? 'h-4 w-4' : 'h-5 w-5 sm:h-6 sm:w-6'}`}>
              <StarIcon fillPct={fillPct} small={compact} />
              <button type="button" aria-label={`Rate ${half} out of 5`} onMouseEnter={() => setHovered(half)} onFocus={() => setHovered(half)} onClick={(e) => click(e, half)} onKeyDown={stopKeyNavigation} className="absolute left-0 top-0 z-10 h-full w-1/2 cursor-pointer rounded-l" />
              <button type="button" aria-label={`Rate ${star} out of 5`} onMouseEnter={() => setHovered(star)} onFocus={() => setHovered(star)} onClick={(e) => click(e, star)} onKeyDown={stopKeyNavigation} className="absolute right-0 top-0 z-10 h-full w-1/2 cursor-pointer rounded-r" />
            </div>
          )
        })}
      </div>
      {rating != null && (
        <button type="button" onClick={(e) => click(e, null)} onKeyDown={stopKeyNavigation} aria-label="Clear rating" className="absolute right-0 top-1/2 -translate-y-1/2 rounded-full bg-black/60 px-1.5 py-0.5 text-xs font-medium text-gray-200 hover:bg-black/90" title="Clear rating">×</button>
      )}
    </div>
  )
}

function childRatingKey(kind: 'EPISODE' | 'MOVIE', parts: { seasonNumber?: number; episodeNumber?: number; providerName?: string; providerId?: string }) {
  if (kind === 'EPISODE') return `${parts.seasonNumber}:${parts.episodeNumber}`
  return `${parts.providerName}:${parts.providerId}`
}


function asTextList(value: string[] | string | null | undefined) {
  if (Array.isArray(value)) return value.join(', ')
  return value ?? ''
}

function formatDate(value?: string | null) {
  if (!value) return ''
  return new Date(value).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })
}

function stripHtml(value?: string | null) {
  return value?.replace(/<br\s*\/?\s*>/gi, ' ').replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim() || ''
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

export default function AnimeDetailsClient({ initialData, defaultCastLanguage }: { initialData: AnimeDetailsData; defaultCastLanguage: 'english' | 'japanese' }) {
  const router = useRouter()
  const [data, setData] = useState(initialData)
  const [busy, setBusy] = useState(false)
  const [enrichmentLoading, setEnrichmentLoading] = useState(false)
  const [enrichmentLoaded, setEnrichmentLoaded] = useState(Boolean(initialData.anime.voiceCast || initialData.anime.recommendations?.length || initialData.anime.relatedMovies?.length))
  const [childRatings, setChildRatings] = useState<ChildRating[]>(initialData.anime.childRatings ?? [])
  const [removeConfirm, setRemoveConfirm] = useState(false)
  const [removeError, setRemoveError] = useState('')
  const anime = data.anime
  const englishCount = anime.voiceCast?.english.length ?? 0
  const japaneseCount = anime.voiceCast?.japanese.length ?? 0
  const [voiceLanguage, setVoiceLanguage] = useState<'english' | 'japanese'>(defaultCastLanguage === 'english' && englishCount > 0 ? 'english' : 'japanese')
  const [voiceLanguageTouched, setVoiceLanguageTouched] = useState(false)
  const voiceCast = anime.voiceCast?.[voiceLanguage] ?? []
  const childRatingMap = useMemo(() => new Map(childRatings.map((rating) => [`${rating.kind}:${rating.key}`, rating])), [childRatings])

  useEffect(() => {
    if (!voiceLanguageTouched && defaultCastLanguage === 'english' && englishCount > 0) setVoiceLanguage('english')
    else if (!voiceLanguageTouched && defaultCastLanguage === 'japanese' && japaneseCount > 0) setVoiceLanguage('japanese')
    else if (voiceLanguage === 'english' && englishCount === 0 && japaneseCount > 0) setVoiceLanguage('japanese')
    else if (voiceLanguage === 'japanese' && japaneseCount === 0 && englishCount > 0) setVoiceLanguage('english')
  }, [defaultCastLanguage, englishCount, japaneseCount, voiceLanguage, voiceLanguageTouched])

  useEffect(() => {
    let cancelled = false
    async function loadEnrichment() {
      setEnrichmentLoading(true)
      try {
        const res = await fetch(`/api/anime/${encodeURIComponent(anime.providerName)}/${encodeURIComponent(anime.providerId)}/enrichment`)
        if (!res.ok) return
        const enrichment: Pick<AnimeDetailsData['anime'], 'voiceCast' | 'recommendations' | 'relatedMovies'> = await res.json()
        if (cancelled) return
        setData((current) => ({
          ...current,
          anime: {
            ...current.anime,
            voiceCast: enrichment.voiceCast,
            recommendations: enrichment.recommendations ?? [],
            relatedMovies: enrichment.relatedMovies ?? [],
          },
        }))
        setEnrichmentLoaded(true)
      } finally {
        if (!cancelled) setEnrichmentLoading(false)
      }
    }
    if (!enrichmentLoaded) void loadEnrichment()
    return () => { cancelled = true }
  }, [anime.providerName, anime.providerId, enrichmentLoaded])

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

  async function removeFromWatchlist() {
    if (!anime.id) return
    setBusy(true)
    setRemoveError('')
    const res = await fetch(`/api/watchlist/${anime.id}`, { method: 'DELETE' })
    if (res.ok) {
      router.push('/watchlist')
      router.refresh()
      return
    }
    const body = await res.json().catch(() => ({}))
    setRemoveError(body.error ?? 'Failed to remove show')
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

  async function patchChildRating(payload: Record<string, unknown>, rating: number | null) {
    if (!anime.id) return
    const res = await fetch(`/api/watchlist/${anime.id}/ratings`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...payload, rating }),
    })
    if (res.ok) {
      const updated: ChildRating = await res.json()
      setChildRatings((current) => {
        const key = `${updated.kind}:${updated.key}`
        return [...current.filter((item) => `${item.kind}:${item.key}` !== key), updated]
      })
    }
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
                <div>
                  <p className="mb-1 text-center text-xs font-semibold uppercase tracking-wide text-gray-300">Rating</p>
                  <StarRating rating={anime.rating ?? null} onRate={(value) => patchTracked({ rating: value })} />
                </div>
                {removeConfirm ? (
                  <div className="rounded-xl border border-red-400/40 bg-gray-950/95 p-3 text-center">
                    <p className="mb-2 text-sm font-medium text-gray-100">Remove from watchlist?</p>
                    <div className="flex justify-center gap-2">
                      <button type="button" disabled={busy} onClick={() => setRemoveConfirm(false)} className="rounded-lg bg-gray-800 px-3 py-1.5 text-sm text-gray-200 hover:bg-gray-700 disabled:opacity-50">Cancel</button>
                      <button type="button" disabled={busy} onClick={removeFromWatchlist} className="rounded-lg bg-red-700 px-3 py-1.5 text-sm font-semibold text-white hover:bg-red-600 disabled:opacity-50">Remove</button>
                    </div>
                  </div>
                ) : (
                  <button type="button" disabled={busy} onClick={() => setRemoveConfirm(true)} className="w-full rounded-xl border border-red-500/60 bg-red-950/80 px-4 py-2 text-sm font-semibold text-red-100 transition-colors hover:bg-red-900 disabled:opacity-50">
                    Remove from watchlist
                  </button>
                )}
                {removeError && <p className="text-center text-xs text-red-300">{removeError}</p>}
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
            {anime.airingStatus && <span className="rounded-full bg-gray-900 px-3 py-1">Status: {anime.airingStatus}</span>}
            {anime.nextAiringAt && <span className="rounded-full bg-purple-900/70 px-3 py-1">Next: Ep {anime.nextEpisodeNum ?? '?'}{anime.nextEpisodeName ? ` — ${anime.nextEpisodeName}` : ''} · {formatDate(anime.nextAiringAt)}</span>}
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


      <section className="rounded-2xl border border-gray-800 bg-gray-900 p-5">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-gray-200">Voice cast</h2>
            <p className="text-sm text-gray-500">Choose the dub/sub cast list.</p>
          </div>
          {(anime.voiceCast?.english.length || anime.voiceCast?.japanese.length) ? (
            <div className="rounded-full border border-gray-700 bg-gray-950 p-1">
              {(['english', 'japanese'] as const).map((language) => (
                <button
                  key={language}
                  type="button"
                  onClick={() => { setVoiceLanguageTouched(true); setVoiceLanguage(language) }}
                  disabled={(anime.voiceCast?.[language].length ?? 0) === 0}
                  className={`rounded-full px-4 py-1.5 text-sm font-medium capitalize transition-colors ${
                    voiceLanguage === language ? 'bg-purple-600 text-white' : 'text-gray-400 hover:text-white disabled:cursor-not-allowed disabled:text-gray-700'
                  }`}
                >
                  {language} <span className="text-xs opacity-75">{anime.voiceCast?.[language].length ?? 0}</span>
                </button>
              ))}
            </div>
          ) : null}
        </div>
        {enrichmentLoading ? (
          <p className="text-sm text-gray-500">Loading voice cast…</p>
        ) : voiceCast.length > 0 ? (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {voiceCast.map((actor) => <CastCard key={`${voiceLanguage}-${actor.name}-${actor.character ?? ''}`} member={actor} />)}
          </div>
        ) : (
          <p className="text-sm text-gray-500">No voice cast found.</p>
        )}
      </section>

      {anime.seasons && anime.seasons.length > 0 && (
        <section className="rounded-2xl border border-gray-800 bg-gray-900 p-5">
          <h2 className="mb-4 text-lg font-semibold text-gray-200">Seasons & episodes</h2>
          <div className="space-y-4">
            {anime.seasons.map((season) => (
              <details key={season.seasonNumber} className="rounded-xl border border-gray-800 bg-gray-950 p-4" open={Boolean(season.episodes && season.seasonNumber === Math.max(...(anime.seasons ?? []).map((s) => s.seasonNumber)))}>
                <summary className="cursor-pointer font-semibold text-gray-100">
                  {season.name} <span className="text-sm font-normal text-gray-500">{season.episodeCount ?? season.episodes?.length ? ` · ${season.episodeCount ?? season.episodes?.length} episodes in this season` : ''}{season.airDate ? ` · ${formatDate(season.airDate)}` : ''}</span>
                </summary>
                {season.overview && <p className="mt-2 text-sm text-gray-400">{season.overview}</p>}
                {season.episodes && season.episodes.length > 0 && (
                  <ol className="mt-4 max-h-[36rem] space-y-3 overflow-y-auto pr-1">
                    {season.episodes.map((episode) => {
                      const key = childRatingKey('EPISODE', { seasonNumber: season.seasonNumber, episodeNumber: episode.episodeNumber })
                      const child = childRatingMap.get(`EPISODE:${key}`)
                      return (
                        <li key={`${season.seasonNumber}-${episode.episodeNumber}`} className="flex flex-col gap-3 rounded-xl border border-gray-800 bg-gray-900 p-3 text-sm sm:flex-row">
                          <div className="relative aspect-video w-full shrink-0 overflow-hidden rounded-lg bg-gray-800 sm:w-40">
                            {episode.stillUrl ? (
                              <PosterImage src={episode.stillUrl} alt={`${episode.name} still`} title={episode.name} sizes="(min-width: 640px) 160px, 100vw" />
                            ) : (
                              <div className="flex h-full w-full items-center justify-center px-3 text-center text-xs text-gray-500">No still image</div>
                            )}
                          </div>
                          <div className="flex min-w-0 flex-1 flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                            <div className="min-w-0">
                              <p className="font-medium leading-snug text-gray-100">{episode.episodeNumber}. {episode.name}</p>
                              {episode.airDate && <p className="mt-1 text-xs text-gray-500">{formatDate(episode.airDate)}</p>}
                              {episode.overview && <p className="mt-2 line-clamp-3 text-sm leading-6 text-gray-400">{episode.overview}</p>}
                            </div>
                            {data.tracked && (
                              <div className="shrink-0 sm:pt-1">
                                <StarRating
                                  compact
                                  rating={child?.rating ?? null}
                                  onRate={(value) => patchChildRating({ kind: 'EPISODE', seasonNumber: season.seasonNumber, episodeNumber: episode.episodeNumber, title: episode.name, posterUrl: episode.stillUrl, airDate: episode.airDate }, value)}
                                />
                              </div>
                            )}
                          </div>
                        </li>
                      )
                    })}
                  </ol>
                )}
              </details>
            ))}
          </div>
        </section>
      )}


      <section className="rounded-2xl border border-gray-800 bg-gray-900 p-5">
        <h2 className="mb-1 text-lg font-semibold text-gray-200">Movies and specials</h2>
        <p className="mb-4 text-sm text-gray-500">Rated under {anime.title}, not added as separate watchlist shows.</p>
        {enrichmentLoading ? (
          <p className="text-sm text-gray-500">Loading movies and specials…</p>
        ) : anime.relatedMovies && anime.relatedMovies.length > 0 ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {anime.relatedMovies.map((movie) => {
              const key = childRatingKey('MOVIE', { providerName: movie.providerName, providerId: movie.providerId })
              const child = childRatingMap.get(`MOVIE:${key}`)
              return (
                <div key={key} className="rounded-xl border border-gray-800 bg-gray-950 p-3">
                  <div className="flex gap-3">
                    {movie.posterUrl && (
                      <div className="relative h-32 w-20 shrink-0 overflow-hidden rounded-lg bg-gray-800">
                        <PosterImage src={movie.posterUrl} alt={`${movie.title} poster`} title={movie.title} />
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="line-clamp-2 font-medium text-gray-100">{movie.title}</p>
                      {movie.firstAiredAt && <p className="text-xs text-gray-500">{formatDate(movie.firstAiredAt)}</p>}
                      {stripHtml(movie.overview) && <p className="mt-2 line-clamp-3 text-sm leading-5 text-gray-400">{stripHtml(movie.overview)}</p>}
                      {data.tracked && (
                        <div className="mt-3">
                          <StarRating compact rating={child?.rating ?? null} onRate={(value) => patchChildRating({ kind: 'MOVIE', providerName: movie.providerName, providerId: movie.providerId, title: movie.title, posterUrl: movie.posterUrl, airDate: movie.firstAiredAt }, value)} />
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        ) : (
          <p className="text-sm text-gray-500">No related movies or specials found.</p>
        )}
      </section>


      <section className="rounded-2xl border border-gray-800 bg-gray-900 p-5">
        <h2 className="mb-4 text-lg font-semibold text-gray-200">Recommended similar anime</h2>
        {enrichmentLoading ? (
          <p className="text-sm text-gray-500">Loading recommendations…</p>
        ) : anime.recommendations && anime.recommendations.length > 0 ? (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
            {anime.recommendations.map((item) => (
              <Link key={`${item.providerName}-${item.providerId}`} href={`/anime/${encodeURIComponent(item.providerName)}/${encodeURIComponent(item.providerId)}`} className="group overflow-hidden rounded-xl border border-gray-800 bg-gray-950 transition-colors hover:border-purple-500">
                <div className="relative aspect-[2/3] bg-gray-800">
                  {item.posterUrl ? <PosterImage src={item.posterUrl} alt={`${item.title} poster`} title={item.title} /> : <div className="flex h-full items-center justify-center p-3 text-center text-xs text-gray-500">{item.title}</div>}
                </div>
                <div className="p-2">
                  <p className="line-clamp-2 text-sm font-medium text-gray-100 group-hover:text-purple-200">{item.title}</p>
                  {item.firstAiredAt && <p className="text-xs text-gray-500">{formatDate(item.firstAiredAt)}</p>}
                  {stripHtml(item.overview) && <p className="mt-2 line-clamp-3 text-xs leading-5 text-gray-400">{stripHtml(item.overview)}</p>}
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <p className="text-sm text-gray-500">No recommendations found.</p>
        )}
      </section>

    </div>
  )
}
