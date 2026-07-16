import { redirect } from 'next/navigation'
import { requireAuth } from '@/lib/auth'
import LoginForm from './LoginForm'

export default async function LoginPage() {
  const user = await requireAuth()
  if (user) redirect('/dashboard')

  return (
    <div className="min-h-screen flex items-center justify-center bg-surface-950">
      <div className="bg-surface-900 p-8 rounded-xl shadow-lg w-full max-w-sm">
        <h1 className="text-2xl font-bold text-center mb-6 text-accent-400">
          LimitList
        </h1>
        <LoginForm />
      </div>
    </div>
  )
}
