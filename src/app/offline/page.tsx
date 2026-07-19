'use client'

export const dynamic = 'force-static'

export default function OfflinePage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-6 px-4 text-center">
      <div className="w-16 h-16 rounded-2xl bg-accent-600 flex items-center justify-center text-white text-3xl font-bold select-none">
        L
      </div>
      <div>
        <h1 className="text-2xl font-bold mb-2">You&apos;re offline</h1>
        <p className="text-surface-400 max-w-xs">
          LimitList can&apos;t reach the server right now. Check your connection and try again.
        </p>
      </div>
      <button
        onClick={() => window.location.reload()}
        className="px-5 py-2 rounded-lg bg-accent-600 hover:bg-accent-500 text-white font-medium transition-colors"
      >
        Try again
      </button>
    </div>
  )
}
