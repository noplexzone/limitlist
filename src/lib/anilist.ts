import type { MetadataCastMember, MetadataRelatedItem, MetadataResult, MetadataSeasonSummary, MetadataVoiceCastGroup } from './providers'
import { getAnimeRootTitle, normalizeAnimeTitle, titleCandidates } from './anime-title'

const ANILIST_GRAPHQL = 'https://graphql.anilist.co'

export type AniListFeedType = 'popular' | 'trending' | 'top-rated' | 'upcoming'

type AniListFormat = 'TV' | 'TV_SHORT' | 'MOVIE' | 'SPECIAL' | 'OVA' | 'ONA' | 'MUSIC' | string

type AniListRelationType = 'ADAPTATION' | 'PREQUEL' | 'SEQUEL' | 'PARENT' | 'SIDE_STORY' | 'CHARACTER' | 'SUMMARY' | 'ALTERNATIVE' | 'SPIN_OFF' | 'OTHER' | string

interface AniListDate {
  year?: number | null
  month?: number | null
  day?: number | null
}

interface AniListTitle {
  romaji?: string | null
  english?: string | null
  native?: string | null
}

interface AniListImage {
  large?: string | null
  extraLarge?: string | null
  medium?: string | null
}

export interface AniListMedia {
  id: number
  idMal?: number | null
  title: AniListTitle
  description?: string | null
  coverImage?: AniListImage | null
  bannerImage?: string | null
  startDate?: AniListDate | null
  seasonYear?: number | null
  episodes?: number | null
  format?: AniListFormat | null
  status?: string | null
  genres?: string[] | null
  averageScore?: number | null
  popularity?: number | null
  characters?: {
    edges?: Array<{
      node?: { name?: { full?: string | null } | null } | null
      voiceActors?: Array<{ name?: { full?: string | null; native?: string | null } | null; languageV2?: string | null }> | null
    }> | null
  } | null
}

export interface AniListDetailMedia extends AniListMedia {
  relations?: {
    edges?: Array<{
      relationType?: AniListRelationType | null
      node?: AniListMedia & { type?: string | null }
    }> | null
  } | null
  recommendations?: {
    nodes?: Array<{
      mediaRecommendation?: AniListMedia | null
    }> | null
  } | null
  characters?: {
    edges?: Array<{
      node?: { name?: { full?: string | null } | null; image?: AniListImage | null } | null
      voiceActors?: Array<{ name?: { full?: string | null; native?: string | null } | null; image?: AniListImage | null; languageV2?: string | null }> | null
    }> | null
  } | null
}

interface AniListResponse {
  data?: {
    Page?: {
      media?: AniListMedia[]
      pageInfo?: { hasNextPage?: boolean | null } | null
    }
  }
  errors?: Array<{ message: string }>
}

export interface AniListDiscoverPage {
  media: AniListMedia[]
  hasNextPage: boolean
}

const MEDIA_FIELDS = `
  id
  idMal
  title { romaji english native }
  description(asHtml: false)
  coverImage { large extraLarge medium }
  bannerImage
  startDate { year month day }
  seasonYear
  episodes
  format
  status
  genres
  averageScore
  popularity
`

const MEDIA_BY_ID_QUERY = `
  query AnimeById($id: Int!) {
    Media(id: $id, type: ANIME) {
      ${MEDIA_FIELDS}
    }
  }
`

const DETAIL_QUERY = `
  query AnimeDetail($id: Int!) {
    Media(id: $id, type: ANIME) {
      ${MEDIA_FIELDS}
      relations {
        edges {
          relationType
          node {
            type
            ${MEDIA_FIELDS}
            characters(page: 1, perPage: 4, sort: [ROLE, RELEVANCE, ID]) {
              edges {
                node { name { full } }
                voiceActors { name { full native } languageV2 }
              }
            }
          }
        }
      }
      recommendations(page: 1, perPage: 15, sort: RATING_DESC) {
        nodes {
          mediaRecommendation {
            ${MEDIA_FIELDS}
          }
        }
      }
      characters(page: 1, perPage: 24, sort: [ROLE, RELEVANCE, ID]) {
        edges {
          node { name { full } image { large medium } }
          voiceActors { name { full native } image { large medium } languageV2 }
        }
      }
    }
  }
`

const SEARCH_DETAIL_QUERY = `
  query SearchAnime($search: String!, $page: Int!, $perPage: Int!) {
    Page(page: $page, perPage: $perPage) {
      media(type: ANIME, search: $search, sort: SEARCH_MATCH, isAdult: false) {
        ${MEDIA_FIELDS}
      }
    }
  }
`

