const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const test = require('node:test')

const source = fs.readFileSync(path.join(__dirname, '../src/lib/plex-sync.ts'), 'utf8')

test('manual+watched protection updates plexRatingKey and episodeName before continuing', () => {
  // When a manual watched row encounters Plex's unwatched signal, the row must NOT
  // be flipped to unwatched — but plexRatingKey and episodeName should still be refreshed.
  // Verify the protection branch does an update before the continue statement.
  assert.match(
    source,
    /existing\.source === 'manual' && existing\.watched && !ep\.watched/,
    'protection condition should exist'
  )
  // The update call must appear inside the protection block (before continue).
  // We extract the block by finding the condition and checking plexRatingKey is updated.
  const protectionIdx = source.indexOf("existing.source === 'manual' && existing.watched && !ep.watched")
  assert.notEqual(protectionIdx, -1)
  const blockSnippet = source.slice(protectionIdx, protectionIdx + 400)
  assert.match(blockSnippet, /plexRatingKey:\s*ep\.plexRatingKey/, 'should update plexRatingKey in protection branch')
  assert.match(blockSnippet, /episodeName:\s*ep\.plexTitle/, 'should update episodeName in protection branch')
  assert.match(blockSnippet, /continue/, 'should still continue after updating')
})

test('manual+watched protection does not update watched field to false', () => {
  const protectionIdx = source.indexOf("existing.source === 'manual' && existing.watched && !ep.watched")
  const blockSnippet = source.slice(protectionIdx, protectionIdx + 400)
  // The update data in the protection branch must NOT contain watched: ep.watched
  // (which would be false and flip the row).
  assert.doesNotMatch(blockSnippet, /watched:\s*ep\.watched/, 'protection branch must not write ep.watched to DB')
})
