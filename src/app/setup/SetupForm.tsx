'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

interface SetupFormProps {
  tvdbApiKeyLocked: boolean
  tvdbPinLocked: boolean
  defaultTvdbSeasonType: string
}

export default function SetupForm({ tvdbApiKeyLocked, tvdbPinLocked, defaultTvdbSeasonType }: SetupFormProps) {
  const router = useRouter()
  const [error, setError] = useState('')
  const [warning, setWarning] = useState('')
  const [loading, setLoading] = useState(false)
  const [showTvdbApiKey, setShowTvdbApiKey] = useState(false)
  const [showTvdbPin, setShowTvdbPin] = useState(false)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError('')
    setWarning('')

    const form = e.currentTarget
    const username = (form.elements.namedItem('username') as HTMLInputElement).value.trim()
    const password = (form.elements.namedItem('password') as HTMLInputElement).value
    const confirmPassword = (form.elements.namedItem('confirmPassword') as HTMLInputElement).value
    const tvdbApiKey = tvdbApiKeyLocked ? '' : ((form.elements.namedItem('tvdbApiKey') as HTMLInputElement | null)?.value.trim() ?? '')
    const tvdbPin = tvdbPinLocked ? '' : ((form.elements.namedItem('tvdbPin') as HTMLInputElement | null)?.value.trim() ?? '')
    const tvdbSeasonType = ((form.elements.namedItem('tvdbSeasonType') as HTMLSelectElement | null)?.value.trim() || defaultTvdbSeasonType)

    if (!username) {
      setError('Username is required')
      return
    }
    if (password.length < 8) {
      setError('Password must be at least 8 characters')
      return
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match')
      return
    }

    setLoading(true)
    const res = await fetch('/api/setup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password, confirmPassword, tvdbApiKey, tvdbPin, tvdbSeasonType }),
    })

    const data = await res.json().catch(() => ({}))
    if (res.ok) {
      if (data.warning) {
        setWarning(data.warning)
        window.setTimeout(() => router.push('/dashboard'), 1500)
      } else {
        router.push('/dashboard')
      }
    } else {
      setError(data.error ?? 'Setup failed')
    }
    setLoading(false)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1 text-gray-300">
            Username
          </label>
          <input
            name="username"
            type="text"
            required
            autoComplete="username"
            className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg focus:outline-none focus:border-purple-500 text-gray-100"
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1 text-gray-300">
            Password
          </label>
          <input
            name="password"
            type="password"
            required
            autoComplete="new-password"
            className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg focus:outline-none focus:border-purple-500 text-gray-100"
          />
          <p className="text-xs text-gray-500 mt-1">Minimum 8 characters</p>
        </div>
        <div>
          <label className="block text-sm font-medium mb-1 text-gray-300">
            Confirm Password
          </label>
          <input
            name="confirmPassword"
            type="password"
            required
            autoComplete="new-password"
            className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg focus:outline-none focus:border-purple-500 text-gray-100"
          />
        </div>
      </div>

      <fieldset className="space-y-3 rounded-xl border border-gray-800 bg-gray-950/60 p-4">
        <div>
          <legend className="text-sm font-semibold text-gray-200">TheTVDB metadata</legend>
          <p className="mt-1 text-xs text-gray-500">
            Optional, but needed for search and imports. Get a key from{' '}
            <a href="https://thetvdb.com/dashboard" target="_blank" rel="noreferrer" className="text-purple-300 hover:text-purple-200 underline">
              TheTVDB dashboard
            </a>
            .
          </p>
        </div>

        {tvdbApiKeyLocked ? (
          <div className="rounded-lg border border-gray-800 bg-gray-900 px-3 py-2 text-sm text-gray-300">
            TVDB API key is configured via environment variables.
          </div>
        ) : (
          <label className="block">
            <span className="mb-1 block text-sm text-gray-400">TVDB API key <span className="text-gray-600">(optional)</span></span>
            <div className="flex rounded-lg border border-gray-700 bg-gray-800 focus-within:border-purple-500">
              <input
                name="tvdbApiKey"
                type={showTvdbApiKey ? 'text' : 'password'}
                autoComplete="off"
                placeholder="Paste TVDB API key"
                className="min-w-0 flex-1 rounded-l-lg bg-transparent px-3 py-2 text-gray-100 focus:outline-none"
              />
              <button type="button" onClick={() => setShowTvdbApiKey((value) => !value)} className="rounded-r-lg px-3 text-xs font-semibold text-gray-400 hover:text-white">
                {showTvdbApiKey ? 'Hide' : 'Show'}
              </button>
            </div>
          </label>
        )}

        {!tvdbApiKeyLocked && !tvdbPinLocked && (
          <label className="block">
            <span className="mb-1 block text-sm text-gray-400">TVDB PIN <span className="text-gray-600">(optional)</span></span>
            <div className="flex rounded-lg border border-gray-700 bg-gray-800 focus-within:border-purple-500">
              <input
                name="tvdbPin"
                type={showTvdbPin ? 'text' : 'password'}
                autoComplete="off"
                placeholder="Optional subscriber PIN"
                className="min-w-0 flex-1 rounded-l-lg bg-transparent px-3 py-2 text-gray-100 focus:outline-none"
              />
              <button type="button" onClick={() => setShowTvdbPin((value) => !value)} className="rounded-r-lg px-3 text-xs font-semibold text-gray-400 hover:text-white">
                {showTvdbPin ? 'Hide' : 'Show'}
              </button>
            </div>
          </label>
        )}

        {!tvdbApiKeyLocked && tvdbPinLocked && (
          <div className="rounded-lg border border-gray-800 bg-gray-900 px-3 py-2 text-sm text-gray-300">
            TVDB PIN is configured via environment variables.
          </div>
        )}

        <label className="block">
          <span className="mb-1 block text-sm text-gray-400">TVDB season type</span>
          <select
            name="tvdbSeasonType"
            defaultValue={defaultTvdbSeasonType || 'default'}
            className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg focus:outline-none focus:border-purple-500 text-gray-100"
          >
            <option value="default">Aired order (recommended)</option>
            <option value="official">Official order</option>
            <option value="dvd">DVD order</option>
            <option value="absolute">Absolute order (one continuous episode count)</option>
          </select>
          <p className="mt-1 text-xs text-gray-500">Pick the TVDB order that matches how the Plex library is organized; anime libraries most often use aired or absolute order.</p>
        </label>
      </fieldset>

      {error && <p className="text-red-400 text-sm">{error}</p>}
      {warning && <p className="text-amber-300 text-sm">{warning}</p>}
      <button
        type="submit"
        disabled={loading}
        className="w-full py-2 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 rounded-lg font-medium transition-colors"
      >
        {loading ? 'Creating account...' : 'Create account'}
      </button>
    </form>
  )
}
