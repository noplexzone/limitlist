import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { hashPassword } from '@/lib/password'
import { isSetupComplete } from '@/lib/setup'
import { getSession } from '@/lib/auth'

export async function POST(req: NextRequest) {
  if (await isSetupComplete()) {
    return NextResponse.json({ error: 'Setup already complete' }, { status: 409 })
  }

  const body = await req.json()
  const { username, password, confirmPassword } = body

  if (!username || typeof username !== 'string' || username.trim().length === 0) {
    return NextResponse.json({ error: 'Username is required' }, { status: 400 })
  }

  if (!password || typeof password !== 'string' || password.length < 8) {
    return NextResponse.json({ error: 'Password must be at least 8 characters' }, { status: 400 })
  }

  if (password !== confirmPassword) {
    return NextResponse.json({ error: 'Passwords do not match' }, { status: 400 })
  }

  const trimmedUsername = username.trim()
  const passwordHash = await hashPassword(password)

  await prisma.appUser.create({
    data: { username: trimmedUsername, passwordHash },
  })

  const session = await getSession()
  session.user = { username: trimmedUsername }
  await session.save()

  return NextResponse.json({ ok: true })
}
