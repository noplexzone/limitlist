const EXPLICIT_SEASON_PATTERNS: RegExp[] = [
  /\b(?:season|series)\s*\d+\b/gi,
  /\b\d+(?:st|nd|rd|th)\s+season\b/gi,
  /\bpart\s*\d+\b/gi,
  /\bcour\s*\d+\b/gi,
  /\bfinal\s+season\b/gi,
  /\bthe\s+final\s+season\b/gi,
]

const ARC_SUFFIX_PATTERNS: RegExp[] = [
  /\s+[-–—:]\s+.*\b(?:arc|season|part|cour)\b.*$/i,
  /\s+\b(?:mugen train|entertainment district|swordsmith village|hashira training)\s+arc\b.*$/i,
  /\s+\b[a-z0-9][a-z0-9'’ -]{1,60}\s+arc\b.*$/i,
]

export function normalizeAnimeTitle(title?: string | null): string {
  if (!title) return ''

  return title
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/&/g, ' and ')
    .replace(/['’]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .replace(/\s+/g, ' ')
}

export function isLikelySeasonSpecificTitle(title?: string | null): boolean {
  if (!title) return false
  return (
    EXPLICIT_SEASON_PATTERNS.some((pattern) => {
      pattern.lastIndex = 0
      return pattern.test(title)
    }) ||
    ARC_SUFFIX_PATTERNS.some((pattern) => pattern.test(title))
  )
}

export function getAnimeRootTitle(title?: string | null): string {
  if (!title) return ''

  let value = title
    .replace(/\([^)]*\)/g, ' ')
    .replace(/\[[^\]]*\]/g, ' ')

  for (const pattern of ARC_SUFFIX_PATTERNS) {
    value = value.replace(pattern, ' ')
  }
  for (const pattern of EXPLICIT_SEASON_PATTERNS) {
    pattern.lastIndex = 0
    value = value.replace(pattern, ' ')
  }

  return normalizeAnimeTitle(value)
}

export function titleCandidates(...titles: Array<string | null | undefined>): string[] {
  const seen = new Set<string>()
  const roots: string[] = []
  const rawTitles: string[] = []

  for (const title of titles) {
    if (!title) continue

    const raw = title.trim()
    const root = getAnimeRootTitle(raw)
    const normalizedRaw = normalizeAnimeTitle(raw)

    if (root && !seen.has(root)) {
      seen.add(root)
      roots.push(root)
    }
    if (normalizedRaw && normalizedRaw !== root && !seen.has(normalizedRaw)) {
      seen.add(normalizedRaw)
      rawTitles.push(raw)
    }
  }

  // Root titles first: Discover should link AniList season entries to TMDB's
  // whole-show records before considering raw season/arc-specific titles.
  return [...roots, ...rawTitles]
}
