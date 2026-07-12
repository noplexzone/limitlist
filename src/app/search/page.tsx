import { redirect } from 'next/navigation'
import { requireAuth } from '@/lib/auth'
import Nav from '@/components/Nav'
import SearchClient from './SearchClient'

export default async function SearchPage() {
  const user = await requireAuth()
  if (!user) redirect('/login')

  return (
    <div className="min-h-screen bg-gray-950">
      <Nav />
      <main className="max-w-7xl mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-8 text-purple-400">Search &amp; Import</h1>
        <SearchClient />
      </main>
    </div>
  )
}
