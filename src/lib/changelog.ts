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
    version: '1.6.1',
    date: '2026-07-19',
    sections: [
      {
        title: 'Features',
        bullets: [
          'Added a full-history /changelog page; What\'s New panels now show the latest three entries with a link to it.',
          'Extracted a shared Toggle component with role="switch", aria-checked, focus ring, and smooth transition for all on/off settings.',
        ],
      },
      {
        title: 'Enhancements',
        bullets: [
          'Replaced the broken Completion Rate stat card with Hours Watched — a metric that reflects real activity for any active user.',
          "Continue Watching uses episode watch history to show the first unwatched episode after the user's furthest watched episode, including season transitions and episode names populated by Plex sync.",
          'What\'s New entries all start collapsed so the panel is compact on any viewport size.',
        ],
      },
      {
        title: 'Bug fixes',
        bullets: [
          'Watchlist card star rating is now always tappable on mobile without hover; each full star is a single 32 × 32 tap target instead of two 16px halves.',
          'Status pill and remove button now occupy a shared flex row and can never overlap.',
          'Continue Watching episode labels use line-clamp-2 and wider cards so names are readable rather than cut off.',
          'Plex import marks fully-watched shows as COMPLETED when airingStatus is ended/completed, or absent with no upcoming episode, and preserves that status through the initial Plex sync.',
          'iOS text inputs in settings and forms no longer trigger Safari auto-zoom on focus; all controls render at 16 px or larger.',
          'Safe-area insets keep the top navigation below the status bar/notch and the bottom navigation above the home indicator.',
          'Discover tab bar no longer overflows on narrow screens; all four tabs remain visible and tappable.',
          'Watchlist filter and sort toolbar collapses to a compact single row on mobile with full touch-sized controls.',
          'Mobile section and Plex-panel dropdowns replace invisible overflowing tab strips, making every settings panel reachable.',
        ],
      },
    ],
  },
  {
    version: '1.6.0',
    date: '2026-07-19',
    sections: [
      {
        title: 'Features',
        bullets: [
          'LimitList is now installable as a standalone PWA with app icons, an offline shell fallback, and network-only handling for API and personalized data.',
          'Added an accessible mobile bottom navigation bar with safe-area support and touch-sized controls.',
        ],
      },
      {
        title: 'Enhancements',
        bullets: [
          'Detail, watchlist, Discover, and Settings surfaces now fit narrow viewports with visible touch controls, responsive forms, and support for all four themes.',
          'Discover tab bar is compact on narrow screens; all three tabs remain fully visible without horizontal overflow.',
          'Watchlist filter and sort controls collapse into a compact single-row toolbar on mobile.',
          'Settings select dropdowns and text inputs are sized for reliable single-tap interaction on iOS.',
          'iOS form inputs use a 16 px base size to prevent Safari auto-zoom when focusing any text field.',
          'Bottom navigation bar and page content respect safe-area insets so nothing is hidden by the home indicator on notched iPhones.',
          'Discover pages fill up to 35 filtered titles while preserving exact AniList pagination without duplicate or skipped items.',
          'Dashboard summary cards now remain complete, and Continue Watching identifies the next episode.',
        ],
      },
      {
        title: 'Bug fixes',
        bullets: [
          'Top Genres excludes Anime, Animation, and missing-value noise; completion rates and empty average ratings render correctly.',
          'TVDB matching now retains sparse anime candidates, uses English translations and bounded year-qualified searches, and validates final extended records.',
        ],
      },
    ],
  },
  {
    version: '1.5.0',
    date: '2026-07-18',
    sections: [
      {
        title: 'Features',
        bullets: [
          'Added configurable new-episode notifications with episode-aired and Plex-aware aired-unwatched triggers.',
          'Added Discord webhook, ntfy, Gotify, and SMTP delivery channels with independent controls and test actions.',
          'Added a scheduled notify task with per-episode/channel deduplication, retryable failures, and a bounded 14-day first-run lookback.',
          'Added a themed Notifications settings section with masked credentials and scheduling guidance.',
        ],
      },
    ],
  },
  {
    version: '1.4.1',
    date: '2026-07-18',
    sections: [
      {
        title: 'Enhancements',
        bullets: [
          'Themed navigation rebuilt with LimitList wordmark, accent-highlighted active links, clearer interaction states, and refined profile/search controls across all four themes.',
          'Remaining navigation, global search, and upcoming-release fixed slate colors migrated to theme-responsive surface tokens.',
        ],
      },
    ],
  },
  {
    version: '1.4.0',
    date: '2026-07-15',
    sections: [
      {
        title: 'Features',
        bullets: [
          'Added server-rendered anime-inspired themes with an Appearance settings picker and no wrong-theme flash on reload.',
          'Added Gojo, Chainsaw Man, Nanami, and Levi themes with CSS-authored decorative motifs.',
        ],
      },
      {
        title: 'Enhancements',
        bullets: [
          'Grouped Plex Connection, Plex Sync, and Import from Plex under one Plex settings section with inner tabs and legacy URL compatibility.',
          'Tokenized the color system into CSS variables and made Gojo electric blue the default accent.',
        ],
      },
      {
        title: 'Bug fixes',
        bullets: [
          'Skipped scheduled tasks no longer update last-run timestamps, run-now overlap checks are centralized, and interrupted running tasks are cleaned up on scheduler startup.',
          'Server-rendered theme loading now falls back safely during static build paths when the settings database is unavailable.',
        ],
      },
    ],
  },
  {
    version: '1.3.0',
    date: '2026-07-15',
    sections: [
      {
        title: 'Features',
        bullets: [
          'Added disabled-by-default scheduled tasks for airing refresh and Plex sync with run-now controls, preset schedules, advanced cron editing, last-run status, and next-run display.',
          'Settings now has a dedicated Tasks section for recurring automation and maintenance operations.',
        ],
      },
      {
        title: 'Enhancements',
        bullets: [
          'Settings is now organized into deep-linkable sidebar sections for Account, Metadata, Plex Connection, Plex Sync, Import from Plex, Tasks, and About.',
          'Discover now filters to TV/TV_SHORT AniList entries and hides sequel seasons when AniList marks them with TV prequel relations.',
        ],
      },
      {
        title: 'Bug fixes',
        bullets: [
          'Refresh All Schedules now refreshes upcoming releases in place without requiring a manual page reload.',
        ],
      },
    ],
  },
  {
    version: '1.2.2',
    date: '2026-07-15',
    sections: [
      {
        title: 'Bug fixes',
        bullets: [
          'Import from Plex now resolves TVDB IDs from Plex library listings by requesting external GUIDs and using a bounded metadata fallback.',
          'Watchlist watched/aired progress now uses persisted aired episode counts instead of the latest episode number within a season.',
          'Detail-page watched/aired progress now excludes specials from the show-level denominator while preserving per-season episode counts.',
          'Watchlist and detail-page status/rating changes now merge PATCH responses without dropping computed progress counts or enriched metadata.',
        ],
      },
      {
        title: 'Features',
        bullets: [
          'Settings now includes a one-time aired-episode-count backfill for existing TVDB shows added before this update.',
        ],
      },
    ],
  },
  {
    version: '1.2.1',
    date: '2026-07-15',
    sections: [
      {
        title: 'Features',
        bullets: [
          'Added Plex sync options for library scoping, shared-account history, watched thresholds, auto-status updates, and sync-on-refresh.',
          'Added review-before-import discovery for previously watched Plex anime that are not yet in the watchlist.',
          'Added season/show/watchlist progress displays and manual episode watched toggles.',
        ],
      },
      {
        title: 'Enhancements',
        bullets: [
          'Plex sync can count 90% complete plays when configured and can preserve curated statuses while still recording watched episodes.',
        ],
      },
    ],
  },
  {
    version: '1.2.0',
    date: '2026-07-15',
    sections: [
      {
        title: 'Features',
        bullets: [
          'Added read-only Plex watch-history sync for TVDB-tracked shows, with manual sync controls and watched indicators on episode rows.',
          'Added Plex base URL and token settings with connection validation and masked credential handling.',
          'Preserved TVDB episode IDs and stores per-episode watched state separately from episode ratings.',
        ],
      },
      {
        title: 'Enhancements',
        bullets: [
          'Plex sync now updates the existing Up-to-Date baseline when all aired episodes are watched.',
          'Shows with incompatible Plex episode ordering now surface a clear warning instead of writing questionable watched data.',
          'TVDB and Plex settings now use separate test and save actions so credentials are validated before being stored.',
        ],
      },
    ],
  },
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
