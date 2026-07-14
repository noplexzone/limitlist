import { Suspense } from 'react'
import { redirect } from 'next/navigation'
import { requireAuth } from '@/lib/auth'
import Nav from '@/components/Nav'
import WatchlistClient from './WatchlistClient'

export default async function WatchlistPage() {
  const user = await requireAuth()
  if (!user) redirect('/login')

  return (
    <div className="min-h-screen bg-gray-950">
      <Nav />
      <main className="max-w-7xl mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-8 text-purple-400">My Watchlist</h1>
        <Suspense fallback={<p className="text-gray-400">Loading watchlist...</p>}>
          <WatchlistClient />
        </Suspense>
      </main>
    </div>
  )
}
