'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function SetupForm() {
  const router = useRouter()
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError('')

    const form = e.currentTarget
    const username = (form.elements.namedItem('username') as HTMLInputElement).value.trim()
    const password = (form.elements.namedItem('password') as HTMLInputElement).value
    const confirmPassword = (form.elements.namedItem('confirmPassword') as HTMLInputElement).value

    if (!username) {
      setError('Username is required')
      return
    }
    if (password.length < 8) {
      setError('Password must be at least 8 characters')
      return
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match')
      return
    }

    setLoading(true)
    const res = await fetch('/api/setup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password, confirmPassword }),
    })

    if (res.ok) {
      router.push('/watchlist')
    } else {
      const data = await res.json()
      setError(data.error ?? 'Setup failed')
    }
    setLoading(false)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium mb-1 text-gray-300">
          Username
        </label>
        <input
          name="username"
          type="text"
          required
          autoComplete="username"
          className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg focus:outline-none focus:border-purple-500 text-gray-100"
        />
      </div>
      <div>
        <label className="block text-sm font-medium mb-1 text-gray-300">
          Password
        </label>
        <input
          name="password"
          type="password"
          required
          autoComplete="new-password"
          className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg focus:outline-none focus:border-purple-500 text-gray-100"
        />
        <p className="text-xs text-gray-500 mt-1">Minimum 8 characters</p>
      </div>
      <div>
        <label className="block text-sm font-medium mb-1 text-gray-300">
          Confirm Password
        </label>
        <input
          name="confirmPassword"
          type="password"
          required
          autoComplete="new-password"
          className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg focus:outline-none focus:border-purple-500 text-gray-100"
        />
      </div>
      {error && <p className="text-red-400 text-sm">{error}</p>}
      <button
        type="submit"
        disabled={loading}
        className="w-full py-2 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 rounded-lg font-medium transition-colors"
      >
        {loading ? 'Creating account...' : 'Create account'}
      </button>
    </form>
  )
}
