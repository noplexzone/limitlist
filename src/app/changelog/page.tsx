import { redirect } from 'next/navigation'
import Link from 'next/link'
import { requireAuth } from '@/lib/auth'
import { changelogEntries } from '@/lib/changelog'
import Nav from '@/components/Nav'

export const metadata = { title: 'Changelog — LimitList' }

export default async function ChangelogPage() {
  const user = await requireAuth()
  if (!user) redirect('/login')

  return (
    <div className="min-h-screen bg-surface-950">
      <Nav />
      <main className="mx-auto max-w-2xl px-4 py-8 sm:px-6">
        <div className="mb-6 flex items-center gap-3">
          <Link href="/dashboard" className="text-sm text-accent-400 hover:text-accent-300 transition-colors">
            ← Dashboard
          </Link>
        </div>
        <h1 className="text-3xl font-bold text-accent-400 mb-8">Changelog</h1>
        <div className="space-y-2">
          {changelogEntries.map((entry) => (
            <details key={entry.version} className="rounded-lg border border-surface-800 bg-surface-900/70 px-4 py-3">
              <summary className="cursor-pointer text-sm font-medium text-surface-200">
                {entry.version} <span className="text-xs font-normal text-surface-500">· {entry.date}</span>
              </summary>
              <div className="mt-3 space-y-3 text-xs leading-5 text-surface-400">
                {entry.sections.map((section) => (
                  <div key={section.title}>
                    <p className="mb-1 font-semibold uppercase tracking-wide text-accent-300">{section.title}</p>
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
      </main>
    </div>
  )
}
