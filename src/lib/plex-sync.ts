import { prisma } from './db'
import { getConfiguredPlexClient, getConfiguredPlexDiscoveryOptions, type PlexEpisode, type PlexWatchedShow } from './plex'
import { getConfiguredTvdbProvider } from './tvdb'
import { getConfiguredPlexAutoStatus, getConfiguredPlexWatchedThreshold, type PlexWatchedThreshold } from './settings'
import { importTvdbShowToWatchlist } from './watchlist-import'
import type { ShowStatus } from './status'
import type { MetadataSeasonSummary } from './providers'

export interface PlexSyncResult {
  showId: string
  title: string
  success: boolean
  skipped: boolean
  skipReason?: string
  error?: string
  warning?: string
  matched: number
  unmatched: number
  unmatchedSamples: string[]
  watchedTotal: number
}

export interface PlexSyncAllResult {
  results: PlexSyncResult[]
  totalMatched: number
  totalUnmatched: number
  totalWatched: number
  failedCount: number
}

export interface PlexDiscoveryShow {
  ratingKey: string
  title: string
  year: number | null
  tvdbId: string | null
  viewedLeafCount: number
  leafCount: number
  showOrdering: string | null
  librarySectionKey: string
  alreadyTracked: boolean
  trackedShowId: string | null
  warning?: string
}

export interface PlexDiscoveryResult {
  shows: PlexDiscoveryShow[]
}

export interface PlexImportResult {
  ratingKey: string
  title: string
  status: 'imported' | 'skipped' | 'unresolved' | 'failed'
  showId?: string
  tvdbId?: string | null
  warning?: string
  error?: string
  sync?: PlexSyncResult
}

interface MatchedEpisode {
  seasonNumber: number
  episodeNumber: number
  plexRatingKey: string
  watched: boolean
  watchedAt: Date | null
  plexTitle: string
}

interface MatchResult {
  matched: MatchedEpisode[]
  unmatched: Array<{ title: string; parentIndex: number; index: number }>
}

// Allowed: null/undefined/empty string, 'None', 'aired'.
// Any other explicit non-aired value is rejected.
export function _isAllowedShowOrderingForTest(ordering: string | null | undefined): boolean {
  if (ordering == null || ordering === '') return true
  const normalized = ordering.toLowerCase()
  const incompatibleProviderAiring = ['t', 'mdbairing'].join('')
  if (['none', 'aired'].includes(normalized)) return true
  if (['absolute', 'dvd', incompatibleProviderAiring].includes(normalized)) return false
  return false
}

function normTitle(title: string): string {
  return title.toLowerCase().replace(/[^a-z0-9]/g, '')
}

