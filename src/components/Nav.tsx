'use client'

import Image from 'next/image'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useEffect, useRef, useState, type ComponentType } from 'react'
import NavSearch from './NavSearch'

const NAV_LINKS = [
  { href: '/dashboard', label: 'Dashboard' },
  { href: '/discover',  label: 'Discover' },
  { href: '/watchlist', label: 'Watchlist' },
]

function IconDashboard() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75} aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z" />
    </svg>
  )
}

function IconDiscover() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75} aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456z" />
    </svg>
  )
}

function IconWatchlist() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75} aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 6.75h12M8.25 12h12m-12 5.25h12M3.75 6.75h.007v.008H3.75V6.75zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zM3.75 12h.007v.008H3.75V12zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm-.375 5.25h.007v.008H3.75v-.008zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
    </svg>
  )
}

function IconSearch() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z" />
    </svg>
  )
}

function IconClose() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
    </svg>
  )
}

const BOTTOM_NAV_ICONS: Record<string, ComponentType> = {
  '/dashboard': IconDashboard,
  '/discover':  IconDiscover,
  '/watchlist': IconWatchlist,
}

export default function Nav() {
  const pathname = usePathname()
  const router = useRouter()
  const [profileImageData, setProfileImageData] = useState<string | null>(null)
  const [searchOpen, setSearchOpen] = useState(false)
  const [profileOpen, setProfileOpen] = useState(false)
  const profileRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function refreshProfileImage() {
      fetch('/api/settings')
        .then((r) => (r.ok ? r.json() : null))
        .then((data) => { if (data?.profileImageData !== undefined) setProfileImageData(data.profileImageData) })
        .catch(() => {})
    }

    refreshProfileImage()
    window.addEventListener('limitlist:profile-image-updated', refreshProfileImage)
    return () => window.removeEventListener('limitlist:profile-image-updated', refreshProfileImage)
  }, [])

  useEffect(() => {
    function openSearch() {
      setSearchOpen(true)
      setProfileOpen(false)
    }
    window.addEventListener('limitlist:open-search', openSearch)
    return () => window.removeEventListener('limitlist:open-search', openSearch)
  }, [])

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

  // Close search/profile on Escape
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
    `relative px-3 py-1.5 rounded text-sm font-medium transition-colors whitespace-nowrap ${
      pathname === path
        ? 'text-accent-300 bg-accent-500/15'
        : 'text-surface-300 hover:text-accent-300 hover:bg-accent-500/10'
    }`

  const bottomNavItemClass = (active: boolean) =>
    `flex flex-col items-center justify-center min-h-[44px] flex-1 gap-0.5 py-2 px-1 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-500 ${
      active ? 'text-accent-300' : 'text-surface-400'
    }`

  return (
    <>
      {/* Safe-area bottom padding for page content so fixed bottom nav doesn't cover it */}
      <style>{`@media (max-width: 767px) { body { padding-bottom: calc(4rem + env(safe-area-inset-bottom)); } }`}</style>

      <nav
        className="bg-surface-900/95 backdrop-blur-xl border-b border-surface-800/90 shadow-lg shadow-surface-950/20 sticky top-0 z-40 pt-[env(safe-area-inset-top)]"
        role="navigation"
        aria-label="Main navigation"
      >
        <div className="max-w-7xl mx-auto px-4 flex items-center h-14 gap-4">

          {/* Brand */}
          <Link
            href="/dashboard"
            className="shrink-0 flex items-center gap-2 rounded-lg px-1.5 py-1 transition-colors hover:bg-accent-500/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-500"
            aria-label="LimitList home"
          >
            <Image src="/favicon.png" alt="LimitList" width={32} height={32} className="h-8 w-8 rounded-md" priority />
            <span className="hidden sm:inline text-sm font-semibold text-accent-300 tracking-wide">LimitList</span>
          </Link>

          {/* Center nav links — hidden on mobile */}
          <div className="hidden md:flex flex-1 justify-center overflow-x-auto [&::-webkit-scrollbar]:hidden [scrollbar-width:none]">
            <div className="flex items-center gap-0.5">
              {NAV_LINKS.map(({ href, label }) => (
                <Link key={href} href={href} className={linkClass(href)}>
                  {label}
                  {pathname === href && (
                    <span className="absolute bottom-0 left-2 right-2 h-0.5 rounded-full bg-accent-400" aria-hidden="true" />
                  )}
                </Link>
              ))}
            </div>
          </div>

          {/* Right side: search icon (desktop only) + profile */}
          <div className="flex items-center gap-1 shrink-0 ml-auto md:ml-0">
            {/* Search icon button — desktop only */}
            <button
              onClick={() => { setSearchOpen((v) => !v); setProfileOpen(false) }}
              aria-label={searchOpen ? 'Close search' : 'Open search'}
              aria-expanded={searchOpen}
              className={`hidden md:inline-flex p-2 rounded-lg transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-500 ${
                searchOpen
                  ? 'bg-accent-500/15 text-accent-300'
                  : 'text-surface-400 hover:text-accent-300 hover:bg-accent-500/10'
              }`}
            >
              {searchOpen ? <IconClose /> : <IconSearch />}
            </button>

            {/* Profile dropdown */}
            <div className="relative" ref={profileRef}>
              <button
                onClick={() => { setProfileOpen((v) => !v); setSearchOpen(false) }}
                aria-label="Account menu"
                aria-expanded={profileOpen}
                aria-haspopup="menu"
                className={`flex items-center gap-1 p-1.5 rounded-lg transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-500 ${
                  profileOpen
                    ? 'bg-accent-500/15 text-accent-300'
                    : 'text-surface-400 hover:text-accent-300 hover:bg-accent-500/10'
                }`}
              >
                <span className="h-7 w-7 overflow-hidden rounded-lg ring-1 ring-accent-500/50 bg-accent-700 flex items-center justify-center text-xs font-bold text-white select-none" aria-hidden="true">
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
                  className="absolute right-0 top-full mt-1 w-40 max-w-[calc(100vw-1rem)] rounded-xl bg-surface-900/95 backdrop-blur-xl border border-surface-700/60 shadow-xl shadow-surface-950/40 overflow-hidden z-50"
                >
                  <Link
                    href="/settings"
                    role="menuitem"
                    onClick={() => setProfileOpen(false)}
                    className="flex items-center gap-2 w-full px-4 py-2.5 text-sm text-surface-300 hover:bg-accent-500/10 hover:text-accent-300 focus-visible:outline-none focus-visible:bg-accent-500/10 focus-visible:text-accent-300 transition-colors"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-surface-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    Settings
                  </Link>
                  <div className="border-t border-surface-700/60" role="separator" />
                  <button
                    role="menuitem"
                    onClick={handleLogout}
                    className="flex items-center gap-2 w-full px-4 py-2.5 text-sm text-surface-300 hover:bg-accent-500/10 hover:text-accent-300 focus-visible:outline-none focus-visible:bg-accent-500/10 focus-visible:text-accent-300 transition-colors"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-surface-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
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

      {/* Search panel — sticky below safe-area top nav */}
      {searchOpen && (
        <div className="sticky top-[calc(3.5rem+env(safe-area-inset-top))] z-30 bg-surface-900/95 backdrop-blur-xl border-b border-surface-800/90 px-4 py-3 overflow-x-hidden">
          <div className="max-w-2xl mx-auto">
            <NavSearch onClose={() => setSearchOpen(false)} />
          </div>
        </div>
      )}

      {/* Bottom nav — mobile only */}
      <nav
        className="fixed bottom-0 inset-x-0 md:hidden z-40 bg-surface-900/95 backdrop-blur-xl border-t border-surface-800/90 pb-[env(safe-area-inset-bottom)]"
        role="navigation"
        aria-label="Mobile navigation"
      >
        <div className="flex items-stretch">
          {NAV_LINKS.map(({ href, label }) => {
            const Icon = BOTTOM_NAV_ICONS[href]
            const active = pathname === href
            return (
              <Link
                key={href}
                href={href}
                aria-current={active ? 'page' : undefined}
                className={bottomNavItemClass(active)}
              >
                <Icon />
                <span>{label}</span>
              </Link>
            )
          })}

          {/* Search button */}
          <button
            onClick={() => { setSearchOpen((v) => !v); setProfileOpen(false) }}
            aria-label={searchOpen ? 'Close search' : 'Open search'}
            aria-expanded={searchOpen}
            className={bottomNavItemClass(searchOpen)}
          >
            {searchOpen ? <IconClose /> : <IconSearch />}
            <span>Search</span>
          </button>
        </div>
      </nav>
    </>
  )
}
