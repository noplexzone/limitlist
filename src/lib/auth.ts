import { getIronSession, SessionOptions } from 'iron-session'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { isSetupComplete } from './setup'

export interface SessionData {
  user?: {
    username: string
  }
}

function buildSessionOptions(): SessionOptions {
  const secret = process.env.AUTH_SECRET
  if (!secret) {
    throw new Error('AUTH_SECRET environment variable is required')
  }
  return {
    password: secret,
    cookieName: 'limitlist-session',
    cookieOptions: {
      // Docker/Unraid deployments may run plain HTTP behind a LAN or reverse proxy.
      // Enable Secure cookies only when the deployment explicitly uses HTTPS.
      secure: process.env.AUTH_COOKIE_SECURE === 'true',
      httpOnly: true,
      sameSite: 'lax',
    },
  }
}

export async function getSession() {
  const cookieStore = await cookies()
  return getIronSession<SessionData>(cookieStore, buildSessionOptions())
}

export async function requireAuth() {
  // Call getSession() first — it calls cookies() which opts the page out of static
  // prerendering, preventing build-time Prisma errors when DATABASE_URL is absent.
  const session = await getSession()
  if (!(await isSetupComplete())) {
    redirect('/setup')
  }
  if (!session.user) {
    return null
  }
  return session.user
}
