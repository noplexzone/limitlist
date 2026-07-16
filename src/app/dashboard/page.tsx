import { redirect } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { requireAuth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { computeStats } from '@/lib/stats'
import { getConfiguredTvdbProvider } from '@/lib/tvdb'
import { changelogEntries } from '@/lib/changelog'
import { SHOW_STATUSES, STATUS_DOT_CLASSES, STATUS_LABELS } from '@/lib/status'
import Nav from '@/components/Nav'
import UpcomingReleases from '@/app/schedule/UpcomingReleases'
import OpenSearchButton from './OpenSearchButton'


function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-surface-900 border border-surface-800 rounded-xl p-5">
      <p className="text-sm text-surface-400 mb-1">{label}</p>
      <p className="text-2xl font-bold text-white">{value}</p>
    </div>
  )
}


function WhatsNewPanel() {
  return (
    <section className="rounded-xl border border-surface-800 bg-surface-900 p-5">
      <div className="mb-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-accent-300">What&apos;s New</p>
        <h2 className="mt-1 text-lg font-semibold text-surface-100">LimitList updates</h2>
      </div>
      <div className="max-h-[38rem] space-y-2 overflow-y-auto pr-1 [scrollbar-width:thin]">
        {changelogEntries.map((entry, index) => (
          <details key={entry.version} open={index === 0} className="rounded-lg border border-surface-800 bg-surface-950/70 px-3 py-2">
            <summary className="cursor-pointer text-sm font-medium text-surface-200">
              {entry.version} <span className="text-xs font-normal text-surface-500">· {entry.date}</span>
            </summary>
            <div className="mt-3 space-y-3 text-xs leading-5 text-surface-400">
              {entry.sections.map((section) => (
                <div key={section.title}>
                  <p className="mb-1 font-semibold uppercase tracking-wide text-accent-300">{section.title}</p>
                  <ul className="space-y-1">
                    {section.bullets.map((bullet) => <li key={bullet}>• {bullet}</li>)}
                  </ul>
                </div>
              ))}
            </div>
          </details>
        ))}
      </div>
    </section>
  )
}

function TokenBar({ name, count, max }: { name: string; count: number; max: number }) {
  const pct = max === 0 ? 0 : Math.round((count / max) * 100)
  return (
    <div className="flex items-center gap-3">
      <span className="text-sm text-surface-300 w-36 truncate shrink-0" title={name}>
        {name}
      </span>
      <div className="flex-1 bg-surface-800 rounded-full h-2">
        <div className="bg-accent-500 h-2 rounded-full transition-all" style={{ width: `${pct}%` }} />
      </div>
      <span className="text-sm text-surface-400 w-6 text-right shrink-0">{count}</span>
    </div>
  )
}

interface ShelfShow {
  id: string
  metadataProvider: string
  metadataId: string
  title: string
  posterUrl: string | null
  rating: number | null
}

function PosterShelf({ title, shows }: { title: string; shows: ShelfShow[] }) {
  if (shows.length === 0) return null
  return (
    <section>
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-lg font-semibold text-surface-200">{title}</h2>
        <Link href="/watchlist" className="text-xs text-accent-400 hover:text-accent-300 transition-colors">
          Go to Watchlist →
        </Link>
      </div>
      <div className="flex gap-3 overflow-x-auto pb-2 [&::-webkit-scrollbar]:h-1 [&::-webkit-scrollbar-thumb]:rounded [&::-webkit-scrollbar-thumb]:bg-surface-700">
        {shows.map((show) => (
          <Link key={show.id} href={`/anime/${show.metadataProvider}/${show.metadataId}`} className="shrink-0 w-24 group">
            <div className="relative aspect-[2/3] overflow-hidden rounded-xl border border-surface-800 bg-surface-900 group-hover:border-accent-500/70 transition-colors">
              {show.posterUrl ? (
                <Image
                  src={show.posterUrl}
                  alt={`${show.title} poster`}
                  fill
                  sizes="96px"
                  className="object-cover"
                />
              ) : (
                <div className="flex h-full items-center justify-center text-xs text-surface-500 text-center p-1">
                  {show.title}
                </div>
              )}
            </div>
            <p className="mt-1 text-[10px] text-surface-400 leading-tight line-clamp-2">{show.title}</p>
            {show.rating != null && (
              <p className="text-[10px] text-yellow-400">★ {show.rating}</p>
            )}
          </Link>
        ))}
      </div>
    </section>
  )
}

