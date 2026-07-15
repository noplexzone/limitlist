'use client'

import { FormEvent, useEffect, useState } from 'react'

interface PlexDiscoveryShow {
  ratingKey: string
  title: string
  year: number | null
  tvdbId: string | null
  viewedLeafCount: number
  leafCount: number
  alreadyTracked: boolean
  warning?: string
}

interface SettingsState {
  username: string
  profileImageData: string | null
  tvdbApiKey: {
    lockedByEnvironment: boolean
    configured: boolean
    masked: string | null
  }
  tvdbPin: {
    lockedByEnvironment: boolean
    configured: boolean
    masked: string | null
  }
  plexBaseUrl: {
    lockedByEnvironment: boolean
    configured: boolean
    value: string | null
  }
  plexToken: {
    lockedByEnvironment: boolean
    configured: boolean
    masked: string | null
  }
  tvdbSeasonType: string
  defaultCastLanguage: 'english' | 'japanese'
  plexLibrarySections: { lockedByEnvironment: boolean; value: string[] }
  plexAccountId: { lockedByEnvironment: boolean; value: string }
  plexWatchedThreshold: { lockedByEnvironment: boolean; value: 'viewcount' | 'partial' }
  plexAutoStatus: { lockedByEnvironment: boolean; value: boolean }
  plexSyncOnRefresh: { lockedByEnvironment: boolean; value: boolean }
}

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result))
    reader.onerror = () => reject(reader.error)
    reader.readAsDataURL(file)
  })
}

