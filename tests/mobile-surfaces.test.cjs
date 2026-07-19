const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const test = require('node:test')
const read = (file) => fs.readFileSync(path.join(__dirname, '..', file), 'utf8')
const watchlist = read('src/app/watchlist/WatchlistClient.tsx')
const discover = read('src/app/discover/DiscoverClient.tsx')
const detail = read('src/app/anime/[provider]/[id]/AnimeDetailsClient.tsx')

test('watchlist exposes status, remove, and rating to touch without hover', () => {
  assert.match(watchlist, /min-h-\[44px\] flex-1 cursor-pointer/)
  assert.match(watchlist, /h-11 w-11[\s\S]*opacity-100/)
  assert.match(watchlist, /w-1\/2 cursor-pointer rounded-l hidden sm:block/)
  assert.match(watchlist, /w-full sm:w-1\/2 cursor-pointer/)
  assert.match(watchlist, /flex flex-wrap items-center justify-center gap-1 sm:flex-nowrap/)
  assert.match(watchlist, /h-8 w-8 shrink-0 sm:h-5 sm:w-5/)
  assert.match(watchlist, /w-full px-0 sm:px-3/)
  assert.match(watchlist, /absolute inset-x-0 top-0 z-20 flex items-start gap-1/)
  assert.match(watchlist, /block md:hidden/)
  assert.match(watchlist, /md:group-hover:block/)
})

test('watchlist toolbar is compact flex-row on mobile; grid fits phone width', () => {
  assert.match(watchlist, /flex flex-row flex-wrap items-center gap-2/)
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

test('discover fits four flex-1 tabs on mobile without scroll; actions are touch sized', () => {
  assert.match(discover, /min-h-\[44px\] flex-1[\s\S]*sm:flex-none/)
  assert.match(discover, /'popular'[\s\S]*'trending'[\s\S]*'top-rated'[\s\S]*'upcoming'/)
  assert.match(discover, /min-h-11 w-full rounded-full/)
  assert.match(discover, /grid grid-cols-2 gap-3/)
})
