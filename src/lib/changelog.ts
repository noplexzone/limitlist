export interface ChangelogEntry {
  version: string
  date: string
  bullets: string[]
}

export const changelogEntries: ChangelogEntry[] = [
  {
    version: '1.0.0',
    date: 'Pending release',
    bullets: [
      'Prepared LimitList as the initial official release line and removed release-candidate versioning from app references.',
      'Expanded dashboard width so the main content is no longer squeezed between the changelog and airing calendar sidebars.',
      'Changed the in-app changelog to show every previous update currently tracked in the app module.',
    ],
  },
  {
    version: 'Pre-release update 10',
    date: '2026-07-14',
    bullets: [
      'Moved What\'s New into the left dashboard sidebar while keeping the airing calendar on the right.',
      'Documented that LimitList should avoid release-candidate tags unless explicitly chosen later.',
    ],
  },
  {
    version: 'Pre-release update 9',
    date: '2026-07-14',
    bullets: [
      'Protected detail-page descriptions from raw watchlist PATCH rows when status or ratings change.',
      'Restored status color generation for every watchlist state, including Paused and Up-to-Date.',
      'Polished detail-page movies, voice cast, seasons, and release notes before the initial release.',
    ],
  },
  {
    version: 'Pre-release update 8',
    date: '2026-07-14',
    bullets: [
      'Added Paused as a watchlist status and shared status metadata across watchlist, detail, dashboard, and schedule UI.',
      'Made Discover cards link directly to anime detail pages without interfering with Add actions.',
    ],
  },
  {
    version: 'Pre-release update 7',
    date: '2026-07-14',
    bullets: [
      'Selected richer English descriptions server-side so detail pages do not flash between sources after hydration.',
      'Added recommendations as a horizontal carousel with arrow controls.',
    ],
  },
  {
    version: 'Pre-release update 6',
    date: '2026-07-14',
    bullets: [
      'Expanded movies/specials cards with full descriptions, cast lines, and child ratings.',
      'Moved detail-page status and rating controls onto the poster overlay.',
    ],
  },
  {
    version: 'Pre-release update 5',
    date: '2026-07-14',
    bullets: [
      'Improved watchlist card overlays, clear-rating placement, and poster-card interaction behavior.',
      'Stopped client enrichment from overriding detail-page descriptions.',
    ],
  },
  {
    version: 'Pre-release update 4',
    date: '2026-07-14',
    bullets: [
      'Added descriptions on related movies/specials and recommendations.',
      'Added default cast language preference handling for detail pages.',
    ],
  },
  {
    version: 'Pre-release update 3',
    date: '2026-07-13',
    bullets: [
      'Added richer seasons and episodes layouts with stills, descriptions, and season-aware episode rows.',
      'Bound detail enrichment so provider delays fail open instead of blocking page rendering.',
    ],
  },
  {
    version: 'Pre-release update 2',
    date: '2026-07-13',
    bullets: [
      'Moved the airing schedule into the dashboard sidebar and removed the standalone schedule workflow.',
      'Added settings/setup improvements for TVDB credentials and season ordering.',
    ],
  },
  {
    version: 'Pre-release update 1',
    date: '2026-07-13',
    bullets: [
      'Rebranded the app to LimitList and refreshed navigation around Dashboard, Discover, Settings, and Watchlist.',
      'Added global anime search, detail pages, Up-to-Date status, Discover pagination, profile controls, and dashboard airing controls.',
    ],
  },
  {
    version: 'Foundation update',
    date: '2026-07-12 to 2026-07-13',
    bullets: [
      'Built the authenticated Next.js, Prisma, SQLite, Tailwind, Dockerized anime tracker foundation.',
      'Added first-run setup, poster-first watchlist cards, ratings/notes, dashboard stats, Discover, icons, and Docker runtime hardening.',
    ],
  },
]
