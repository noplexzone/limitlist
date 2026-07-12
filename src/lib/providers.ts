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
}

export interface MetadataProvider {
  name: string
  search(query: string): Promise<MetadataResult[]>
}
