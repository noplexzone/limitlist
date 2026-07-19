'use client'

import { FormEvent, useState } from 'react'
import { SettingsState } from '../types'

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result))
    reader.onerror = () => reject(reader.error)
    reader.readAsDataURL(file)
  })
}

interface Props {
  settings: SettingsState
  onSettingsChange: (s: SettingsState) => void
}

export default function AccountSection({ settings, onSettingsChange }: Props) {
  const [username, setUsername] = useState(settings.username)
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

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
      if ('profileImageData' in body) window.dispatchEvent(new Event('limitlist:profile-image-updated'))
      setMessage(successMsg)
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

  return (
    <div className="space-y-6">
      {(message || error) && (
        <div className={`rounded-xl border px-4 py-3 text-sm ${error ? 'border-red-500/50 bg-red-950/50 text-red-200' : 'border-green-500/40 bg-green-950/40 text-green-200'}`}>
          {error || message}
        </div>
      )}

      <section className="bg-surface-900 border border-surface-800 rounded-xl p-4 sm:p-6">
        <h2 className="text-lg font-semibold text-surface-200 mb-4">Account</h2>
        <form onSubmit={submitAccount} className="space-y-4">
          <label className="block">
            <span className="mb-1 block text-sm text-surface-400">Username</span>
            <input
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full rounded-lg border border-surface-700 bg-surface-950 px-3 py-2 text-surface-100 outline-none focus:border-accent-500"
            />
          </label>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block">
              <span className="mb-1 block text-sm text-surface-400">Current password</span>
              <input
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                autoComplete="current-password"
                className="w-full rounded-lg border border-surface-700 bg-surface-950 px-3 py-2 text-surface-100 outline-none focus:border-accent-500"
              />
            </label>
            <label className="block">
              <span className="mb-1 block text-sm text-surface-400">New password</span>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                autoComplete="new-password"
                className="w-full rounded-lg border border-surface-700 bg-surface-950 px-3 py-2 text-surface-100 outline-none focus:border-accent-500"
              />
            </label>
          </div>
          <button disabled={saving} className="rounded-lg bg-accent-600 px-4 py-2 text-sm font-semibold text-white hover:bg-accent-500 disabled:opacity-50">
            Save account
          </button>
        </form>
      </section>

      <section className="bg-surface-900 border border-surface-800 rounded-xl p-4 sm:p-6">
        <h2 className="text-lg font-semibold text-surface-200 mb-4">Profile picture</h2>
        <div className="flex items-center gap-4">
          <div className="h-20 w-20 overflow-hidden rounded-xl bg-accent-800 flex items-center justify-center text-lg font-bold text-white">
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
              className="block text-sm text-surface-400 file:mr-3 file:rounded-lg file:border-0 file:bg-surface-800 file:px-3 file:py-2 file:text-sm file:font-medium file:text-surface-100 hover:file:bg-surface-700"
            />
            <p className="text-xs text-surface-500">Stored in the local database as an image data URL; max 2 MB.</p>
            {settings.profileImageData && (
              <button
                type="button"
                onClick={() => savePatch({ profileImageData: null }, 'Profile picture removed.')}
                className="text-xs text-surface-400 underline hover:text-white"
              >
                Remove picture
              </button>
            )}
          </div>
        </div>
      </section>
    </div>
  )
}
