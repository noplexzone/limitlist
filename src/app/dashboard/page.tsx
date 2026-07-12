import { redirect } from 'next/navigation'
import Link from 'next/link'
import { requireAuth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { computeStats } from '@/lib/stats'
import Nav from '@/components/Nav'

const STATUS_LABELS: Record<string, string> = {
  WATCHING: 'Watching',
  COMPLETED: 'Completed',
  PLAN_TO_WATCH: 'Plan to Watch',
  DROPPED: 'Dropped',
}

const STATUS_COLORS: Record<string, string> = {
  WATCHING: 'bg-blue-500',
  COMPLETED: 'bg-green-500',
  PLAN_TO_WATCH: 'bg-gray-500',
  DROPPED: 'bg-red-500',
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
      <p className="text-sm text-gray-400 mb-1">{label}</p>
      <p className="text-2xl font-bold text-white">{value}</p>
    </div>
  )
}

function TokenBar({
  name,
  count,
  max,
}: {
  name: string
  count: number
  max: number
}) {
  const pct = max === 0 ? 0 : Math.round((count / max) * 100)
  return (
    <div className="flex items-center gap-3">
      <span className="text-sm text-gray-300 w-36 truncate shrink-0" title={name}>
        {name}
      </span>
      <div className="flex-1 bg-gray-800 rounded-full h-2">
        <div
          className="bg-purple-500 h-2 rounded-full transition-all"
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="text-sm text-gray-400 w-6 text-right shrink-0">{count}</span>
    </div>
  )
}

export default async function DashboardPage() {
  const user = await requireAuth()
  if (!user) redirect('/login')

  const shows = await prisma.animeShow.findMany()
  const stats = computeStats(shows)

  const isEmpty = stats.totalShows === 0

  return (
    <div className="min-h-screen bg-gray-950">
      <Nav />
      <main className="max-w-7xl mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-8 text-purple-400">Dashboard</h1>

        {isEmpty ? (
          <div className="text-center py-20 text-gray-500">
            <p className="text-lg mb-4">No shows tracked yet.</p>
            <Link
              href="/search"
              className="inline-block px-5 py-2.5 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-medium transition-colors"
            >
              Search &amp; import anime
            </Link>
          </div>
        ) : (
          <div className="space-y-8">
            {/* Summary cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <StatCard label="Total Shows" value={String(stats.totalShows)} />
              <StatCard
                label="Completion Rate"
                value={`${stats.completionRate.toFixed(1)}%`}
              />
              <StatCard
                label="Episodes Watched"
                value={stats.totalEpisodesWatched.toLocaleString()}
              />
              <StatCard
                label="Hours Watched"
                value={stats.estimatedHoursWatched.toFixed(1)}
              />
              {stats.averageRating !== null && (
                <StatCard
                  label="Average Rating"
                  value={`${stats.averageRating.toFixed(1)} / 5`}
                />
              )}
            </div>

            {/* Status breakdown */}
            <section>
              <h2 className="text-lg font-semibold text-gray-200 mb-3">By Status</h2>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {(
                  ['WATCHING', 'COMPLETED', 'PLAN_TO_WATCH', 'DROPPED'] as const
                ).map((status) => (
                  <div
                    key={status}
                    className="bg-gray-900 border border-gray-800 rounded-xl p-4 flex items-center gap-3"
                  >
                    <div
                      className={`w-3 h-3 rounded-full shrink-0 ${STATUS_COLORS[status]}`}
                    />
                    <div>
                      <p className="text-xs text-gray-400">{STATUS_LABELS[status]}</p>
                      <p className="text-xl font-bold text-white">
                        {stats.byStatus[status]}
                      </p>
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
                      <TokenBar
                        key={g.name}
                        name={g.name}
                        count={g.count}
                        max={stats.topGenres[0].count}
                      />
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
                      <TokenBar
                        key={s.name}
                        name={s.name}
                        count={s.count}
                        max={stats.topStudios[0].count}
                      />
                    ))}
                  </div>
                )}
              </section>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
