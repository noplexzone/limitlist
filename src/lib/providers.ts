export interface MetadataCastMember {
  name: string
  originalName?: string
  character?: string
  episodeCount?: number | null
  profileUrl?: string
}

export interface MetadataSeasonSummary {
  seasonNumber: number
  name: string
  episodeCount?: number | null
  airDate?: string | null
  overview?: string | null
  episodes?: Array<{
    episodeNumber: number
    name: string
    airDate?: string | null
    voteAverage?: number | null
  }>
}

export interface MetadataResult {
  providerId: string
  providerName: string
  title: string
  originalTitle?: string
  overview?: string
  posterUrl?: string
  firstAiredAt?: string
  genres?: string[]
  studios?: string[]
  episodesTotal?: number
  voteAverage?: number
  voteCount?: number
  popularity?: number
  originalLanguage?: string
  originCountries?: string[]
  contentRating?: string
  airingStatus?: string
  nextEpisodeName?: string
  lastEpisodeName?: string
  cast?: MetadataCastMember[]
  seasons?: MetadataSeasonSummary[]
  sourceProvider?: string
  sourceId?: string
}

export interface SearchOptions {
  animeOnly?: boolean
  limit?: number
}

export interface MetadataProvider {
  name: string
  search(query: string, options?: SearchOptions): Promise<MetadataResult[]>
}
