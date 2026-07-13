import { redirect } from 'next/navigation'
import { requireAuth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import Nav from '@/components/Nav'
import ScheduleClient from './ScheduleClient'

export default async function SchedulePage() {
  const user = await requireAuth()
  if (!user) redirect('/login')

  const now = new Date()

  // Shows with known upcoming episodes
  const shows = await prisma.animeShow.findMany({
    where: { nextAiringAt: { not: null } },
    orderBy: { nextAiringAt: 'asc' },
    include: {
      reminders: {
        where: { airsAt: { gte: now } },
        orderBy: { airsAt: 'asc' },
        take: 1,
      },
    },
  })

  const entries = shows.map((show) => {
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
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-purple-400">Airing Schedule</h1>
          <p className="text-gray-400 mt-1 text-sm">
            Upcoming episodes from your watchlist — sorted by air date
          </p>
        </div>
        <ScheduleClient initialEntries={entries} />
      </main>
    </div>
  )
}
