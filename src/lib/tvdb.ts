import type { AiringInfo, MetadataProvider, MetadataRelatedItem, MetadataResult, SearchOptions } from './providers'
import { getAnimeRootTitle, isLikelySeasonSpecificTitle, normalizeAnimeTitle, titleCandidates } from './anime-title'
import { getConfiguredTvdbSeasonType, getEffectiveTvdbApiKey, getEffectiveTvdbPin } from './settings'

const TVDB_BASE = 'https://api4.thetvdb.com/v4'
const TOKEN_MAX_AGE_MS = 25 * 24 * 60 * 60 * 1000

type TvdbEnvelope<T> = { data?: T; links?: { next?: string | null }; token?: string }
type TokenCache = { token: string; issuedAt: number; key: string; pin?: string | null }
let tokenCache: TokenCache | null = null

interface TvdbTranslationValue {
  name?: string
  overview?: string
}

interface TvdbSeriesTranslation {
  name?: string
  overview?: string
}

interface TvdbSearchResult {
  tvdb_id?: string | number
  id?: string | number
  name?: string
  primary_language?: string
  translations?: { eng?: string; jpn?: string }
  overview?: string
  image_url?: string
  first_air_time?: string
  year?: string
  country?: string
  genres?: string[]
}
interface TvdbGenre { name?: string }
interface TvdbCompany { name?: string }
interface TvdbCompanyGroups {
  studio?: TvdbCompany[]
  production?: TvdbCompany[]
  network?: TvdbCompany[]
  distributor?: TvdbCompany[]
  special_effects?: TvdbCompany[]
}

interface TvdbSeriesExtended {
  id: number
  name?: string
  image?: string
  overview?: string
  firstAired?: string
  year?: string
  status?: { name?: string } | string
  genres?: TvdbGenre[]
  originalCountry?: string
  originalLanguage?: string
  companies?: TvdbCompanyGroups | TvdbCompany[]
  nextAired?: string
  lastAired?: string
  artworks?: Array<{ image?: string; url?: string }>
  translations?: { eng?: string | TvdbTranslationValue; jpn?: string | TvdbTranslationValue }
}
interface TvdbEpisode {
  id?: number
  seasonNumber?: number
  number?: number
  absoluteNumber?: number
  name?: string
  aired?: string
  image?: string
  overview?: string
}
interface TvdbEpisodesPayload {
  episodes?: TvdbEpisode[]
}

function normalizeSeasonType(value?: string | null) {
  return value?.trim() || 'default'
}
function parseDate(value?: string | null): Date | null {
  if (!value) return null
  const parsed = new Date(value)
  return Number.isNaN(parsed.getTime()) ? null : parsed
}
function imageUrl(value?: string | null) {
  if (!value) return undefined
  if (value.startsWith('http')) return value
  return `https://artworks.thetvdb.com${value.startsWith('/') ? '' : '/'}${value}`
}

