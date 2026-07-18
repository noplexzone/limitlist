const assert = require('node:assert/strict')
const fs = require('node:fs')
const Module = require('node:module')
const path = require('node:path')
const test = require('node:test')
const ts = require('typescript')

function loadTask(stubs) {
  const sourcePath = path.join(__dirname, '../src/lib/notify/task.ts')
  const source = fs.readFileSync(sourcePath, 'utf8')
  const compiled = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
    fileName: sourcePath,
  }).outputText
  const productionModule = new Module(sourcePath, module)
  productionModule.filename = sourcePath
  productionModule.paths = Module._nodeModulePaths(path.dirname(sourcePath))
  productionModule.require = (id) => {
    if (id === '../db') return { prisma: stubs.prisma }
    if (id === '../settings') return {
      getConfiguredNotifyEnabled: async () => true,
      getConfiguredNotifyTrigger: async () => 'episode-aired',
    }
    if (id === './detect') return { detectPendingNotifications: stubs.detect }
    if (id === './index') return { dispatch: stubs.dispatch, getEnabledChannels: async () => ['ntfy'] }
    return require(id)
  }
  productionModule._compile(compiled, sourcePath)
  return productionModule.exports
}

const notification = {
  animeShowId: 'show-1', metadataId: '123', seasonNumber: 2, episodeNumber: 13,
  trigger: 'episode-aired', channels: ['ntfy'],
  payload: { title: 'Episode', body: 'Aired', showTitle: 'Show', episodeLabel: 'S02E13' },
}

function createHarness(initialRow = null) {
  let row = initialRow
  let deliveries = 0
  const prisma = { notificationLog: {
    findUnique: async () => row && { ...row },
    create: async ({ data }) => {
      if (row) { const error = new Error('unique'); error.code = 'P2002'; throw error }
      row = { id: 'log-1', ...data }
      return { ...row }
    },
    updateMany: async ({ where, data }) => {
      if (!row || (where.id && row.id !== where.id) || (where.status && row.status !== where.status)) return { count: 0 }
      if (where.sentAt && row.sentAt?.getTime() !== where.sentAt.getTime()) return { count: 0 }
      row = { ...row, ...data }
      return { count: 1 }
    },
    upsert: async ({ create, update }) => {
      row = row ? { ...row, ...update } : { id: 'log-1', ...create }
      return { ...row }
    },
  } }
  const detect = async () => ({ notifications: [notification], candidateCount: 1, skippedCandidateCount: 0, dataLimitedCount: 0 })
  const dispatch = async () => {
    deliveries += 1
    await new Promise((resolve) => setImmediate(resolve))
    return [{ channel: 'ntfy', ok: true, message: 'Notification sent' }]
  }
  return {
    run: loadTask({ prisma, detect, dispatch }).runNotificationTask,
    deliveries: () => deliveries,
    row: () => row,
  }
}

test('overlapping task runs claim an event channel before only one external delivery', async () => {
  const harness = createHarness()
  await Promise.all([harness.run(), harness.run()])
  assert.equal(harness.deliveries(), 1)
  assert.equal(harness.row().status, 'sent')
})

test('a failed delivery remains retryable but is claimed by only one overlapping run', async () => {
  const harness = createHarness({ id: 'log-1', status: 'failed', sentAt: new Date(0) })
  await Promise.all([harness.run(), harness.run()])
  assert.equal(harness.deliveries(), 1)
  assert.equal(harness.row().status, 'sent')
})

test('a fresh in-progress delivery is not sent again', async () => {
  const harness = createHarness({ id: 'log-1', status: 'sending', sentAt: new Date() })
  await Promise.all([harness.run(), harness.run()])
  assert.equal(harness.deliveries(), 0)
  assert.equal(harness.row().status, 'sending')
})