// Match Plex episodes to TVDB episodes.
// Priority: (1) TVDB GUID from Plex guids[], (2) parentIndex/index S/E, (3) air-date + title.
// Plex specials (parentIndex <= 0) are skipped.
export function _matchPlexEpisodesForTest(
  plexEpisodes: PlexEpisode[],
  seasons: MetadataSeasonSummary[],
  threshold: PlexWatchedThreshold = 'viewcount'
): MatchResult {
  // guidMap: providerEpisodeId -> { seasonNumber, episodeNumber }
  const guidMap = new Map<string, { seasonNumber: number; episodeNumber: number }>()
  // seMap: "S:E" -> true (membership check)
  const seSet = new Set<string>()
  // airDateMap: "YYYY-MM-DD" -> [{ seasonNumber, episodeNumber, name }]
  const airDateMap = new Map<string, Array<{ seasonNumber: number; episodeNumber: number; name: string }>>()

  for (const season of seasons) {
    for (const ep of season.episodes ?? []) {
      if (ep.providerEpisodeId) {
        guidMap.set(ep.providerEpisodeId, {
          seasonNumber: season.seasonNumber,
          episodeNumber: ep.episodeNumber,
        })
      }
      seSet.add(`${season.seasonNumber}:${ep.episodeNumber}`)
      if (ep.airDate) {
        const dateKey = ep.airDate.slice(0, 10)
        const list = airDateMap.get(dateKey) ?? []
        list.push({ seasonNumber: season.seasonNumber, episodeNumber: ep.episodeNumber, name: ep.name })
        airDateMap.set(dateKey, list)
      }
    }
  }

  const matched: MatchedEpisode[] = []
  const unmatched: Array<{ title: string; parentIndex: number; index: number }> = []

  for (const plexEp of plexEpisodes) {
    if (plexEp.parentIndex <= 0) continue

    const partialWatched = threshold === 'partial' && plexEp.duration > 0 && plexEp.viewOffset / plexEp.duration >= 0.9
    const isWatched = plexEp.watched || plexEp.viewCount > 0 || partialWatched
    const watchedAt = plexEp.lastViewedAt != null ? new Date(plexEp.lastViewedAt * 1000) : null
    let matchedKey: { seasonNumber: number; episodeNumber: number } | null = null

    // 1. GUID match: tvdb://{providerEpisodeId}
    for (const guid of plexEp.guids) {
      if (guid.startsWith('tvdb://')) {
        const found = guidMap.get(guid.slice(7))
        if (found) {
          matchedKey = found
          break
        }
      }
    }

    // 2. S/E match
    if (!matchedKey && seSet.has(`${plexEp.parentIndex}:${plexEp.index}`)) {
      matchedKey = { seasonNumber: plexEp.parentIndex, episodeNumber: plexEp.index }
    }

    // 3. Air-date + normalized-title fallback
    if (!matchedKey && plexEp.originallyAvailableAt) {
      const dateKey = plexEp.originallyAvailableAt.slice(0, 10)
      const candidates = airDateMap.get(dateKey)
      if (candidates) {
        const normalizedPlexTitle = normTitle(plexEp.title)
        const byTitle = candidates.find((c) => normTitle(c.name) === normalizedPlexTitle)
        if (byTitle) {
          matchedKey = { seasonNumber: byTitle.seasonNumber, episodeNumber: byTitle.episodeNumber }
        } else if (candidates.length === 1) {
          matchedKey = { seasonNumber: candidates[0].seasonNumber, episodeNumber: candidates[0].episodeNumber }
        }
      }
    }

    if (matchedKey) {
      matched.push({
        seasonNumber: matchedKey.seasonNumber,
        episodeNumber: matchedKey.episodeNumber,
        plexRatingKey: plexEp.ratingKey,
        watched: isWatched,
        watchedAt,
        plexTitle: plexEp.title,
      })
    } else {
      unmatched.push({ title: plexEp.title, parentIndex: plexEp.parentIndex, index: plexEp.index })
    }
  }

  return { matched, unmatched }
}

// Compute whether all aired TVDB episodes are covered by watched EpisodeWatch rows.
// Returns the newest watched aired episode for use as the UP_TO_DATE baseline.
export function _computeUpToDateStatus(
  episodeWatches: Array<{ seasonNumber: number; episodeNumber: number; watched: boolean }>,
  seasons: MetadataSeasonSummary[],
  now: Date = new Date()
): {
  allAiredWatched: boolean
  airedCount: number
  watchedAiredCount: number
  newestWatchedEpisode: { episodeNumber: number; airDate: string } | null
} {
  const watchedSet = new Set<string>()
  for (const w of episodeWatches) {
    if (w.watched) watchedSet.add(`${w.seasonNumber}:${w.episodeNumber}`)
  }

  const airedEps: Array<{ seasonNumber: number; episodeNumber: number; airDate: string }> = []
  for (const season of seasons) {
    for (const ep of season.episodes ?? []) {
      if (!ep.airDate) continue
      const d = new Date(ep.airDate)
      if (!Number.isNaN(d.getTime()) && d.getTime() <= now.getTime()) {
        airedEps.push({
          seasonNumber: season.seasonNumber,
          episodeNumber: ep.episodeNumber,
          airDate: ep.airDate,
        })
      }
    }
  }

  if (airedEps.length === 0) {
    return { allAiredWatched: false, airedCount: 0, watchedAiredCount: 0, newestWatchedEpisode: null }
  }

  const watchedAired = airedEps.filter((ep) => watchedSet.has(`${ep.seasonNumber}:${ep.episodeNumber}`))
  const allAiredWatched = watchedAired.length === airedEps.length

  let newestWatchedEpisode: { episodeNumber: number; airDate: string } | null = null
  if (watchedAired.length > 0) {
    const sorted = watchedAired
      .slice()
      .sort((a, b) => new Date(b.airDate).getTime() - new Date(a.airDate).getTime())
    newestWatchedEpisode = { episodeNumber: sorted[0].episodeNumber, airDate: sorted[0].airDate }
  }

  return {
    allAiredWatched,
    airedCount: airedEps.length,
    watchedAiredCount: watchedAired.length,
    newestWatchedEpisode,
  }
}

function skipResult(showId: string, title: string, skipReason: string, warning?: string): PlexSyncResult {
  return { showId, title, success: false, skipped: true, skipReason, warning, matched: 0, unmatched: 0, unmatchedSamples: [], watchedTotal: 0 }
}

