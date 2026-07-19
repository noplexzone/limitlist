const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const test = require('node:test')
const read = (file) => fs.readFileSync(path.join(__dirname, '..', file), 'utf8')
const client = read('src/app/settings/SettingsClient.tsx')
const css = read('src/app/globals.css')
const notifications = read('src/app/settings/sections/NotificationsSection.tsx')
const toggle = read('src/components/Toggle.tsx')

test('mobile settings and Plex use labelled dropdown selectors; desktop Plex tabs remain', () => {
  assert.match(client, /aria-label="Settings section"/)
  assert.match(client, /aria-label="Plex settings panel"/)
  assert.match(client, /hidden sm:flex[\s\S]*min-h-11 shrink-0/)
})

test('settings controls get scoped 44px mobile targets', () => {
  assert.match(client, /mobile-settings/)
  assert.match(css, /\.mobile-settings button:not\(\[role="switch"\]\)/)
  assert.match(css, /min-height: 44px/)
})

test('dense notification cards use phone padding and touchable toggle labels', () => {
  assert.match(toggle, /inline-flex min-h-\[44px\]/)
  assert.match(notifications, /p-4 sm:p-5/)
})

test('settings mobile rules constrain form controls without affecting the rest of the app', () => {
  assert.match(css, /\.mobile-settings input/)
  assert.match(css, /max-width: 100%/)
  assert.doesNotMatch(css, /(^|\n)button[^\n]*min-height: 44px/)
})
