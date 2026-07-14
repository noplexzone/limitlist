'use client'

import { FormEvent, useEffect, useState } from 'react'

interface SettingsState {
  username: string
  profileImageData: string | null
  tmdbApiKey: {
    lockedByEnvironment: boolean
    configured: boolean
    masked: string | null
  }
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
  tvdbSeasonType: string
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
  const [tmdbApiKey, setTmdbApiKey] = useState('')
  const [tvdbApiKey, setTvdbApiKey] = useState('')
  const [tvdbPin, setTvdbPin] = useState('')
  const [tvdbSeasonType, setTvdbSeasonType] = useState(initialSettings.tvdbSeasonType || 'default')
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => setUsername(settings.username), [settings.username])

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

  async function submitApiKeys(e: FormEvent) {
    e.preventDefault()
    const body: Record<string, unknown> = { tvdbSeasonType }
    if (!settings.tmdbApiKey.lockedByEnvironment && tmdbApiKey.trim()) body.tmdbApiKey = tmdbApiKey
    if (!settings.tvdbApiKey.lockedByEnvironment && tvdbApiKey.trim()) body.tvdbApiKey = tvdbApiKey
    if (!settings.tvdbPin.lockedByEnvironment && (tvdbPin.trim() || tvdbApiKey.trim())) body.tvdbPin = tvdbPin
    await savePatch(body, 'Metadata settings saved.')
    setTmdbApiKey('')
    setTvdbApiKey('')
    setTvdbPin('')
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
        <h2 className="text-lg font-semibold text-gray-200 mb-1">API keys</h2>
        <p className="mb-4 text-sm text-gray-400">TheTVDB is used for new search/import metadata and season ordering. TMDB remains supported for existing legacy rows.</p>
        {settings.tmdbApiKey.lockedByEnvironment && settings.tvdbApiKey.lockedByEnvironment ? (
          <div className="rounded-lg border border-gray-800 bg-gray-950 px-4 py-3 text-sm text-gray-300">
            Metadata API keys are set by environment variables and cannot be changed from the UI.
          </div>
        ) : (
          <form onSubmit={submitApiKeys} className="space-y-3">
            <p className="text-xs text-gray-500">TVDB key: {settings.tvdbApiKey.configured ? settings.tvdbApiKey.masked : 'Not configured'}</p>
            <p className="text-xs text-gray-500">TVDB PIN: {settings.tvdbPin.configured ? settings.tvdbPin.masked : 'Not configured / not required'}</p>
            <p className="text-xs text-gray-500">TMDB legacy key: {settings.tmdbApiKey.configured ? settings.tmdbApiKey.masked : 'Not configured'}</p>
            {!settings.tvdbApiKey.lockedByEnvironment && (
              <input
                value={tvdbApiKey}
                onChange={(e) => setTvdbApiKey(e.target.value)}
                placeholder="Paste TVDB API key"
                className="w-full rounded-lg border border-gray-700 bg-gray-950 px-3 py-2 text-gray-100 outline-none focus:border-purple-500"
              />
            )}
            {!settings.tvdbPin.lockedByEnvironment && (
              <input
                value={tvdbPin}
                onChange={(e) => setTvdbPin(e.target.value)}
                placeholder="Optional TVDB PIN"
                className="w-full rounded-lg border border-gray-700 bg-gray-950 px-3 py-2 text-gray-100 outline-none focus:border-purple-500"
              />
            )}
            <label className="block">
              <span className="mb-1 block text-sm text-gray-400">TVDB season type</span>
              <input
                value={tvdbSeasonType}
                onChange={(e) => setTvdbSeasonType(e.target.value)}
                placeholder="default"
                className="w-full rounded-lg border border-gray-700 bg-gray-950 px-3 py-2 text-gray-100 outline-none focus:border-purple-500"
              />
            </label>
            {!settings.tmdbApiKey.lockedByEnvironment && (
            <input
              value={tmdbApiKey}
              onChange={(e) => setTmdbApiKey(e.target.value)}
              placeholder="Paste TMDB API key"
              className="w-full rounded-lg border border-gray-700 bg-gray-950 px-3 py-2 text-gray-100 outline-none focus:border-purple-500"
            />
            )}
            <button disabled={saving} className="rounded-lg bg-purple-600 px-4 py-2 text-sm font-semibold text-white hover:bg-purple-500 disabled:opacity-50">
              Save metadata settings
            </button>
            <p className="text-xs text-gray-500">Metadata provided by TheTVDB.</p>
          </form>
        )}
      </section>

      <section className="bg-gray-900 border border-gray-800 rounded-xl p-6">
        <h2 className="text-lg font-semibold text-gray-200 mb-1">Data</h2>
        <p className="text-sm text-gray-400">Your anime list and account settings are stored in the local SQLite database on your server.</p>
      </section>
    </div>
  )
}
