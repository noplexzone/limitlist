import type { MetadataProvider, MetadataRelatedItem, MetadataResult, SearchOptions } from './providers'
import { getEffectiveTmdbApiKey } from './settings'
import { getAnimeRootTitle, isLikelySeasonSpecificTitle, normalizeAnimeTitle, titleCandidates } from './anime-title'

const TMDB_BASE = 'https://api.themoviedb.org/3'
const POSTER_BASE = 'https://image.tmdb.org/t/p/w500'
const ANIMATION_GENRE_ID = 16

interface TmdbTvResult {
  id: number
  name: string
  original_name?: string
  overview?: string
  poster_path?: string | null
  first_air_date?: string
  genre_ids?: number[]
  origin_country?: string[]
  original_language?: string
  popularity?: number
}

interface TmdbSearchResponse {
  results: TmdbTvResult[]
}

interface TmdbMovieResult {
  id: number
  title: string
  original_title?: string
  overview?: string
  poster_path?: string | null
  release_date?: string
  genre_ids?: number[]
  original_language?: string
  popularity?: number
}

interface TmdbTvListResponse {
  results?: TmdbTvResult[]
}

interface TmdbMovieSearchResponse {
  results?: TmdbMovieResult[]
}

interface TmdbEpisode {
  episode_number: number
  air_date?: string | null
  name?: string
  overview?: string | null
  still_path?: string | null
  vote_average?: number | null
}

interface TmdbSeasonSummary {
  id: number
  season_number: number
  name: string
  episode_count?: number
  air_date?: string | null
  overview?: string | null
  poster_path?: string | null
}

interface TmdbSeasonDetails {
  id: number
  season_number: number
  name: string
  episodes?: TmdbEpisode[]
}

interface TmdbAggregateCredit {
  id: number
  name: string
  original_name?: string
  profile_path?: string | null
  roles?: Array<{ character?: string | null; episode_count?: number | null }>
  total_episode_count?: number | null
}

interface TmdbTvDetails {
  id: number
  name: string
  original_name?: string
  overview?: string
  poster_path?: string | null
  first_air_date?: string
  genres?: { id: number; name: string }[]
  production_companies?: { id: number; name: string }[]
  number_of_episodes?: number
  status?: string
  next_episode_to_air?: TmdbEpisode | null
  last_episode_to_air?: TmdbEpisode | null
  vote_average?: number | null
  vote_count?: number | null
  popularity?: number | null
  original_language?: string | null
  origin_country?: string[] | null
  seasons?: TmdbSeasonSummary[]
  aggregate_credits?: { cast?: TmdbAggregateCredit[] }
  content_ratings?: { results?: Array<{ iso_3166_1: string; rating: string }> }
}

export interface TmdbAiringInfo {
  airingStatus: string | null
  nextEpisodeNum: number | null
  nextAiringAt: Date | null
  lastEpisodeNum: number | null
  lastAiredAt: Date | null
}

export class TmdbProvider implements MetadataProvider {
  name = 'tmdb'

  private apiKey: string

  constructor(apiKey: string) {
    this.apiKey = apiKey
  }


  private mapTvResult(item: TmdbTvResult): MetadataRelatedItem {
    return {
      providerId: String(item.id),
      providerName: 'tmdb',
      title: item.name,
      originalTitle: item.original_name !== item.name ? item.original_name : undefined,
      overview: item.overview || undefined,
      posterUrl: item.poster_path ? `${POSTER_BASE}${item.poster_path}` : undefined,
      firstAiredAt: item.first_air_date || undefined,
    }
  }

  private mapMovieResult(item: TmdbMovieResult): MetadataRelatedItem {
    return {
      providerId: String(item.id),
      providerName: 'tmdb-movie',
      title: item.title,
      originalTitle: item.original_title !== item.title ? item.original_title : undefined,
      overview: item.overview || undefined,
      posterUrl: item.poster_path ? `${POSTER_BASE}${item.poster_path}` : undefined,
      firstAiredAt: item.release_date || undefined,
    }
  }

