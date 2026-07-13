import { redirect } from 'next/navigation'
import { requireAuth } from '@/lib/auth'
import Nav from '@/components/Nav'

export default async function SettingsPage() {
  const user = await requireAuth()
  if (!user) redirect('/login')

  return (
    <div className="min-h-screen bg-gray-950">
      <Nav />
      <main className="max-w-2xl mx-auto px-4 py-12">
        <h1 className="text-3xl font-bold mb-2 text-purple-400">Settings</h1>
        <p className="text-gray-400 text-sm mb-10">Manage your LimitList preferences.</p>

        <div className="space-y-6">
          <section className="bg-gray-900 border border-gray-800 rounded-xl p-6">
            <h2 className="text-lg font-semibold text-gray-200 mb-1">Account</h2>
            <p className="text-sm text-gray-400 mb-4">
              Signed in as <span className="text-white font-medium">{user.username}</span>.
            </p>
            <p className="text-xs text-gray-500">
              To change your password or username, re-run the setup flow or update your credentials directly in the database.
            </p>
          </section>

          <section className="bg-gray-900 border border-gray-800 rounded-xl p-6">
            <h2 className="text-lg font-semibold text-gray-200 mb-1">Data</h2>
            <p className="text-sm text-gray-400">
              Your anime list is stored in a local SQLite database. No cloud sync — all data stays on your server.
            </p>
          </section>

          <section className="bg-gray-900 border border-gray-800 rounded-xl p-6">
            <h2 className="text-lg font-semibold text-gray-200 mb-1">About</h2>
            <p className="text-sm text-gray-400">
              LimitList — personal anime watchlist tracker.
            </p>
          </section>
        </div>
      </main>
    </div>
  )
}
