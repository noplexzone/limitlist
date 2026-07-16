'use client'

import { changelogEntries } from '@/lib/changelog'

interface Props {
  version: string
}

export default function AboutSection({ version }: Props) {
  return (
    <div className="space-y-6">
      <section className="bg-gray-900 border border-gray-800 rounded-xl p-6">
        <h2 className="text-lg font-semibold text-gray-200 mb-4">About</h2>
        <div className="space-y-1">
          <p className="text-sm text-gray-400">LimitList</p>
          <p className="text-2xl font-bold text-purple-400">v{version}</p>
        </div>
      </section>

      <section className="bg-gray-900 border border-gray-800 rounded-xl p-6">
        <div className="mb-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-purple-300">What&apos;s New</p>
          <h2 className="mt-1 text-lg font-semibold text-gray-100">LimitList updates</h2>
        </div>
        <div className="space-y-2">
          {changelogEntries.map((entry, index) => (
            <details key={entry.version} open={index === 0} className="rounded-lg border border-gray-800 bg-gray-950/70 px-3 py-2">
              <summary className="cursor-pointer text-sm font-medium text-gray-200">
                {entry.version} <span className="text-xs font-normal text-gray-500">· {entry.date}</span>
              </summary>
              <div className="mt-3 space-y-3 text-xs leading-5 text-gray-400">
                {entry.sections.map((section) => (
                  <div key={section.title}>
                    <p className="mb-1 font-semibold uppercase tracking-wide text-purple-300">{section.title}</p>
                    <ul className="space-y-1">
                      {section.bullets.map((bullet) => (
                        <li key={bullet}>• {bullet}</li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </details>
          ))}
        </div>
      </section>
    </div>
  )
}