  private async fetchJson<T>(url: URL, revalidate: number, timeoutMs = 3000): Promise<T | null> {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), timeoutMs)
    try {
      const res = await fetch(url.toString(), { next: { revalidate }, signal: controller.signal })
      if (!res.ok) return null
      return (await res.json()) as T
    } catch {
      return null
    } finally {
      clearTimeout(timeout)
    }
  }


  async validateApiKey(): Promise<boolean> {
    const url = new URL(`${TMDB_BASE}/configuration`)
    url.searchParams.set('api_key', this.apiKey)
    const res = await fetch(url.toString(), { cache: 'no-store' })
    return res.ok
  }

  async search(query: string, options?: SearchOptions): Promise<MetadataResult[]> {
    const url = new URL(`${TMDB_BASE}/search/tv`)
    url.searchParams.set('api_key', this.apiKey)
    url.searchParams.set('query', query)
    url.searchParams.set('include_adult', 'false')

    const res = await fetch(url.toString(), { next: { revalidate: 60 } })
    if (!res.ok) {
      throw new Error(`TMDB search failed: ${res.status} ${res.statusText}`)
    }

    const data: TmdbSearchResponse = await res.json()
    let items = data.results

    // Anime-only mode: filter to Animation genre (id 16) or Japanese-origin content.
    // Do not fall back to broad TV results; this app intentionally tracks anime only.
    if (options?.animeOnly !== false) {
      const filtered = items.filter(
        (item) =>
          item.genre_ids?.includes(ANIMATION_GENRE_ID) ||
          item.original_language === 'ja' ||
          item.origin_country?.includes('JP')
      )
      items = filtered

      // Sort: Japanese/JP-origin first, then Animation genre, then rest
      items = [...items].sort((a, b) => {
        const score = (i: TmdbTvResult) =>
          (i.original_language === 'ja' || i.origin_country?.includes('JP') ? 2 : 0) +
          (i.genre_ids?.includes(ANIMATION_GENRE_ID) ? 1 : 0)
        return score(b) - score(a)
      })
    }

    return items.slice(0, options?.limit ?? 10).map((item) => this.mapTvResult(item))
  }

  async getDetails(tmdbId: string): Promise<MetadataResult | null> {
    const url = new URL(`${TMDB_BASE}/tv/${tmdbId}`)
    url.searchParams.set('api_key', this.apiKey)
    url.searchParams.set('append_to_response', 'aggregate_credits,content_ratings')

    const res = await fetch(url.toString(), { next: { revalidate: 300 } })
    if (!res.ok) return null

    const data: TmdbTvDetails = await res.json()

    const seasons = (data.seasons ?? [])
      .filter((season) => season.season_number > 0)
      .map((season) => ({
        seasonNumber: season.season_number,
        name: season.name,
        episodeCount: season.episode_count ?? null,
        airDate: season.air_date ?? null,
        overview: season.overview ?? null,
      }))

    const cast = (data.aggregate_credits?.cast ?? [])
      .slice()
      .sort((a, b) => (b.total_episode_count ?? 0) - (a.total_episode_count ?? 0))
      .slice(0, 18)
      .map((actor) => ({
        name: actor.name,
        originalName: actor.original_name && actor.original_name !== actor.name ? actor.original_name : undefined,
        character: actor.roles?.map((role) => role.character).filter(Boolean).slice(0, 3).join(', ') || undefined,
        episodeCount: actor.total_episode_count ?? actor.roles?.[0]?.episode_count ?? null,
        profileUrl: actor.profile_path ? `${POSTER_BASE}${actor.profile_path}` : undefined,
      }))

    const usRating = data.content_ratings?.results?.find((r) => r.iso_3166_1 === 'US')?.rating

    return {
      providerId: String(data.id),
      providerName: 'tmdb',
      title: data.name,
      originalTitle: data.original_name !== data.name ? data.original_name : undefined,
      overview: data.overview || undefined,
      posterUrl: data.poster_path ? `${POSTER_BASE}${data.poster_path}` : undefined,
      firstAiredAt: data.first_air_date || undefined,
      genres: data.genres?.map((g) => g.name),
      studios: data.production_companies?.map((c) => c.name),
      episodesTotal: data.number_of_episodes,
      voteAverage: data.vote_average ?? undefined,
      voteCount: data.vote_count ?? undefined,
      popularity: data.popularity ?? undefined,
      originalLanguage: data.original_language ?? undefined,
      originCountries: data.origin_country ?? undefined,
      contentRating: usRating,
      airingStatus: data.status ?? undefined,
      nextEpisodeName: data.next_episode_to_air?.name ?? undefined,
      lastEpisodeName: data.last_episode_to_air?.name ?? undefined,
      seasons,
      cast,
    }
  }

  async getSeasonEpisodes(tmdbId: string, seasonNumber: number): Promise<Array<{ episodeNumber: number; name: string; airDate?: string | null; voteAverage?: number | null }> | null> {
    const url = new URL(`${TMDB_BASE}/tv/${tmdbId}/season/${seasonNumber}`)
    url.searchParams.set('api_key', this.apiKey)
    const data = await this.fetchJson<TmdbSeasonDetails>(url, 3600, 2500)
    if (!data) return null
    return (data.episodes ?? []).map((episode) => ({
      episodeNumber: episode.episode_number,
      name: episode.name || `Episode ${episode.episode_number}`,
      airDate: episode.air_date ?? null,
      voteAverage: episode.vote_average ?? null,
    }))
  }

  async getRecommendations(tmdbId: string, limit = 12): Promise<MetadataRelatedItem[]> {
    const url = new URL(`${TMDB_BASE}/tv/${tmdbId}/recommendations`)
    url.searchParams.set('api_key', this.apiKey)
    const data = await this.fetchJson<TmdbTvListResponse>(url, 3600, 2500)
    return (data?.results ?? [])
      .filter((item) => item.genre_ids?.includes(ANIMATION_GENRE_ID) || item.original_language === 'ja' || item.origin_country?.includes('JP'))
      .slice(0, limit)
      .map((item) => this.mapTvResult(item))
  }

  async getRelatedMovies(titles: Array<string | null | undefined>, limit = 8): Promise<MetadataRelatedItem[]> {
    const candidates = titleCandidates(...titles).slice(0, 2)
    const seen = new Set<string>()
    const movies: TmdbMovieResult[] = []

    for (const query of candidates) {
      const url = new URL(`${TMDB_BASE}/search/movie`)
      url.searchParams.set('api_key', this.apiKey)
      url.searchParams.set('query', query)
      url.searchParams.set('include_adult', 'false')
      const data = await this.fetchJson<TmdbMovieSearchResponse>(url, 3600, 2500)
      for (const item of data?.results ?? []) {
        if (seen.has(String(item.id))) continue
        if (!(item.genre_ids?.includes(ANIMATION_GENRE_ID) || item.original_language === 'ja')) continue
        seen.add(String(item.id))
        movies.push(item)
      }
      if (movies.length >= limit) break
    }

    return movies
      .sort((a, b) => (b.popularity ?? 0) - (a.popularity ?? 0))
      .slice(0, limit)
      .map((item) => this.mapMovieResult(item))
  }



  async findShowForAnime(
    titles: Array<string | null | undefined>,
    year?: number | null
  ): Promise<MetadataResult | null> {
    const candidates = titleCandidates(...titles)
    if (candidates.length === 0) return null

    let best: { item: TmdbTvResult; score: number } | null = null

    for (const query of candidates.slice(0, 4)) {
      const url = new URL(`${TMDB_BASE}/search/tv`)
      url.searchParams.set('api_key', this.apiKey)
      url.searchParams.set('query', query)
      url.searchParams.set('include_adult', 'false')

      const res = await fetch(url.toString(), { next: { revalidate: 3600 } })
      if (!res.ok) continue

      const data: TmdbSearchResponse = await res.json()
      for (const item of data.results ?? []) {
        const score = scoreTmdbAnimeMatch(item, candidates, year)
        if (!best || score > best.score) best = { item, score }
      }

      if (best && best.score >= 11) break
    }

    if (!best || best.score < 5) return null
    return this.getDetails(String(best.item.id))
  }

  async getAiringDetails(tmdbId: string): Promise<TmdbAiringInfo | null> {
    const url = new URL(`${TMDB_BASE}/tv/${tmdbId}`)
    url.searchParams.set('api_key', this.apiKey)

    const res = await fetch(url.toString(), { cache: 'no-store' })
    if (!res.ok) return null

    const data: TmdbTvDetails = await res.json()

    const parseDate = (d?: string | null): Date | null => {
      if (!d) return null
      const parsed = new Date(d)
      return isNaN(parsed.getTime()) ? null : parsed
    }

    return {
      airingStatus: data.status ?? null,
      nextEpisodeNum: data.next_episode_to_air?.episode_number ?? null,
      nextAiringAt: parseDate(data.next_episode_to_air?.air_date),
      lastEpisodeNum: data.last_episode_to_air?.episode_number ?? null,
      lastAiredAt: parseDate(data.last_episode_to_air?.air_date),
    }
  }
}


