export interface ChangelogEntry {
  version: string
  date: string
  bullets: string[]
}

export const changelogEntries: ChangelogEntry[] = [
  {
    version: '1.2.0-rc.9',
    date: '2026-07-14',
    bullets: [
      'Protect detail-page descriptions from raw watchlist PATCH rows when status or ratings change.',
      'Restore status color generation for every watchlist state, including Paused and Up-to-Date.',
      'Polish detail-page movies, voice cast, seasons, and in-app release notes ahead of 1.2.0.',
    ],
  },
  {
    version: '1.1.0',
    date: '2026-07-13',
    bullets: [
      'Added AniList-powered Discover, dashboard shelves, and global reminder badge support.',
      'Reworked watchlist cards with persistent poster titles, image fallbacks, and cleaner search results.',
    ],
  },
  {
    version: '1.0.3',
    date: '2026-07-13',
    bullets: [
      'Changed watchlist cards to poster-only tiles with overlaid status and hover/focus rating controls.',
    ],
  },
]
