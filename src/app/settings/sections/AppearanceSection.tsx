'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { THEMES } from '@/lib/themes'
import { SettingsState } from '../types'

interface Props {
  settings: SettingsState
  onSettingsChange: (s: SettingsState) => void
}

export default function AppearanceSection({ settings, onSettingsChange }: Props) {
  const router = useRouter()
  const [savingTheme, setSavingTheme] = useState<string | null>(null)
  const [error, setError] = useState('')

  async function selectTheme(themeId: string) {
    if (savingTheme || themeId === settings.theme) return
    setSavingTheme(themeId)
    setError('')
    const res = await fetch('/api/settings', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ theme: themeId }),
    })
    const data = await res.json()
    if (!res.ok) {
      setError(data.error ?? 'Theme update failed')
    } else {
      onSettingsChange(data)
      router.refresh()
    }
    setSavingTheme(null)
  }

  return (
    <section className="bg-surface-900 border border-surface-800 rounded-xl p-4 sm:p-6">
      <h2 className="text-lg font-semibold text-surface-200 mb-1">Appearance</h2>
      <p className="mb-4 text-sm text-surface-400">Choose the global LimitList theme. Changes apply after the server-rendered refresh to avoid a wrong-theme flash.</p>
      {error && <div className="mb-4 rounded-xl border border-red-500/50 bg-red-950/50 px-4 py-3 text-sm text-red-200">{error}</div>}
      <div className="grid gap-4 sm:grid-cols-2">
        {THEMES.map((theme) => {
          const selected = settings.theme === theme.id
          return (
            <button
              key={theme.id}
              type="button"
              onClick={() => selectTheme(theme.id)}
              disabled={Boolean(savingTheme)}
              className={`rounded-xl border p-4 text-left transition ${
                selected
                  ? 'border-accent-500 bg-accent-950/40 shadow-lg shadow-accent-950/30'
                  : 'border-surface-800 bg-surface-950 hover:border-accent-700/70'
              } disabled:opacity-60`}
            >
              <div className="mb-3 flex items-center justify-between gap-3">
                <div className="flex gap-1.5" aria-hidden="true">
                  {theme.swatches.map((swatch) => (
                    <span
                      key={swatch}
                      className="h-6 w-6 rounded-full border border-white/10"
                      style={{ backgroundColor: `rgb(${swatch})` }}
                    />
                  ))}
                </div>
                {selected && <span className="rounded-full bg-accent-600 px-2 py-0.5 text-xs font-semibold text-white">Active</span>}
              </div>
              <h3 className="font-semibold text-surface-100">{theme.name}</h3>
              <p className="mt-1 text-sm text-surface-400">{theme.description}</p>
            </button>
          )
        })}
      </div>
    </section>
  )
}