function translationName(value?: string | TvdbTranslationValue | null) {
  if (!value) return undefined
  return typeof value === 'string' ? value : value.name
}
function translationOverview(value?: string | TvdbTranslationValue | null) {
  if (!value || typeof value === 'string') return undefined
  return value.overview
}
function isAnimeLike(item: TvdbSearchResult | TvdbSeriesExtended) {
  const genreText = Array.isArray(item.genres)
    ? item.genres.map((g) => (typeof g === 'string' ? g : g.name)).join(' ')
    : ''
  const searchItem = item as TvdbSearchResult
  const extendedItem = item as TvdbSeriesExtended
  const language = searchItem.primary_language ?? extendedItem.originalLanguage
  const country = searchItem.country ?? extendedItem.originalCountry
  const text = [genreText, language, country, item.name, item.overview].filter(Boolean).join(' ').toLowerCase()
  return text.includes('anime') || text.includes('animation') || text.includes('japan') || text.includes('japanese') || country === 'jp' || language === 'jpn'
}
async function login(apiKey: string, pin?: string | null): Promise<string | null> {
  const body: { apikey: string; pin?: string } = { apikey: apiKey }
  if (pin?.trim()) body.pin = pin.trim()
  const res = await fetch(`${TVDB_BASE}/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify(body),
    cache: 'no-store',
  })
  if (!res.ok) return null
  const json = (await res.json()) as TvdbEnvelope<{ token?: string }>
  return json.data?.token ?? json.token ?? null
}
async function getToken(apiKey: string, pin?: string | null, force = false): Promise<string | null> {
  const now = Date.now()
  if (!force && tokenCache && tokenCache.key === apiKey && (tokenCache.pin ?? null) === (pin ?? null) && now - tokenCache.issuedAt < TOKEN_MAX_AGE_MS) {
    return tokenCache.token
  }
  const token = await login(apiKey, pin)
  if (!token) return null
  tokenCache = { token, issuedAt: now, key: apiKey, pin }
  return token
}

export class TvdbProvider implements MetadataProvider {
  name = 'tvdb'
  constructor(private apiKey: string, private pin?: string | null, private seasonType = 'default') {}

  private async fetchJson<T>(pathOrUrl: string, revalidate = 300, timeoutMs = 5000, retried = false): Promise<TvdbEnvelope<T> | null> {
    const token = await getToken(this.apiKey, this.pin)
    if (!token) return null
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), timeoutMs)
    try {
      const url = pathOrUrl.startsWith('http') ? pathOrUrl : `${TVDB_BASE}${pathOrUrl}`
      const res = await fetch(url, { headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' }, next: { revalidate }, signal: controller.signal })
      if (res.status === 401 && !retried) {
        await getToken(this.apiKey, this.pin, true)
        return this.fetchJson<T>(pathOrUrl, revalidate, timeoutMs, true)
      }
      if (!res.ok) {
        if (process.env.NODE_ENV !== 'production') {
          console.warn('[tvdb] request failed', { path: pathOrUrl, status: res.status })
        }
        return null
      }
      return (await res.json()) as TvdbEnvelope<T>
    } catch {
      return null
    } finally {
      clearTimeout(timeout)
    }
  }

  async validateApiKey(): Promise<boolean> {
    return Boolean(await getToken(this.apiKey, this.pin, true))
  }

  async search(query: string, options?: SearchOptions): Promise<MetadataResult[]> {
    const params = new URLSearchParams({ query, type: 'series' })
    const envelope = await this.fetchJson<TvdbSearchResult[]>(`/search?${params.toString()}`, 60, 4000)
    let items = envelope?.data ?? []
    if (options?.animeOnly !== false) {
      const anime = items.filter(isAnimeLike)
      if (anime.length) items = anime
    }
    return items.slice(0, options?.limit ?? 10).map((item) => ({
      providerId: String(item.tvdb_id ?? item.id),
      providerName: 'tvdb',
      title: item.name || `TVDB #${item.tvdb_id ?? item.id}`,
      originalTitle: item.translations?.jpn,
      overview: item.overview || undefined,
      posterUrl: imageUrl(item.image_url),
      firstAiredAt: item.first_air_time || (item.year ? `${item.year}-01-01` : undefined),
      originalLanguage: item.primary_language,
      originCountries: item.country ? [item.country] : undefined,
      genres: item.genres,
    }))
  }

  private async getAllEpisodes(tvdbId: string): Promise<TvdbEpisode[]> {
    let path = `/series/${encodeURIComponent(tvdbId)}/episodes/${encodeURIComponent(normalizeSeasonType(this.seasonType))}/eng`
    const episodes: TvdbEpisode[] = []
    const seen = new Set<string>()
    for (let page = 0; page < 25 && path; page += 1) {
      const envelope = await this.fetchJson<TvdbEpisode[] | TvdbEpisodesPayload>(path, 3600, 6000)
      const data = envelope?.data
      const pageEpisodes = Array.isArray(data) ? data : data?.episodes ?? []
      for (const episode of pageEpisodes) {
        const key = String(episode.id ?? `${episode.seasonNumber}-${episode.number}-${episode.name}`)
        if (!seen.has(key)) {
          seen.add(key)
          episodes.push(episode)
        }
      }
      const next = envelope?.links?.next
      path = next ? (next.startsWith('http') ? next : next.replace(TVDB_BASE, '')) : ''
    }
    return episodes
  }

  async getDetails(tvdbId: string): Promise<MetadataResult | null> {
    const [extended, episodes] = await Promise.all([
      this.fetchJson<TvdbSeriesExtended>(`/series/${encodeURIComponent(tvdbId)}/extended`, 300, 5000),
      this.getAllEpisodes(tvdbId),
    ])
    const series = extended?.data
    if (!series) return null
    const englishTranslation = translationOverview(series.translations?.eng)
      ? null
      : await this.fetchJson<TvdbSeriesTranslation>(`/series/${encodeURIComponent(tvdbId)}/translations/eng`, 3600, 4000)
    const englishName = translationName(series.translations?.eng) ?? englishTranslation?.data?.name
    const japaneseName = translationName(series.translations?.jpn)
    const englishOverview = translationOverview(series.translations?.eng) ?? englishTranslation?.data?.overview
    const grouped = new Map<number, TvdbEpisode[]>()
    for (const episode of episodes) {
      const seasonNumber = episode.seasonNumber ?? 0
      if (seasonNumber <= 0) continue
      grouped.set(seasonNumber, [...(grouped.get(seasonNumber) ?? []), episode])
    }
    const seasons = [...grouped.entries()].sort(([a], [b]) => a - b).map(([seasonNumber, eps]) => {
      const sorted = eps.slice().sort((a, b) => (a.number ?? 0) - (b.number ?? 0))
      return {
        seasonNumber,
        name: `Season ${seasonNumber}`,
        episodeCount: sorted.length,
        airDate: sorted[0]?.aired ?? null,
        episodes: sorted.map((episode) => ({
          episodeNumber: episode.number ?? episode.absoluteNumber ?? 0,
          name: episode.name || `Episode ${episode.number ?? episode.absoluteNumber ?? ''}`.trim(),
          airDate: episode.aired ?? null,
          voteAverage: null,
          stillUrl: imageUrl(episode.image) ?? null,
          overview: episode.overview ?? null,
        })),
      }
    })
    const episodesTotal = seasons.reduce((sum, season) => sum + (season.episodeCount ?? season.episodes?.length ?? 0), 0)
    const dated = episodes.map((e) => ({ ...e, date: parseDate(e.aired) })).filter((e) => e.date) as Array<TvdbEpisode & { date: Date }>
    const now = Date.now()
    const last = dated.filter((e) => e.date.getTime() <= now).sort((a, b) => b.date.getTime() - a.date.getTime())[0]
    const next = dated.filter((e) => e.date.getTime() > now).sort((a, b) => a.date.getTime() - b.date.getTime())[0]
    const companyGroups = Array.isArray(series.companies)
      ? { production: series.companies }
      : series.companies
    const studios = [
      ...(companyGroups?.studio ?? []),
      ...(companyGroups?.production ?? []),
      ...(companyGroups?.network ?? []),
      ...(companyGroups?.distributor ?? []),
      ...(companyGroups?.special_effects ?? []),
    ]
      .map((c) => c.name?.trim())
      .filter((name, index, all): name is string => Boolean(name) && all.indexOf(name) === index)
    return {
      providerId: String(series.id),
      providerName: 'tvdb',
      title: englishName || series.name || `TVDB #${series.id}`,
      originalTitle: japaneseName && japaneseName !== (englishName || series.name) ? japaneseName : undefined,
      overview: englishOverview || series.overview || undefined,
      posterUrl: imageUrl(series.image) ?? imageUrl(series.artworks?.[0]?.image ?? series.artworks?.[0]?.url),
      firstAiredAt: series.firstAired || (series.year ? `${series.year}-01-01` : undefined),
      genres: series.genres?.map((g) => g.name).filter(Boolean) as string[] | undefined,
      studios: studios.length ? studios : undefined,
      episodesTotal: episodesTotal || undefined,
      originalLanguage: series.originalLanguage,
      originCountries: series.originalCountry ? [series.originalCountry] : undefined,
      airingStatus: typeof series.status === 'string' ? series.status : series.status?.name,
      nextEpisodeName: next?.name,
      lastEpisodeName: last?.name,
      seasons,
    }
  }

  async getSeasonEpisodes(tvdbId: string, seasonNumber: number) {
    const episodes = await this.getAllEpisodes(tvdbId)
    return episodes.filter((e) => e.seasonNumber === seasonNumber).sort((a, b) => (a.number ?? 0) - (b.number ?? 0)).map((episode) => ({
      episodeNumber: episode.number ?? episode.absoluteNumber ?? 0,
      name: episode.name || `Episode ${episode.number ?? episode.absoluteNumber ?? ''}`.trim(),
      airDate: episode.aired ?? null,
      voteAverage: null,
      stillUrl: imageUrl(episode.image) ?? null,
      overview: episode.overview ?? null,
    }))
  }

  async getAiringDetails(tvdbId: string): Promise<AiringInfo | null> {
    const [extended, episodes] = await Promise.all([
      this.fetchJson<TvdbSeriesExtended>(`/series/${encodeURIComponent(tvdbId)}/extended`, 300, 5000),
      this.getAllEpisodes(tvdbId),
    ])
    const series = extended?.data
    if (!series) return null
    const dated = episodes.map((e) => ({ ...e, date: parseDate(e.aired) })).filter((e) => e.date) as Array<TvdbEpisode & { date: Date }>
    const now = Date.now()
    const last = dated.filter((e) => e.date.getTime() <= now).sort((a, b) => b.date.getTime() - a.date.getTime())[0]
    const next = dated.filter((e) => e.date.getTime() > now).sort((a, b) => a.date.getTime() - b.date.getTime())[0]
    return {
      airingStatus: typeof series.status === 'string' ? series.status : series.status?.name ?? null,
      nextEpisodeNum: next?.number ?? null,
      nextAiringAt: parseDate(series.nextAired) ?? next?.date ?? null,
      lastEpisodeNum: last?.number ?? null,
      lastAiredAt: parseDate(series.lastAired) ?? last?.date ?? null,
    }
  }

  async findShowForAnime(titles: Array<string | null | undefined>, year?: number | null): Promise<MetadataResult | null> {
    const candidates = titleCandidates(...titles)
    let best: { item: MetadataResult; score: number } | null = null
    for (const query of candidates.slice(0, 6)) {
      const results = await this.search(query, { animeOnly: true, limit: 10 })
      for (const item of results) {
        const score = scoreTvdbMatch(item, candidates, year)
        if (!best || score > best.score) best = { item, score }
      }
      if (best && best.score >= 10) break
    }
    if (process.env.NODE_ENV !== 'production') {
      console.info('[tvdb] AniList import match', {
        titles: titles.filter(Boolean),
        candidates,
        year,
        matched: Boolean(best && best.score >= 3.5),
        bestScore: best?.score ?? null,
        bestTitle: best?.item.title ?? null,
        bestId: best?.item.providerId ?? null,
      })
    }
    if (!best || best.score < 3.5) return null
    return this.getDetails(best.item.providerId)
  }
}

