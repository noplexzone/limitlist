// Contract tests for public/sw.js (service worker source)
// Tests verify the text of the SW source satisfies required ordering guarantees
// and behavioral constraints that cannot be inferred from runtime alone.

const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const test = require('node:test')

const swSource = fs.readFileSync(
  path.join(__dirname, '../public/sw.js'),
  'utf8'
)

// ── Registration guard ─────────────────────────────────────────────────────

test('SW registration component guards with process.env.NODE_ENV !== production', () => {
  const regSource = fs.readFileSync(
    path.join(__dirname, '../src/components/ServiceWorkerRegistration.tsx'),
    'utf8'
  )
  assert.ok(
    regSource.includes("process.env.NODE_ENV !== 'production'"),
    'Registration must be guarded by NODE_ENV production check'
  )
})

test('SW registration component only runs in useEffect (client-side only)', () => {
  const regSource = fs.readFileSync(
    path.join(__dirname, '../src/components/ServiceWorkerRegistration.tsx'),
    'utf8'
  )
  assert.ok(regSource.includes('useEffect'), 'Registration must use useEffect')
  assert.ok(regSource.includes("'use client'"), 'Component must be a client component')
})

// ── API routes — network-only ordering ────────────────────────────────────

test('SW checks for /api/ before any cache operation in fetch handler', () => {
  // The NETWORK_ONLY_PATTERNS must include /api/
  assert.ok(swSource.includes('/^\\/api\\//'), 'SW must have /^\/api\// pattern for network-only')
  // And isNetworkOnly must be checked early (before cache checks)
  const fetchHandlerIdx = swSource.indexOf("addEventListener('fetch'")
  const networkOnlyCheckIdx = swSource.indexOf('isNetworkOnly', fetchHandlerIdx)
  const cacheFirstIdx = swSource.indexOf('cacheFirst', fetchHandlerIdx)
  const navigationIdx = swSource.indexOf('isNavigation', fetchHandlerIdx)
  assert.ok(networkOnlyCheckIdx > fetchHandlerIdx, 'isNetworkOnly check must be inside fetch handler')
  assert.ok(
    networkOnlyCheckIdx < cacheFirstIdx,
    'isNetworkOnly check must come before cache-first branch'
  )
  assert.ok(
    networkOnlyCheckIdx < navigationIdx,
    'isNetworkOnly check must come before navigation branch'
  )
})

test('SW returns immediately (network-only) for API routes without caching', () => {
  // The isNetworkOnly early-return path must NOT call cache.put or respondWith
  // We verify by confirming the early return pattern is present
  assert.ok(
    swSource.includes('if (isNetworkOnly(url)) return'),
    'SW must early-return for network-only routes without intercepting response'
  )
})

// ── Navigation — no personalized cache.put ─────────────────────────────────

test('navigationNetworkFirst function never calls cache.put', () => {
  const navFuncStart = swSource.indexOf('async function navigationNetworkFirst')
  assert.ok(navFuncStart !== -1, 'navigationNetworkFirst function must exist')
  // Find the function body (from its start to the closing brace)
  // Extract content between the function start and the next top-level async function
  const afterNavFunc = swSource.indexOf('\nasync function ', navFuncStart + 1)
  const navFuncBody = afterNavFunc === -1
    ? swSource.slice(navFuncStart)
    : swSource.slice(navFuncStart, afterNavFunc)
  assert.ok(
    !navFuncBody.includes('cache.put'),
    'navigationNetworkFirst must NOT call cache.put (no personalized navigation caching)'
  )
})

test('navigation network failure falls back to offline URL constant', () => {
  const navFuncStart = swSource.indexOf('async function navigationNetworkFirst')
  const afterNavFunc = swSource.indexOf('\nasync function ', navFuncStart + 1)
  const navFuncBody = afterNavFunc === -1
    ? swSource.slice(navFuncStart)
    : swSource.slice(navFuncStart, afterNavFunc)
  assert.ok(
    navFuncBody.includes('OFFLINE_URL') || navFuncBody.includes("'/offline'"),
    'navigationNetworkFirst must reference OFFLINE_URL or /offline for fallback'
  )
})

// ── Offline page precached ──────────────────────────────────────────────────

test('SW precaches the offline fallback URL', () => {
  assert.ok(
    swSource.includes("'/offline'"),
    "SW must include '/offline' in precache list"
  )
  assert.ok(
    swSource.includes('PRECACHE_URLS') && swSource.includes("'/offline'"),
    'offline URL must appear in PRECACHE_URLS'
  )
})

// ── Login/setup never cached ────────────────────────────────────────────────

test('SW treats /login as network-only', () => {
  assert.ok(
    swSource.includes('\\/login'),
    'NETWORK_ONLY_PATTERNS must include /login'
  )
})

test('SW treats /setup as network-only', () => {
  assert.ok(
    swSource.includes('\\/setup'),
    'NETWORK_ONLY_PATTERNS must include /setup'
  )
})

// ── Old cache cleanup ───────────────────────────────────────────────────────

test('SW activate handler clears old versioned caches', () => {
  const activateIdx = swSource.indexOf("addEventListener('activate'")
  assert.ok(activateIdx !== -1, 'SW must have activate listener')
  const afterActivate = swSource.slice(activateIdx)
  assert.ok(
    afterActivate.includes('caches.delete') || afterActivate.includes('caches.keys'),
    'activate handler must clean up old caches'
  )
})

// ── Icon and manifest precaching ────────────────────────────────────────────

test('SW precaches the web manifest', () => {
  assert.ok(
    swSource.includes("'/manifest.webmanifest'"),
    "SW must precache '/manifest.webmanifest'"
  )
})

test('SW precaches PWA icons', () => {
  assert.ok(swSource.includes("'/pwa-192.png'"), "SW must precache pwa-192.png")
  assert.ok(swSource.includes("'/pwa-512.png'"), "SW must precache pwa-512.png")
})
