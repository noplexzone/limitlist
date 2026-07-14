import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { fetchJikanVoiceCast } from '@/lib/jikan'
import {
  buildAniListRecommendations,
  buildAniListRelatedMovies,
  buildAniListVoiceCast,
  fetchAniListDetailById,
  findAniListDetailForAnime,
  mergeVoiceCast,
  stripAniListHtml,
} from '@/lib/anilist'
import type { MetadataVoiceCastGroup } from '@/lib/providers'

function mergeVoiceCastPreferJikan(jikan?: MetadataVoiceCastGroup | null, anilist?: MetadataVoiceCastGroup | null): MetadataVoiceCastGroup | undefined {
  return mergeVoiceCast(jikan, anilist)
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ provider: string; id: string }> }
) {
  const user = await requireAuth()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { provider, id } = await params
  const empty = { voiceCast: undefined, recommendations: [], relatedMovies: [], overview: undefined }

  try {
    const tracked = provider === 'anilist'
      ? await prisma.animeShow.findFirst({
          where: { OR: [{ metadataProvider: 'anilist', metadataId: id }, { sourceProvider: 'anilist', sourceId: id }] },
        })
      : await prisma.animeShow.findUnique({
          where: { metadataProvider_metadataId: { metadataProvider: provider, metadataId: id } },
        })

    const titles = tracked ? [tracked.title, tracked.originalTitle] : []
    const year = tracked?.firstAiredAt?.getFullYear() ?? null
    const anilistDetail = await (async () => {
      try {
        return tracked?.sourceProvider === 'anilist' && tracked.sourceId
          ? await fetchAniListDetailById(tracked.sourceId)
          : provider === 'anilist'
            ? await fetchAniListDetailById(id)
            : await findAniListDetailForAnime(titles, year)
      } catch (error) {
        if (process.env.NODE_ENV !== 'production') console.warn('[enrichment] AniList lookup failed', error)
        return null
      }
    })()

    if (!tracked && !anilistDetail) return NextResponse.json(empty)

    const lookupTitles = titles.length ? titles : [anilistDetail?.title.english, anilistDetail?.title.romaji, anilistDetail?.title.native]
    const jikanVoiceCast = await fetchJikanVoiceCast(lookupTitles, year).catch((error) => {
      if (process.env.NODE_ENV !== 'production') console.warn('[enrichment] Jikan voice cast failed', error)
      return undefined
    })
    const anilistVoiceCast = anilistDetail ? buildAniListVoiceCast(anilistDetail) : undefined
    const recommendations = await Promise.resolve(anilistDetail ? buildAniListRecommendations(anilistDetail) : []).catch(() => [])
    const relatedMovies = await Promise.resolve(anilistDetail ? buildAniListRelatedMovies(anilistDetail) : []).catch(() => [])

    return NextResponse.json({
      voiceCast: mergeVoiceCastPreferJikan(jikanVoiceCast, anilistVoiceCast),
      recommendations,
      relatedMovies,
      overview: stripAniListHtml(anilistDetail?.description),
    })
  } catch {
    return NextResponse.json(empty)
  }
}
