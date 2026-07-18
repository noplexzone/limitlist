const assert = require("node:assert/strict")
const fs = require("node:fs")
const Module = require("node:module")
const path = require("node:path")
const test = require("node:test")
const ts = require("typescript")

const sourcePath = path.join(__dirname, "../src/lib/notify/detect-logic.ts")
const source = fs.readFileSync(sourcePath, "utf8")
const compiled = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  fileName: sourcePath,
}).outputText
const productionModule = new Module(sourcePath, module)
productionModule.filename = sourcePath
productionModule.paths = Module._nodeModulePaths(path.dirname(sourcePath))
productionModule._compile(compiled, sourcePath)
const { deriveLatestEpisode, pendingChannelsForEpisode } = productionModule.exports

const seasons = [
  { seasonNumber: 1, episodes: [
    { episodeNumber: 12, name: "Old finale", airDate: "2026-07-17" },
    { episodeNumber: 13, name: "Cursed Womb", airDate: "2026-07-18" },
  ] },
  { seasonNumber: 2, episodes: [{ episodeNumber: 1, name: "New season", airDate: "2026-07-18" }] },
]

test("derives the exact air-date and in-season episode-number match", () => {
  assert.deepEqual(deriveLatestEpisode(seasons, new Date("2026-07-18T18:00:00Z"), 13), {
    seasonNumber: 1, episodeNumber: 13, title: "Cursed Womb",
  })
})

test("uses a unique one-day nearest match only when the episode number agrees", () => {
  assert.deepEqual(deriveLatestEpisode(seasons, new Date("2026-07-19T00:00:00Z"), 13), {
    seasonNumber: 1, episodeNumber: 13, title: "Cursed Womb",
  })
})

test("does not trust a unique air date when the persisted episode number disagrees", () => {
  assert.equal(deriveLatestEpisode([
    { seasonNumber: 3, episodes: [{ episodeNumber: 7, name: "Only episode", airDate: "2026-07-18" }] },
  ], new Date("2026-07-18T00:00:00Z"), 8), null)
})

test("skips ambiguous episode identity instead of returning nullable ledger keys", () => {
  assert.equal(deriveLatestEpisode(seasons, new Date("2026-07-18T00:00:00Z"), null), null)
})

test("only a sent row for the exact event and channel suppresses delivery", () => {
  const event = { animeShowId: "show-1", seasonNumber: 1, episodeNumber: 13, trigger: "episode-aired" }
  const logs = [
    { ...event, channel: "discord", status: "sent" },
    { ...event, channel: "ntfy", status: "failed" },
    { ...event, episodeNumber: 12, channel: "smtp", status: "sent" },
  ]
  assert.deepEqual(pendingChannelsForEpisode(["discord", "ntfy", "smtp"], logs, event), ["ntfy", "smtp"])
})
