import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { verifyPassword } from '@/lib/password'
import { isSetupComplete } from '@/lib/setup'

export async function POST(req: NextRequest) {
  if (!(await isSetupComplete())) {
    return NextResponse.json(
      { error: 'Setup not complete. Please visit /setup first.' },
      { status: 409 }
    )
  }

  const { username, password } = await req.json()

  const appUser = await prisma.appUser.findUnique({ where: { username } })
  if (!appUser) {
    return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 })
  }

  const valid = await verifyPassword(password, appUser.passwordHash)
  if (!valid) {
    return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 })
  }

  const session = await getSession()
  session.user = { username }
  await session.save()

  return NextResponse.json({ ok: true })
}
