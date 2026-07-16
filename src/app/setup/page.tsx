import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth'
import { isSetupComplete } from '@/lib/setup'
import { DEFAULT_TVDB_SEASON_TYPE, isTvdbApiKeyEnvLocked, isTvdbPinEnvLocked } from '@/lib/settings'
import SetupForm from './SetupForm'

export default async function SetupPage() {
  // Call getSession() first to use cookies(), which opts the page out of static
  // prerendering and prevents build-time Prisma errors when DATABASE_URL is absent.
  const session = await getSession()
  const setupDone = await isSetupComplete()

  if (setupDone) {
    if (session.user) {
      redirect('/watchlist')
    } else {
      redirect('/login')
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-surface-950">
      <div className="bg-surface-900 p-8 rounded-xl shadow-lg w-full max-w-lg">
        <h1 className="text-2xl font-bold text-center mb-2 text-accent-400">
          LimitList
        </h1>
        <p className="text-center text-sm text-surface-400 mb-6">
          First-run setup — create your account to get started
        </p>
        <SetupForm
          tvdbApiKeyLocked={isTvdbApiKeyEnvLocked()}
          tvdbPinLocked={isTvdbPinEnvLocked()}
          defaultTvdbSeasonType={DEFAULT_TVDB_SEASON_TYPE}
        />
      </div>
    </div>
  )
}