function errorResult(showId: string, title: string, error: string): PlexSyncResult {
  return { showId, title, success: false, skipped: false, error, matched: 0, unmatched: 0, unmatchedSamples: [], watchedTotal: 0 }
}

export async function syncShowFromPlex(showId: string): Promise<PlexSyncResult> {
  const show = await prisma.animeShow.findUnique({ where: { id: showId } })
  if (!show) return skipResult(showId, '', 'Show not found')

  if (show.metadataProvider !== 'tvdb') {
    return skipResult(showId, show.title, `Metadata provider "${show.metadataProvider}" is not supported; only TVDB shows can sync from Plex`)
  }

  const client = await getConfiguredPlexClient()
  if (!client) return skipResult(showId, show.title, 'Plex is not configured')

  // Resolve ratingKey and showOrdering
  let ratingKey: string
  let showOrdering: string | null

  if (show.plexRatingKey) {
    ratingKey = show.plexRatingKey
    showOrdering = await client.getShowOrdering(ratingKey)
  } else {
    const year = show.firstAiredAt ? show.firstAiredAt.getFullYear() : null
    const series = await client.findSeriesByTvdbId(show.metadataId, [show.title, show.originalTitle], year)
    if (!series) return skipResult(showId, show.title, 'Show not found in Plex library')
    ratingKey = series.ratingKey
    showOrdering = series.showOrdering
    await prisma.animeShow.update({ where: { id: showId }, data: { plexRatingKey: ratingKey } })
  }

  // Ordering guard: reject non-aired ordering.
  if (!_isAllowedShowOrderingForTest(showOrdering)) {
    const warning = `Plex uses ${showOrdering} ordering but LimitList is set to TVDB aired order — set the show's ordering in Plex to 'TheTVDB (Aired)' or change LimitList's season type in Settings.`
    return skipResult(showId, show.title, warning, warning)
  }

  // Fetch TVDB details once (not per season)
  const tvdbProvider = await getConfiguredTvdbProvider()
  if (!tvdbProvider) return errorResult(showId, show.title, 'TVDB is not configured')

  let tvdbDetails
  try {
    tvdbDetails = await tvdbProvider.getDetails(show.metadataId)
  } catch (e) {
    return errorResult(showId, show.title, `TVDB fetch failed: ${e instanceof Error ? e.message : 'Unknown error'}`)
  }
  if (!tvdbDetails?.seasons?.length) {
    return errorResult(showId, show.title, 'TVDB returned no season/episode data')
  }

  const [watchedThreshold, plexAutoStatus] = await Promise.all([
    getConfiguredPlexWatchedThreshold(),
    getConfiguredPlexAutoStatus(),
  ])

  // Fetch Plex episodes
  let plexEpisodes: PlexEpisode[]
  try {
    plexEpisodes = await client.getEpisodes(ratingKey)
  } catch (e) {
    return errorResult(showId, show.title, `Plex fetch failed: ${e instanceof Error ? e.message : 'Unknown error'}`)
  }

  // Match
  const { matched, unmatched } = _matchPlexEpisodesForTest(plexEpisodes, tvdbDetails.seasons, watchedThreshold)

  // Load existing rows for preservation check
  const existingWatches = await prisma.episodeWatch.findMany({ where: { animeShowId: showId } })
  const existingMap = new Map(existingWatches.map((w) => [`${w.seasonNumber}:${w.episodeNumber}`, w]))

  // Upsert EpisodeWatch rows; preserve manual+true rows from being flipped false by Plex
  for (const ep of matched) {
    const existing = existingMap.get(`${ep.seasonNumber}:${ep.episodeNumber}`)
    if (existing) {
      if (existing.source === 'manual' && existing.watched && !ep.watched) {
        // Never flip manual+watched=true to false via Plex; still refresh key/name.
        await prisma.episodeWatch.update({
          where: { id: existing.id },
          data: { plexRatingKey: ep.plexRatingKey, episodeName: ep.plexTitle || null },
        })
        continue
      }
      if (existing.source === 'manual') {
        // Preserve source=manual; update watch state and Plex key only
        await prisma.episodeWatch.update({
          where: { id: existing.id },
          data: { watched: ep.watched, watchedAt: ep.watchedAt, plexRatingKey: ep.plexRatingKey, episodeName: ep.plexTitle || null },
        })
      } else {
        await prisma.episodeWatch.update({
          where: { id: existing.id },
          data: { watched: ep.watched, watchedAt: ep.watchedAt, plexRatingKey: ep.plexRatingKey, source: 'plex', episodeName: ep.plexTitle || null },
        })
      }
    } else {
      await prisma.episodeWatch.create({
        data: {
          animeShowId: showId,
          seasonNumber: ep.seasonNumber,
          episodeNumber: ep.episodeNumber,
          watched: ep.watched,
          watchedAt: ep.watchedAt,
          plexRatingKey: ep.plexRatingKey,
          source: 'plex',
          episodeName: ep.plexTitle || null,
        },
      })
    }
  }

  await prisma.animeShow.update({ where: { id: showId }, data: { plexSyncedAt: new Date() } })

  const watchedTotal = await prisma.episodeWatch.count({ where: { animeShowId: showId, watched: true } })

  // If all aired TVDB episodes are watched, set UP_TO_DATE with the newest aired episode as baseline.
  // Preserve a valid COMPLETED classification, but allow a future episode to move it back to UP_TO_DATE.
  const allWatches = await prisma.episodeWatch.findMany({ where: { animeShowId: showId } })
  const upToDate = _computeUpToDateStatus(allWatches, tvdbDetails.seasons)
  const preserveCompletedStatus = show.status === 'COMPLETED' && isNotCurrentlyAiring(show.airingStatus, show.nextAiringAt)
  if (upToDate.allAiredWatched && upToDate.newestWatchedEpisode) {
    await prisma.animeShow.update({
      where: { id: showId },
      data: {
        ...(plexAutoStatus && !preserveCompletedStatus ? { status: 'UP_TO_DATE' } : {}),
        upToDateEpisodeNum: upToDate.newestWatchedEpisode.episodeNumber,
        upToDateAiredAt: new Date(upToDate.newestWatchedEpisode.airDate),
        upToDateStale: false,
      },
    })
  }

  const warning =
    unmatched.length > 0
      ? `${unmatched.length} Plex episode(s) could not be matched to TVDB data`
      : undefined

  return {
    showId,
    title: show.title,
    success: true,
    skipped: false,
    matched: matched.length,
    unmatched: unmatched.length,
    unmatchedSamples: unmatched.slice(0, 5).map((u) => u.title),
    watchedTotal,
    warning,
  }
}


