// LimitList Service Worker
// Cache strategy:
//   - Static assets (/_next/static/, icons, manifest): cache-first / stale-while-revalidate
//   - Navigation HTML: network-first, fall back to /offline on failure
//   - API routes (/api/*): network-only, never cached
//   - /login, /setup: network-only, never cached

const CACHE_VERSION = 'v1'
const STATIC_CACHE = `limitlist-static-${CACHE_VERSION}`
const OFFLINE_URL = '/offline'

const PRECACHE_URLS = [
  OFFLINE_URL,
  '/pwa-192.png',
  '/pwa-512.png',
  '/pwa-maskable-512.png',
  '/manifest.webmanifest',
]

// Patterns that must never be cached
const NETWORK_ONLY_PATTERNS = [
  /^\/api\//,
  /^\/login(\/|$|\?)/,
  /^\/setup(\/|$|\?)/,
]

function isNetworkOnly(url) {
  const { pathname } = new URL(url)
  return NETWORK_ONLY_PATTERNS.some(re => re.test(pathname))
}

function isStaticAsset(url) {
  const { pathname } = new URL(url)
  return (
    pathname.startsWith('/_next/static/') ||
    pathname.startsWith('/pwa-') ||
    pathname === '/manifest.webmanifest' ||
    pathname === '/favicon.ico' ||
    pathname === '/favicon.png' ||
    pathname === '/apple-touch-icon.png'
  )
}

function isNavigation(request) {
  return request.mode === 'navigate'
}

// ── Install ────────────────────────────────────────────────────────────────
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(STATIC_CACHE).then(cache => cache.addAll(PRECACHE_URLS))
  )
  self.skipWaiting()
})

// ── Activate ───────────────────────────────────────────────────────────────
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys
          .filter(key => key.startsWith('limitlist-') && key !== STATIC_CACHE)
          .map(key => caches.delete(key))
      )
    )
  )
  self.clients.claim()
})

// ── Fetch ──────────────────────────────────────────────────────────────────
self.addEventListener('fetch', event => {
  const { request } = event
  const url = request.url

  // Only handle same-origin requests
  if (!url.startsWith(self.location.origin)) return

  // Network-only: API routes, login, setup
  if (isNetworkOnly(url)) return

  // Static assets: cache-first, stale-while-revalidate
  if (isStaticAsset(url)) {
    event.respondWith(cacheFirstStale(request))
    return
  }

  // Navigation: network-first, fall back to offline page
  if (isNavigation(request)) {
    event.respondWith(navigationNetworkFirst(request))
    return
  }
})

async function cacheFirstStale(request) {
  const cached = await caches.match(request)
  const networkPromise = fetch(request)
    .then(response => {
      if (response.ok) {
        caches.open(STATIC_CACHE).then(cache => cache.put(request, response.clone()))
      }
      return response
    })
    .catch(() => null)

  return cached ?? (await networkPromise) ?? Response.error()
}

async function navigationNetworkFirst(request) {
  try {
    const response = await fetch(request)
    // Never store personalized navigation responses in cache
    return response
  } catch {
    const offline = await caches.match(OFFLINE_URL)
    return offline ?? Response.error()
  }
}
