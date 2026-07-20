const assert = require('node:assert/strict')
const fs = require('node:fs')
const Module = require('node:module')
const path = require('node:path')
const test = require('node:test')
const ts = require('typescript')

const sourcePath = path.join(__dirname, '../src/lib/continue-watching.ts')
const source = fs.readFileSync(sourcePath, 'utf8')
const compiled = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  fileName: sourcePath,
}).outputText
const m = new Module(sourcePath, module)
m.filename = sourcePath
m.paths = Module._nodeModulePaths(path.dirname(sourcePath))
m._compile(compiled, sourcePath)
const { nextContinueEpisode } = m.exports

function ce(seasonNumber, episodeNumber, name, airDate) {
  return { seasonNumber, episodeNumber, name: name ?? null, airDate: airDate ?? null }
}

function w(seasonNumber, episodeNumber, watched, opts = {}) {
  return {
    seasonNumber,
    episodeNumber,
    watched,
    watchedAt: watched ? (opts.watchedAt ?? new Date('2026-01-01T00:00:00Z')) : null,
    episodeName: opts.name ?? null,
  }
}

test('returns null when no watches at all', () => {
  assert.equal(nextContinueEpisode([]), null)
})

test('returns null when all rows are unwatched', () => {
  const watches = [w(1, 1, false), w(1, 2, false), w(1, 3, false)]
  assert.equal(nextContinueEpisode(watches), null)
})

test('basic: watched ep1, unwatched ep2 → returns ep2', () => {
  const watches = [w(1, 1, true, { name: 'Ep One' }), w(1, 2, false, { name: 'Ep Two' })]
  const result = nextContinueEpisode(watches)
  assert.deepEqual(result, {
    seasonNumber: 1,
    episodeNumber: 2,
    episodeName: 'Ep Two',
    furthestWatchedAt: new Date('2026-01-01T00:00:00Z'),
  })
})

test('Pokémon-style: gaps before furthest watched are ignored', () => {
  // Watched: 1, 3, 5. Unwatched: 2, 4, 6, 7.
  // Furthest watched = ep5. Next unwatched after ep5 = ep6.
  const watches = [
    w(1, 1, true),
    w(1, 2, false),
    w(1, 3, true),
    w(1, 4, false),
    w(1, 5, true),
    w(1, 6, false, { name: 'Next One' }),
    w(1, 7, false),
  ]
  const result = nextContinueEpisode(watches)
  assert.equal(result?.episodeNumber, 6)
  assert.equal(result?.seasonNumber, 1)
  assert.equal(result?.episodeName, 'Next One')
})

test('season transition: furthest watched is last ep of S1, next is first ep of S2', () => {
  const watches = [
    w(1, 12, true, { watchedAt: new Date('2026-03-01T00:00:00Z') }),
    w(2, 1, false, { name: 'New Season' }),
  ]
  const result = nextContinueEpisode(watches)
  assert.equal(result?.seasonNumber, 2)
  assert.equal(result?.episodeNumber, 1)
  assert.equal(result?.episodeName, 'New Season')
  assert.deepEqual(result?.furthestWatchedAt, new Date('2026-03-01T00:00:00Z'))
})

test('fully watched: all rows watched → returns null', () => {
  const watches = [w(1, 1, true), w(1, 2, true), w(1, 3, true)]
  assert.equal(nextContinueEpisode(watches), null)
})

test('fully watched across seasons → returns null', () => {
  const watches = [w(1, 12, true), w(2, 1, true), w(2, 13, true)]
  assert.equal(nextContinueEpisode(watches), null)
})

test('season-0 rows are excluded entirely', () => {
  // Only specials (season 0) — no main season rows → returns null
  const watches = [w(0, 1, true), w(0, 2, false)]
  assert.equal(nextContinueEpisode(watches), null)
})

test('season-0 rows do not affect main-season furthest calculation', () => {
  // S0E1 watched, S1E1 watched, S1E2 not. Furthest main-season watched = S1E1.
  const watches = [w(0, 1, true), w(1, 1, true), w(1, 2, false, { name: 'Second' })]
  const result = nextContinueEpisode(watches)
  assert.equal(result?.seasonNumber, 1)
  assert.equal(result?.episodeNumber, 2)
})

