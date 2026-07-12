import { redirect } from 'next/navigation'
import { requireAuth } from '@/lib/auth'
import LoginForm from './LoginForm'

export default async function LoginPage() {
  const user = await requireAuth()
  if (user) redirect('/watchlist')

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-950">
      <div className="bg-gray-900 p-8 rounded-xl shadow-lg w-full max-w-sm">
        <h1 className="text-2xl font-bold text-center mb-6 text-purple-400">
          Anime Tracker
        </h1>
        <LoginForm />
      </div>
    </div>
  )
}
