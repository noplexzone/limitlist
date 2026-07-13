const ANILIST_GRAPHQL = 'https://graphql.anilist.co'

type AniListFeedType = 'popular' | 'trending'

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

export interface AniListMedia {
  id: number
  idMal?: number | null
  title: AniListTitle
  description?: string | null
  coverImage?: { large?: string | null; extraLarge?: string | null } | null
  startDate?: AniListDate | null
  seasonYear?: number | null
  episodes?: number | null
  genres?: string[] | null
  averageScore?: number | null
  popularity?: number | null
}

interface AniListResponse {
  data?: {
    Page?: {
      media?: AniListMedia[]
    }
  }
  errors?: Array<{ message: string }>
}

const DISCOVER_QUERY = `
  query DiscoverAnime($page: Int!, $perPage: Int!, $sort: [MediaSort]) {
    Page(page: $page, perPage: $perPage) {
      media(type: ANIME, sort: $sort, isAdult: false) {
        id
        idMal
        title { romaji english native }
        description(asHtml: false)
        coverImage { large extraLarge }
        startDate { year month day }
        seasonYear
        episodes
        genres
        averageScore
        popularity
      }
    }
  }
`

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

export async function fetchAniListDiscover(
  type: AniListFeedType,
  page = 1,
  perPage = 42
): Promise<AniListMedia[]> {
  const sort = type === 'trending' ? ['TRENDING_DESC'] : ['POPULARITY_DESC']

  const res = await fetch(ANILIST_GRAPHQL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify({
      query: DISCOVER_QUERY,
      variables: { page, perPage, sort },
    }),
    next: { revalidate: 3600 },
  })

  if (!res.ok) {
    throw new Error(`AniList request failed: ${res.status} ${res.statusText}`)
  }

  const data: AniListResponse = await res.json()
  if (data.errors?.length) {
    throw new Error(data.errors.map((e) => e.message).join('; '))
  }

  return data.data?.Page?.media ?? []
}
