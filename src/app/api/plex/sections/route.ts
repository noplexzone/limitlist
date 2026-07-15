import { NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { getConfiguredPlexClient } from '@/lib/plex'

export async function GET() {
  const user = await requireAuth()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const client = await getConfiguredPlexClient()
  if (!client) return NextResponse.json({ sections: [] })
  const sections = await client.getSections()
  return NextResponse.json({ sections: sections.filter((section) => section.type === 'show') })
}
