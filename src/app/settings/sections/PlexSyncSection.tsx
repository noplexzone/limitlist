'use client'

import { FormEvent, useEffect, useState } from 'react'
import Toggle from '@/components/Toggle'
import { SettingsState } from '../types'

interface Props {
  settings: SettingsState
  onSettingsChange: (s: SettingsState) => void
}

export default function PlexSyncSection({ settings, onSettingsChange }: Props) {
  const [plexSections, setPlexSections] = useState<Array<{ key: string; title: string; type: string }>>([])
  const [plexSectionsLoading, setPlexSectionsLoading] = useState(false)
  const [plexLibrarySections, setPlexLibrarySections] = useState<string[]>(settings.plexLibrarySections.value ?? [])
  const [plexAccountId, setPlexAccountId] = useState(settings.plexAccountId.value ?? '')
  const [plexWatchedThreshold, setPlexWatchedThreshold] = useState<'viewcount' | 'partial'>(settings.plexWatchedThreshold.value ?? 'viewcount')
  const [plexAutoStatus, setPlexAutoStatus] = useState(settings.plexAutoStatus.value ?? true)
  const [plexSyncOnRefresh, setPlexSyncOnRefresh] = useState(settings.plexSyncOnRefresh.value ?? false)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    setPlexLibrarySections(settings.plexLibrarySections.value ?? [])
    setPlexAccountId(settings.plexAccountId.value ?? '')
    setPlexWatchedThreshold(settings.plexWatchedThreshold.value ?? 'viewcount')
    setPlexAutoStatus(settings.plexAutoStatus.value ?? true)
    setPlexSyncOnRefresh(settings.plexSyncOnRefresh.value ?? false)
  }, [settings.plexLibrarySections.value, settings.plexAccountId.value, settings.plexWatchedThreshold.value, settings.plexAutoStatus.value, settings.plexSyncOnRefresh.value])

  useEffect(() => {
    if (!settings.plexBaseUrl.configured || !settings.plexToken.configured) return
    let cancelled = false
    setPlexSectionsLoading(true)
    fetch('/api/plex/sections')
      .then((res) => res.ok ? res.json() : { sections: [] })
      .then((data) => { if (!cancelled) setPlexSections(data.sections ?? []) })
      .finally(() => { if (!cancelled) setPlexSectionsLoading(false) })
    return () => { cancelled = true }
  }, [settings.plexBaseUrl.configured, settings.plexToken.configured])

  async function submitPlexSync(e: FormEvent) {
    e.preventDefault()
    if (saving) return
    setSaving(true)
    setError('')
    setMessage('')
    const body: Record<string, unknown> = {}
    if (!settings.plexLibrarySections.lockedByEnvironment) body.plexLibrarySections = plexLibrarySections
    if (!settings.plexAccountId.lockedByEnvironment) body.plexAccountId = plexAccountId
    if (!settings.plexWatchedThreshold.lockedByEnvironment) body.plexWatchedThreshold = plexWatchedThreshold
    if (!settings.plexAutoStatus.lockedByEnvironment) body.plexAutoStatus = plexAutoStatus
    if (!settings.plexSyncOnRefresh.lockedByEnvironment) body.plexSyncOnRefresh = plexSyncOnRefresh
    const res = await fetch('/api/settings', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    const data = await res.json()
    if (!res.ok) {
      setError(data.error ?? 'Settings update failed')
    } else {
      onSettingsChange(data)
      setMessage('Plex sync settings saved.')
    }
    setSaving(false)
  }

  const plexConfigured = settings.plexBaseUrl.configured && settings.plexToken.configured

  return (
    <div className="space-y-6">
      {(message || error) && (
        <div className={`rounded-xl border px-4 py-3 text-sm ${error ? 'border-red-500/50 bg-red-950/50 text-red-200' : 'border-green-500/40 bg-green-950/40 text-green-200'}`}>
          {error || message}
        </div>
      )}

      <section className="bg-surface-900 border border-surface-800 rounded-xl p-4 sm:p-6">
        <h2 className="text-lg font-semibold text-surface-200 mb-1">Plex Sync</h2>
        <p className="mb-4 text-sm text-surface-400">Controls library discovery, watched thresholds, and status updates.</p>
        {!plexConfigured ? (
          <p className="text-sm text-surface-500">Configure Plex connection credentials first.</p>
        ) : (
          <form onSubmit={submitPlexSync} className="space-y-4">
            <div>
              <p className="mb-2 text-sm text-surface-400">Libraries to scan</p>
              {settings.plexLibrarySections.lockedByEnvironment ? (
                <p className="text-xs text-surface-500">Library sections are set by environment variable.</p>
              ) : plexSectionsLoading ? (
                <p className="text-xs text-surface-500">Loading Plex show libraries…</p>
              ) : plexSections.length > 0 ? (
                <div className="grid gap-2 sm:grid-cols-2">
                  {plexSections.map((section) => (
                    <label key={section.key} className="flex items-center gap-2 rounded-lg border border-surface-800 bg-surface-900 px-3 py-2 text-sm text-surface-200">
                      <input
                        type="checkbox"
                        checked={plexLibrarySections.includes(section.key)}
                        onChange={(e) => setPlexLibrarySections((current) =>
                          e.target.checked ? [...current, section.key] : current.filter((k) => k !== section.key)
                        )}
                        className="accent-accent-500"
                      />
                      {section.title}
                    </label>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-surface-500">No show libraries loaded yet; save/test Plex credentials first. Empty means all show libraries.</p>
              )}
              <p className="mt-1 text-xs text-surface-500">Choose dedicated Anime libraries to make discovery faster and avoid regular TV imports. Leave none selected to scan all show libraries.</p>
            </div>
            <label className="block">
              <span className="mb-1 block text-sm text-surface-400">Plex account ID <span className="text-surface-600">(optional)</span></span>
              <input
                value={plexAccountId}
                onChange={(e) => setPlexAccountId(e.target.value)}
                readOnly={settings.plexAccountId.lockedByEnvironment}
                className="w-full rounded-lg border border-surface-700 bg-surface-950 px-3 py-2 text-surface-100 outline-none focus:border-accent-500 read-only:opacity-60"
              />
              <p className="mt-1 text-xs text-surface-500">Scope shared-server history to one Plex account. Blank uses the server owner.</p>
            </label>
            <label className="block">
              <span className="mb-1 block text-sm text-surface-400">Watched threshold</span>
              <select
                value={plexWatchedThreshold}
                onChange={(e) => setPlexWatchedThreshold(e.target.value as 'viewcount' | 'partial')}
                disabled={settings.plexWatchedThreshold.lockedByEnvironment}
                className="w-full rounded-lg border border-surface-700 bg-surface-950 px-3 py-2 text-surface-100 outline-none focus:border-accent-500 disabled:opacity-60"
              >
                <option value="viewcount">Plex view count only</option>
                <option value="partial">Also count 90% complete plays</option>
              </select>
              <p className="mt-1 text-xs text-surface-500">Partial catches nearly-finished episodes Plex has not marked played.</p>
            </label>
            <div className="rounded-lg border border-surface-800 bg-surface-900 px-3 py-2">
              <Toggle
                checked={plexAutoStatus}
                disabled={settings.plexAutoStatus.lockedByEnvironment}
                onChange={setPlexAutoStatus}
                label="Auto-set Up-to-Date"
              />
              <p className="mt-0.5 text-xs text-surface-500 ml-14">When all aired episodes are watched, Plex may update the show status.</p>
            </div>
            <div className="rounded-lg border border-surface-800 bg-surface-900 px-3 py-2">
              <Toggle
                checked={plexSyncOnRefresh}
                disabled={settings.plexSyncOnRefresh.lockedByEnvironment}
                onChange={setPlexSyncOnRefresh}
                label="Sync after schedule refresh"
              />
              <p className="mt-0.5 text-xs text-surface-500 ml-14">Refresh All Schedules also runs Plex sync afterward.</p>
            </div>
            <button disabled={saving} className="rounded-lg bg-accent-600 px-4 py-2 text-sm font-semibold text-white hover:bg-accent-500 disabled:opacity-50">
              Save sync settings
            </button>
          </form>
        )}
      </section>
    </div>
  )
}
