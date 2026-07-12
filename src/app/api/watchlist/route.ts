import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { getTmdbProvider } from '@/lib/tmdb'

export async function GET() {
  const user = await requireAuth()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const shows = await prisma.animeShow.findMany({
    orderBy: { updatedAt: 'desc' },
  })
  return NextResponse.json(shows)
}

export async function POST(req: NextRequest) {
  const user = await requireAuth()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { metadataProvider, metadataId } = body

  // Prevent duplicates
  const existing = await prisma.animeShow.findUnique({
    where: { metadataProvider_metadataId: { metadataProvider, metadataId } },
  })
  if (existing) {
    return NextResponse.json(
      { error: 'This show is already in your watchlist', existing },
      { status: 409 }
    )
  }

  // Fetch details from provider to get full metadata
  let enriched = body
  if (metadataProvider === 'tmdb') {
    const tmdb = getTmdbProvider()
    if (tmdb) {
      const details = await tmdb.getDetails(metadataId)
      if (details) {
        enriched = {
          ...body,
          title: details.title,
          originalTitle: details.originalTitle,
          overview: details.overview,
          posterUrl: details.posterUrl,
          firstAiredAt: details.firstAiredAt,
          genres: details.genres?.join(', '),
          studios: details.studios?.join(', '),
          episodesTotal: details.episodesTotal,
        }
      }
    }
  }

  const show = await prisma.animeShow.create({
    data: {
      metadataProvider: enriched.metadataProvider,
      metadataId: enriched.metadataId,
      title: enriched.title,
      originalTitle: enriched.originalTitle ?? null,
      overview: enriched.overview ?? null,
      posterUrl: enriched.posterUrl ?? null,
      firstAiredAt: enriched.firstAiredAt ? new Date(enriched.firstAiredAt) : null,
      genres: enriched.genres ?? null,
      studios: enriched.studios ?? null,
      episodesTotal: enriched.episodesTotal ?? null,
      status: 'PLAN_TO_WATCH',
    },
  })
  return NextResponse.json(show, { status: 201 })
}
