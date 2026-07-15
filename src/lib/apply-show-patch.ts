// The PATCH route returns the raw AnimeShow DB row. Client state carries
// computed/enriched fields (watchedCount, airedCount, seasons, voiceCast, …)
// that the row does not contain, so never replace state wholesale. Merge only
// the fields PATCH /api/watchlist/[id] is allowed to change.
const PATCH_MUTABLE_SHOW_FIELDS = [
  'status',
  'rating',
  'notes',
  'airingStatus',
  'nextEpisodeNum',
  'nextAiringAt',
  'lastEpisodeNum',
  'lastAiredAt',
  'airingRefreshedAt',
  'upToDateEpisodeNum',
  'upToDateAiredAt',
  'upToDateStale',
] as const

export function applyShowPatch<T extends object>(
  current: T,
  updated: Record<string, unknown>,
): T {
  const merged: Record<string, unknown> = { ...(current as Record<string, unknown>) }

  for (const field of PATCH_MUTABLE_SHOW_FIELDS) {
    if (Object.prototype.hasOwnProperty.call(updated, field)) {
      merged[field] = updated[field]
    }
  }

  return merged as T
}
