import type { MetadataVoiceCastGroup } from './providers'

const JIKAN_BASE = 'https://api.jikan.moe/v4'

async function fetchJikanJson<T>(url: string, timeoutMs = 4000): Promise<T | null> {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), timeoutMs)
  try {
    const res = await fetch(url, { next: { revalidate: 86400 }, signal: controller.signal })
    if (!res.ok) return null
    return (await res.json()) as T
  } catch (err) {
    if (process.env.NODE_ENV !== 'production') {
      if (err instanceof Error && err.name === 'AbortError') {
        console.warn('[jikan] timeout fetching:', url)
      } else {
        console.warn('[jikan] fetch error:', url, err)
      }
    }
    return null
  } finally {
    clearTimeout(timeout)
  }
}

interface JikanAnimeSearchResponse {
  data?: Array<{ mal_id: number; title?: string; title_english?: string; title_japanese?: string; year?: number | null }>
}

interface JikanCharactersResponse {
  data?: Array<{
    character?: { name?: string; images?: { jpg?: { image_url?: string | null } } }
    voice_actors?: Array<{
      language?: string
      person?: { name?: string; images?: { jpg?: { image_url?: string | null } } }
    }>
  }>
}

function normalize(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim()
}

function scoreAnimeMatch(item: NonNullable<JikanAnimeSearchResponse['data']>[number], titles: string[], year?: number | null) {
  const itemTitles = [item.title, item.title_english, item.title_japanese].filter(Boolean).map((t) => normalize(String(t)))
  const queryTitles = titles.filter(Boolean).map(normalize)
  let score = 0
  for (const itemTitle of itemTitles) {
    for (const queryTitle of queryTitles) {
      if (!itemTitle || !queryTitle) continue
      if (itemTitle === queryTitle) score += 10
      else if (itemTitle.includes(queryTitle) || queryTitle.includes(itemTitle)) score += 4
    }
  }
  if (year && item.year && Math.abs(item.year - year) <= 1) score += 1
  return score
}

const SCORE_THRESHOLD = 4

export async function fetchJikanVoiceCast(
  titles: Array<string | null | undefined>,
  year?: number | null
): Promise<MetadataVoiceCastGroup | undefined> {
  const usableTitles = titles.filter((title): title is string => Boolean(title && title.trim()))
  if (usableTitles.length === 0) return undefined

  type BestCandidate = { item: NonNullable<JikanAnimeSearchResponse['data']>[number]; score: number }
  let best: BestCandidate | undefined

  // Try up to 2 candidate titles, stopping early when a confident match is found
  for (const candidateTitle of usableTitles.slice(0, 2)) {
    const search = new URL(`${JIKAN_BASE}/anime`)
    search.searchParams.set('q', candidateTitle)
    search.searchParams.set('sfw', 'true')
    search.searchParams.set('limit', '5')

    const searchData = await fetchJikanJson<JikanAnimeSearchResponse>(search.toString())
    if (!searchData) continue

    const candidate = (searchData.data ?? [])
      .map((item) => ({ item, score: scoreAnimeMatch(item, usableTitles, year) }))
      .sort((a, b) => b.score - a.score)[0]

    if (candidate && (!best || candidate.score > best.score)) {
      best = candidate
    }

    if (best && best.score >= SCORE_THRESHOLD) break
  }

  if (process.env.NODE_ENV !== 'production') {
    console.log(`[jikan] title="${usableTitles[0]}" best score=${best?.score ?? 0}`)
    if (!best || best.score < SCORE_THRESHOLD) {
      console.warn(`[jikan] low/no match for: ${usableTitles.join(' | ')}`)
    }
  }

  if (!best || best.score < SCORE_THRESHOLD) return undefined

  const charactersData = await fetchJikanJson<JikanCharactersResponse>(`${JIKAN_BASE}/anime/${best.item.mal_id}/characters`, 4000)
  if (!charactersData) return undefined
  const groups: MetadataVoiceCastGroup = { english: [], japanese: [] }

  for (const row of charactersData.data ?? []) {
    const character = row.character?.name
    if (!character) continue
    const characterImageUrl = row.character?.images?.jpg?.image_url ?? undefined
    for (const actor of row.voice_actors ?? []) {
      const language = actor.language?.toLowerCase()
      const target = language === 'english' ? groups.english : language === 'japanese' ? groups.japanese : null
      if (!target || !actor.person?.name) continue
      target.push({
        name: actor.person.name,
        character,
        profileUrl: actor.person.images?.jpg?.image_url ?? characterImageUrl,
        characterImageUrl,
      })
    }
  }

  groups.english = groups.english.slice(0, 24)
  groups.japanese = groups.japanese.slice(0, 24)
  return groups.english.length || groups.japanese.length ? groups : undefined
}
