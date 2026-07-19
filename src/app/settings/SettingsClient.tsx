'use client'

import { Suspense, useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { SettingsState } from './types'
import AccountSection from './sections/AccountSection'
import MetadataSection from './sections/MetadataSection'
import PlexConnectionSection from './sections/PlexConnectionSection'
import PlexSyncSection from './sections/PlexSyncSection'
import ImportFromPlexSection from './sections/ImportFromPlexSection'
import TasksSection from './sections/TasksSection'
import NotificationsSection from './sections/NotificationsSection'
import AppearanceSection from './sections/AppearanceSection'
import AboutSection from './sections/AboutSection'

const SECTIONS = [
  { id: 'account', label: 'Account' },
  { id: 'metadata', label: 'Metadata' },
  { id: 'plex', label: 'Plex' },
  { id: 'tasks', label: 'Tasks' },
  { id: 'notifications', label: 'Notifications' },
  { id: 'appearance', label: 'Appearance' },
  { id: 'about', label: 'About' },
] as const

type SectionId = (typeof SECTIONS)[number]['id']

const PLEX_PANELS = [
  { id: 'connection', label: 'Connection' },
  { id: 'sync', label: 'Sync options' },
  { id: 'import', label: 'Import watched anime' },
] as const

type PlexPanelId = (typeof PLEX_PANELS)[number]['id']

// Legacy section IDs that map to the unified Plex section.
const LEGACY_PLEX_MAP: Record<string, PlexPanelId> = {
  'plex-connection': 'connection',
  'plex-sync': 'sync',
  'import-from-plex': 'import',
}

function SettingsRouter({ initialSettings, version }: { initialSettings: SettingsState; version: string }) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [settings, setSettings] = useState(initialSettings)

  const rawSection = searchParams.get('section') ?? 'account'
  const rawPanel = searchParams.get('panel') ?? 'connection'

  // Redirect legacy plex section URLs to the unified plex section.
  useEffect(() => {
    if (rawSection in LEGACY_PLEX_MAP) {
      const panel = LEGACY_PLEX_MAP[rawSection]
      router.replace(`/settings?section=plex&panel=${panel}`, { scroll: false })
    }
  }, [rawSection, router])

  const isLegacyRedirect = rawSection in LEGACY_PLEX_MAP

  const activeSection: SectionId = (SECTIONS.some((s) => s.id === rawSection)
    ? rawSection
    : isLegacyRedirect
      ? 'plex'
      : 'account') as SectionId

  const activePlexPanel: PlexPanelId = (PLEX_PANELS.some((p) => p.id === rawPanel)
    ? rawPanel
    : 'connection') as PlexPanelId

  function navigate(id: SectionId) {
    if (id === 'plex') {
      router.replace(`/settings?section=plex&panel=${activePlexPanel}`, { scroll: false })
    } else {
      router.replace(`/settings?section=${id}`, { scroll: false })
    }
  }

  function navigatePlexPanel(panel: PlexPanelId) {
    router.replace(`/settings?section=plex&panel=${panel}`, { scroll: false })
  }

  function renderSection() {
    switch (activeSection) {
      case 'account':
        return <AccountSection settings={settings} onSettingsChange={setSettings} />
      case 'metadata':
        return <MetadataSection settings={settings} onSettingsChange={setSettings} />
      case 'plex':
        return (
          <div className="space-y-6">
            {/* Mobile: panel picker dropdown */}
            <div className="sm:hidden">
              <select
                aria-label="Plex settings panel"
                value={activePlexPanel}
                onChange={(e) => navigatePlexPanel(e.target.value as PlexPanelId)}
                className="w-full rounded-lg border border-surface-700 bg-surface-950 px-3 py-3 text-sm font-medium text-surface-100 outline-none focus:border-accent-500"
              >
                {PLEX_PANELS.map((p) => (
                  <option key={p.id} value={p.id}>{p.label}</option>
                ))}
              </select>
            </div>
            {/* Desktop: inner tab strip */}
            <div className="hidden sm:flex gap-1 border-b border-surface-800">
              {PLEX_PANELS.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => navigatePlexPanel(p.id)}
                  className={`min-h-11 shrink-0 px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
                    activePlexPanel === p.id
                      ? 'border-accent-500 text-accent-300'
                      : 'border-transparent text-surface-400 hover:text-surface-200'
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>
            {activePlexPanel === 'connection' && (
              <PlexConnectionSection settings={settings} onSettingsChange={setSettings} />
            )}
            {activePlexPanel === 'sync' && (
              <PlexSyncSection settings={settings} onSettingsChange={setSettings} />
            )}
            {activePlexPanel === 'import' && (
              <ImportFromPlexSection plexConfigured={settings.plexBaseUrl.configured && settings.plexToken.configured} />
            )}
          </div>
        )
      case 'tasks':
        return <TasksSection />
      case 'notifications':
        return <NotificationsSection settings={settings} onSettingsChange={setSettings} />
      case 'appearance':
        return <AppearanceSection settings={settings} onSettingsChange={setSettings} />
      case 'about':
        return <AboutSection version={version} />
    }
  }

  return (
    <div className="mobile-settings flex flex-col gap-6 md:flex-row">
      {/* Mobile: section picker dropdown */}
      <div className="md:hidden">
        <select
          aria-label="Settings section"
          value={activeSection}
          onChange={(e) => navigate(e.target.value as SectionId)}
          className="w-full rounded-lg border border-surface-700 bg-surface-950 px-3 py-3 text-sm font-medium text-surface-100 outline-none focus:border-accent-500"
        >
          {SECTIONS.map((s) => (
            <option key={s.id} value={s.id}>{s.label}</option>
          ))}
        </select>
      </div>

      {/* Desktop: left sidebar */}
      <nav className="hidden md:block w-44 shrink-0">
        <div className="sticky top-6 space-y-0.5">
          {SECTIONS.map((s) => (
            <button
              key={s.id}
              onClick={() => navigate(s.id)}
              className={`w-full text-left px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                activeSection === s.id
                  ? 'bg-accent-900/60 text-accent-200'
                  : 'text-surface-400 hover:text-surface-200 hover:bg-surface-800/60'
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>
      </nav>

      {/* Content pane */}
      <div className="flex-1 min-w-0">
        {renderSection()}
      </div>
    </div>
  )
}

export default function SettingsClient({ initialSettings, version }: { initialSettings: SettingsState; version: string }) {
  return (
    <Suspense>
      <SettingsRouter initialSettings={initialSettings} version={version} />
    </Suspense>
  )
}
