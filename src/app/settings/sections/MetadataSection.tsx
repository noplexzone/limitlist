'use client'

import { FormEvent, useState } from 'react'
import { SettingsState } from '../types'

interface Props {
  settings: SettingsState
  onSettingsChange: (s: SettingsState) => void
}

export default function MetadataSection({ settings, onSettingsChange }: Props) {
  const [tvdbApiKey, setTvdbApiKey] = useState('')
  const [tvdbPin, setTvdbPin] = useState('')
  const [tvdbSeasonType, setTvdbSeasonType] = useState(settings.tvdbSeasonType || 'default')
  const [defaultCastLanguage, setDefaultCastLanguage] = useState<'english' | 'japanese'>(settings.defaultCastLanguage || 'japanese')
  const [showTvdbApiKey, setShowTvdbApiKey] = useState(false)
  const [showTvdbPin, setShowTvdbPin] = useState(false)
  const [testing, setTesting] = useState(false)
  const [tvdbTestedSignature, setTvdbTestedSignature] = useState('')
  const [tvdbTestMessage, setTvdbTestMessage] = useState('')
  const [tvdbTestError, setTvdbTestError] = useState('')
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  const tvdbCredentialSignature = `${tvdbApiKey.trim() || '__stored__'}|${tvdbPin.trim() || '__stored__'}`
  const tvdbCredentialChangeNeedsTest = Boolean(tvdbApiKey.trim() || tvdbPin.trim())
  const tvdbSaveDisabled = saving || testing || (tvdbCredentialChangeNeedsTest && tvdbTestedSignature !== tvdbCredentialSignature)

  async function savePatch(body: Record<string, unknown>, successMsg: string) {
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
      onSettingsChange(data)
      setMessage(successMsg)
    }
    setSaving(false)
  }

  async function testTvdb() {
    setTesting(true)
    setTvdbTestMessage('')
    setTvdbTestError('')
    const body: Record<string, unknown> = { validateOnly: 'tvdb' }
    if (!settings.tvdbApiKey.lockedByEnvironment && tvdbApiKey.trim()) body.tvdbApiKey = tvdbApiKey
    if (!settings.tvdbPin.lockedByEnvironment && tvdbPin.trim()) body.tvdbPin = tvdbPin
    try {
      const res = await fetch('/api/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setTvdbTestError(data.error ?? 'TVDB connection test failed')
        return
      }
      setTvdbTestedSignature(tvdbCredentialSignature)
      setTvdbTestMessage(data.message ?? 'TVDB connection test passed.')
    } catch (err) {
      setTvdbTestError(err instanceof Error ? err.message : 'TVDB connection test failed')
    } finally {
      setTesting(false)
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

  return (
    <div className="space-y-6">
      {(message || error) && (
        <div className={`rounded-xl border px-4 py-3 text-sm ${error ? 'border-red-500/50 bg-red-950/50 text-red-200' : 'border-green-500/40 bg-green-950/40 text-green-200'}`}>
          {error || message}
        </div>
      )}

      <section className="bg-surface-900 border border-surface-800 rounded-xl p-6">
        <h2 className="text-lg font-semibold text-surface-200 mb-1">TVDB</h2>
        <p className="mb-4 text-sm text-surface-400">TheTVDB is used for search, imports, airing metadata, and season ordering.</p>
        <form onSubmit={submitApiKeys} className="space-y-4">
          {settings.tvdbApiKey.lockedByEnvironment && (
            <div className="rounded-lg border border-surface-800 bg-surface-950 px-4 py-3 text-sm text-surface-300">
              TVDB API key is set by environment variable and cannot be changed from the UI.
            </div>
          )}
          {!settings.tvdbApiKey.lockedByEnvironment && (
            <label className="block">
              <span className="mb-1 block text-sm text-surface-400">TVDB API key</span>
              <div className="flex rounded-lg border border-surface-700 bg-surface-950 focus-within:border-accent-500">
                <input
                  type={showTvdbApiKey ? 'text' : 'password'}
                  value={tvdbApiKey}
                  onChange={(e) => { setTvdbApiKey(e.target.value); setTvdbTestedSignature(''); setTvdbTestMessage(''); setTvdbTestError('') }}
                  autoComplete="off"
                  placeholder={settings.tvdbApiKey.configured ? 'Enter new key to replace' : 'Paste TVDB API key'}
                  className="min-w-0 flex-1 rounded-l-lg bg-transparent px-3 py-2 text-surface-100 outline-none"
                />
                <button type="button" onClick={() => setShowTvdbApiKey((v) => !v)} className="rounded-r-lg px-3 text-xs font-semibold text-surface-400 hover:text-white">
                  {showTvdbApiKey ? 'Hide' : 'Show'}
                </button>
              </div>
              <p className="mt-1 text-xs text-surface-500">
                {settings.tvdbApiKey.configured
                  ? `Currently configured${settings.tvdbApiKey.masked ? ` (${settings.tvdbApiKey.masked})` : ''}; leave blank to keep it.`
                  : 'Not configured.'}
              </p>
            </label>
          )}
          {!settings.tvdbPin.lockedByEnvironment && (
            <label className="block">
              <span className="mb-1 block text-sm text-surface-400">TVDB PIN <span className="text-surface-600">(optional)</span></span>
              <div className="flex rounded-lg border border-surface-700 bg-surface-950 focus-within:border-accent-500">
                <input
                  type={showTvdbPin ? 'text' : 'password'}
                  value={tvdbPin}
                  onChange={(e) => { setTvdbPin(e.target.value); setTvdbTestedSignature(''); setTvdbTestMessage(''); setTvdbTestError('') }}
                  autoComplete="off"
                  placeholder={settings.tvdbPin.configured ? 'Enter new PIN to replace' : 'Optional subscriber PIN'}
                  className="min-w-0 flex-1 rounded-l-lg bg-transparent px-3 py-2 text-surface-100 outline-none"
                />
                <button type="button" onClick={() => setShowTvdbPin((v) => !v)} className="rounded-r-lg px-3 text-xs font-semibold text-surface-400 hover:text-white">
                  {showTvdbPin ? 'Hide' : 'Show'}
                </button>
              </div>
              <p className="mt-1 text-xs text-surface-500">
                {settings.tvdbPin.configured
                  ? `Currently configured${settings.tvdbPin.masked ? ` (${settings.tvdbPin.masked})` : ''}; leave blank to keep it.`
                  : 'Not configured; usually not required.'}
              </p>
            </label>
          )}
          <label className="block">
            <span className="mb-1 block text-sm text-surface-400">TVDB season type</span>
            <select
              value={tvdbSeasonType}
              onChange={(e) => setTvdbSeasonType(e.target.value)}
              className="w-full rounded-lg border border-surface-700 bg-surface-950 px-3 py-2 text-surface-100 outline-none focus:border-accent-500"
            >
              <option value="default">Aired order (recommended)</option>
              <option value="official">Official order</option>
              <option value="dvd">DVD order</option>
              <option value="absolute">Absolute order (one continuous episode count)</option>
            </select>
            <p className="mt-1 text-xs text-surface-500">Pick the TVDB order that matches how the Plex library is organized; anime libraries most often use aired or absolute order.</p>
          </label>
          <label className="block">
            <span className="mb-1 block text-sm text-surface-400">Default cast language on detail pages</span>
            <select
              value={defaultCastLanguage}
              onChange={(e) => setDefaultCastLanguage(e.target.value as 'english' | 'japanese')}
              className="w-full rounded-lg border border-surface-700 bg-surface-950 px-3 py-2 text-surface-100 outline-none focus:border-accent-500"
            >
              <option value="japanese">Japanese</option>
              <option value="english">English</option>
            </select>
            <p className="mt-1 text-xs text-surface-500">Falls back to whichever is available if your choice has no cast.</p>
          </label>
          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              disabled={saving || testing || (!settings.tvdbApiKey.configured && !tvdbApiKey.trim())}
              onClick={testTvdb}
              className="rounded-lg border border-accent-500/60 px-4 py-2 text-sm font-semibold text-accent-100 hover:bg-accent-950 disabled:opacity-50"
            >
              {testing ? 'Testing…' : 'Test TVDB'}
            </button>
            <button disabled={tvdbSaveDisabled} className="rounded-lg bg-accent-600 px-4 py-2 text-sm font-semibold text-white hover:bg-accent-500 disabled:opacity-50">
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
          <p className="text-xs text-surface-500">Metadata provided by TheTVDB.</p>
        </form>
      </section>
    </div>
  )
}
