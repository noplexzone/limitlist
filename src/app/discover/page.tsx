import { redirect } from 'next/navigation'
import { requireAuth } from '@/lib/auth'
import Nav from '@/components/Nav'
import DiscoverClient from './DiscoverClient'

export default async function DiscoverPage() {
  const user = await requireAuth()
  if (!user) redirect('/login')

  return (
    <div className="min-h-screen bg-gray-950">
      <Nav />
      <main className="max-w-7xl mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-2 text-purple-400">Discover</h1>
        <p className="text-gray-400 text-sm mb-8">Popular and trending anime from AniList, linked to TMDB for tracking</p>
        <DiscoverClient />
      </main>
    </div>
  )
}