export async function discoverWatchedFromPlex(): Promise<PlexDiscoveryResult> {
  const client = await getConfiguredPlexClient()
  if (!client) return { shows: [] }
  const { sectionKeys, accountId } = await getConfiguredPlexDiscoveryOptions()
  // Library scan is the source of truth for watched discovery. Plex session history is paginated/truncated
  // on many servers, so it must never be used to decide whether a show has watch history.
  const watchedShows = await client.getWatchedShows(sectionKeys, accountId)
  const tvdbIds = watchedShows.map((show) => show.tvdbId).filter((id): id is string => Boolean(id))
  const ratingKeys = watchedShows.map((show) => show.ratingKey)
  const tracked = await prisma.animeShow.findMany({
    where: {
      OR: [
        { metadataProvider: 'tvdb', metadataId: { in: tvdbIds.length ? tvdbIds : ['__none__'] } },
        { plexRatingKey: { in: ratingKeys.length ? ratingKeys : ['__none__'] } },
      ],
    },
    select: { id: true, metadataId: true, plexRatingKey: true },
  })
  const byTvdb = new Map(tracked.map((show) => [show.metadataId, show]))
  const byRatingKey = new Map(tracked.filter((show) => show.plexRatingKey).map((show) => [show.plexRatingKey!, show]))
  return {
    shows: watchedShows.map((show) => {
      const trackedShow = (show.tvdbId ? byTvdb.get(show.tvdbId) : null) ?? byRatingKey.get(show.ratingKey) ?? null
      return {
        ratingKey: show.ratingKey,
        title: show.title,
        year: show.year,
        tvdbId: show.tvdbId,
        viewedLeafCount: show.viewedLeafCount,
        leafCount: show.leafCount,
        showOrdering: show.showOrdering,
        librarySectionKey: show.librarySectionKey,
        alreadyTracked: Boolean(trackedShow),
        trackedShowId: trackedShow?.id ?? null,
        warning: !_isAllowedShowOrderingForTest(show.showOrdering) ? `Plex uses ${show.showOrdering} ordering; watched-state sync is skipped until the show uses aired ordering.` : undefined,
      }
    }),
  }
}

