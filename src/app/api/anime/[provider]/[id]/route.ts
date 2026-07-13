import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { getConfiguredTmdbProvider } from '@/lib/tmdb'

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ provider: string; id: string }> }
) {
  const user = await requireAuth()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { provider, id } = await params
  const tracked = await prisma.animeShow.findUnique({
    where: { metadataProvider_metadataId: { metadataProvider: provider, metadataId: id } },
  })
  if (tracked) return NextResponse.json({ tracked: true, anime: tracked })

  if (provider !== 'tmdb') {
    return NextResponse.json({ error: 'Unsupported provider' }, { status: 404 })
  }

  const tmdb = await getConfiguredTmdbProvider()
  if (!tmdb) return NextResponse.json({ error: 'TMDB_API_KEY is not configured.' }, { status: 503 })
  const details = await tmdb.getDetails(id)
  if (!details) return NextResponse.json({ error: 'Anime not found' }, { status: 404 })

  return NextResponse.json({ tracked: false, anime: details })
}
