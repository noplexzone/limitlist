const assert = require('node:assert/strict')
const fs = require('node:fs')
const Module = require('node:module')
const path = require('node:path')
const test = require('node:test')
const ts = require('typescript')

const sourcePath = path.join(__dirname, '../src/lib/discover-pagination.ts')
const source = fs.readFileSync(sourcePath, 'utf8')
const compiled = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  fileName: sourcePath,
}).outputText
const m = new Module(sourcePath, module)
m.filename = sourcePath
m.paths = Module._nodeModulePaths(path.dirname(sourcePath))
m._compile(compiled, sourcePath)
const { encodeCursor, decodeCursor, computeNextCursor } = m.exports

// --- encodeCursor / decodeCursor round-trips ---

test('round-trip: page=1 offset=0', () => {
  assert.deepEqual(decodeCursor(encodeCursor(1, 0)), { page: 1, offset: 0 })
})

test('round-trip: page=1000 offset=49', () => {
  assert.deepEqual(decodeCursor(encodeCursor(1000, 49)), { page: 1000, offset: 49 })
})

test('round-trip: mid values page=7 offset=23', () => {
  assert.deepEqual(decodeCursor(encodeCursor(7, 23)), { page: 7, offset: 23 })
})

// --- decodeCursor rejects invalid ---

test('decodeCursor: page=0 → null', () => {
  const bad = Buffer.from(JSON.stringify({ page: 0, offset: 0 })).toString('base64')
  assert.equal(decodeCursor(bad), null)
})

test('decodeCursor: page=1001 → null', () => {
  const bad = Buffer.from(JSON.stringify({ page: 1001, offset: 0 })).toString('base64')
  assert.equal(decodeCursor(bad), null)
})

test('decodeCursor: offset=-1 → null', () => {
  const bad = Buffer.from(JSON.stringify({ page: 1, offset: -1 })).toString('base64')
  assert.equal(decodeCursor(bad), null)
})

test('decodeCursor: offset=50 → null', () => {
  const bad = Buffer.from(JSON.stringify({ page: 1, offset: 50 })).toString('base64')
  assert.equal(decodeCursor(bad), null)
})

test('decodeCursor: non-integer page → null', () => {
  const bad = Buffer.from(JSON.stringify({ page: 1.5, offset: 0 })).toString('base64')
  assert.equal(decodeCursor(bad), null)
})

test('decodeCursor: non-integer offset → null', () => {
  const bad = Buffer.from(JSON.stringify({ page: 1, offset: 0.5 })).toString('base64')
  assert.equal(decodeCursor(bad), null)
})

test('decodeCursor: missing offset field → null', () => {
  const bad = Buffer.from(JSON.stringify({ page: 1 })).toString('base64')
  assert.equal(decodeCursor(bad), null)
})

test('decodeCursor: missing page field → null', () => {
  const bad = Buffer.from(JSON.stringify({ offset: 0 })).toString('base64')
  assert.equal(decodeCursor(bad), null)
})

test('decodeCursor: not JSON → null', () => {
  const bad = Buffer.from('hello world').toString('base64')
  assert.equal(decodeCursor(bad), null)
})

test('decodeCursor: JSON null → null', () => {
  const bad = Buffer.from('null').toString('base64')
  assert.equal(decodeCursor(bad), null)
})

test('decodeCursor: arbitrary garbage string → null', () => {
  assert.equal(decodeCursor('not-valid!!!'), null)
})

test('decodeCursor: empty string → null', () => {
  assert.equal(decodeCursor(''), null)
})

// --- computeNextCursor: same-page continuation ---

test('computeNextCursor: 35 taken from 40, offset=0 → same-page cursor at 35', () => {
  const result = computeNextCursor(3, 40, 0, 35, true)
  assert.deepEqual(result, { nextCursor: encodeCursor(3, 35), hasNextPage: true })
})

test('computeNextCursor: 30 taken from 40, offset=5 → same-page cursor at 35', () => {
  const result = computeNextCursor(3, 40, 5, 30, true)
  assert.deepEqual(result, { nextCursor: encodeCursor(3, 35), hasNextPage: true })
})

test('computeNextCursor: same-page even when upstream has no next', () => {
  // Still items on this page → cursor points within current page regardless of upstream
  const result = computeNextCursor(3, 40, 0, 35, false)
  assert.deepEqual(result, { nextCursor: encodeCursor(3, 35), hasNextPage: true })
})

// --- computeNextCursor: page exhausted ---

test('computeNextCursor: page exhausted exactly, upstream has next → next-page cursor', () => {
  const result = computeNextCursor(3, 20, 5, 15, true)
  // offset=5, taken=15 → newOffset=20 >= filteredLength=20
  assert.deepEqual(result, { nextCursor: encodeCursor(4, 0), hasNextPage: true })
})

test('computeNextCursor: page exhausted exactly, no upstream → no cursor', () => {
  const result = computeNextCursor(3, 20, 5, 15, false)
  assert.deepEqual(result, { nextCursor: null, hasNextPage: false })
})

test('computeNextCursor: page consumed from offset=0 fully, upstream continues', () => {
  const result = computeNextCursor(1, 35, 0, 35, true)
  // newOffset=35 >= filteredLength=35 → advance page
  assert.deepEqual(result, { nextCursor: encodeCursor(2, 0), hasNextPage: true })
})

test('computeNextCursor: page consumed from offset=0 fully, source end', () => {
  const result = computeNextCursor(1, 35, 0, 35, false)
  assert.deepEqual(result, { nextCursor: null, hasNextPage: false })
})

test('computeNextCursor: page 999 exhausted with upstream → advances to 1000', () => {
  const result = computeNextCursor(999, 10, 0, 10, true)
  assert.deepEqual(result, { nextCursor: encodeCursor(1000, 0), hasNextPage: true })
})