function scoreTvdbMatch(item: MetadataRelatedItem | MetadataResult, candidates: string[], year?: number | null) {
  const normalizedCandidates = candidates.map(normalizeAnimeTitle).filter(Boolean)
  const rootCandidates = candidates.map(getAnimeRootTitle).filter(Boolean)
  const titles = [item.title, item.originalTitle].filter(Boolean) as string[]
  const normalizedTitles = titles.map(normalizeAnimeTitle)
  const rootTitles = titles.map(getAnimeRootTitle)
  const rawCandidates = new Set(candidates.map((title) => title.trim().toLowerCase()).filter(Boolean))
  const seasonSpecificTitle = titles.some(isLikelySeasonSpecificTitle)
  let score = 0
  for (const title of titles) if (rawCandidates.has(title.trim().toLowerCase())) score += 8
  for (const title of rootTitles) if (rootCandidates.includes(title)) score += 8
  for (const title of normalizedTitles) if (!seasonSpecificTitle && normalizedCandidates.includes(title)) score += 3
  if (seasonSpecificTitle) score -= 4
  if (year && item.firstAiredAt) {
    const itemYear = Number(item.firstAiredAt.slice(0, 4))
    if (!Number.isNaN(itemYear)) {
      const delta = Math.abs(itemYear - year)
      if (delta === 0) score += 0.5
      else if (delta <= 2) score += 0.25
    }
  }
  return score
}

export function getTvdbProvider(apiKey = process.env.TVDB_API_KEY, pin = process.env.TVDB_PIN, seasonType = process.env.TVDB_SEASON_TYPE): TvdbProvider | null {
  if (!apiKey) return null
  return new TvdbProvider(apiKey, pin, normalizeSeasonType(seasonType))
}

export async function getConfiguredTvdbProvider(): Promise<TvdbProvider | null> {
  const [key, pin, seasonType] = await Promise.all([getEffectiveTvdbApiKey(), getEffectiveTvdbPin(), getConfiguredTvdbSeasonType()])
  return getTvdbProvider(key ?? undefined, pin ?? undefined, seasonType)
}