export default async function DashboardPage() {
  const user = await requireAuth()
  if (!user) redirect('/login')

  let shows = await prisma.animeShow.findMany({
    orderBy: { updatedAt: 'desc' },
  })
  let stats = computeStats(shows)
  if (stats.topStudios.length === 0 && shows.some((show) => show.metadataProvider === 'tvdb' && !show.studios)) {
    const tvdb = await getConfiguredTvdbProvider()
    if (tvdb?.getDetails) {
      const candidates = shows.filter((show) => show.metadataProvider === 'tvdb' && !show.studios).slice(0, 12)
      const enriched = await Promise.all(candidates.map(async (show) => {
        const details = await tvdb.getDetails!(show.metadataId)
        const studios = details?.studios?.join(', ')
        if (!studios) return null
        await prisma.animeShow.update({ where: { id: show.id }, data: { studios } })
        return { id: show.id, studios }
      }))
      const studioUpdates = new Map(enriched.filter(Boolean).map((update) => [update!.id, update!.studios]))
      if (studioUpdates.size > 0) {
        shows = shows.map((show) => studioUpdates.has(show.id) ? { ...show, studios: studioUpdates.get(show.id)! } : show)
        stats = computeStats(shows)
      }
    }
  }
  const isEmpty = stats.totalShows === 0

  const continueWatching: ShelfShow[] = shows
    .filter((s) => s.status === 'WATCHING' || (s.status === 'UP_TO_DATE' && s.upToDateStale))
    .slice(0, 12)

  const highestRated: ShelfShow[] = shows
    .filter((s) => s.rating != null)
    .sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0))
    .slice(0, 12)

  const scheduleEntries = shows
    .filter((show) => show.nextAiringAt)
    .sort((a, b) => (a.nextAiringAt?.getTime() ?? 0) - (b.nextAiringAt?.getTime() ?? 0))
    .map((show) => ({
      showId: show.id,
      title: show.title,
      status: show.status,
      episodeNumber: show.nextEpisodeNum,
      episodeName: show.nextEpisodeName ?? null,
      stillUrl: show.nextEpisodeStillUrl ?? null,
      posterUrl: show.posterUrl ?? null,
      airsAt: show.nextAiringAt!.toISOString(),
    }))

  return (
    <div className="min-h-screen bg-surface-950">
      <Nav />
      <main className="mx-auto max-w-[112rem] px-4 py-8 sm:px-6 lg:px-8">
        <h1 className="text-3xl font-bold mb-8 text-accent-400">Dashboard</h1>

        {isEmpty ? (
          <div className="text-center py-20 text-surface-500">
            <p className="text-lg mb-4">No shows tracked yet.</p>
            <OpenSearchButton />
          </div>
        ) : (
          <div className="space-y-8">
            <div className="grid grid-cols-1 gap-8 xl:grid-cols-[280px_minmax(0,1fr)_320px] 2xl:grid-cols-[300px_minmax(0,1fr)_340px] xl:items-start">
              <aside className="xl:sticky xl:top-[5rem]">
                <WhatsNewPanel />
              </aside>

              <div className="space-y-8 min-w-0">
                {/* Actionable shelves */}
                <PosterShelf title="Continue Watching" shows={continueWatching} />
                <PosterShelf title="Highest Rated" shows={highestRated} />

                {/* Summary cards */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  <StatCard label="Total Shows" value={String(stats.totalShows)} />
                  <StatCard label="Completion Rate" value={`${stats.completionRate.toFixed(1)}%`} />
                  {stats.averageRating !== null && (
                    <StatCard label="Average Rating" value={`${stats.averageRating.toFixed(1)} / 5`} />
                  )}
                </div>

                {/* Status breakdown */}
                <section>
              <h2 className="text-lg font-semibold text-surface-200 mb-3">By Status</h2>
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                {SHOW_STATUSES.map((status) => (
                  <div
                    key={status}
                    className="bg-surface-900 border border-surface-800 rounded-xl p-4 flex items-center gap-3"
                  >
                    <div className={`w-3 h-3 rounded-full shrink-0 ${STATUS_DOT_CLASSES[status]}`} />
                    <div>
                      <p className="text-xs text-surface-400">{STATUS_LABELS[status]}</p>
                      <p className="text-xl font-bold text-white">{stats.byStatus[status]}</p>
                    </div>
                  </div>
                ))}
              </div>
            </section>

                {/* Top genres + studios */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <section>
                <h2 className="text-lg font-semibold text-surface-200 mb-3">Top Genres</h2>
                {stats.topGenres.length === 0 ? (
                  <p className="text-sm text-surface-500">No genre data.</p>
                ) : (
                  <div className="space-y-2">
                    {stats.topGenres.map((g) => (
                      <TokenBar key={g.name} name={g.name} count={g.count} max={stats.topGenres[0].count} />
                    ))}
                  </div>
                )}
              </section>

              <section>
                <h2 className="text-lg font-semibold text-surface-200 mb-3">Top Studios</h2>
                {stats.topStudios.length === 0 ? (
                  <p className="text-sm text-surface-500">No studio data.</p>
                ) : (
                  <div className="space-y-2">
                    {stats.topStudios.map((s) => (
                      <TokenBar key={s.name} name={s.name} count={s.count} max={stats.topStudios[0].count} />
                    ))}
                  </div>
                )}
              </section>
                </div>
              </div>

              <aside className="xl:sticky xl:top-[5rem]">
                <div className="mb-3">
                  <h2 className="text-lg font-semibold text-surface-200">Upcoming Releases</h2>
                  <p className="text-sm text-surface-500">Upcoming watchlist episodes.</p>
                </div>
                <UpcomingReleases initialEntries={scheduleEntries} compact />
              </aside>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