function scoreTmdbAnimeMatch(
  item: TmdbTvResult,
  candidates: string[],
  anilistYear?: number | null
): number {
  const normalizedCandidates = candidates.map(normalizeAnimeTitle).filter(Boolean)
  const rootCandidates = candidates.map(getAnimeRootTitle).filter(Boolean)
  const titleValues = [item.name, item.original_name].filter(Boolean) as string[]
  const normalizedTitles = titleValues.map(normalizeAnimeTitle)
  const rootTitles = titleValues.map(getAnimeRootTitle)
  const seasonSpecificTitle = titleValues.some(isLikelySeasonSpecificTitle)

  let score = 0
  const animeScore =
    (item.original_language === 'ja' || item.origin_country?.includes('JP') ? 4 : 0) +
    (item.genre_ids?.includes(ANIMATION_GENRE_ID) ? 3 : 0)
  score += animeScore

  for (const title of rootTitles) {
    if (rootCandidates.includes(title)) score += 8
  }
  for (const title of normalizedTitles) {
    if (!seasonSpecificTitle && normalizedCandidates.includes(title)) score += 3
  }
  if (seasonSpecificTitle) score -= 4
  // AniList Discover should link to anime whole-show records. Generic/non-anime
  // TMDB title collisions such as live-action adaptations should not beat anime records.
  if (animeScore === 0) score -= 6

  if (anilistYear && item.first_air_date) {
    const tmdbYear = Number(item.first_air_date.slice(0, 4))
    if (!Number.isNaN(tmdbYear)) {
      const delta = Math.abs(tmdbYear - anilistYear)
      if (delta === 0) score += 0.5
      else if (delta <= 2) score += 0.25
    }
  }

  score += Math.min(item.popularity ?? 0, 100) / 100
  return score
}

export function getTmdbProvider(apiKey = process.env.TMDB_API_KEY): TmdbProvider | null {
  if (!apiKey) return null
  return new TmdbProvider(apiKey)
}

export async function getConfiguredTmdbProvider(): Promise<TmdbProvider | null> {
  const key = await getEffectiveTmdbApiKey()
  return getTmdbProvider(key ?? undefined)
}