test('multiple seasons with gap in S1, furthest in S2', () => {
  // S1: 1 watched, 2 not watched. S2: 1 watched. → furthest = S2E1, no unwatched after it.
  const watches = [w(1, 1, true), w(1, 2, false), w(2, 1, true)]
  assert.equal(nextContinueEpisode(watches), null)
})

test('sorting is canonical not insertion-order', () => {
  // Episodes provided in reverse order; furthest watched must be determined after sort.
  const watches = [
    w(1, 3, false, { name: 'Third' }),
    w(1, 2, false),
    w(1, 1, true),
  ]
  const result = nextContinueEpisode(watches)
  assert.equal(result?.episodeNumber, 2)
})

test('episodeName is null when not provided', () => {
  const watches = [w(1, 1, true), w(1, 2, false)]
  const result = nextContinueEpisode(watches)
  assert.equal(result?.episodeName, null)
})

test('dashboard page uses nextContinueEpisode from continue-watching module', () => {
  const pageSource = fs.readFileSync(
    path.join(__dirname, '../src/app/dashboard/page.tsx'),
    'utf8'
  )
  assert.match(pageSource, /from '@\/lib\/continue-watching'/, 'should import from continue-watching')
  assert.match(pageSource, /nextContinueEpisode/, 'should call nextContinueEpisode')
  assert.doesNotMatch(pageSource, /s\.nextEpisodeNum.*continueWatching|continueWatching.*nextEpisodeNum.*s\./, 'should not pass show.nextEpisodeNum into continueWatching array directly')
})

test('dashboard excludes DROPPED and COMPLETED from continue watching', () => {
  const pageSource = fs.readFileSync(
    path.join(__dirname, '../src/app/dashboard/page.tsx'),
    'utf8'
  )
  assert.match(pageSource, /status.*!==.*'DROPPED'|'DROPPED'.*!==.*status/, 'should exclude DROPPED')
  assert.match(pageSource, /status.*!==.*'COMPLETED'|'COMPLETED'.*!==.*status/, 'should exclude COMPLETED')
})

test('ShelfShow interface includes nextSeasonNum', () => {
  const pageSource = fs.readFileSync(
    path.join(__dirname, '../src/app/dashboard/page.tsx'),
    'utf8'
  )
  assert.match(pageSource, /nextSeasonNum/, 'ShelfShow should have nextSeasonNum')
})

