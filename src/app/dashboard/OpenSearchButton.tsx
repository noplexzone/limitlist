'use client'

export default function OpenSearchButton() {
  return (
    <button
      type="button"
      onClick={() => window.dispatchEvent(new CustomEvent('limitlist:open-search'))}
      className="inline-block px-5 py-2.5 bg-accent-600 hover:bg-accent-700 text-white rounded-lg font-medium transition-colors"
    >
      Search to import anime
    </button>
  )
}
