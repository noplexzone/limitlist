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
  const empty = { voiceCast: undefined, recommendations: [], relatedMovies: [] }

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
    const anilistDetail = tracked?.sourceProvider === 'anilist' && tracked.sourceId
      ? await fetchAniListDetailById(tracked.sourceId)
      : provider === 'anilist'
        ? await fetchAniListDetailById(id)
        : await findAniListDetailForAnime(titles, year)

    if (!tracked && !anilistDetail) return NextResponse.json(empty)

    const jikanVoiceCast = await fetchJikanVoiceCast(
      titles.length ? titles : [anilistDetail?.title.english, anilistDetail?.title.romaji, anilistDetail?.title.native],
      year
    ).catch(() => undefined)
    const anilistVoiceCast = anilistDetail ? buildAniListVoiceCast(anilistDetail) : undefined

    return NextResponse.json({
      voiceCast: mergeVoiceCastPreferJikan(jikanVoiceCast, anilistVoiceCast),
      recommendations: anilistDetail ? buildAniListRecommendations(anilistDetail) : [],
      relatedMovies: anilistDetail ? buildAniListRelatedMovies(anilistDetail) : [],
    })
  } catch {
    return NextResponse.json(empty)
  }
}
