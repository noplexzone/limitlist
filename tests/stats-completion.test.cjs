const assert = require('node:assert/strict')
const fs = require('node:fs')
const Module = require('node:module')
const path = require('node:path')
const test = require('node:test')
const ts = require('typescript')

const sourcePath = path.join(__dirname, '../src/lib/stats.ts')
const source = fs.readFileSync(sourcePath, 'utf8')
const compiled = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  fileName: sourcePath,
}).outputText
const m = new Module(sourcePath, module)
m.filename = sourcePath
m.paths = Module._nodeModulePaths(path.dirname(sourcePath))
m._compile(compiled, sourcePath)
const { computeStats } = m.exports

function makeShow(status, overrides = {}) {
  return {
    id: Math.random().toString(36).slice(2),
    metadataProvider: 'tvdb', metadataId: '1', title: 'T',
    originalTitle: null, overview: null, posterUrl: null, firstAiredAt: null,
    status, episodesTotal: null, genres: null, studios: null,
    rating: null, notes: null, airingStatus: null, nextEpisodeNum: null,
    nextAiringAt: null, lastEpisodeNum: null, lastAiredAt: null,
    airingRefreshedAt: null, airedEpisodeCount: null, upToDateEpisodeNum: null,
    upToDateAiredAt: null, upToDateStale: false, plexRatingKey: null,
    plexSyncedAt: null, nextEpisodeName: null, nextEpisodeStillUrl: null,
    sourceProvider: null, sourceId: null, createdAt: new Date(), updatedAt: new Date(),
    ...overrides,
  }
}

test('1 COMPLETED out of 4 shows = 25% completion rate', () => {
  const shows = [
    makeShow('COMPLETED'),
    makeShow('WATCHING'),
    makeShow('PLAN_TO_WATCH'),
    makeShow('PAUSED'),
  ]
  const { completionRate, byStatus } = computeStats(shows)
  assert.equal(byStatus.COMPLETED, 1, 'byStatus.COMPLETED should be 1')
  assert.equal(byStatus.WATCHING, 1, 'byStatus.WATCHING should be 1')
  assert.equal(byStatus.PLAN_TO_WATCH, 1, 'byStatus.PLAN_TO_WATCH should be 1')
  assert.equal(byStatus.PAUSED, 1, 'byStatus.PAUSED should be 1')
  assert.equal(completionRate, 25, `completionRate should be 25, got ${completionRate}`)
})

test('0 COMPLETED shows = 0% completion rate', () => {
  const shows = [makeShow('WATCHING'), makeShow('PLAN_TO_WATCH')]
  const { completionRate } = computeStats(shows)
  assert.equal(completionRate, 0)
})

test('all COMPLETED shows = 100% completion rate', () => {
  const shows = [makeShow('COMPLETED'), makeShow('COMPLETED'), makeShow('COMPLETED')]
  const { completionRate } = computeStats(shows)
  assert.equal(completionRate, 100)
})

test('empty show list = 0% completion rate (no division by zero)', () => {
  const { completionRate } = computeStats([])
  assert.equal(completionRate, 0)
})

test('DROPPED and UP_TO_DATE are not counted as COMPLETED', () => {
  const shows = [
    makeShow('DROPPED'),
    makeShow('UP_TO_DATE'),
    makeShow('WATCHING'),
    makeShow('COMPLETED'),
  ]
  const { byStatus, completionRate } = computeStats(shows)
  assert.equal(byStatus.COMPLETED, 1)
  assert.equal(byStatus.DROPPED, 1)
  assert.equal(byStatus.UP_TO_DATE, 1)
  assert.equal(completionRate, 25)
})

test('averageRating is null when no shows have ratings', () => {
  const shows = [makeShow('WATCHING'), makeShow('COMPLETED')]
  const { averageRating } = computeStats(shows)
  assert.equal(averageRating, null)
})

test('averageRating is computed correctly when ratings exist', () => {
  const shows = [
    makeShow('COMPLETED', { rating: 4 }),
    makeShow('WATCHING', { rating: 2 }),
  ]
  const { averageRating } = computeStats(shows)
  assert.equal(averageRating, 3)
})
