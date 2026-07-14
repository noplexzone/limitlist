import { redirect } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { requireAuth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { computeStats } from '@/lib/stats'
import { changelogEntries } from '@/lib/changelog'
import { SHOW_STATUSES, STATUS_DOT_CLASSES, STATUS_LABELS } from '@/lib/status'
import Nav from '@/components/Nav'
import ScheduleClient from '@/app/schedule/ScheduleClient'
import OpenSearchButton from './OpenSearchButton'


function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
      <p className="text-sm text-gray-400 mb-1">{label}</p>
      <p className="text-2xl font-bold text-white">{value}</p>
    </div>
  )
}


function WhatsNewPanel() {
  const [latest, ...previous] = changelogEntries
  return (
    <section className="rounded-xl border border-gray-800 bg-gray-900 p-5">
      <div className="mb-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-purple-300">What&apos;s New</p>
        <h2 className="mt-1 text-lg font-semibold text-gray-100">LimitList {latest.version}</h2>
        <p className="text-sm text-gray-500">{latest.date}</p>
      </div>
      <ul className="space-y-2 text-sm leading-6 text-gray-300">
        {latest.bullets.map((bullet) => (
          <li key={bullet} className="flex gap-2">
            <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-purple-400" />
            <span>{bullet}</span>
          </li>
        ))}
      </ul>
      <div className="mt-5 space-y-2 border-t border-gray-800 pt-4">
        {previous.slice(0, 2).map((entry) => (
          <details key={entry.version} className="rounded-lg border border-gray-800 bg-gray-950/70 px-3 py-2">
            <summary className="cursor-pointer text-sm font-medium text-gray-200">
              {entry.version} <span className="text-xs font-normal text-gray-500">· {entry.date}</span>
            </summary>
            <ul className="mt-2 space-y-1 text-xs leading-5 text-gray-400">
              {entry.bullets.map((bullet) => <li key={bullet}>• {bullet}</li>)}
            </ul>
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
      <span className="text-sm text-gray-300 w-36 truncate shrink-0" title={name}>
        {name}
      </span>
      <div className="flex-1 bg-gray-800 rounded-full h-2">
        <div className="bg-purple-500 h-2 rounded-full transition-all" style={{ width: `${pct}%` }} />
      </div>
      <span className="text-sm text-gray-400 w-6 text-right shrink-0">{count}</span>
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
        <h2 className="text-lg font-semibold text-gray-200">{title}</h2>
        <Link href="/watchlist" className="text-xs text-purple-400 hover:text-purple-300 transition-colors">
          Go to Watchlist →
        </Link>
      </div>
      <div className="flex gap-3 overflow-x-auto pb-2 [&::-webkit-scrollbar]:h-1 [&::-webkit-scrollbar-thumb]:rounded [&::-webkit-scrollbar-thumb]:bg-gray-700">
        {shows.map((show) => (
          <Link key={show.id} href={`/anime/${show.metadataProvider}/${show.metadataId}`} className="shrink-0 w-24 group">
            <div className="relative aspect-[2/3] overflow-hidden rounded-xl border border-gray-800 bg-gray-900 group-hover:border-purple-500/70 transition-colors">
              {show.posterUrl ? (
                <Image
                  src={show.posterUrl}
                  alt={`${show.title} poster`}
                  fill
                  sizes="96px"
                  className="object-cover"
                />
              ) : (
                <div className="flex h-full items-center justify-center text-xs text-gray-500 text-center p-1">
                  {show.title}
                </div>
              )}
            </div>
            <p className="mt-1 text-[10px] text-gray-400 leading-tight line-clamp-2">{show.title}</p>
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

  const now = new Date()
  const shows = await prisma.animeShow.findMany({
    orderBy: { updatedAt: 'desc' },
    include: {
      reminders: {
        where: { airsAt: { gte: now } },
        orderBy: { airsAt: 'asc' },
        take: 1,
      },
    },
  })
  const stats = computeStats(shows)
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
    .map((show) => {
      const reminder = show.reminders[0] ?? null
      return {
        showId: show.id,
        title: show.title,
        status: show.status,
        episodeNumber: show.nextEpisodeNum,
        airsAt: show.nextAiringAt!.toISOString(),
        reminderId: reminder?.id ?? null,
        reminderDismissed: reminder ? reminder.dismissedAt !== null : false,
      }
    })

  return (
    <div className="min-h-screen bg-gray-950">
      <Nav />
      <main className="max-w-7xl mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-8 text-purple-400">Dashboard</h1>

        {isEmpty ? (
          <div className="text-center py-20 text-gray-500">
            <p className="text-lg mb-4">No shows tracked yet.</p>
            <OpenSearchButton />
          </div>
        ) : (
          <div className="space-y-8">
            <div className="grid grid-cols-1 gap-8 xl:grid-cols-[1fr_360px] xl:items-start">
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
              <h2 className="text-lg font-semibold text-gray-200 mb-3">By Status</h2>
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                {SHOW_STATUSES.map((status) => (
                  <div
                    key={status}
                    className="bg-gray-900 border border-gray-800 rounded-xl p-4 flex items-center gap-3"
                  >
                    <div className={`w-3 h-3 rounded-full shrink-0 ${STATUS_DOT_CLASSES[status]}`} />
                    <div>
                      <p className="text-xs text-gray-400">{STATUS_LABELS[status]}</p>
                      <p className="text-xl font-bold text-white">{stats.byStatus[status]}</p>
                    </div>
                  </div>
                ))}
              </div>
            </section>

                {/* Top genres + studios */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <section>
                <h2 className="text-lg font-semibold text-gray-200 mb-3">Top Genres</h2>
                {stats.topGenres.length === 0 ? (
                  <p className="text-sm text-gray-500">No genre data.</p>
                ) : (
                  <div className="space-y-2">
                    {stats.topGenres.map((g) => (
                      <TokenBar key={g.name} name={g.name} count={g.count} max={stats.topGenres[0].count} />
                    ))}
                  </div>
                )}
              </section>

              <section>
                <h2 className="text-lg font-semibold text-gray-200 mb-3">Top Studios</h2>
                {stats.topStudios.length === 0 ? (
                  <p className="text-sm text-gray-500">No studio data.</p>
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

              <aside className="space-y-6 xl:sticky xl:top-[5rem]">
                <div>
                  <div className="mb-3">
                    <h2 className="text-lg font-semibold text-gray-200">Airing Calendar</h2>
                    <p className="text-sm text-gray-500">Upcoming watchlist episodes and reminders.</p>
                  </div>
                  <ScheduleClient initialEntries={scheduleEntries} compact />
                </div>
                <WhatsNewPanel />
              </aside>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