const DISCOVER_QUERY = `
  query DiscoverAnime($page: Int!, $perPage: Int!, $sort: [MediaSort], $status: MediaStatus) {
    Page(page: $page, perPage: $perPage) {
      pageInfo { hasNextPage }
      media(type: ANIME, sort: $sort, isAdult: false, status: $status) {
        ${MEDIA_FIELDS}
      }
    }
  }
`

export function stripAniListHtml(value?: string | null): string | undefined {
  if (!value) return undefined
  return value
    .replace(/<br\s*\/?\s*>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\n{3,}/g, '\n\n')
    .trim() || undefined
}

async function postAniList<T>(query: string, variables: Record<string, unknown>, timeoutMs = 3500): Promise<T | null> {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), timeoutMs)
  try {
    const res = await fetch(ANILIST_GRAPHQL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({ query, variables }),
      next: { revalidate: 3600 },
      signal: controller.signal,
    })
    if (!res.ok) return null
    const data = await res.json() as T & { errors?: Array<{ message: string }> }
    if (data.errors?.length) return null
    return data
  } catch {
    return null
  } finally {
    clearTimeout(timeout)
  }
}

export function getAniListDisplayTitle(media: AniListMedia): string {
  return media.title.english || media.title.romaji || media.title.native || `AniList #${media.id}`
}

export function getAniListOriginalTitle(media: AniListMedia): string | undefined {
  const display = getAniListDisplayTitle(media)
  const original = media.title.romaji || media.title.native || undefined
  return original && original !== display ? original : undefined
}

