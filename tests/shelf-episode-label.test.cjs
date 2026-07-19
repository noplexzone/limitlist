const assert = require('node:assert/strict')
const fs = require('node:fs')
const Module = require('node:module')
const path = require('node:path')
const test = require('node:test')
const ts = require('typescript')

const sourcePath = path.join(__dirname, '../src/lib/format-episode.ts')
const source = fs.readFileSync(sourcePath, 'utf8')
const compiled = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  fileName: sourcePath,
}).outputText
const m = new Module(sourcePath, module)
m.filename = sourcePath
m.paths = Module._nodeModulePaths(path.dirname(sourcePath))
m._compile(compiled, sourcePath)
const { formatEpisodeLabel } = m.exports

test('with season and episode name: Sx · Ey — Name format', () => {
  assert.equal(
    formatEpisodeLabel(1, 5, 'Cursed Womb'),
    'Up next: S1 · Ep 5 — Cursed Womb'
  )
})

test('with season but no name: Sx · Ey format', () => {
  assert.equal(
    formatEpisodeLabel(2, 1, null),
    'Up next: S2 · Ep 1'
  )
})

test('without season and with name: Ep y — Name format', () => {
  assert.equal(
    formatEpisodeLabel(null, 25, 'Final Battle'),
    'Up next: Ep 25 — Final Battle'
  )
})

test('without season and without name: Ep y format', () => {
  assert.equal(
    formatEpisodeLabel(null, 12, undefined),
    'Up next: Ep 12'
  )
})

test('season 0 (TVDB Specials) is a valid season and is shown', () => {
  // season 0 means "Specials" in TVDB — it's a legitimate season identifier
  assert.equal(
    formatEpisodeLabel(0, 3, 'Episode'),
    'Up next: S0 · Ep 3 — Episode'
  )
})