function isNotCurrentlyAiring(airingStatus?: string | null, nextAiringAt?: Date | null): boolean {
  const statusLower = airingStatus?.toLowerCase()
  const hasUpcomingEpisode = nextAiringAt != null && nextAiringAt.getTime() > Date.now()
  return ['ended', 'completed'].includes(statusLower ?? '') || (!statusLower && !hasUpcomingEpisode)
}

function initialStatusForImportedShow(show: PlexWatchedShow, airingStatus?: string | null, nextAiringAt?: Date | null): ShowStatus {
  const isFullyWatched = show.leafCount > 0 && show.viewedLeafCount >= show.leafCount
  if (isFullyWatched && isNotCurrentlyAiring(airingStatus, nextAiringAt)) return 'COMPLETED'
  return show.viewedLeafCount > 0 ? 'WATCHING' : 'PLAN_TO_WATCH'
}

export async function importWatchedFromPlex(ratingKeys: string[]): Promise<{ results: PlexImportResult[] }> {
  const selected = new Set(ratingKeys)
  const client = await getConfiguredPlexClient()
  if (!client) throw new Error('Plex is not configured')
  const discovery = await discoverWatchedFromPlex()
  const watchedShows = discovery.shows.filter((show) => selected.has(show.ratingKey))
  const tvdb = await getConfiguredTvdbProvider()
  if (!tvdb) throw new Error('TVDB is not configured')
  const results: PlexImportResult[] = []
  for (const discovered of watchedShows) {
    try {
      if (discovered.alreadyTracked && discovered.trackedShowId) {
        results.push({ ratingKey: discovered.ratingKey, title: discovered.title, status: 'skipped', showId: discovered.trackedShowId, tvdbId: discovered.tvdbId, warning: 'Already in watchlist' })
        continue
      }
      let tvdbId = discovered.tvdbId
      if (!tvdbId) {
        const match = await tvdb.findShowForAnime([discovered.title], discovered.year)
        tvdbId = match?.providerId ?? null
      }
      if (!tvdbId) {
        results.push({ ratingKey: discovered.ratingKey, title: discovered.title, status: 'unresolved', tvdbId: null, error: 'No confident TVDB match' })
        continue
      }
      const details = await tvdb.getDetails(tvdbId)
      let importAiringStatus = details?.airingStatus ?? null
      let importNextAiringAt: Date | null = null
      if (tvdb.getAiringDetails) {
        try {
          const airingInfo = await tvdb.getAiringDetails(tvdbId)
          if (airingInfo) {
            importAiringStatus = airingInfo.airingStatus ?? importAiringStatus
            importNextAiringAt = airingInfo.nextAiringAt
          }
        } catch {
          // fall back to details airingStatus
        }
      }
      const initialStatus = initialStatusForImportedShow({ ...discovered, guids: [] }, importAiringStatus, importNextAiringAt)
      const show = await importTvdbShowToWatchlist(tvdbId, { status: initialStatus, plexRatingKey: discovered.ratingKey })
      const sync = _isAllowedShowOrderingForTest(discovered.showOrdering) ? await syncShowFromPlex(show.id) : undefined
      results.push({
        ratingKey: discovered.ratingKey,
        title: discovered.title,
        status: 'imported',
        showId: show.id,
        tvdbId,
        warning: discovered.warning ?? sync?.warning,
        sync,
      })
    } catch (e) {
      results.push({ ratingKey: discovered.ratingKey, title: discovered.title, status: 'failed', tvdbId: discovered.tvdbId, error: e instanceof Error ? e.message : 'Unknown error' })
    }
  }
  return { results }
}

export async function syncAllShowsFromPlex(): Promise<PlexSyncAllResult> {
  const shows = await prisma.animeShow.findMany({
    where: { metadataProvider: 'tvdb' },
    select: { id: true, title: true },
  })

  const results: PlexSyncResult[] = []
  for (const show of shows) {
    // Per-show errors are scoped; one failure does not abort the rest
    try {
      results.push(await syncShowFromPlex(show.id))
    } catch (e) {
      results.push(
        errorResult(show.id, show.title, `Unexpected error: ${e instanceof Error ? e.message : 'Unknown error'}`)
      )
    }
  }

  return {
    results,
    totalMatched: results.reduce((sum, r) => sum + r.matched, 0),
    totalUnmatched: results.reduce((sum, r) => sum + r.unmatched, 0),
    totalWatched: results.reduce((sum, r) => sum + r.watchedTotal, 0),
    failedCount: results.filter((r) => !r.success && !r.skipped).length,
  }
}
