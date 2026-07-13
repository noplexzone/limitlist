import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { getConfiguredTmdbProvider } from '@/lib/tmdb'
import { fetchAniListMediaById, getAniListTitles, getAniListYear } from '@/lib/anilist'

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

  // Fetch details from provider to get full metadata. AniList discover cards are
  // intentionally fast-loading; resolve their canonical TMDB show only when the
  // user imports one.
  let enriched = body
  let createProvider = metadataProvider
  let createProviderId = metadataId
  const tmdb = await getConfiguredTmdbProvider()

  if (metadataProvider === 'anilist') {
    const media = await fetchAniListMediaById(metadataId)
    const titles = Array.isArray(body.titles) ? body.titles : media ? getAniListTitles(media) : [body.title]
    const tmdbMatch = tmdb ? await tmdb.findShowForAnime(titles, media ? getAniListYear(media) : null) : null
    if (tmdbMatch) {
      createProvider = tmdbMatch.providerName
      createProviderId = tmdbMatch.providerId
      const existingTmdb = await prisma.animeShow.findUnique({
        where: { metadataProvider_metadataId: { metadataProvider: createProvider, metadataId: createProviderId } },
      })
      if (existingTmdb) {
        return NextResponse.json(
          { error: 'This show is already in your watchlist', existing: existingTmdb },
          { status: 409 }
        )
      }
      enriched = {
        ...body,
        title: tmdbMatch.title,
        originalTitle: body.originalTitle ?? tmdbMatch.originalTitle,
        overview: body.overview ?? tmdbMatch.overview,
        posterUrl: body.posterUrl ?? tmdbMatch.posterUrl,
        firstAiredAt: body.firstAiredAt ?? tmdbMatch.firstAiredAt,
        genres: tmdbMatch.genres?.join(', ') ?? (Array.isArray(body.genres) ? body.genres.join(', ') : body.genres),
        studios: tmdbMatch.studios?.join(', '),
        episodesTotal: tmdbMatch.episodesTotal ?? body.episodesTotal,
      }
    } else {
      enriched = {
        ...body,
        genres: Array.isArray(body.genres) ? body.genres.join(', ') : body.genres,
      }
    }
  } else if (metadataProvider === 'tmdb' && tmdb) {
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

  const show = await prisma.animeShow.create({
    data: {
      metadataProvider: createProvider,
      metadataId: createProviderId,
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
