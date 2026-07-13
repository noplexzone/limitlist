'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'

interface NavProps {
  reminderCount?: number
}

export default function Nav({ reminderCount }: NavProps) {
  const pathname = usePathname()
  const router = useRouter()

  async function handleLogout() {
    await fetch('/api/auth/logout', { method: 'POST' })
    router.push('/login')
    router.refresh()
  }

  const linkClass = (path: string) =>
    `px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
      pathname === path
        ? 'bg-purple-600 text-white'
        : 'text-gray-400 hover:text-white hover:bg-gray-800'
    }`

  return (
    <nav className="bg-gray-900 border-b border-gray-800 px-4 py-3">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="font-bold text-purple-400 text-lg">Anime Tracker</span>
          <div className="flex gap-1 ml-4">
            <Link href="/watchlist" className={linkClass('/watchlist')}>
              Watchlist
            </Link>
            <Link href="/search" className={linkClass('/search')}>
              Search
            </Link>
            <Link href="/dashboard" className={linkClass('/dashboard')}>
              Dashboard
            </Link>
            <Link href="/schedule" className={`${linkClass('/schedule')} relative`}>
              Schedule
              {reminderCount != null && reminderCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold rounded-full w-4 h-4 flex items-center justify-center leading-none">
                  {reminderCount > 9 ? '9+' : reminderCount}
                </span>
              )}
            </Link>
          </div>
        </div>
        <button
          onClick={handleLogout}
          className="text-sm text-gray-400 hover:text-white transition-colors"
        >
          Sign out
        </button>
      </div>
    </nav>
  )
}
