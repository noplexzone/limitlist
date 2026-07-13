import type { MetadataVoiceCastGroup } from './providers'

const JIKAN_BASE = 'https://api.jikan.moe/v4'

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

export async function fetchJikanVoiceCast(
  titles: Array<string | null | undefined>,
  year?: number | null
): Promise<MetadataVoiceCastGroup | undefined> {
  const usableTitles = titles.filter((title): title is string => Boolean(title && title.trim()))
  if (usableTitles.length === 0) return undefined

  const search = new URL(`${JIKAN_BASE}/anime`)
  search.searchParams.set('q', usableTitles[0])
  search.searchParams.set('sfw', 'true')
  search.searchParams.set('limit', '5')

  const searchRes = await fetch(search.toString(), { next: { revalidate: 86400 } })
  if (!searchRes.ok) return undefined
  const searchData: JikanAnimeSearchResponse = await searchRes.json()
  const best = (searchData.data ?? [])
    .map((item) => ({ item, score: scoreAnimeMatch(item, usableTitles, year) }))
    .sort((a, b) => b.score - a.score)[0]
  if (!best || best.score < 4) return undefined

  const charactersRes = await fetch(`${JIKAN_BASE}/anime/${best.item.mal_id}/characters`, { next: { revalidate: 86400 } })
  if (!charactersRes.ok) return undefined
  const charactersData: JikanCharactersResponse = await charactersRes.json()
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
