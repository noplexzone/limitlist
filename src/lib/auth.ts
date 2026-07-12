import { getIronSession, SessionOptions } from 'iron-session'
import { cookies } from 'next/headers'

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
    cookieName: 'anime-tracker-session',
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
  const session = await getSession()
  if (!session.user) {
    return null
  }
  return session.user
}
