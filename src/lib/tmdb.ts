import type { MetadataProvider, MetadataResult, SearchOptions } from './providers'
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

interface TmdbEpisode {
  episode_number: number
  air_date?: string | null
  name?: string
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

    return items.slice(0, 10).map((item) => ({
      providerId: String(item.id),
      providerName: 'tmdb',
      title: item.name,
      originalTitle: item.original_name !== item.name ? item.original_name : undefined,
      overview: item.overview || undefined,
      posterUrl: item.poster_path ? `${POSTER_BASE}${item.poster_path}` : undefined,
      firstAiredAt: item.first_air_date || undefined,
    }))
  }

  async getDetails(tmdbId: string): Promise<MetadataResult | null> {
    const url = new URL(`${TMDB_BASE}/tv/${tmdbId}`)
    url.searchParams.set('api_key', this.apiKey)

    const res = await fetch(url.toString(), { next: { revalidate: 300 } })
    if (!res.ok) return null

    const data: TmdbTvDetails = await res.json()

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
    }
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

export function getTmdbProvider(): TmdbProvider | null {
  const key = process.env.TMDB_API_KEY
  if (!key) return null
  return new TmdbProvider(key)
}
