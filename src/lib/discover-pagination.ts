export interface DiscoverCursor {
  page: number
  offset: number
}

export function encodeCursor(page: number, offset: number): string {
  return Buffer.from(JSON.stringify({ page, offset })).toString('base64')
}

export function decodeCursor(cursor: string): DiscoverCursor | null {
  try {
    const json = Buffer.from(cursor, 'base64').toString('utf8')
    const obj = JSON.parse(json)
    if (typeof obj !== 'object' || obj === null) return null
    const { page, offset } = obj as Record<string, unknown>
    if (!Number.isInteger(page) || (page as number) < 1 || (page as number) > 1000) return null
    if (!Number.isInteger(offset) || (offset as number) < 0 || (offset as number) > 49) return null
    return { page: page as number, offset: offset as number }
  } catch {
    return null
  }
}

export function computeNextCursor(
  currentPage: number,
  filteredLength: number,
  currentOffset: number,
  itemsTaken: number,
  upstreamHasNextPage: boolean
): { nextCursor: string | null; hasNextPage: boolean } {
  const newOffset = currentOffset + itemsTaken
  if (newOffset >= filteredLength) {
    if (upstreamHasNextPage) {
      return { nextCursor: encodeCursor(currentPage + 1, 0), hasNextPage: true }
    }
    return { nextCursor: null, hasNextPage: false }
  }
  return { nextCursor: encodeCursor(currentPage, newOffset), hasNextPage: true }
}
