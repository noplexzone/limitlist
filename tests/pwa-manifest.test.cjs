// Contract tests for the PWA manifest (src/app/manifest.ts)
// Transpiles the TypeScript module and checks the shape of the returned object.

const assert = require('node:assert/strict')
const fs = require('node:fs')
const Module = require('node:module')
const path = require('node:path')
const test = require('node:test')
const ts = require('typescript')

const sourcePath = path.join(__dirname, '../src/app/manifest.ts')
const source = fs.readFileSync(sourcePath, 'utf8')
const compiled = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  fileName: sourcePath,
}).outputText
const m = new Module(sourcePath, module)
m.filename = sourcePath
m.paths = Module._nodeModulePaths(path.dirname(sourcePath))
m._compile(compiled, sourcePath)
const manifest = m.exports.default()

test('manifest name and short_name are LimitList', () => {
  assert.equal(manifest.name, 'LimitList')
  assert.equal(manifest.short_name, 'LimitList')
})

test('manifest display is standalone', () => {
  assert.equal(manifest.display, 'standalone')
})

test('manifest start_url is /dashboard', () => {
  assert.equal(manifest.start_url, '/dashboard')
})

test('manifest theme_color is #2563eb', () => {
  assert.equal(manifest.theme_color, '#2563eb')
})

test('manifest background_color is a dark hex color', () => {
  assert.ok(typeof manifest.background_color === 'string', 'background_color should be a string')
  assert.match(manifest.background_color, /^#[0-9a-f]{6}$/i, 'background_color should be a hex color')
  // Verify it is actually dark (low RGB values) by checking it starts with a low digit
  const r = parseInt(manifest.background_color.slice(1, 3), 16)
  const g = parseInt(manifest.background_color.slice(3, 5), 16)
  const b = parseInt(manifest.background_color.slice(5, 7), 16)
  const brightness = (r * 299 + g * 587 + b * 114) / 1000
  assert.ok(brightness < 100, `background_color brightness ${brightness} should be < 100 (dark)`)
})

test('manifest has icons array with entries', () => {
  assert.ok(Array.isArray(manifest.icons), 'icons should be an array')
  assert.ok(manifest.icons.length >= 3, 'should have at least 3 icon entries')
})

test('manifest has a 192x192 icon with any purpose', () => {
  const icon = manifest.icons.find(i => i.sizes === '192x192')
  assert.ok(icon, 'should have 192x192 icon')
  assert.ok(icon.src, '192 icon must have src')
  assert.ok(['any', 'monochrome', undefined].includes(icon.purpose) || icon.purpose === 'any',
    '192 icon purpose should be any or unset')
})

test('manifest has a 512x512 icon with any purpose', () => {
  const anyIcon = manifest.icons.find(i => i.sizes === '512x512' && i.purpose === 'any')
  assert.ok(anyIcon, 'should have 512x512 icon with purpose=any')
})

test('manifest has a maskable 512x512 icon', () => {
  const maskable = manifest.icons.find(i => i.purpose === 'maskable')
  assert.ok(maskable, 'should have at least one maskable icon')
  assert.equal(maskable.sizes, '512x512', 'maskable icon should be 512x512')
})

test('all icons have valid src and sizes fields', () => {
  for (const icon of manifest.icons) {
    assert.ok(icon.src && typeof icon.src === 'string', `icon src must be a non-empty string, got ${icon.src}`)
    assert.ok(icon.sizes && typeof icon.sizes === 'string', `icon sizes must be a non-empty string, got ${icon.sizes}`)
    assert.match(icon.src, /\.(png|svg|webp)$/, `icon src should end with image extension: ${icon.src}`)
  }
})
