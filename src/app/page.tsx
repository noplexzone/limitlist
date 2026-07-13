import { redirect } from 'next/navigation'
import { requireAuth } from '@/lib/auth'

export default async function Home() {
  const user = await requireAuth()
  if (!user) {
    redirect('/login')
  }
  redirect('/dashboard')
}
