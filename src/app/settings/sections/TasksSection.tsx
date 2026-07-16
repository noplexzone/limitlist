'use client'

import { useState } from 'react'

export default function TasksSection() {
  const [backfillingAiredCounts, setBackfillingAiredCounts] = useState(false)
  const [airedBackfillSummary, setAiredBackfillSummary] = useState('')

  async function backfillAiredEpisodeCounts() {
    setBackfillingAiredCounts(true)
    setAiredBackfillSummary('')
    const res = await fetch('/api/airing/backfill', { method: 'POST' })
    const body = await res.json().catch(() => ({}))
    if (res.ok) {
      const failedCount = body.failed?.length ?? 0
      setAiredBackfillSummary(`Backfill finished: ${body.succeeded ?? 0} succeeded, ${failedCount} failed, ${body.total ?? 0} eligible.`)
    } else {
      setAiredBackfillSummary(body.error ?? 'Aired episode count backfill failed')
    }
    setBackfillingAiredCounts(false)
  }

  return (
    <div className="space-y-6">
      <section className="bg-gray-900 border border-gray-800 rounded-xl p-6">
        <h2 className="text-lg font-semibold text-gray-200 mb-1">Tasks</h2>
        <p className="mb-4 text-sm text-gray-400">Data maintenance operations.</p>
        <div className="space-y-4">
          <div className="rounded-xl border border-gray-800 bg-gray-950/70 p-4 space-y-3">
            <div>
              <h3 className="text-sm font-semibold text-purple-100">Aired episode counts</h3>
              <p className="text-xs text-gray-500">Populates aired-episode counts for shows added before the v1.2.2 update. Only needed once.</p>
            </div>
            <button
              type="button"
              disabled={backfillingAiredCounts}
              onClick={backfillAiredEpisodeCounts}
              className="rounded-lg border border-purple-500/60 px-4 py-2 text-sm font-semibold text-purple-100 hover:bg-purple-950 disabled:opacity-50"
            >
              {backfillingAiredCounts ? 'Backfilling…' : 'Backfill episode counts'}
            </button>
            {airedBackfillSummary && (
              <p className="rounded-lg border border-purple-500/30 bg-purple-950/30 px-3 py-2 text-sm text-purple-100">{airedBackfillSummary}</p>
            )}
          </div>
          <div className="rounded-xl border border-gray-800 bg-gray-950/70 p-4">
            <h3 className="text-sm font-semibold text-purple-100 mb-1">Scheduled tasks</h3>
            <p className="text-xs text-gray-500">Automated recurring tasks (e.g. nightly airing refresh, Plex sync) are coming in the next update.</p>
          </div>
        </div>
      </section>
    </div>
  )
}
