const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const test = require('node:test')

const nav = fs.readFileSync(path.join(__dirname, '../src/components/Nav.tsx'), 'utf8')
const search = fs.readFileSync(path.join(__dirname, '../src/components/NavSearch.tsx'), 'utf8')

test('mobile bottom navigation is hidden on desktop and labelled', () => {
  assert.match(nav, /aria-label="Mobile navigation"/)
  assert.match(nav, /md:hidden/)
})

test('desktop center navigation is hidden on phones', () => {
  assert.match(nav, /hidden md:flex flex-1 justify-center/)
})

test('mobile links expose current page and search expansion state', () => {
  assert.match(nav, /aria-current=\{active \? 'page' : undefined\}/)
  assert.match(nav, /aria-expanded=\{searchOpen\}/)
})

test('navigation respects top and bottom safe areas without changing unauthenticated layout', () => {
  assert.match(nav, /safe-area-inset-top/)
  assert.match(nav, /safe-area-inset-bottom/)
  assert.match(nav, /body \{ padding-bottom:/)
})

test('search results are viewport-bounded and touch targets are at least 44px', () => {
  assert.match(search, /max-h-\[60vh\] overflow-y-auto/)
  assert.match(search, /min-h-\[44px\]/)
  assert.match(search, /min-w-\[44px\]/)
})
