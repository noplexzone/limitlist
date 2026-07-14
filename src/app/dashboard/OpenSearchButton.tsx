'use client'

export default function OpenSearchButton() {
  return (
    <button
      type="button"
      onClick={() => window.dispatchEvent(new CustomEvent('limitlist:open-search'))}
      className="inline-block px-5 py-2.5 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-medium transition-colors"
    >
      Search to import anime
    </button>
  )
}
