'use client'

import { FormEvent, useState } from 'react'
import { SettingsState } from '../types'

interface Props {
  settings: SettingsState
  onSettingsChange: (s: SettingsState) => void
}

export default function PlexConnectionSection({ settings, onSettingsChange }: Props) {
  const [plexBaseUrl, setPlexBaseUrl] = useState(settings.plexBaseUrl.value ?? '')
  const [plexToken, setPlexToken] = useState('')
  const [showPlexToken, setShowPlexToken] = useState(false)
  const [testing, setTesting] = useState(false)
  const [plexTestedSignature, setPlexTestedSignature] = useState('')
  const [plexTestMessage, setPlexTestMessage] = useState('')
  const [plexTestError, setPlexTestError] = useState('')
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  const plexCredentialSignature = `${plexBaseUrl.trim()}|${plexToken.trim() || '__stored__'}`
  const plexSaveDisabled = saving || testing || !plexBaseUrl.trim() || plexTestedSignature !== plexCredentialSignature

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

  async function testPlex() {
    setTesting(true)
    setPlexTestMessage('')
    setPlexTestError('')
    const body: Record<string, unknown> = { validateOnly: 'plex', plexBaseUrl }
    if (!settings.plexToken.lockedByEnvironment && plexToken.trim()) body.plexToken = plexToken
    try {
      const res = await fetch('/api/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setPlexTestError(data.error ?? 'Plex connection test failed')
        return
      }
      setPlexTestedSignature(plexCredentialSignature)
      setPlexTestMessage(data.message ?? 'Plex connection test passed.')
    } catch (err) {
      setPlexTestError(err instanceof Error ? err.message : 'Plex connection test failed')
    } finally {
      setTesting(false)
    }
  }

  async function submitPlex(e: FormEvent) {
    e.preventDefault()
    if (plexSaveDisabled) return
    const body: Record<string, unknown> = { plexBaseUrl }
    if (!settings.plexToken.lockedByEnvironment) body.plexToken = plexToken
    await savePatch(body, 'Plex connection saved.')
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

      <section className="bg-surface-900 border border-surface-800 rounded-xl p-4 sm:p-6">
        <h2 className="text-lg font-semibold text-surface-200 mb-1">Plex Connection</h2>
        <p className="mb-4 text-sm text-surface-400">Connect to your Plex server. Plex is read-only here.</p>
        <form onSubmit={submitPlex} className="space-y-4">
          <label className="block">
            <span className="mb-1 block text-sm text-surface-400">Plex base URL</span>
            <input
              value={plexBaseUrl}
              onChange={(e) => { setPlexBaseUrl(e.target.value); setPlexTestedSignature(''); setPlexTestMessage(''); setPlexTestError('') }}
              placeholder="http://plex:32400"
              readOnly={settings.plexBaseUrl.lockedByEnvironment}
              className="w-full rounded-lg border border-surface-700 bg-surface-950 px-3 py-2 text-surface-100 outline-none focus:border-accent-500 read-only:opacity-60"
            />
            <p className="mt-1 text-xs text-surface-500">
              {settings.plexBaseUrl.lockedByEnvironment
                ? 'Plex base URL is set by environment variable.'
                : settings.plexBaseUrl.configured
                  ? 'Currently configured.'
                  : 'Not configured.'}
            </p>
          </label>
          {settings.plexToken.lockedByEnvironment && (
            <div className="rounded-lg border border-surface-800 bg-surface-950 px-4 py-3 text-sm text-surface-300">
              Plex token is set by environment variable and cannot be changed from the UI.
            </div>
          )}
          {!settings.plexToken.lockedByEnvironment && (
            <label className="block">
              <span className="mb-1 block text-sm text-surface-400">Plex token</span>
              <div className="flex rounded-lg border border-surface-700 bg-surface-950 focus-within:border-accent-500">
                <input
                  type={showPlexToken ? 'text' : 'password'}
                  value={plexToken}
                  onChange={(e) => { setPlexToken(e.target.value); setPlexTestedSignature(''); setPlexTestMessage(''); setPlexTestError('') }}
                  autoComplete="off"
                  placeholder={settings.plexToken.configured ? 'Enter new token to replace' : 'Paste Plex token'}
                  className="min-w-0 flex-1 rounded-l-lg bg-transparent px-3 py-2 text-surface-100 outline-none"
                />
                <button type="button" onClick={() => setShowPlexToken((v) => !v)} className="rounded-r-lg px-3 text-xs font-semibold text-surface-400 hover:text-white">
                  {showPlexToken ? 'Hide' : 'Show'}
                </button>
              </div>
              <p className="mt-1 text-xs text-surface-500">
                {settings.plexToken.configured
                  ? `Currently configured${settings.plexToken.masked ? ` (${settings.plexToken.masked})` : ''}; leave blank to keep it.`
                  : 'Not configured.'}
              </p>
            </label>
          )}
          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              disabled={saving || testing || !plexBaseUrl.trim() || (!settings.plexToken.configured && !plexToken.trim())}
              onClick={testPlex}
              className="rounded-lg border border-accent-500/60 px-4 py-2 text-sm font-semibold text-accent-100 hover:bg-accent-950 disabled:opacity-50"
            >
              {testing ? 'Testing…' : 'Test Plex'}
            </button>
            <button disabled={plexSaveDisabled} className="rounded-lg bg-accent-600 px-4 py-2 text-sm font-semibold text-white hover:bg-accent-500 disabled:opacity-50">
              Save Plex connection
            </button>
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
    </div>
  )
}