test('formatEpisodeLabel receives nextSeasonNum from ShelfShow', () => {
  const pageSource = fs.readFileSync(
    path.join(__dirname, '../src/app/dashboard/page.tsx'),
    'utf8'
  )
  assert.match(pageSource, /formatEpisodeLabel\(show\.nextSeasonNum/, 'formatEpisodeLabel should receive show.nextSeasonNum')
})

// ── Canonical mode tests ──────────────────────────────────────────────────────

test('canonical: manual-only S1E1 watch → next canonical episode is S1E2', () => {
  // Manual progress creates only a watched=true row; no unwatched S1E2 in ledger.
  const watches = [w(1, 1, true, { name: 'Ep One', watchedAt: new Date('2026-01-01T00:00:00Z') })]
  const canonical = [
    ce(1, 1, 'Ep One', '2026-01-01'),
    ce(1, 2, 'Ep Two', '2026-01-08'),
  ]
  const result = nextContinueEpisode(watches, canonical, new Date('2026-02-01T00:00:00Z'))
  assert.deepEqual(result, {
    seasonNumber: 1,
    episodeNumber: 2,
    episodeName: 'Ep Two',
    furthestWatchedAt: new Date('2026-01-01T00:00:00Z'),
  })
})

test('canonical: future episodes are excluded', () => {
  const watches = [w(1, 1, true)]
  const canonical = [
    ce(1, 1, 'Ep One', '2026-01-01'),
    ce(1, 2, 'Future', '2099-01-01'),
  ]
  const result = nextContinueEpisode(watches, canonical, new Date('2026-02-01T00:00:00Z'))
  assert.equal(result, null)
})

test('canonical: unaired episode (null airDate) is excluded', () => {
  const watches = [w(1, 1, true)]
  const canonical = [
    ce(1, 1, 'Ep One', '2026-01-01'),
    ce(1, 2, 'TBA', null),
  ]
  const result = nextContinueEpisode(watches, canonical, new Date('2026-02-01T00:00:00Z'))
  assert.equal(result, null)
})

test('canonical: season transition — last ep of S1 watched, S2E1 returns correctly', () => {
  const watches = [w(1, 12, true, { watchedAt: new Date('2026-03-01T00:00:00Z') })]
  const canonical = [
    ce(1, 12, 'S1 Finale', '2026-01-01'),
    ce(2, 1, 'New Season', '2026-04-01'),
  ]
  const result = nextContinueEpisode(watches, canonical, new Date('2026-05-01T00:00:00Z'))
  assert.equal(result?.seasonNumber, 2)
  assert.equal(result?.episodeNumber, 1)
  assert.equal(result?.episodeName, 'New Season')
  assert.deepEqual(result?.furthestWatchedAt, new Date('2026-03-01T00:00:00Z'))
})

test('canonical: season-0 specials are excluded', () => {
  const watches = [w(1, 1, true)]
  const canonical = [
    ce(0, 1, 'OVA', '2026-01-01'),
    ce(1, 1, 'Ep One', '2026-01-01'),
    ce(1, 2, 'Ep Two', '2026-02-01'),
  ]
  const result = nextContinueEpisode(watches, canonical, new Date('2026-03-01T00:00:00Z'))
  assert.equal(result?.seasonNumber, 1)
  assert.equal(result?.episodeNumber, 2)
})

test('canonical: no progress → returns null', () => {
  const watches = []
  const canonical = [ce(1, 1, 'Ep One', '2026-01-01')]
  assert.equal(nextContinueEpisode(watches, canonical, new Date('2026-02-01T00:00:00Z')), null)
})

test('canonical: all aired eps watched → returns null', () => {
  const watches = [w(1, 1, true), w(1, 2, true)]
  const canonical = [ce(1, 1, 'Ep One', '2026-01-01'), ce(1, 2, 'Ep Two', '2026-02-01')]
  assert.equal(nextContinueEpisode(watches, canonical, new Date('2026-03-01T00:00:00Z')), null)
})

test('canonical: empty array falls back to null (no canonical episodes)', () => {
  // An empty canonical list means no aired episodes to iterate.
  const watches = [w(1, 1, true)]
  assert.equal(nextContinueEpisode(watches, [], new Date('2026-02-01T00:00:00Z')), null)
})

test('provider unavailable: ledger fallback works when canonical omitted', () => {
  // Simulates TVDB being unavailable — caller passes no canonicalEpisodes.
  const watches = [w(1, 1, true, { name: 'Ep One' }), w(1, 2, false, { name: 'Ep Two' })]
  const result = nextContinueEpisode(watches)
  assert.equal(result?.seasonNumber, 1)
  assert.equal(result?.episodeNumber, 2)
  assert.equal(result?.episodeName, 'Ep Two')
})

// ── Dashboard source / bounded-metadata integration ──────────────────────────

test('dashboard imports CanonicalEpisode from continue-watching', () => {
  const pageSource = fs.readFileSync(
    path.join(__dirname, '../src/app/dashboard/page.tsx'),
    'utf8'
  )
  assert.match(pageSource, /CanonicalEpisode/, 'dashboard should reference CanonicalEpisode')
})

test('dashboard calls nextContinueEpisode with canonical episodes', () => {
  const pageSource = fs.readFileSync(
    path.join(__dirname, '../src/app/dashboard/page.tsx'),
    'utf8'
  )
  assert.match(pageSource, /nextContinueEpisode\(watches,\s*canonical\)/, 'should call nextContinueEpisode with canonical arg')
})

test('dashboard bounds TVDB fetches for Continue Watching (CW_FETCH_BOUND)', () => {
  const pageSource = fs.readFileSync(
    path.join(__dirname, '../src/app/dashboard/page.tsx'),
    'utf8'
  )
  assert.match(pageSource, /CW_FETCH_BOUND/, 'dashboard should define CW_FETCH_BOUND')
  assert.match(pageSource, /slice\(0,\s*CW_FETCH_BOUND\)/, 'dashboard should slice candidates to CW_FETCH_BOUND')
})

test('dashboard uses ledger fallback nextContinueEpisode when TVDB unavailable', () => {
  const pageSource = fs.readFileSync(
    path.join(__dirname, '../src/app/dashboard/page.tsx'),
    'utf8'
  )
  // Should have a fallback call to nextContinueEpisode(watches) without canonical
  assert.match(pageSource, /nextContinueEpisode\(watches\)/, 'should have ledger-only fallback call')
})
