'use strict'
const assert = require('node:assert/strict')
const fs = require('node:fs')
const test = require('node:test')
const ts = require('typescript')

// Extract just the isAnimeLike function from tvdb.ts (it has no external deps)
// by stripping import lines and adding a CJS export.
const sourcePath = require('path').join(__dirname, '../src/lib/tvdb.ts')
const source = fs.readFileSync(sourcePath, 'utf8')

// Remove import lines and wrap the extracted function for standalone use
const noImports = source
  .split('\n')
  .filter((l) => !l.trimStart().startsWith('import '))
  .join('\n')

// Patch: expose isAnimeLike as an export
const patched = noImports.replace(
  /^function isAnimeLike\(/m,
  'export function isAnimeLike('
)

const compiled = ts.transpileModule(patched, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  fileName: sourcePath,
}).outputText

// eslint-disable-next-line no-new-func
const mod = new (require('node:module'))(sourcePath, module)
mod.filename = sourcePath
mod.paths = require('node:module')._nodeModulePaths(require('path').dirname(sourcePath))
mod._compile(compiled, sourcePath)
const { isAnimeLike, searchResultTitle, buildAnimeSearchQueries } = mod.exports

// Helper builders
function sparse(name) {
  return { name }
}
function withAnimeSignals(overrides) {
  return { name: 'Test', ...overrides }
}
function usSeries(name) {
  return { name, genres: ['Drama', 'Crime'], primary_language: 'eng', country: 'us' }
}

test('sparse result (title only) is eligible', () => {
  assert.equal(isAnimeLike(sparse('Dragon Ball Z')), true,
    'sparse result with title only should be eligible (no metadata to reject it)')
})

test('sparse result with overview only is eligible', () => {
  assert.equal(isAnimeLike({ name: 'Some Show', overview: 'A story about a hero.' }), true,
    'result with no genre/country/language metadata should be eligible')
})

test('anime genre signal makes it eligible', () => {
  assert.equal(isAnimeLike(withAnimeSignals({ genres: ['Anime', 'Action'] })), true)
})

test('animation genre signal makes it eligible', () => {
  assert.equal(isAnimeLike(withAnimeSignals({ genres: ['Animation'] })), true)
})

test('japanese primary_language makes it eligible', () => {
  assert.equal(isAnimeLike(withAnimeSignals({ primary_language: 'jpn' })), true)
})

test('jp country makes it eligible', () => {
  assert.equal(isAnimeLike(withAnimeSignals({ country: 'jp' })), true)
})

test('populated US/eng/drama metadata is rejected', () => {
  assert.equal(isAnimeLike(usSeries('Breaking Bad')), false,
    'US English drama series should be rejected')
})

test('populated US/eng/sci-fi metadata is rejected', () => {
  assert.equal(isAnimeLike({ name: 'The Expanse', genres: ['Sci-Fi', 'Drama'], primary_language: 'eng', country: 'us' }), false)
})

test('populated non-anime metadata with animation genre is eligible', () => {
  // Western animation — currently passes because of "animation" signal; this stays true
  assert.equal(isAnimeLike({ name: 'Batman TAS', genres: ['Animation', 'Action'], primary_language: 'eng', country: 'us' }), true)
})


test('English TVDB translation is used for localized search result title', () => {
  assert.equal(searchResultTitle({ name: 'モンスター', translations: { eng: 'Monster', jpn: 'モンスター' } }), 'Monster')
})

test('year-qualified search is tried before the generic candidate', () => {
  assert.deepEqual(buildAnimeSearchQueries(['monster'], 2004), ['monster 2004', 'monster'])
})

test('search queries stay bounded to six title candidates', () => {
  assert.equal(buildAnimeSearchQueries(['a', 'b', 'c', 'd', 'e', 'f', 'g'], 2004).length, 12)
})
