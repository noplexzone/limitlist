import { getIronSession, SessionOptions } from 'iron-session'
import { cookies } from 'next/headers'

export interface SessionData {
  user?: {
    username: string
  }
}

export const sessionOptions: SessionOptions = {
  password: process.env.AUTH_SECRET ?? 'fallback-secret-must-be-changed-32chars',
  cookieName: 'anime-tracker-session',
  cookieOptions: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    sameSite: 'lax',
  },
}

export async function getSession() {
  const cookieStore = await cookies()
  return getIronSession<SessionData>(cookieStore, sessionOptions)
}

export async function requireAuth() {
  const session = await getSession()
  if (!session.user) {
    return null
  }
  return session.user
}
