export interface ChangelogEntry {
  version: string
  date: string
  bullets: string[]
}

export const changelogEntries: ChangelogEntry[] = [
  {
    version: '1.2.0-rc.1',
    date: '2026-07-14',
    bullets: [
      'Moved What\'s New into its own left dashboard sidebar so release notes stay visible beside the main dashboard.',
      'Documented the release iteration scheme: patch versions during active iteration, release-candidate tags only once the release is otherwise wrapped.',
      'Updated app references toward the real 1.2.0 release candidate line.',
    ],
  },
  {
    version: '1.1.9',
    date: '2026-07-14',
    bullets: [
      'Protected detail-page descriptions from raw watchlist PATCH rows when status or ratings change.',
      'Restored status color generation for every watchlist state, including Paused and Up-to-Date.',
      'Polished detail-page movies, voice cast, seasons, and in-app release notes ahead of 1.2.0.',
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
]
