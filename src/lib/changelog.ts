export interface ChangelogSection {
  title: 'Features' | 'Enhancements' | 'Bug fixes'
  bullets: string[]
}

export interface ChangelogEntry {
  version: string
  date: string
  sections: ChangelogSection[]
}

export const changelogEntries: ChangelogEntry[] = [
  {
    version: '1.1.0',
    date: '2026-07-14',
    sections: [
      {
        title: 'Features',
        bullets: [
          'Added Top Rated and Upcoming tabs to Discover.',
          'Episode names and still images now appear on upcoming release cards in the dashboard.',
          'Watchlist sort direction is now an independent toggle, persisted in the URL (legacy ?sort param still works).',
          'Removed the reminder read/dismiss system; upcoming releases are now stateless and always reflect live airing data.',
        ],
      },
    ],
  },
  {
    version: '1.0.0',
    date: '2026-07-14',
    sections: [
      {
        title: 'Enhancements',
        bullets: [
          'Promoted LimitList to the official v1.0.0 release line.',
          'Changed the updates panel so every release, including the newest one, uses the same expandable card format with the newest entry open by default.',
          'Grouped update notes into Features, Enhancements, and Bug fixes where applicable.',
        ],
      },
      {
        title: 'Bug fixes',
        bullets: [
          'Backfilled missing studio metadata on the dashboard when tracked TVDB shows have genres but no studio data stored yet.',
          'Removed internal process/documentation notes from user-facing release notes.',
        ],
      },
    ],
  },
  {
    version: '0.14.0',
    date: '2026-07-14',
    sections: [
      {
        title: 'Enhancements',
        bullets: [
          'Moved What\'s New into the left dashboard sidebar while keeping the airing calendar on the right.',
          'Expanded the dashboard layout so the main content has more room between the sidebars.',
          'Prepared LimitList as a pre-1.0 release line leading into the official 1.0.0 release.',
        ],
      },
    ],
  },
  {
    version: '0.13.0',
    date: '2026-07-14',
    sections: [
      {
        title: 'Enhancements',
        bullets: [
          'Made movies and specials full-width rows with correctly sized posters.',
          'Added character artwork opposite actor photos in voice-cast cards.',
          'Sorted seasons newest-first on detail pages while keeping episodes in order.',
          'Added the in-app What\'s New panel.',
        ],
      },
      {
        title: 'Bug fixes',
        bullets: [
          'Protected detail-page descriptions from raw watchlist updates when status or ratings change.',
          'Restored generated status colors across the watchlist, detail page, and dashboard.',
        ],
      },
    ],
  },
  {
    version: '0.12.0',
    date: '2026-07-14',
    sections: [
      {
        title: 'Features',
        bullets: [
          'Added Paused as a watchlist status.',
        ],
      },
      {
        title: 'Bug fixes',
        bullets: [
          'Made Discover cards link directly to anime detail pages without interfering with Add actions.',
          'Color-coded the detail-page status selector from the shared status map.',
        ],
      },
    ],
  },
  {
    version: '0.11.0',
    date: '2026-07-14',
    sections: [
      {
        title: 'Enhancements',
        bullets: [
          'Selected richer English descriptions server-side so detail pages do not flash between sources after hydration.',
          'Added recommendations as a horizontal carousel with arrow controls.',
        ],
      },
    ],
  },
  {
    version: '0.10.0',
    date: '2026-07-14',
    sections: [
      {
        title: 'Features',
        bullets: [
          'Expanded movies and specials with full descriptions, cast lines, and child ratings.',
          'Moved detail-page status and rating controls onto the poster overlay.',
        ],
      },
    ],
  },
  {
    version: '0.9.0',
    date: '2026-07-14',
    sections: [
      {
        title: 'Enhancements',
        bullets: [
          'Improved watchlist card overlays, clear-rating placement, and poster-card interaction behavior.',
        ],
      },
      {
        title: 'Bug fixes',
        bullets: [
          'Stopped client enrichment from overriding detail-page descriptions.',
        ],
      },
    ],
  },
  {
    version: '0.8.0',
    date: '2026-07-14',
    sections: [
      {
        title: 'Features',
        bullets: [
          'Added descriptions on related movies/specials and recommendations.',
          'Added default cast language preference handling for detail pages.',
        ],
      },
    ],
  },
  {
    version: '0.7.0',
    date: '2026-07-13',
    sections: [
      {
        title: 'Features',
        bullets: [
          'Added richer seasons and episodes layouts with stills, descriptions, and season-aware episode rows.',
        ],
      },
      {
        title: 'Bug fixes',
        bullets: [
          'Bound detail enrichment so provider delays fail open instead of blocking page rendering.',
        ],
      },
    ],
  },
  {
    version: '0.6.0',
    date: '2026-07-13',
    sections: [
      {
        title: 'Features',
        bullets: [
          'Moved the airing schedule into the dashboard sidebar and removed the standalone schedule workflow.',
          'Added settings/setup improvements for TVDB credentials and season ordering.',
        ],
      },
    ],
  },
  {
    version: '0.5.0',
    date: '2026-07-13',
    sections: [
      {
        title: 'Features',
        bullets: [
          'Rebranded the app to LimitList and refreshed navigation around Dashboard, Discover, Settings, and Watchlist.',
          'Added global anime search, detail pages, Up-to-Date status, Discover pagination, profile controls, and dashboard airing controls.',
        ],
      },
    ],
  },
  {
    version: '0.4.0',
    date: '2026-07-13',
    sections: [
      {
        title: 'Features',
        bullets: [
          'Added AniList-powered Discover, dashboard shelves, and global reminder badge support.',
          'Reworked watchlist cards with persistent poster titles, image fallbacks, and cleaner search results.',
        ],
      },
    ],
  },
  {
    version: '0.3.0',
    date: '2026-07-13',
    sections: [
      {
        title: 'Enhancements',
        bullets: [
          'Changed watchlist cards into poster-only tiles with status and star-rating overlays.',
        ],
      },
    ],
  },
  {
    version: '0.2.0',
    date: '2026-07-12',
    sections: [
      {
        title: 'Features',
        bullets: [
          'Added first-run setup so new installs create their owner account in-app.',
          'Moved credentials into the database and removed username/password environment variables.',
        ],
      },
    ],
  },
  {
    version: '0.1.0',
    date: '2026-07-12',
    sections: [
      {
        title: 'Features',
        bullets: [
          'Built the authenticated Next.js, Prisma, SQLite, Tailwind, Dockerized anime tracker foundation.',
          'Added watchlist CRUD, metadata search/import, ratings/notes, dashboard stats, airing reminders, and Docker runtime hardening.',
        ],
      },
    ],
  },
]