export default function SettingsClient({ initialSettings }: { initialSettings: SettingsState }) {
  const [settings, setSettings] = useState(initialSettings)
  const [username, setUsername] = useState(initialSettings.username)
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [tvdbApiKey, setTvdbApiKey] = useState('')
  const [tvdbPin, setTvdbPin] = useState('')
  const [tvdbSeasonType, setTvdbSeasonType] = useState(initialSettings.tvdbSeasonType || 'default')
  const [defaultCastLanguage, setDefaultCastLanguage] = useState<'english' | 'japanese'>(initialSettings.defaultCastLanguage || 'japanese')
  const [plexBaseUrl, setPlexBaseUrl] = useState(initialSettings.plexBaseUrl.value ?? '')
  const [plexToken, setPlexToken] = useState('')
  const [plexSections, setPlexSections] = useState<Array<{ key: string; title: string; type: string }>>([])
  const [plexSectionsLoading, setPlexSectionsLoading] = useState(false)
  const [plexLibrarySections, setPlexLibrarySections] = useState<string[]>(initialSettings.plexLibrarySections.value ?? [])
  const [plexAccountId, setPlexAccountId] = useState(initialSettings.plexAccountId.value ?? '')
  const [plexWatchedThreshold, setPlexWatchedThreshold] = useState<'viewcount' | 'partial'>(initialSettings.plexWatchedThreshold.value ?? 'viewcount')
  const [plexAutoStatus, setPlexAutoStatus] = useState(initialSettings.plexAutoStatus.value ?? true)
  const [plexSyncOnRefresh, setPlexSyncOnRefresh] = useState(initialSettings.plexSyncOnRefresh.value ?? false)
  const [showTvdbApiKey, setShowTvdbApiKey] = useState(false)
  const [showTvdbPin, setShowTvdbPin] = useState(false)
  const [showPlexToken, setShowPlexToken] = useState(false)
  const [testing, setTesting] = useState<'tvdb' | 'plex' | null>(null)
  const [tvdbTestedSignature, setTvdbTestedSignature] = useState('')
  const [plexTestedSignature, setPlexTestedSignature] = useState('')
  const [tvdbTestMessage, setTvdbTestMessage] = useState('')
  const [tvdbTestError, setTvdbTestError] = useState('')
  const [plexTestMessage, setPlexTestMessage] = useState('')
  const [plexTestError, setPlexTestError] = useState('')
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const [discoveringPlex, setDiscoveringPlex] = useState(false)
  const [plexDiscovery, setPlexDiscovery] = useState<PlexDiscoveryShow[]>([])
  const [selectedPlexImports, setSelectedPlexImports] = useState<string[]>([])
  const [importingPlex, setImportingPlex] = useState(false)
  const [plexImportSummary, setPlexImportSummary] = useState('')
  const [backfillingAiredCounts, setBackfillingAiredCounts] = useState(false)
  const [airedBackfillSummary, setAiredBackfillSummary] = useState('')

  useEffect(() => setUsername(settings.username), [settings.username])
  useEffect(() => setPlexBaseUrl(settings.plexBaseUrl.value ?? ''), [settings.plexBaseUrl.value])
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

  const tvdbCredentialSignature = `${tvdbApiKey.trim() || '__stored__'}|${tvdbPin.trim() || '__stored__'}`
  const plexCredentialSignature = `${plexBaseUrl.trim()}|${plexToken.trim() || '__stored__'}`
  const tvdbCredentialChangeNeedsTest = Boolean(tvdbApiKey.trim() || tvdbPin.trim())
  const tvdbSaveDisabled = saving || testing !== null || (tvdbCredentialChangeNeedsTest && tvdbTestedSignature !== tvdbCredentialSignature)
  const plexSaveDisabled = saving || testing !== null || !plexBaseUrl.trim() || plexTestedSignature !== plexCredentialSignature

  async function savePatch(body: Record<string, unknown>, success: string) {
    setSaving(true)
    setError('')
    setMessage('')
    const res = await fetch('/api/settings', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    const data = await res.json()
    if (!res.ok) {
      setError(data.error ?? 'Settings update failed')
    } else {
      setSettings(data)
      if ('profileImageData' in body) window.dispatchEvent(new Event('limitlist:profile-image-updated'))
      setMessage(success)
    }
    setSaving(false)
  }

  async function submitAccount(e: FormEvent) {
    e.preventDefault()
    const body: Record<string, unknown> = { username }
    if (currentPassword || newPassword) {
      body.currentPassword = currentPassword
      body.newPassword = newPassword
    }
    await savePatch(body, 'Account settings saved.')
    setCurrentPassword('')
    setNewPassword('')
  }

  async function uploadProfileImage(file: File | null) {
    if (!file) return
    if (!file.type.startsWith('image/')) {
      setError('Profile picture must be an image file.')
      return
    }
    const dataUrl = await fileToDataUrl(file)
    await savePatch({ profileImageData: dataUrl }, 'Profile picture updated.')
  }

  async function testSettings(kind: 'tvdb' | 'plex') {
    setTesting(kind)
    setError('')
    setMessage('')
    if (kind === 'tvdb') {
      setTvdbTestMessage('')
      setTvdbTestError('')
    } else {
      setPlexTestMessage('')
      setPlexTestError('')
    }
    const body: Record<string, unknown> = { validateOnly: kind }
    if (kind === 'tvdb') {
      if (!settings.tvdbApiKey.lockedByEnvironment && tvdbApiKey.trim()) body.tvdbApiKey = tvdbApiKey
      if (!settings.tvdbPin.lockedByEnvironment && tvdbPin.trim()) body.tvdbPin = tvdbPin
    } else {
      body.plexBaseUrl = plexBaseUrl
      if (!settings.plexToken.lockedByEnvironment && plexToken.trim()) body.plexToken = plexToken
    }
    try {
      const res = await fetch('/api/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        const failure = data.error ?? `${kind === 'tvdb' ? 'TVDB' : 'Plex'} connection test failed`
        if (kind === 'tvdb') setTvdbTestError(failure)
        else setPlexTestError(failure)
        return
      }
      const success = data.message ?? `${kind === 'tvdb' ? 'TVDB' : 'Plex'} connection test passed.`
      if (kind === 'tvdb') {
        setTvdbTestedSignature(tvdbCredentialSignature)
        setTvdbTestMessage(success)
      } else {
        setPlexTestedSignature(plexCredentialSignature)
        setPlexTestMessage(success)
      }
    } catch (err) {
      const failure = err instanceof Error ? err.message : `${kind === 'tvdb' ? 'TVDB' : 'Plex'} connection test failed`
      if (kind === 'tvdb') setTvdbTestError(failure)
      else setPlexTestError(failure)
    } finally {
      setTesting(null)
    }
  }

  async function submitApiKeys(e: FormEvent) {
    e.preventDefault()
    if (tvdbSaveDisabled) return
    const body: Record<string, unknown> = { tvdbSeasonType, defaultCastLanguage }
    if (!settings.tvdbApiKey.lockedByEnvironment && tvdbApiKey.trim()) body.tvdbApiKey = tvdbApiKey
    if (!settings.tvdbPin.lockedByEnvironment && (tvdbPin.trim() || tvdbApiKey.trim())) body.tvdbPin = tvdbPin
    await savePatch(body, 'TVDB settings saved.')
    setTvdbApiKey('')
    setTvdbPin('')
    setTvdbTestedSignature('')
    setTvdbTestMessage('')
    setTvdbTestError('')
  }

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
    const res = await fetch('/api/plex/import', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ratingKeys: selectedPlexImports }) })
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

  async function submitPlex(e: FormEvent) {
    e.preventDefault()
    if (plexSaveDisabled) return
    const body: Record<string, unknown> = { plexBaseUrl }
    if (!settings.plexToken.lockedByEnvironment) body.plexToken = plexToken
    if (!settings.plexLibrarySections.lockedByEnvironment) body.plexLibrarySections = plexLibrarySections
    if (!settings.plexAccountId.lockedByEnvironment) body.plexAccountId = plexAccountId
    if (!settings.plexWatchedThreshold.lockedByEnvironment) body.plexWatchedThreshold = plexWatchedThreshold
    if (!settings.plexAutoStatus.lockedByEnvironment) body.plexAutoStatus = plexAutoStatus
    if (!settings.plexSyncOnRefresh.lockedByEnvironment) body.plexSyncOnRefresh = plexSyncOnRefresh
    await savePatch(body, 'Plex settings saved.')
    setPlexToken('')
    setPlexTestedSignature('')
    setPlexTestMessage('')
    setPlexTestError('')
  }

  return (
    <div className="space-y-6">
      {(message || error) && (
        <div className={`rounded-xl border px-4 py-3 text-sm ${error ? 'border-red-500/50 bg-red-950/50 text-red-200' : 'border-green-500/40 bg-green-950/40 text-green-200'}`}>
          {error || message}
        </div>
      )}

      <section className="bg-gray-900 border border-gray-800 rounded-xl p-6">
        <h2 className="text-lg font-semibold text-gray-200 mb-4">Account</h2>
        <form onSubmit={submitAccount} className="space-y-4">
          <label className="block">
            <span className="mb-1 block text-sm text-gray-400">Username</span>
            <input
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full rounded-lg border border-gray-700 bg-gray-950 px-3 py-2 text-gray-100 outline-none focus:border-purple-500"
            />
          </label>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block">
              <span className="mb-1 block text-sm text-gray-400">Current password</span>
              <input
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                autoComplete="current-password"
                className="w-full rounded-lg border border-gray-700 bg-gray-950 px-3 py-2 text-gray-100 outline-none focus:border-purple-500"
              />
            </label>
            <label className="block">
              <span className="mb-1 block text-sm text-gray-400">New password</span>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                autoComplete="new-password"
                className="w-full rounded-lg border border-gray-700 bg-gray-950 px-3 py-2 text-gray-100 outline-none focus:border-purple-500"
              />
            </label>
          </div>
          <button disabled={saving} className="rounded-lg bg-purple-600 px-4 py-2 text-sm font-semibold text-white hover:bg-purple-500 disabled:opacity-50">
            Save account
          </button>
        </form>
      </section>

      <section className="bg-gray-900 border border-gray-800 rounded-xl p-6">
        <h2 className="text-lg font-semibold text-gray-200 mb-4">Profile picture</h2>
        <div className="flex items-center gap-4">
          <div className="h-20 w-20 overflow-hidden rounded-xl bg-purple-800 flex items-center justify-center text-lg font-bold text-white">
            {settings.profileImageData ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={settings.profileImageData} alt="Profile" className="h-full w-full object-cover" />
            ) : (
              'LL'
            )}
          </div>
          <div className="space-y-2">
            <input
              type="file"
              accept="image/png,image/jpeg,image/webp,image/gif"
              onChange={(e) => uploadProfileImage(e.target.files?.[0] ?? null)}
              className="block text-sm text-gray-400 file:mr-3 file:rounded-lg file:border-0 file:bg-gray-800 file:px-3 file:py-2 file:text-sm file:font-medium file:text-gray-100 hover:file:bg-gray-700"
            />
            <p className="text-xs text-gray-500">Stored in the local database as an image data URL; max 2 MB.</p>
            {settings.profileImageData && (
              <button type="button" onClick={() => savePatch({ profileImageData: null }, 'Profile picture removed.')} className="text-xs text-gray-400 underline hover:text-white">
                Remove picture
              </button>
            )}
          </div>
        </div>
      </section>

      <section className="bg-gray-900 border border-gray-800 rounded-xl p-6">
        <h2 className="text-lg font-semibold text-gray-200 mb-1">TVDB</h2>
        <p className="mb-4 text-sm text-gray-400">TheTVDB is used for search, imports, airing metadata, and season ordering.</p>
        <form onSubmit={submitApiKeys} className="space-y-4">
          {settings.tvdbApiKey.lockedByEnvironment && (
            <div className="rounded-lg border border-gray-800 bg-gray-950 px-4 py-3 text-sm text-gray-300">
              TVDB API key is set by environment variable and cannot be changed from the UI.
            </div>
          )}
          {!settings.tvdbApiKey.lockedByEnvironment && (
              <label className="block">
                <span className="mb-1 block text-sm text-gray-400">TVDB API key</span>
                <div className="flex rounded-lg border border-gray-700 bg-gray-950 focus-within:border-purple-500">
                  <input
                    type={showTvdbApiKey ? 'text' : 'password'}
                    value={tvdbApiKey}
                    onChange={(e) => { setTvdbApiKey(e.target.value); setTvdbTestedSignature(''); setTvdbTestMessage(''); setTvdbTestError('') }}
                    autoComplete="off"
                    placeholder={settings.tvdbApiKey.configured ? 'Enter new key to replace' : 'Paste TVDB API key'}
                    className="min-w-0 flex-1 rounded-l-lg bg-transparent px-3 py-2 text-gray-100 outline-none"
                  />
                  <button type="button" onClick={() => setShowTvdbApiKey((value) => !value)} className="rounded-r-lg px-3 text-xs font-semibold text-gray-400 hover:text-white">
                    {showTvdbApiKey ? 'Hide' : 'Show'}
                  </button>
                </div>
                <p className="mt-1 text-xs text-gray-500">{settings.tvdbApiKey.configured ? `Currently configured${settings.tvdbApiKey.masked ? ` (${settings.tvdbApiKey.masked})` : ''}; leave blank to keep it.` : 'Not configured.'}</p>
              </label>
            )}
          {!settings.tvdbPin.lockedByEnvironment && (
              <label className="block">
                <span className="mb-1 block text-sm text-gray-400">TVDB PIN <span className="text-gray-600">(optional)</span></span>
                <div className="flex rounded-lg border border-gray-700 bg-gray-950 focus-within:border-purple-500">
                  <input
                    type={showTvdbPin ? 'text' : 'password'}
                    value={tvdbPin}
                    onChange={(e) => { setTvdbPin(e.target.value); setTvdbTestedSignature(''); setTvdbTestMessage(''); setTvdbTestError('') }}
                    autoComplete="off"
                    placeholder={settings.tvdbPin.configured ? 'Enter new PIN to replace' : 'Optional subscriber PIN'}
                    className="min-w-0 flex-1 rounded-l-lg bg-transparent px-3 py-2 text-gray-100 outline-none"
                  />
                  <button type="button" onClick={() => setShowTvdbPin((value) => !value)} className="rounded-r-lg px-3 text-xs font-semibold text-gray-400 hover:text-white">
                    {showTvdbPin ? 'Hide' : 'Show'}
                  </button>
                </div>
                <p className="mt-1 text-xs text-gray-500">{settings.tvdbPin.configured ? `Currently configured${settings.tvdbPin.masked ? ` (${settings.tvdbPin.masked})` : ''}; leave blank to keep it.` : 'Not configured; usually not required.'}</p>
              </label>
            )}
          <label className="block">
            <span className="mb-1 block text-sm text-gray-400">TVDB season type</span>
            <select
              value={tvdbSeasonType}
              onChange={(e) => setTvdbSeasonType(e.target.value)}
              className="w-full rounded-lg border border-gray-700 bg-gray-950 px-3 py-2 text-gray-100 outline-none focus:border-purple-500"
            >
              <option value="default">Aired order (recommended)</option>
              <option value="official">Official order</option>
              <option value="dvd">DVD order</option>
              <option value="absolute">Absolute order (one continuous episode count)</option>
            </select>
            <p className="mt-1 text-xs text-gray-500">Pick the TVDB order that matches how the Plex library is organized; anime libraries most often use aired or absolute order.</p>
          </label>
          <label className="block">
            <span className="mb-1 block text-sm text-gray-400">Default cast language on detail pages</span>
            <select
              value={defaultCastLanguage}
              onChange={(e) => setDefaultCastLanguage(e.target.value as 'english' | 'japanese')}
              className="w-full rounded-lg border border-gray-700 bg-gray-950 px-3 py-2 text-gray-100 outline-none focus:border-purple-500"
            >
              <option value="japanese">Japanese</option>
              <option value="english">English</option>
            </select>
            <p className="mt-1 text-xs text-gray-500">Falls back to whichever is available if your choice has no cast.</p>
          </label>
          <div className="flex flex-wrap gap-3">
            <button type="button" disabled={saving || testing !== null || (!settings.tvdbApiKey.configured && !tvdbApiKey.trim())} onClick={() => testSettings('tvdb')} className="rounded-lg border border-purple-500/60 px-4 py-2 text-sm font-semibold text-purple-100 hover:bg-purple-950 disabled:opacity-50">
              {testing === 'tvdb' ? 'Testing…' : 'Test TVDB'}
            </button>
            <button disabled={tvdbSaveDisabled} className="rounded-lg bg-purple-600 px-4 py-2 text-sm font-semibold text-white hover:bg-purple-500 disabled:opacity-50">
              Save TVDB settings
            </button>
          </div>
          {tvdbTestMessage && (
            <p className="rounded-lg border border-green-500/40 bg-green-950/40 px-3 py-2 text-sm text-green-200">{tvdbTestMessage}</p>
          )}
          {tvdbTestError && (
            <p className="rounded-lg border border-red-500/50 bg-red-950/50 px-3 py-2 text-sm text-red-200">{tvdbTestError}</p>
          )}
          {tvdbCredentialChangeNeedsTest && tvdbTestedSignature !== tvdbCredentialSignature && (
            <p className="text-xs text-amber-300">Test the TVDB credentials before saving them.</p>
          )}
          <p className="text-xs text-gray-500">Metadata provided by TheTVDB.</p>
        </form>
      </section>

      <section className="bg-gray-900 border border-gray-800 rounded-xl p-6">
        <h2 className="text-lg font-semibold text-gray-200 mb-1">Plex</h2>
        <p className="mb-4 text-sm text-gray-400">Sync watched episodes from your Plex anime library. Plex is read-only here.</p>
        <form onSubmit={submitPlex} className="space-y-4">
          <label className="block">
            <span className="mb-1 block text-sm text-gray-400">Plex base URL</span>
            <input
              value={plexBaseUrl}
              onChange={(e) => { setPlexBaseUrl(e.target.value); setPlexTestedSignature(''); setPlexTestMessage(''); setPlexTestError('') }}
              placeholder="http://plex:32400"
              readOnly={settings.plexBaseUrl.lockedByEnvironment}
              className="w-full rounded-lg border border-gray-700 bg-gray-950 px-3 py-2 text-gray-100 outline-none focus:border-purple-500 read-only:opacity-60"
            />
            <p className="mt-1 text-xs text-gray-500">{settings.plexBaseUrl.lockedByEnvironment ? 'Plex base URL is set by environment variable.' : settings.plexBaseUrl.configured ? 'Currently configured.' : 'Not configured.'}</p>
          </label>
          {settings.plexToken.lockedByEnvironment && (
            <div className="rounded-lg border border-gray-800 bg-gray-950 px-4 py-3 text-sm text-gray-300">
              Plex token is set by environment variable and cannot be changed from the UI.
            </div>
          )}
          {!settings.plexToken.lockedByEnvironment && (
            <label className="block">
              <span className="mb-1 block text-sm text-gray-400">Plex token</span>
              <div className="flex rounded-lg border border-gray-700 bg-gray-950 focus-within:border-purple-500">
                <input
                  type={showPlexToken ? 'text' : 'password'}
                  value={plexToken}
                  onChange={(e) => { setPlexToken(e.target.value); setPlexTestedSignature(''); setPlexTestMessage(''); setPlexTestError('') }}
                  autoComplete="off"
                  placeholder={settings.plexToken.configured ? 'Enter new token to replace' : 'Paste Plex token'}
                  className="min-w-0 flex-1 rounded-l-lg bg-transparent px-3 py-2 text-gray-100 outline-none"
                />
                <button type="button" onClick={() => setShowPlexToken((value) => !value)} className="rounded-r-lg px-3 text-xs font-semibold text-gray-400 hover:text-white">
                  {showPlexToken ? 'Hide' : 'Show'}
                </button>
              </div>
              <p className="mt-1 text-xs text-gray-500">{settings.plexToken.configured ? `Currently configured${settings.plexToken.masked ? ` (${settings.plexToken.masked})` : ''}; leave blank to keep it.` : 'Not configured.'}</p>
            </label>
          )}

          <div className="rounded-xl border border-gray-800 bg-gray-950/70 p-4 space-y-4">
            <div>
              <h3 className="text-sm font-semibold text-purple-100">Plex sync options</h3>
              <p className="text-xs text-gray-500">Controls library discovery, watched thresholds, and status updates.</p>
            </div>
            <div>
              <p className="mb-2 text-sm text-gray-400">Libraries to scan</p>
              {settings.plexLibrarySections.lockedByEnvironment ? (
                <p className="text-xs text-gray-500">Library sections are set by environment variable.</p>
              ) : plexSectionsLoading ? (
                <p className="text-xs text-gray-500">Loading Plex show libraries…</p>
              ) : plexSections.length > 0 ? (
                <div className="grid gap-2 sm:grid-cols-2">
                  {plexSections.map((section) => (
                    <label key={section.key} className="flex items-center gap-2 rounded-lg border border-gray-800 bg-gray-900 px-3 py-2 text-sm text-gray-200">
                      <input
                        type="checkbox"
                        checked={plexLibrarySections.includes(section.key)}
                        onChange={(e) => setPlexLibrarySections((current) => e.target.checked ? [...current, section.key] : current.filter((key) => key !== section.key))}
                        className="accent-purple-500"
                      />
                      {section.title}
                    </label>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-gray-500">No show libraries loaded yet; save/test Plex credentials first. Empty means all show libraries.</p>
              )}
              <p className="mt-1 text-xs text-gray-500">Choose dedicated Anime libraries to make discovery faster and avoid regular TV imports. Leave none selected to scan all show libraries.</p>
            </div>
            <label className="block">
              <span className="mb-1 block text-sm text-gray-400">Plex account ID <span className="text-gray-600">(optional)</span></span>
              <input value={plexAccountId} onChange={(e) => setPlexAccountId(e.target.value)} readOnly={settings.plexAccountId.lockedByEnvironment} className="w-full rounded-lg border border-gray-700 bg-gray-950 px-3 py-2 text-gray-100 outline-none focus:border-purple-500 read-only:opacity-60" />
              <p className="mt-1 text-xs text-gray-500">Scope shared-server history to one Plex account. Blank uses the server owner.</p>
            </label>
            <label className="block">
              <span className="mb-1 block text-sm text-gray-400">Watched threshold</span>
              <select value={plexWatchedThreshold} onChange={(e) => setPlexWatchedThreshold(e.target.value as 'viewcount' | 'partial')} disabled={settings.plexWatchedThreshold.lockedByEnvironment} className="w-full rounded-lg border border-gray-700 bg-gray-950 px-3 py-2 text-gray-100 outline-none focus:border-purple-500 disabled:opacity-60">
                <option value="viewcount">Plex view count only</option>
                <option value="partial">Also count 90% complete plays</option>
              </select>
              <p className="mt-1 text-xs text-gray-500">Partial catches nearly-finished episodes Plex has not marked played.</p>
            </label>
            <label className="flex items-start gap-3 rounded-lg border border-gray-800 bg-gray-900 px-3 py-2 text-sm text-gray-200">
              <input type="checkbox" checked={plexAutoStatus} onChange={(e) => setPlexAutoStatus(e.target.checked)} disabled={settings.plexAutoStatus.lockedByEnvironment} className="mt-1 accent-purple-500" />
              <span><span className="font-medium">Auto-set Up-to-Date</span><span className="block text-xs text-gray-500">When all aired episodes are watched, Plex may update the show status.</span></span>
            </label>
            <label className="flex items-start gap-3 rounded-lg border border-gray-800 bg-gray-900 px-3 py-2 text-sm text-gray-200">
              <input type="checkbox" checked={plexSyncOnRefresh} onChange={(e) => setPlexSyncOnRefresh(e.target.checked)} disabled={settings.plexSyncOnRefresh.lockedByEnvironment} className="mt-1 accent-purple-500" />
              <span><span className="font-medium">Sync after schedule refresh</span><span className="block text-xs text-gray-500">Refresh All Schedules also runs Plex sync afterward.</span></span>
            </label>
          </div>
          <div className="flex flex-wrap gap-3">
            <button type="button" disabled={saving || testing !== null || !plexBaseUrl.trim() || (!settings.plexToken.configured && !plexToken.trim())} onClick={() => testSettings('plex')} className="rounded-lg border border-purple-500/60 px-4 py-2 text-sm font-semibold text-purple-100 hover:bg-purple-950 disabled:opacity-50">
              {testing === 'plex' ? 'Testing…' : 'Test Plex'}
            </button>
            <button disabled={plexSaveDisabled} className="rounded-lg bg-purple-600 px-4 py-2 text-sm font-semibold text-white hover:bg-purple-500 disabled:opacity-50">
              Save Plex settings
            </button>
          </div>

          <div className="rounded-xl border border-gray-800 bg-gray-950/70 p-4 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-semibold text-purple-100">Import from Plex</h3>
                <p className="text-xs text-gray-500">Review watched Plex shows before creating watchlist rows.</p>
              </div>
              <button type="button" disabled={discoveringPlex || importingPlex} onClick={discoverPlexImports} className="rounded-lg border border-purple-500/60 px-3 py-1.5 text-sm font-semibold text-purple-100 hover:bg-purple-950 disabled:opacity-50">{discoveringPlex ? 'Scanning…' : 'Import from Plex'}</button>
            </div>
            {plexDiscovery.length > 0 && (
              <div className="space-y-3">
                <div className="flex gap-2">
                  <button type="button" onClick={() => setSelectedPlexImports(plexDiscovery.filter((show) => !show.alreadyTracked && show.tvdbId).map((show) => show.ratingKey))} className="text-xs text-purple-200 underline">Select resolvable</button>
                  <button type="button" onClick={() => setSelectedPlexImports([])} className="text-xs text-gray-300 underline">Select none</button>
                </div>
                <div className="max-h-96 space-y-2 overflow-y-auto pr-1">
                  {plexDiscovery.slice(0, 150).map((show) => {
                    const disabled = show.alreadyTracked || !show.tvdbId
                    return (
                      <label key={show.ratingKey} className={`flex items-start gap-3 rounded-lg border px-3 py-2 text-sm ${disabled ? 'border-gray-800 bg-gray-900/50 text-gray-500' : 'border-gray-700 bg-gray-900 text-gray-100'}`}>
                        <input type="checkbox" disabled={disabled} checked={selectedPlexImports.includes(show.ratingKey)} onChange={(e) => setSelectedPlexImports((current) => e.target.checked ? [...current, show.ratingKey] : current.filter((key) => key !== show.ratingKey))} className="mt-1 accent-purple-500" />
                        <span className="min-w-0 flex-1"><span className="block font-medium">{show.title}{show.year ? ` (${show.year})` : ''}</span><span className="block text-xs text-gray-500">{show.viewedLeafCount}/{show.leafCount} watched {show.alreadyTracked ? ' · Already in watchlist' : ''}{!show.tvdbId ? ' · No TVDB match' : ''}{show.warning ? ` · ${show.warning}` : ''}</span></span>
                      </label>
                    )
                  })}
                </div>
                <button type="button" disabled={importingPlex || selectedPlexImports.length === 0} onClick={importSelectedPlexShows} className="rounded-lg bg-purple-600 px-4 py-2 text-sm font-semibold text-white hover:bg-purple-500 disabled:opacity-50">{importingPlex ? 'Importing…' : `Import ${selectedPlexImports.length} selected`}</button>
              </div>
            )}
            {plexImportSummary && <p className="rounded-lg border border-purple-500/30 bg-purple-950/30 px-3 py-2 text-sm text-purple-100">{plexImportSummary}</p>}
          </div>
          {plexTestMessage && (
            <p className="rounded-lg border border-green-500/40 bg-green-950/40 px-3 py-2 text-sm text-green-200">{plexTestMessage}</p>
          )}
          {plexTestError && (
            <p className="rounded-lg border border-red-500/50 bg-red-950/50 px-3 py-2 text-sm text-red-200">{plexTestError}</p>
          )}
          {plexTestedSignature !== plexCredentialSignature && (
            <p className="text-xs text-amber-300">Test the Plex connection before saving these settings.</p>
          )}
        </form>
      </section>

      <section className="bg-gray-900 border border-gray-800 rounded-xl p-6">
        <h2 className="text-lg font-semibold text-gray-200 mb-1">Data</h2>
        <p className="text-sm text-gray-400">Your anime list and account settings are stored in the local SQLite database on your server.</p>
        <div className="mt-4 rounded-xl border border-gray-800 bg-gray-950/70 p-4 space-y-3">
          <div>
            <h3 className="text-sm font-semibold text-purple-100">Aired episode counts</h3>
            <p className="text-xs text-gray-500">Populates aired-episode counts for shows added before this update. Only needed once.</p>
          </div>
          <button type="button" disabled={backfillingAiredCounts} onClick={backfillAiredEpisodeCounts} className="rounded-lg border border-purple-500/60 px-4 py-2 text-sm font-semibold text-purple-100 hover:bg-purple-950 disabled:opacity-50">
            {backfillingAiredCounts ? 'Backfilling…' : 'Backfill episode counts'}
          </button>
          {airedBackfillSummary && <p className="rounded-lg border border-purple-500/30 bg-purple-950/30 px-3 py-2 text-sm text-purple-100">{airedBackfillSummary}</p>}
        </div>
      </section>
    </div>
  )
}
