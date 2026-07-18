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

function makeShow(overrides = {}) {
  return {
    id: 'x', metadataProvider: 'tvdb', metadataId: '1', title: 'T',
    originalTitle: null, overview: null, posterUrl: null, firstAiredAt: null,
    status: 'WATCHING', episodesTotal: null, genres: null, studios: null,
    rating: null, notes: null, airingStatus: null, nextEpisodeNum: null,
    nextAiringAt: null, lastEpisodeNum: null, lastAiredAt: null,
    airingRefreshedAt: null, airedEpisodeCount: null, upToDateEpisodeNum: null,
    upToDateAiredAt: null, upToDateStale: false, plexRatingKey: null,
    plexSyncedAt: null, nextEpisodeName: null, nextEpisodeStillUrl: null,
    sourceProvider: null, sourceId: null, createdAt: new Date(), updatedAt: new Date(),
    ...overrides,
  }
}

test('genres: "Anime" is excluded from topGenres', () => {
  const shows = [
    makeShow({ genres: 'Anime, Action, Comedy' }),
    makeShow({ genres: 'Anime, Drama' }),
    makeShow({ genres: 'Action, Thriller' }),
  ]
  const stats = computeStats(shows)
  const names = stats.topGenres.map((g) => g.name.toLowerCase())
  assert.ok(!names.includes('anime'), `"anime" should be excluded but got: ${JSON.stringify(stats.topGenres)}`)
})

test('genres: "Animation" is excluded from topGenres', () => {
  const shows = [
    makeShow({ genres: 'Animation, Sci-Fi' }),
    makeShow({ genres: 'Animation, Fantasy' }),
  ]
  const stats = computeStats(shows)
  const names = stats.topGenres.map((g) => g.name.toLowerCase())
  assert.ok(!names.includes('animation'), `"animation" should be excluded but got: ${JSON.stringify(stats.topGenres)}`)
})

test('genres: "N/A" is excluded from topGenres', () => {
  const shows = [
    makeShow({ genres: 'N/A' }),
    makeShow({ genres: 'n/a, Action' }),
  ]
  const stats = computeStats(shows)
  const names = stats.topGenres.map((g) => g.name.toLowerCase())
  assert.ok(!names.includes('n/a'), `"n/a" should be excluded from genres`)
})

test('genres: empty tokens are excluded', () => {
  const shows = [makeShow({ genres: ', Action, , Comedy,' })]
  const stats = computeStats(shows)
  const names = stats.topGenres.map((g) => g.name)
  assert.ok(!names.includes(''), 'empty tokens should be excluded')
})

test('genres: valid non-anime genres are still counted', () => {
  const shows = [
    makeShow({ genres: 'Anime, Action, Drama' }),
    makeShow({ genres: 'Action, Comedy' }),
  ]
  const stats = computeStats(shows)
  const actionEntry = stats.topGenres.find((g) => g.name.toLowerCase() === 'action')
  assert.ok(actionEntry, 'Action should still appear in topGenres')
  assert.equal(actionEntry.count, 2)
})

test('studios: "Anime" is NOT excluded from topStudios', () => {
  const shows = [
    makeShow({ studios: 'Anime Ltd, MAPPA' }),
    makeShow({ studios: 'Anime Ltd, Bones' }),
  ]
  const stats = computeStats(shows)
  const names = stats.topStudios.map((s) => s.name.toLowerCase())
  assert.ok(names.includes('anime ltd'), `"Anime Ltd" should appear in studios`)
})

test('studios: "Animation" is NOT excluded from topStudios', () => {
  const shows = [
    makeShow({ studios: 'Toei Animation' }),
    makeShow({ studios: 'Toei Animation' }),
  ]
  const stats = computeStats(shows)
  const names = stats.topStudios.map((s) => s.name.toLowerCase())
  assert.ok(names.includes('toei animation'), `"Toei Animation" should appear in studios`)
})

test('studios: "n/a" is excluded from topStudios as generic missing value', () => {
  const shows = [
    makeShow({ studios: 'n/a' }),
    makeShow({ studios: 'N/A, MAPPA' }),
  ]
  const stats = computeStats(shows)
  const names = stats.topStudios.map((s) => s.name.toLowerCase())
  assert.ok(!names.includes('n/a'), '"n/a" should be excluded from studios')
})

test('studios: empty tokens are excluded', () => {
  const shows = [makeShow({ studios: ', Studio A, ,' })]
  const stats = computeStats(shows)
  const names = stats.topStudios.map((s) => s.name)
  assert.ok(!names.includes(''), 'empty tokens should be excluded from studios')
})
