'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'

export default function Nav() {
  const pathname = usePathname()
  const router = useRouter()
  const [reminderCount, setReminderCount] = useState(0)

  // Fetch reminder count globally on every route change
  useEffect(() => {
    fetch('/api/reminders/count')
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => { if (data) setReminderCount(data.count) })
      .catch(() => {})
  }, [pathname])

  async function handleLogout() {
    await fetch('/api/auth/logout', { method: 'POST' })
    router.push('/login')
    router.refresh()
  }

  const linkClass = (path: string) =>
    `relative px-2 py-1.5 sm:px-3 sm:py-2 rounded-lg text-xs sm:text-sm font-medium transition-colors whitespace-nowrap ${
      pathname === path
        ? 'bg-purple-600 text-white'
        : 'text-gray-400 hover:text-white hover:bg-gray-800'
    }`

  return (
    <nav className="bg-gray-900 border-b border-gray-800 px-3 py-2 sm:px-4 sm:py-3">
      <div className="max-w-7xl mx-auto flex items-center gap-2 sm:gap-3">
        <span className="font-bold text-purple-400 shrink-0">
          <span className="hidden sm:inline text-lg">Anime Tracker</span>
          <span className="sm:hidden text-base">AT</span>
        </span>

        <div className="flex-1 min-w-0 overflow-x-auto [&::-webkit-scrollbar]:hidden [scrollbar-width:none]">
          <div className="flex gap-0.5 sm:gap-1 ml-1 sm:ml-3">
            <Link href="/watchlist" className={linkClass('/watchlist')}>Watchlist</Link>
            <Link href="/search" className={linkClass('/search')}>Search</Link>
            <Link href="/discover" className={linkClass('/discover')}>Discover</Link>
            <Link href="/dashboard" className={`${linkClass('/dashboard')} hidden md:inline-flex`}>
              Dashboard
            </Link>
            <Link href="/schedule" className={linkClass('/schedule')}>
              Schedule
              {reminderCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold rounded-full w-4 h-4 flex items-center justify-center leading-none">
                  {reminderCount > 9 ? '9+' : reminderCount}
                </span>
              )}
            </Link>
          </div>
        </div>

        <button
          onClick={handleLogout}
          className="shrink-0 text-xs sm:text-sm text-gray-400 hover:text-white transition-colors"
        >
          Sign out
        </button>
      </div>
    </nav>
  )
}
