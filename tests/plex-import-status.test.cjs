const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const test = require('node:test')

const source = fs.readFileSync(path.join(__dirname, '../src/lib/plex-sync.ts'), 'utf8')

test('Plex import does not complete a fully watched show with a future episode', () => {
  assert.match(source, /initialStatusForImportedShow\(show: PlexWatchedShow, airingStatus\?: string \| null, nextAiringAt\?: Date \| null\)/)
  assert.match(source, /function isNotCurrentlyAiring\(airingStatus\?: string \| null, nextAiringAt\?: Date \| null\)/)
  assert.match(source, /const hasUpcomingEpisode = nextAiringAt != null && nextAiringAt\.getTime\(\) > Date\.now\(\)/)
  assert.match(source, /\(!statusLower && !hasUpcomingEpisode\)/)
})

test('Plex import loads and passes current airing details to status detection', () => {
  assert.match(source, /tvdb\.getAiringDetails\(tvdbId\)/)
  assert.match(source, /airingInfo\.nextAiringAt/)
  assert.match(source, /initialStatusForImportedShow\([\s\S]*importAiringStatus, importNextAiringAt\)/)
})


test('initial Plex sync preserves an imported COMPLETED status', () => {
  assert.match(source, /const preserveCompletedStatus = show\.status === 'COMPLETED' && isNotCurrentlyAiring\(show\.airingStatus, show\.nextAiringAt\)/)
  assert.match(source, /plexAutoStatus && !preserveCompletedStatus/)
})
