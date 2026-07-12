import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'

export async function POST(req: NextRequest) {
  const { username, password } = await req.json()

  const expectedUser = process.env.AUTH_USERNAME
  const expectedPass = process.env.AUTH_PASSWORD

  if (
    !expectedUser ||
    !expectedPass ||
    username !== expectedUser ||
    password !== expectedPass
  ) {
    return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 })
  }

  const session = await getSession()
  session.user = { username }
  await session.save()

  return NextResponse.json({ ok: true })
}
