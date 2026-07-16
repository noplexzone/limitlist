'use client'

import { useState } from 'react'
import { PlexDiscoveryShow } from '../types'

interface Props {
  plexConfigured: boolean
}

export default function ImportFromPlexSection({ plexConfigured }: Props) {
  const [discoveringPlex, setDiscoveringPlex] = useState(false)
  const [plexDiscovery, setPlexDiscovery] = useState<PlexDiscoveryShow[]>([])
  const [selectedPlexImports, setSelectedPlexImports] = useState<string[]>([])
  const [importingPlex, setImportingPlex] = useState(false)
  const [plexImportSummary, setPlexImportSummary] = useState('')

  async function discoverPlexImports() {
    setDiscoveringPlex(true)
    setPlexImportSummary('')
    const res = await fetch('/api/plex/discover')
    const body = await res.json().catch(() => ({}))
    if (res.ok) {
      const shows: PlexDiscoveryShow[] = body.shows ?? []
      setPlexDiscovery(shows)
      setSelectedPlexImports(shows.filter((show) => !show.alreadyTracked && show.tvdbId).map((show) => show.ratingKey))
    } else {
      setPlexImportSummary(body.error ?? 'Plex discovery failed')
    }
    setDiscoveringPlex(false)
  }

  async function importSelectedPlexShows() {
    setImportingPlex(true)
    const res = await fetch('/api/plex/import', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ratingKeys: selectedPlexImports }),
    })
    const body = await res.json().catch(() => ({}))
    if (res.ok) {
      const results = body.results ?? []
      const imported = results.filter((r: { status: string }) => r.status === 'imported').length
      const skipped = results.filter((r: { status: string }) => r.status === 'skipped').length
      const unresolved = results.filter((r: { status: string }) => r.status === 'unresolved').length
      const failed = results.filter((r: { status: string }) => r.status === 'failed').length
      setPlexImportSummary(`Import finished: ${imported} imported, ${skipped} skipped, ${unresolved} unresolved, ${failed} failed.`)
      await discoverPlexImports()
    } else {
      setPlexImportSummary(body.error ?? 'Plex import failed')
    }
    setImportingPlex(false)
  }

  return (
    <div className="space-y-6">
      <section className="bg-gray-900 border border-gray-800 rounded-xl p-6">
        <h2 className="text-lg font-semibold text-gray-200 mb-1">Import from Plex</h2>
        <p className="mb-4 text-sm text-gray-400">Review watched Plex shows before creating watchlist rows.</p>
        {!plexConfigured ? (
          <p className="text-sm text-gray-500">Configure Plex connection credentials first.</p>
        ) : (
          <div className="space-y-3">
            <button
              type="button"
              disabled={discoveringPlex || importingPlex}
              onClick={discoverPlexImports}
              className="rounded-lg border border-purple-500/60 px-3 py-1.5 text-sm font-semibold text-purple-100 hover:bg-purple-950 disabled:opacity-50"
            >
              {discoveringPlex ? 'Scanning…' : 'Scan Plex library'}
            </button>
            {plexDiscovery.length > 0 && (
              <div className="space-y-3">
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setSelectedPlexImports(plexDiscovery.filter((s) => !s.alreadyTracked && s.tvdbId).map((s) => s.ratingKey))}
                    className="text-xs text-purple-200 underline"
                  >
                    Select resolvable
                  </button>
                  <button type="button" onClick={() => setSelectedPlexImports([])} className="text-xs text-gray-300 underline">
                    Select none
                  </button>
                </div>
                <div className="max-h-96 space-y-2 overflow-y-auto pr-1">
                  {plexDiscovery.slice(0, 150).map((show) => {
                    const disabled = show.alreadyTracked || !show.tvdbId
                    return (
                      <label
                        key={show.ratingKey}
                        className={`flex items-start gap-3 rounded-lg border px-3 py-2 text-sm ${
                          disabled ? 'border-gray-800 bg-gray-900/50 text-gray-500' : 'border-gray-700 bg-gray-900 text-gray-100'
                        }`}
                      >
                        <input
                          type="checkbox"
                          disabled={disabled}
                          checked={selectedPlexImports.includes(show.ratingKey)}
                          onChange={(e) =>
                            setSelectedPlexImports((current) =>
                              e.target.checked ? [...current, show.ratingKey] : current.filter((k) => k !== show.ratingKey)
                            )
                          }
                          className="mt-1 accent-purple-500"
                        />
                        <span className="min-w-0 flex-1">
                          <span className="block font-medium">{show.title}{show.year ? ` (${show.year})` : ''}</span>
                          <span className="block text-xs text-gray-500">
                            {show.viewedLeafCount}/{show.leafCount} watched
                            {show.alreadyTracked ? ' · Already in watchlist' : ''}
                            {!show.tvdbId ? ' · No TVDB match' : ''}
                            {show.warning ? ` · ${show.warning}` : ''}
                          </span>
                        </span>
                      </label>
                    )
                  })}
                </div>
                <button
                  type="button"
                  disabled={importingPlex || selectedPlexImports.length === 0}
                  onClick={importSelectedPlexShows}
                  className="rounded-lg bg-purple-600 px-4 py-2 text-sm font-semibold text-white hover:bg-purple-500 disabled:opacity-50"
                >
                  {importingPlex ? 'Importing…' : `Import ${selectedPlexImports.length} selected`}
                </button>
              </div>
            )}
            {plexImportSummary && (
              <p className="rounded-lg border border-purple-500/30 bg-purple-950/30 px-3 py-2 text-sm text-purple-100">{plexImportSummary}</p>
            )}
          </div>
        )}
      </section>
    </div>
  )
}