export function getAniListStartDate(media: AniListMedia): string | undefined {
  const year = media.startDate?.year ?? media.seasonYear
  if (!year) return undefined
  const month = String(media.startDate?.month ?? 1).padStart(2, '0')
  const day = String(media.startDate?.day ?? 1).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export function getAniListYear(media: AniListMedia): number | null {
  return media.startDate?.year ?? media.seasonYear ?? null
}

export function getAniListTitles(media: AniListMedia): string[] {
  return [media.title.english, media.title.romaji, media.title.native].filter(Boolean) as string[]
}

function mediaDateNumber(media: AniListMedia): number {
  const y = media.startDate?.year ?? media.seasonYear ?? 9999
  const m = media.startDate?.month ?? 12
  const d = media.startDate?.day ?? 31
  return y * 10000 + m * 100 + d
}

function buildRelatedCast(media: AniListMedia): string[] | undefined {
  const cast: string[] = []
  const seen = new Set<string>()

  for (const edge of media.characters?.edges ?? []) {
    const character = edge.node?.name?.full
    const actor =
      edge.voiceActors?.find((voiceActor) => voiceActor.languageV2?.toLowerCase() === 'japanese') ??
      edge.voiceActors?.find((voiceActor) => voiceActor.languageV2?.toLowerCase() === 'english') ??
      edge.voiceActors?.[0]
    const actorName = actor?.name?.full
    const label = actorName && character ? `${actorName} as ${character}` : actorName ?? character
    if (!label || seen.has(label)) continue
    seen.add(label)
    cast.push(label)
    if (cast.length >= 4) break
  }

  return cast.length ? cast : undefined
}

function asRelatedItem(media: AniListMedia): MetadataRelatedItem {
  return {
    providerId: String(media.id),
    providerName: 'anilist',
    title: getAniListDisplayTitle(media),
    originalTitle: getAniListOriginalTitle(media),
    overview: media.description ?? undefined,
    posterUrl: media.coverImage?.extraLarge ?? media.coverImage?.large ?? undefined,
    firstAiredAt: getAniListStartDate(media),
    cast: buildRelatedCast(media),
  }
}

function synthesizeEpisodes(count: number | null | undefined) {
  if (!count || count < 1 || count > 200) return undefined
  return Array.from({ length: count }, (_, index) => ({
    episodeNumber: index + 1,
    name: `Episode ${index + 1}`,
  }))
}

function buildSeasonSummary(media: AniListMedia, index: number): MetadataSeasonSummary {
  return {
    seasonNumber: index,
    name: getAniListDisplayTitle(media),
    episodeCount: media.episodes ?? null,
    airDate: getAniListStartDate(media) ?? null,
    overview: media.description ?? null,
    episodes: synthesizeEpisodes(media.episodes),
  }
}

const SERIES_FORMATS = new Set(['TV', 'TV_SHORT'])
const CHILD_FORMATS = new Set(['MOVIE', 'SPECIAL', 'OVA', 'ONA'])
const STRICT_CHILD_RELATIONS = new Set(['PREQUEL', 'SEQUEL', 'SIDE_STORY', 'SPIN_OFF', 'SUMMARY'])

function uniqueAnimeRelations(media: AniListDetailMedia): Array<{ relationType: AniListRelationType; node: AniListMedia }> {
  const seen = new Set<string>()
  const items: Array<{ relationType: AniListRelationType; node: AniListMedia }> = []
  for (const edge of media.relations?.edges ?? []) {
    const node = edge.node
    if (!node || node.type !== 'ANIME' || seen.has(String(node.id))) continue
    seen.add(String(node.id))
    items.push({ relationType: edge.relationType ?? 'OTHER', node })
  }
  return items
}

export function buildAniListSeasons(media: AniListDetailMedia): MetadataSeasonSummary[] {
  const relatedSeries = uniqueAnimeRelations(media)
    .filter(({ node }) => SERIES_FORMATS.has(String(node.format)))
    .map(({ node }) => node)
  const all = [media, ...relatedSeries]
  const deduped = Array.from(new Map(all.map((item) => [item.id, item])).values())
    .sort((a, b) => mediaDateNumber(a) - mediaDateNumber(b))
  return deduped.map((item, index) => buildSeasonSummary(item, index + 1))
}

export function buildAniListRelatedMovies(media: AniListDetailMedia, limit = 8): MetadataRelatedItem[] {
  return uniqueAnimeRelations(media)
    .filter(({ relationType, node }) => CHILD_FORMATS.has(String(node.format)) && STRICT_CHILD_RELATIONS.has(relationType))
    .sort((a, b) => mediaDateNumber(a.node) - mediaDateNumber(b.node))
    .slice(0, limit)
    .map(({ node }) => asRelatedItem(node))
}

export function buildAniListRecommendations(media: AniListDetailMedia, limit = 15): MetadataRelatedItem[] {
  const seen = new Set<string>()
  const items: MetadataRelatedItem[] = []
  for (const node of media.recommendations?.nodes ?? []) {
    const rec = node.mediaRecommendation
    if (!rec || seen.has(String(rec.id))) continue
    if (rec.format && !['TV', 'TV_SHORT', 'MOVIE', 'OVA', 'ONA', 'SPECIAL'].includes(String(rec.format))) continue
    seen.add(String(rec.id))
    items.push(asRelatedItem(rec))
    if (items.length >= limit) break
  }
  return items
}

export function buildAniListVoiceCast(media: AniListDetailMedia): MetadataVoiceCastGroup {
  const english: MetadataCastMember[] = []
  const japanese: MetadataCastMember[] = []
  const seen = new Set<string>()
  for (const edge of media.characters?.edges ?? []) {
    const character = edge.node?.name?.full
    const characterImageUrl = edge.node?.image?.large ?? edge.node?.image?.medium ?? undefined
    for (const actor of edge.voiceActors ?? []) {
      const name = actor.name?.full
      if (!name) continue
      const lang = actor.languageV2?.toLowerCase()
      const target = lang === 'english' ? english : lang === 'japanese' ? japanese : null
      if (!target) continue
      const key = `${lang}:${name}:${character ?? ''}`
      if (seen.has(key)) continue
      seen.add(key)
      target.push({
        name,
        originalName: actor.name?.native ?? undefined,
        character: character ?? undefined,
        profileUrl: actor.image?.large ?? actor.image?.medium ?? undefined,
        characterImageUrl,
      })
    }
  }
  return { english: english.slice(0, 24), japanese: japanese.slice(0, 24) }
}

export function mergeVoiceCast(primary?: MetadataVoiceCastGroup | null, fallback?: MetadataVoiceCastGroup | null): MetadataVoiceCastGroup | undefined {
  const english = primary?.english?.length ? primary.english : fallback?.english ?? []
  const japanese = primary?.japanese?.length ? primary.japanese : fallback?.japanese ?? []
  if (!english.length && !japanese.length) return undefined
  return { english, japanese }
}

export function mapAniListDetailToMetadata(media: AniListDetailMedia): MetadataResult {
  const seasons = buildAniListSeasons(media)
  return {
    providerId: String(media.id),
    providerName: 'anilist',
    title: getAniListDisplayTitle(media),
    originalTitle: getAniListOriginalTitle(media),
    overview: media.description ?? undefined,
    posterUrl: media.coverImage?.extraLarge ?? media.coverImage?.large ?? undefined,
    firstAiredAt: getAniListStartDate(media),
    genres: media.genres ?? undefined,
    episodesTotal: seasons.reduce((sum, season) => sum + (season.episodeCount ?? 0), 0) || media.episodes || undefined,
    voteAverage: media.averageScore ? media.averageScore / 10 : undefined,
    popularity: media.popularity ?? undefined,
    airingStatus: media.status ?? undefined,
    voiceCast: buildAniListVoiceCast(media),
    seasons,
    recommendations: buildAniListRecommendations(media),
    relatedMovies: buildAniListRelatedMovies(media),
  }
}

export async function fetchAniListDiscover(
  type: AniListFeedType,
  page = 1,
  perPage = 42
): Promise<AniListDiscoverPage> {
  let sort: string[]
  let status: string | undefined
  if (type === 'trending') {
    sort = ['TRENDING_DESC']
  } else if (type === 'top-rated') {
    sort = ['SCORE_DESC']
  } else if (type === 'upcoming') {
    sort = ['POPULARITY_DESC']
    status = 'NOT_YET_RELEASED'
  } else {
    sort = ['POPULARITY_DESC']
  }
  const data = await postAniList<AniListResponse>(DISCOVER_QUERY, { page, perPage, sort, status }, 5000)
  if (!data) throw new Error('AniList request failed')
  return {
    media: data.data?.Page?.media ?? [],
    hasNextPage: Boolean(data.data?.Page?.pageInfo?.hasNextPage),
  }
}

export async function fetchAniListMediaById(id: string): Promise<AniListMedia | null> {
  const numericId = Number(id)
  if (!Number.isInteger(numericId) || numericId <= 0) return null
  const data = await postAniList<{ data?: { Media?: AniListMedia | null }; errors?: Array<{ message: string }> }>(MEDIA_BY_ID_QUERY, { id: numericId }, 3500)
  return data?.data?.Media ?? null
}

export async function fetchAniListDetailById(id: string | number): Promise<AniListDetailMedia | null> {
  const numericId = Number(id)
  if (!Number.isInteger(numericId) || numericId <= 0) return null
  const data = await postAniList<{ data?: { Media?: AniListDetailMedia | null }; errors?: Array<{ message: string }> }>(DETAIL_QUERY, { id: numericId }, 4000)
  return data?.data?.Media ?? null
}

function scoreAniListSearchMatch(media: AniListMedia, candidates: string[], year?: number | null): number {
  const normalizedCandidates = candidates.map(normalizeAnimeTitle).filter(Boolean)
  const rootCandidates = candidates.map(getAnimeRootTitle).map(normalizeAnimeTitle).filter(Boolean)
  const titles = getAniListTitles(media)
  const normalizedTitles = titles.map(normalizeAnimeTitle).filter(Boolean)
  const rootTitles = titles.map(getAnimeRootTitle).map(normalizeAnimeTitle).filter(Boolean)
  const rawCandidates = new Set(candidates.map((title) => title.trim().toLowerCase()).filter(Boolean))
  let score = 0
  for (const title of titles) if (rawCandidates.has(title.trim().toLowerCase())) score += 10
  for (const title of normalizedTitles) if (normalizedCandidates.includes(title)) score += 10
  for (const title of rootTitles) if (rootCandidates.includes(title)) score += 6
  if (SERIES_FORMATS.has(String(media.format))) score += 3
  if (year) {
    const mediaYear = getAniListYear(media)
    if (mediaYear) {
      const delta = Math.abs(mediaYear - year)
      if (delta === 0) score += 4
      else if (delta <= 1) score += 2
      else if (delta >= 5) score -= 3
    }
  }
  return score
}

export async function findAniListDetailForAnime(titles: Array<string | null | undefined>, year?: number | null): Promise<AniListDetailMedia | null> {
  const candidates = titleCandidates(...titles)
  if (!candidates.length) return null
  let best: { media: AniListMedia; score: number } | null = null
  for (const query of candidates.slice(0, 6)) {
    const data = await postAniList<{ data?: { Page?: { media?: AniListMedia[] | null } | null }; errors?: Array<{ message: string }> }>(
      SEARCH_DETAIL_QUERY,
      { search: query, page: 1, perPage: 8 },
      3500
    )
    for (const media of data?.data?.Page?.media ?? []) {
      const score = scoreAniListSearchMatch(media, candidates, year)
      if (!best || score > best.score) best = { media, score }
    }
    if (best && best.score >= 13) break
  }
  const matched = Boolean(best && best.score >= 5)
  if (process.env.NODE_ENV !== 'production') {
    console.info('[anilist] detail match', {
      titles: titles.filter(Boolean),
      candidates,
      year,
      matched,
      bestScore: best?.score ?? null,
      bestId: best?.media.id ?? null,
      bestTitles: best ? getAniListTitles(best.media) : [],
    })
  }
  if (!best || best.score < 5) return null
  return fetchAniListDetailById(best.media.id)
}
