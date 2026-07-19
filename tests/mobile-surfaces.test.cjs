const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const test = require('node:test')
const read = (file) => fs.readFileSync(path.join(__dirname, '..', file), 'utf8')
const watchlist = read('src/app/watchlist/WatchlistClient.tsx')
const discover = read('src/app/discover/DiscoverClient.tsx')
const detail = read('src/app/anime/[provider]/[id]/AnimeDetailsClient.tsx')

test('watchlist exposes status, remove, and rating to touch without hover', () => {
  assert.match(watchlist, /min-h-11 w-full cursor-pointer/)
  assert.match(watchlist, /h-11 w-11[\s\S]*opacity-100/)
  assert.match(watchlist, /Rating for \{show\.title\}/)
  assert.match(watchlist, /block md:hidden/)
  assert.match(watchlist, /md:group-hover:block/)
})

test('watchlist filters and grid fit phone width', () => {
  assert.match(watchlist, /flex flex-col gap-3[\s\S]*sm:flex-row/)
  assert.match(watchlist, /grid grid-cols-2 gap-3/)
})

test('detail constrains hero and uses mobile rating selects', () => {
  assert.match(detail, /mx-auto aspect-\[2\/3\] w-full max-w-sm/)
  assert.match(detail, /aria-label="Rating"[\s\S]*sm:hidden/)
  assert.match(detail, /text-3xl[\s\S]*sm:text-4xl/)
})

test('detail episode and language controls are touch sized', () => {
  assert.match(detail, /min-h-11 rounded-full px-4 py-2/)
  assert.match(detail, /min-h-11 rounded-full px-3 py-2/)
  assert.match(detail, /summary className="flex min-h-11/)
})

test('discover tabs intentionally scroll and actions are touch sized', () => {
  assert.match(discover, /overflow-x-auto[\s\S]*scrollbar-width:none/)
  assert.match(discover, /min-h-11 shrink-0/)
  assert.match(discover, /min-h-11 w-full rounded-full/)
  assert.match(discover, /grid grid-cols-2 gap-3/)
})
