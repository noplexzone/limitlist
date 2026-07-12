import type { MetadataProvider, MetadataResult } from './providers'

const TMDB_BASE = 'https://api.themoviedb.org/3'
const POSTER_BASE = 'https://image.tmdb.org/t/p/w500'

interface TmdbTvResult {
  id: number
  name: string
  original_name?: string
  overview?: string
  poster_path?: string | null
  first_air_date?: string
  genre_ids?: number[]
  origin_country?: string[]
}

interface TmdbSearchResponse {
  results: TmdbTvResult[]
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
}

export class TmdbProvider implements MetadataProvider {
  name = 'tmdb'

  private apiKey: string

  constructor(apiKey: string) {
    this.apiKey = apiKey
  }

  async search(query: string): Promise<MetadataResult[]> {
    const url = new URL(`${TMDB_BASE}/search/tv`)
    url.searchParams.set('api_key', this.apiKey)
    url.searchParams.set('query', query)
    url.searchParams.set('include_adult', 'false')

    const res = await fetch(url.toString(), { next: { revalidate: 60 } })
    if (!res.ok) {
      throw new Error(`TMDB search failed: ${res.status} ${res.statusText}`)
    }

    const data: TmdbSearchResponse = await res.json()

    return data.results.slice(0, 10).map((item) => ({
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
}

export function getTmdbProvider(): TmdbProvider | null {
  const key = process.env.TMDB_API_KEY
  if (!key) return null
  return new TmdbProvider(key)
}
