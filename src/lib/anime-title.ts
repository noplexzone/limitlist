const SEASON_PATTERNS: RegExp[] = [
  /\b(?:season|series)\s*\d+\b/gi,
  /\b\d+(?:st|nd|rd|th)\s+season\b/gi,
  /\bpart\s*\d+\b/gi,
  /\bcour\s*\d+\b/gi,
  /\bfinal\s+season\b/gi,
  /\bthe\s+final\s+season\b/gi,
  /\b[ivxlcdm]+\b$/gi,
  /\b\d+\b$/g,
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

export function getAnimeRootTitle(title?: string | null): string {
  if (!title) return ''

  let value = title
    .replace(/\([^)]*\)/g, ' ')
    .replace(/\[[^\]]*\]/g, ' ')
    .replace(/\s+[-–—:]\s+(?:season|part|cour|final)\b.*$/i, ' ')

  for (const pattern of SEASON_PATTERNS) {
    value = value.replace(pattern, ' ')
  }

  return normalizeAnimeTitle(value)
}

export function titleCandidates(...titles: Array<string | null | undefined>): string[] {
  const seen = new Set<string>()
  const candidates: string[] = []

  for (const title of titles) {
    if (!title) continue

    const raw = title.trim()
    const root = getAnimeRootTitle(raw)
    for (const candidate of [raw, root]) {
      const normalized = normalizeAnimeTitle(candidate)
      if (!normalized || seen.has(normalized)) continue
      seen.add(normalized)
      candidates.push(candidate)
    }
  }

  return candidates
}
