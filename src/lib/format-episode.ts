export function formatEpisodeLabel(
  nextSeasonNum: number | null | undefined,
  nextEpisodeNum: number,
  nextEpisodeName: string | null | undefined,
  compact?: boolean
): string {
  const epPart = nextSeasonNum != null ? `S${nextSeasonNum}·E${nextEpisodeNum}` : `Ep ${nextEpisodeNum}`
  const namePart = nextEpisodeName ? ` — ${nextEpisodeName}` : ''
  return compact ? `${epPart}${namePart}` : `Up next: ${epPart}${namePart}`
}
