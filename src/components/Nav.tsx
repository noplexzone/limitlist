'use client'

import Image from 'next/image'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'
import NavSearch from './NavSearch'

const NAV_LINKS = [
  { href: '/dashboard', label: 'Dashboard' },
  { href: '/discover',  label: 'Discover' },
  { href: '/watchlist', label: 'Watchlist' },
]

export default function Nav() {
  const pathname = usePathname()
  const router = useRouter()
  const [reminderCount, setReminderCount] = useState(0)
  const [profileImageData, setProfileImageData] = useState<string | null>(null)
  const [searchOpen, setSearchOpen] = useState(false)
  const [profileOpen, setProfileOpen] = useState(false)
  const profileRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    fetch('/api/reminders/count')
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => { if (data) setReminderCount(data.count) })
      .catch(() => {})
    fetch('/api/settings')
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => { if (data?.profileImageData !== undefined) setProfileImageData(data.profileImageData) })
      .catch(() => {})
  }, [pathname])

  // Close profile dropdown on outside click
  useEffect(() => {
    function onPointerDown(e: PointerEvent) {
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) {
        setProfileOpen(false)
      }
    }
    document.addEventListener('pointerdown', onPointerDown)
    return () => document.removeEventListener('pointerdown', onPointerDown)
  }, [])

  // Close search on Escape
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        setSearchOpen(false)
        setProfileOpen(false)
      }
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [])

  async function handleLogout() {
    await fetch('/api/auth/logout', { method: 'POST' })
    router.push('/login')
    router.refresh()
  }

  const linkClass = (path: string) =>
    `px-3 py-1.5 rounded text-sm font-medium transition-colors whitespace-nowrap ${
      pathname === path
        ? 'text-white bg-slate-700'
        : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800'
    }`

  return (
    <>
      <nav className="bg-slate-900 border-b border-slate-800 sticky top-0 z-40" role="navigation" aria-label="Main navigation">
        <div className="max-w-7xl mx-auto px-4 flex items-center h-14 gap-4">

          {/* Logo */}
          <Link
            href="/dashboard"
            className="shrink-0 rounded-lg p-1 transition-colors hover:bg-slate-800"
            aria-label="LimitList home"
          >
            <Image src="/favicon.png" alt="LimitList" width={32} height={32} className="h-8 w-8 rounded-md" priority />
          </Link>

          {/* Center nav links */}
          <div className="flex-1 flex justify-center overflow-x-auto [&::-webkit-scrollbar]:hidden [scrollbar-width:none]">
            <div className="flex items-center gap-0.5">
              {NAV_LINKS.map(({ href, label }) => (
                <Link key={href} href={href} className={`relative ${linkClass(href)}`}>
                  {label}
                </Link>
              ))}
            </div>
          </div>

          {reminderCount > 0 && (
            <Link
              href="/dashboard"
              className="hidden sm:inline-flex items-center rounded-full bg-red-500/90 px-2 py-0.5 text-[10px] font-bold text-white"
              aria-label={`${reminderCount} unread reminder${reminderCount !== 1 ? 's' : ''} on dashboard`}
            >
              {reminderCount > 9 ? '9+' : reminderCount}
            </Link>
          )}

          {/* Right side: search icon + profile dropdown */}
          <div className="flex items-center gap-1 shrink-0">
            {/* Search icon button */}
            <button
              onClick={() => { setSearchOpen((v) => !v); setProfileOpen(false) }}
              aria-label={searchOpen ? 'Close search' : 'Open search'}
              aria-expanded={searchOpen}
              className="p-2 rounded-lg text-slate-400 hover:text-slate-100 hover:bg-slate-800 transition-colors"
            >
              {searchOpen ? (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z" />
                </svg>
              )}
            </button>

            {/* Profile dropdown */}
            <div className="relative" ref={profileRef}>
              <button
                onClick={() => { setProfileOpen((v) => !v); setSearchOpen(false) }}
                aria-label="Account menu"
                aria-expanded={profileOpen}
                aria-haspopup="menu"
                className="flex items-center gap-1 p-1.5 rounded-lg text-slate-400 hover:text-slate-100 hover:bg-slate-800 transition-colors"
              >
                <span className="h-7 w-7 overflow-hidden rounded-sm bg-purple-700 flex items-center justify-center text-xs font-bold text-white select-none" aria-hidden="true">
                  {profileImageData ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={profileImageData} alt="" className="h-full w-full object-cover" />
                  ) : (
                    'LL'
                  )}
                </span>
                <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5} aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {profileOpen && (
                <div
                  role="menu"
                  aria-label="Account options"
                  className="absolute right-0 top-full mt-1 w-40 rounded-xl bg-slate-800 border border-slate-700 shadow-xl shadow-black/40 overflow-hidden z-50"
                >
                  <Link
                    href="/settings"
                    role="menuitem"
                    onClick={() => setProfileOpen(false)}
                    className="flex items-center gap-2 w-full px-4 py-2.5 text-sm text-slate-300 hover:bg-slate-700 hover:text-white transition-colors"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    Settings
                  </Link>
                  <div className="border-t border-slate-700" role="separator" />
                  <button
                    role="menuitem"
                    onClick={handleLogout}
                    className="flex items-center gap-2 w-full px-4 py-2.5 text-sm text-slate-300 hover:bg-slate-700 hover:text-white transition-colors"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                    </svg>
                    Sign out
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </nav>

      {/* Search panel — slides in below nav */}
      {searchOpen && (
        <div className="sticky top-14 z-30 bg-slate-900/95 backdrop-blur border-b border-slate-800 px-4 py-3">
          <div className="max-w-2xl mx-auto">
            <NavSearch onClose={() => setSearchOpen(false)} />
          </div>
        </div>
      )}
    </>
  )
}
