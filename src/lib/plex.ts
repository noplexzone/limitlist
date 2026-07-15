import { getAnimeRootTitle, normalizeAnimeTitle, titleCandidates } from './anime-title'
import { getEffectivePlexBaseUrl, getEffectivePlexToken } from './settings'

export interface PlexSeries {
  ratingKey: string
  title: string
  showOrdering: string | null
}

export interface PlexEpisode {
  ratingKey: string
  parentIndex: number
  index: number
  title: string
  originallyAvailableAt: string | null
  year: number | null
  viewCount: number
  lastViewedAt: number | null
  viewOffset: number
  guids: string[]
  watched: boolean
}

interface PlexGuid {
  id: string
}

interface PlexMetadataItem {
  ratingKey?: string
  title?: string
  viewingOrder?: string
  showOrdering?: string
  parentIndex?: number
  index?: number
  originallyAvailableAt?: string
  year?: number
  viewCount?: number
  lastViewedAt?: number
  viewOffset?: number
  Guid?: PlexGuid[]
}

interface PlexContainer {
  MediaContainer: {
    Metadata?: PlexMetadataItem[]
    size?: number
  }
}

export class PlexClient {
  constructor(private baseUrl: string, private token: string) {}

  private async fetchJson<T>(path: string): Promise<T | null> {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 4000)
    const url = `${this.baseUrl.replace(/\/$/, '')}${path}`
    try {
      const res = await fetch(url, {
        headers: { 'X-Plex-Token': this.token, Accept: 'application/json' },
        signal: controller.signal,
        cache: 'no-store',
      })
      if (!res.ok) {
        if (process.env.NODE_ENV !== 'production') {
          console.warn('[plex] request failed', { path, status: res.status })
        }
        return null
      }
      return (await res.json()) as T
    } catch {
      return null
    } finally {
      clearTimeout(timeout)
    }
  }

  async validate(): Promise<boolean> {
    return (await this.fetchJson<unknown>('/identity')) !== null
  }

  async getShowOrdering(seriesRatingKey: string): Promise<string | null> {
    const data = await this.fetchJson<PlexContainer>(
      `/library/metadata/${encodeURIComponent(seriesRatingKey)}`
    )
    const item = data?.MediaContainer?.Metadata?.[0]
    return item?.showOrdering ?? item?.viewingOrder ?? null
  }

  async findSeriesByTvdbId(
    tvdbId: string,
    titles?: Array<string | null | undefined>,
    year?: number | null
  ): Promise<PlexSeries | null> {
    const guidData = await this.fetchJson<PlexContainer>(
      `/library/all?guid=${encodeURIComponent(`tvdb://${tvdbId}`)}`
    )
    const guidItems = guidData?.MediaContainer?.Metadata ?? []
    if (guidItems.length > 0) {
      const item = guidItems[0]
      if (item.ratingKey && item.title) {
        return { ratingKey: item.ratingKey, title: item.title, showOrdering: item.showOrdering ?? item.viewingOrder ?? null }
      }
    }

    if (!titles?.length) return null
    const candidates = titleCandidates(...titles)
    if (!candidates.length) return null

    let best: { item: PlexMetadataItem; score: number } | null = null
    for (const query of candidates.slice(0, 4)) {
      const searchData = await this.fetchJson<PlexContainer>(
        `/search?query=${encodeURIComponent(query)}&type=2`
      )
      for (const item of searchData?.MediaContainer?.Metadata ?? []) {
        if (!item.ratingKey || !item.title) continue
        const score = scorePlexMatch(item, candidates, year)
        if (!best || score > best.score) best = { item, score }
      }
      if (best && best.score >= 10) break
    }

    if (!best || best.score < 3.5) return null
    return {
      ratingKey: best.item.ratingKey!,
      title: best.item.title!,
      showOrdering: best.item.showOrdering ?? best.item.viewingOrder ?? null,
    }
  }

  async getEpisodes(seriesRatingKey: string): Promise<PlexEpisode[]> {
    const data = await this.fetchJson<PlexContainer>(
      `/library/metadata/${encodeURIComponent(seriesRatingKey)}/allLeaves`
    )
    return (data?.MediaContainer?.Metadata ?? [])
      .filter((item): item is PlexMetadataItem & { ratingKey: string } => Boolean(item.ratingKey))
      .map((item) => ({
        ratingKey: item.ratingKey,
        parentIndex: item.parentIndex ?? 0,
        index: item.index ?? 0,
        title: item.title ?? '',
        originallyAvailableAt: item.originallyAvailableAt ?? null,
        year: item.year ?? null,
        viewCount: item.viewCount ?? 0,
        lastViewedAt: item.lastViewedAt ?? null,
        viewOffset: item.viewOffset ?? 0,
        guids: (item.Guid ?? []).map((g) => g.id).filter(Boolean),
        watched: (item.viewCount ?? 0) > 0,
      }))
  }
}

function scorePlexMatch(
  item: PlexMetadataItem,
  candidates: string[],
  year?: number | null
): number {
  const itemTitles = [item.title].filter(Boolean) as string[]
  const normalizedCandidates = candidates.map(normalizeAnimeTitle).filter(Boolean)
  const rootCandidates = candidates.map(getAnimeRootTitle).filter(Boolean)
  const normalizedTitles = itemTitles.map(normalizeAnimeTitle)
  const rootTitles = itemTitles.map(getAnimeRootTitle)
  const rawCandidates = new Set(candidates.map((t) => t.trim().toLowerCase()).filter(Boolean))

  let score = 0
  for (const title of itemTitles) if (rawCandidates.has(title.trim().toLowerCase())) score += 8
  for (const title of rootTitles) if (rootCandidates.includes(title)) score += 8
  for (const title of normalizedTitles) if (normalizedCandidates.includes(title)) score += 3

  if (year && item.year) {
    const delta = Math.abs(item.year - year)
    if (delta === 0) score += 0.5
    else if (delta <= 2) score += 0.25
  }

  return score
}

export async function getConfiguredPlexClient(): Promise<PlexClient | null> {
  const [baseUrl, token] = await Promise.all([getEffectivePlexBaseUrl(), getEffectivePlexToken()])
  if (!baseUrl || !token) return null
  return new PlexClient(baseUrl, token)
}
