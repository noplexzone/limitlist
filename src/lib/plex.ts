import { getAnimeRootTitle, normalizeAnimeTitle, titleCandidates } from './anime-title'
import { getConfiguredPlexAccountId, getConfiguredPlexLibrarySections, getEffectivePlexBaseUrl, getEffectivePlexToken } from './settings'

export interface PlexSeries {
  ratingKey: string
  title: string
  showOrdering: string | null
}

export interface PlexSection {
  key: string
  title: string
  type: string
}

export interface PlexWatchedShow {
  ratingKey: string
  title: string
  year: number | null
  guids: string[]
  tvdbId: string | null
  viewedLeafCount: number
  leafCount: number
  showOrdering: string | null
  librarySectionKey: string
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
  duration: number
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
  duration?: number
  viewedLeafCount?: number
  leafCount?: number
  type?: string
  key?: string
  Guid?: PlexGuid[]
  guid?: string
}

interface PlexContainer {
  MediaContainer: {
    Metadata?: PlexMetadataItem[]
    Directory?: PlexMetadataItem[]
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

  async getSections(): Promise<PlexSection[]> {
    const data = await this.fetchJson<PlexContainer>('/library/sections')
    return (data?.MediaContainer?.Directory ?? [])
      .filter((item) => item.key && item.title && item.type)
      .map((item) => ({ key: String(item.key), title: item.title!, type: item.type! }))
  }

  async getWatchedShows(sectionKeys: string[] = [], accountId?: string | null): Promise<PlexWatchedShow[]> {
    const keys = sectionKeys.length > 0
      ? sectionKeys
      : (await this.getSections()).filter((section) => section.type === 'show').map((section) => section.key)
    const batches = await Promise.all(keys.map(async (key) => {
      const params = new URLSearchParams({ type: '2', includeGuids: '1' })
      if (accountId) params.set('accountID', accountId)
      const data = await this.fetchJson<PlexContainer>(`/library/sections/${encodeURIComponent(key)}/all?${params.toString()}`)
      return (data?.MediaContainer?.Metadata ?? []).map((item) => ({ item, key }))
    }))

    const watched = batches.flat().filter(({ item }) => (item.viewedLeafCount ?? 0) > 0 && item.ratingKey && item.title)
    const results: PlexWatchedShow[] = watched.map(({ item, key }) => {
      const guids = getPlexGuids(item)
      return {
        ratingKey: item.ratingKey!,
        title: item.title!,
        year: item.year ?? null,
        guids,
        tvdbId: extractTvdbId(guids),
        viewedLeafCount: item.viewedLeafCount ?? 0,
        leafCount: item.leafCount ?? 0,
        showOrdering: item.showOrdering ?? item.viewingOrder ?? null,
        librarySectionKey: key,
      }
    })

    const noGuidIndexes = results.map((show, i) => (show.guids.length === 0 ? i : -1)).filter((i) => i >= 0)
    const FALLBACK_LIMIT = 50
    if (noGuidIndexes.length > 0 && noGuidIndexes.length <= FALLBACK_LIMIT) {
      for (const idx of noGuidIndexes) {
        const show = results[idx]
        const meta = await this.fetchJson<PlexContainer>(`/library/metadata/${encodeURIComponent(show.ratingKey)}`)
        const metaItem = meta?.MediaContainer?.Metadata?.[0]
        if (metaItem) {
          const guids = getPlexGuids(metaItem)
          if (guids.length > 0) {
            results[idx] = { ...show, guids, tvdbId: extractTvdbId(guids) }
          }
        }
      }
    }

    if (process.env.NODE_ENV !== 'production') {
      const resolvedCount = results.filter((show) => show.tvdbId !== null).length
      const fallbackCount = noGuidIndexes.length
      const skippedFallback = fallbackCount > FALLBACK_LIMIT
      console.info('[plex] getWatchedShows', {
        totalShows: results.length,
        tvdbResolved: resolvedCount,
        fallbackAttempted: skippedFallback ? 0 : fallbackCount,
        fallbackSkipped: skippedFallback ? fallbackCount : 0,
      })
    }

    return results
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
        duration: item.duration ?? 0,
        guids: getPlexGuids(item),
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

function getPlexGuids(item: PlexMetadataItem): string[] {
  return [
    ...(item.Guid ?? []).map((g) => g.id),
    item.guid,
  ].filter((guid): guid is string => Boolean(guid))
}

export function extractTvdbId(guids: string[]): string | null {
  for (const guid of guids) {
    const match = guid.match(/^tvdb:\/\/(\d+)/) ?? guid.match(/^com\.plexapp\.agents\.thetvdb:\/\/(\d+)/)
    if (match) return match[1]
  }
  return null
}

export async function getConfiguredPlexClient(): Promise<PlexClient | null> {
  const [baseUrl, token] = await Promise.all([getEffectivePlexBaseUrl(), getEffectivePlexToken()])
  if (!baseUrl || !token) return null
  return new PlexClient(baseUrl, token)
}

export async function getConfiguredPlexDiscoveryOptions() {
  const [sectionKeys, accountId] = await Promise.all([getConfiguredPlexLibrarySections(), getConfiguredPlexAccountId()])
  return { sectionKeys, accountId }
}
