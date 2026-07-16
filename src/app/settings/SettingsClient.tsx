'use client'

import { Suspense, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { SettingsState } from './types'
import AccountSection from './sections/AccountSection'
import MetadataSection from './sections/MetadataSection'
import PlexConnectionSection from './sections/PlexConnectionSection'
import PlexSyncSection from './sections/PlexSyncSection'
import ImportFromPlexSection from './sections/ImportFromPlexSection'
import TasksSection from './sections/TasksSection'
import AboutSection from './sections/AboutSection'

const SECTIONS = [
  { id: 'account', label: 'Account' },
  { id: 'metadata', label: 'Metadata' },
  { id: 'plex-connection', label: 'Plex Connection' },
  { id: 'plex-sync', label: 'Plex Sync' },
  { id: 'import-from-plex', label: 'Import from Plex' },
  { id: 'tasks', label: 'Tasks' },
  { id: 'about', label: 'About' },
] as const

type SectionId = (typeof SECTIONS)[number]['id']

function SettingsRouter({ initialSettings, version }: { initialSettings: SettingsState; version: string }) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [settings, setSettings] = useState(initialSettings)

  const rawSection = searchParams.get('section') ?? 'account'
  const activeSection: SectionId = (SECTIONS.some((s) => s.id === rawSection) ? rawSection : 'account') as SectionId

  function navigate(id: SectionId) {
    router.replace(`/settings?section=${id}`, { scroll: false })
  }

  function renderSection() {
    switch (activeSection) {
      case 'account':
        return <AccountSection settings={settings} onSettingsChange={setSettings} />
      case 'metadata':
        return <MetadataSection settings={settings} onSettingsChange={setSettings} />
      case 'plex-connection':
        return <PlexConnectionSection settings={settings} onSettingsChange={setSettings} />
      case 'plex-sync':
        return <PlexSyncSection settings={settings} onSettingsChange={setSettings} />
      case 'import-from-plex':
        return <ImportFromPlexSection plexConfigured={settings.plexBaseUrl.configured && settings.plexToken.configured} />
      case 'tasks':
        return <TasksSection />
      case 'about':
        return <AboutSection version={version} />
    }
  }

  return (
    <div className="flex flex-col md:flex-row gap-6">
      {/* Mobile: horizontal scrollable tab bar */}
      <div className="flex overflow-x-auto border-b border-gray-800 md:hidden -mx-4 px-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {SECTIONS.map((s) => (
          <button
            key={s.id}
            onClick={() => navigate(s.id)}
            className={`shrink-0 px-4 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
              activeSection === s.id
                ? 'border-purple-500 text-purple-300'
                : 'border-transparent text-gray-400 hover:text-gray-200'
            }`}
          >
            {s.label}
          </button>
        ))}
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
                  ? 'bg-purple-900/60 text-purple-200'
                  : 'text-gray-400 hover:text-gray-200 hover:bg-gray-800/60'
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
