export function formatEpisodeLabel(
  nextSeasonNum: number | null | undefined,
  nextEpisodeNum: number,
  nextEpisodeName: string | null | undefined
): string {
  const epPart = `Ep ${nextEpisodeNum}`
  const namePart = nextEpisodeName ? ` — ${nextEpisodeName}` : ''
  return nextSeasonNum != null
    ? `Up next: S${nextSeasonNum} · ${epPart}${namePart}`
    : `Up next: ${epPart}${namePart}`
}
