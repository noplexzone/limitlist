const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const test = require('node:test')
const read = (file) => fs.readFileSync(path.join(__dirname, '..', file), 'utf8')
const client = read('src/app/settings/SettingsClient.tsx')
const css = read('src/app/globals.css')
const notifications = read('src/app/settings/sections/NotificationsSection.tsx')

test('settings and Plex tabs intentionally scroll on phones', () => {
  assert.match(client, /overflow-x-auto[\s\S]*scrollbar-width:none/)
  assert.match(client, /min-h-11 shrink-0/)
  assert.match(client, /overscroll-x-contain/)
})

test('settings controls get scoped 44px mobile targets', () => {
  assert.match(client, /mobile-settings/)
  assert.match(css, /\.mobile-settings button:not\(\[role="switch"\]\)/)
  assert.match(css, /min-height: 44px/)
})

test('dense notification cards use phone padding and touchable toggle labels', () => {
  assert.match(notifications, /inline-flex min-h-11/)
  assert.match(notifications, /p-4 sm:p-5/)
})

test('settings mobile rules constrain form controls without affecting the rest of the app', () => {
  assert.match(css, /\.mobile-settings input/)
  assert.match(css, /max-width: 100%/)
  assert.doesNotMatch(css, /(^|\n)button[^\n]*min-height: 44px/)
})
