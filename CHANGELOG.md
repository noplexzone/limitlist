# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).

## [Unreleased]

No unreleased changes yet.

## [1.2.1] - 2026-07-15

### Added

- **Plex sync options**: Added library section selection, account scoping, watched-threshold mode, auto-status control, and sync-on-refresh settings.
- **Plex library discovery and import**: Added watched-show discovery across configured Plex libraries plus a review-before-import flow for previously watched anime.
- **Watch progress controls**: Added show, season, detail-row, and watchlist watched/aired progress plus manual episode watched toggles.

### Changed

- Plex sync can now count near-complete partial plays when configured and can preserve curated statuses while still writing watched episodes and Up-to-Date baselines.
- Refresh All Schedules can optionally trigger Plex sync afterward.

## [1.2.0] - 2026-07-15

### Added

- **Plex watch-history sync**: Added read-only Plex integration for TVDB-tracked shows, including Plex base URL/token settings, manual per-show and bulk sync API routes, and watched indicators on detail-page episode rows.
- **Episode watch persistence**: Added dedicated `EpisodeWatch` rows plus cached Plex series keys and last-sync timestamps on tracked anime.
- **TVDB episode ID passthrough**: Preserved TVDB episode IDs in season summaries so Plex `tvdb://` episode GUIDs can match reliably before falling back to season/episode numbers.

### Changed

- **Up-to-Date progress from Plex**: Plex sync now feeds watched/aired progress into the existing `UP_TO_DATE` baseline fields when all aired episodes are watched.

### Fixed

- **Ordering guard for Plex sync**: Shows using Plex absolute, DVD, or TMDB-airing ordering now return a visible warning and skip sync instead of writing mismatched watched data.
- **Settings credential flow**: TVDB and Plex settings now test credentials separately before saving, and Plex tokens are saved only after an explicit successful test/save flow.

## [1.1.0] - 2026-07-14

### Added

- **Discover Top Rated and Upcoming tabs**: Discover now has Top Rated and Upcoming release tabs alongside the existing Popular and Trending tabs.
- **Episode names and stills on upcoming release cards**: Dashboard upcoming release cards now display the episode name and still image when available.

### Changed

- **Independent watchlist sort direction**: Sort direction is now a separate toggle from the sort field, persisted in the URL; the legacy `?sort` param continues to work.
- **Stateless upcoming releases**: Removed the reminder read/dismiss system; upcoming releases are now stateless and always reflect the latest airing data.

## [1.0.0] - 2026-07-14

### Added

- **Dashboard What's New sidebar**: The dashboard changelog panel now lives in a left sidebar, uses a unified expandable card for every update with the newest entry open by default, and the whole card scrolls through the full pre-1.0 history.

- First-run setup now offers optional TVDB API key, PIN, and season-type fields so new installs can search/import immediately.
- **AniList detail metadata**: Anime detail pages now use AniList for similar recommendations, official related movies/specials, season grouping, and Japanese voice-cast fallback.

- **Anime detail recommendations**: Detail pages now show recommended similar anime and related movie/special cards at the bottom.
- **Episode and movie ratings**: Tracked anime now support half-star child ratings for individual episodes and related movies/specials while keeping them under the main anime title.

- **Global anime search**: Nav now includes an app-wide search bar with quick results, direct detail navigation, and an inline `+` import button. The standalone `/search` page now redirects back to the watchlist.
- **Anime details pages**: Added `/anime/[provider]/[id]` pages for search results and tracked shows, with poster, metadata, airing info, add-to-watchlist action, and tracked status controls.
- **Up-to-Date status**: Added `UP_TO_DATE` as a watchlist status plus persisted `upToDateEpisodeNum`, `upToDateAiredAt`, and `upToDateStale` fields. Airing refreshes now flag Up-to-Date shows when TMDB reports a newer aired episode/date, including new seasons whose episode numbers reset.
- **Watchlist navigation controls**: Added status filters, a Needs Update filter, and sort options for recent updates, title, rating, and first-air date.
- **Discover pagination**: Discover now fetches 42 AniList items per page and exposes Previous/Next controls per tab.
- **Rebrand to LimitList**: Application renamed to LimitList across all user-facing surfaces (title, nav, login/setup pages, layout metadata, package name, README).
- **Profile dropdown**: Nav sign-out button replaced with an avatar/chevron profile dropdown containing Settings and Sign out options. Keyboard accessible with `Escape` to close.
- **Settings page**: Real account settings for changing username/password, uploading a profile picture, and configuring TMDB API keys when the key is not locked by environment variables.
- **Search icon button**: Global search is now triggered by a magnifying-glass icon button in the nav rather than being always visible. Clicking the icon reveals the search bar below the nav; clicking again or pressing Escape closes it.
- **Dashboard airing sidebar**: The dashboard now owns the airing calendar/sidebar and upcoming release details, including refresh and mark-as-read actions.
- **Mark as read**: Schedule page reminder action renamed from "Dismiss" to "Mark as read" for clarity.

### Changed

- **Versioning**: LimitList is promoted to the official `v1.0.0` release line after the pre-1.0 iteration series.

- TVDB Settings and first-run setup now use hidden key/PIN inputs with show/hide controls and a labeled season-order dropdown aligned to Plex ordering.
- **Anime detail provider priority**: TMDB remains the monitoring source for tracked shows, but detail-page related metadata now prefers AniList so titles like Jujutsu Kaisen do not collapse into one aggregate season or include stage/fan-made movie results.

- **Anime detail ratings**: Detail-page poster overlays now use the same clickable half-star rating control as watchlist poster cards.
- **Anime detail performance**: Remote cast, season episode, recommendation, and movie enrichment are bounded and fail open so detail pages do not hang on provider slowness.
- **Anime detail seasons**: Season cards now label per-season episode counts and episode rows use season-aware keys.

- **Anime detail controls**: Status and personal rating controls moved onto the poster overlay so tracked details remain directly editable.
- **Anime detail layout**: Cast and seasons/episodes sections now span the full detail page width, with cast photos and wider season boxes.
- **Voice cast**: Detail pages now show a language toggle for English and Japanese voice actors when Jikan cast data is available.
- **Profile pictures**: Upload limit increased from 512 KB to 2 MB; images are still stored as bounded local database data URLs.

- **Schedule removal**: Removed the standalone Schedule page and its nav entry; release details now live on the dashboard.
- **Anime details**: Detail pages now include TMDB ratings, content rating, cast credits, season summaries, and episode names for recent seasons when TMDB is configured.
- **Discover performance**: Discover now loads AniList rankings directly and defers TMDB canonical matching until import, reducing initial page wait time.

- **Watchlist cards**: Tracked poster cards now navigate to their anime detail pages. Rating stars were made more compact and the clear-rating button was moved out of the star row so rated cards fit inside small poster cards.
- **Nav redesign**: Dark navy (`slate-900`) bar inspired by AniList — logo at left links to dashboard, nav links sorted alphabetically and centered, search as icon button, profile dropdown at far right.
- **Dashboard/Schedule status labels**: Include the new Up-to-Date status throughout status summaries and badges.
- **Dashboard home**: Root `/` and post-login/setup flows now redirect to `/dashboard` instead of `/watchlist`. Logo links to `/dashboard`.
- **Continue Watching shelf**: UP_TO_DATE shows are excluded from the Continue Watching shelf unless `upToDateStale` is true (new episodes have aired since the user marked themselves up-to-date).
- **Nav link order**: Links sorted alphabetically — Dashboard, Discover, Schedule, Watchlist.

### Fixed

- Dashboard studio stats now backfill missing TVDB studio/company metadata for existing tracked shows when possible.
- User-facing update notes no longer include internal documentation/process-only notes.
- **Pre-release polish**: Status/rating changes on detail pages no longer clobber English sanitized descriptions; Tailwind now scans shared status classes; movies/specials, voice-cast cards, season ordering, and dashboard release notes were polished for initial release readiness.
- Settings keeps the TVDB season-order dropdown and editable PIN controls visible when the API key is locked by environment.
- Discover imports now surface watchlist API errors on the affected card, clear stuck loading states, and log AniList-to-TVDB import matching in development.
- TVDB detail metadata now prefers English TVDB translations and AniList enrichment returns a sanitized English overview while logging match misses in development.
- TVDB artwork host is now whitelisted for optimized images so tracked posters render across details, watchlist, and dashboard after rebuild/restart.
- TVDB search now calls `/v4/search` without doubling the `/v4` path segment, handles episode payloads returned under `data.episodes`, and development logs surface non-OK TVDB responses.
- Dashboard empty-state import action now opens the global nav search instead of navigating to the watchlist.
- Voice-cast enrichment now fails open so Jikan network/runtime errors cannot 500 anime detail pages.
- Navigation no longer refetches the potentially-large profile image data URL on every route change; it loads once and refreshes when the Settings page changes the avatar.
- Hardened AniList Discover imports so they require a valid TMDB match before creating a watchlist row, preventing unrefreshable AniList-only records.
- Persisted AniList source ids on TMDB-backed imports so Discover can keep already-imported cards marked as in-watchlist after deferred matching.
- Settings now requires current-password verification for username changes and validates TMDB API keys before saving them.
- Hardened Up-to-Date baselines so shows with no previous airing refresh do not immediately become stale on the first refresh.
- Fixed status PATCH validation for invalid falsy status values.
- Discover now uses AniList `pageInfo.hasNextPage` and bounded TMDB mapping concurrency to reduce pagination/rate-limit issues.
- Prevented watchlist child controls from bubbling keyboard events to the card-level detail navigation.
- Added abort handling to global search so stale responses cannot overwrite newer queries.

## [0.4.0] - 2026-07-13

### Added

- **Favicon / app icon**: Uses the provided anime-eye artwork for `/favicon.ico`, `/favicon.png`, `/icon.png`, and Apple/app icon assets, including the transparent-background favicon artwork.
- **Discover page** (`/discover`): New auth-protected page with popular and trending anime ranked by AniList and linked to whole-show TMDB records before import. One-click Add to Watchlist uses TMDB enrichment/monitoring, and all visible AniList seasons mapped to an existing TMDB show are marked "In Watchlist".
- **Global reminder badge**: Nav now self-fetches `/api/reminders/count` on every route change — the Schedule badge is visible from any page, not only when the Schedule page passes a prop. `reminderCount` prop removed from Nav.
- **Watchlist title overlay**: Always-visible title strip at the bottom of each poster card so posters are no longer anonymous.
- **Poster image error fallback**: Broken remote poster URLs now show a title placeholder via the new `PosterImage` client component (`src/components/PosterImage.tsx`) used across Watchlist, Search, and Discover.
- **Dashboard shelves**: "Continue Watching" and "Highest Rated" horizontal poster strips at the top of the Dashboard, derived from existing watchlist data. Shelves are hidden when empty.
- **Discover link** added to the Nav bar.

### Changed

- **Discover provider**: Popular/trending discovery now uses AniList rankings instead of TMDB rankings. AniList poster hosts are allowed for optimized image loading.
- **TMDB linking**: AniList season results are normalized and matched to anime whole-show TMDB records for tracking; season/arc-specific and non-anime TMDB collisions are penalized during matching.
- **Search scope**: Removed the Anime-focused checkbox; Search is now always anime-only and no longer exposes a broad all-TV mode.
- **Watchlist progress**: Removed episode-progress tracking from the app workflow; show status now carries progress state.
- **Rating stars**: Replaced text-star clipping with SVG stars for clean full-star and half-star rendering.
- **Nav mobile responsiveness**: Links use smaller padding/text on mobile (`px-2 text-xs`), the link strip is horizontally scrollable, Dashboard link is hidden below the `md` breakpoint, and the brand abbreviates to "AT" below `sm`.
- **Search results** restyled from a vertical list into a responsive poster-grid (2–6 columns) consistent with Watchlist and Discover.

## [0.3.0] - 2026-07-13

### Changed

- Watchlist cards are now poster-only tiles. The status dropdown overlays the top of each poster, and the star rating overlay appears at the bottom only while hovering/focusing the poster.

## [0.2.1] - 2026-07-13

### Changed

- Watchlist card redesign: larger poster (120×180), two-column grid on wide screens, bigger title text, more padding.
- Status is now a styled pill-shaped dropdown on each card; changing it PATCHes immediately without entering edit mode.
- Star rating is now clickable directly on each card with half-star precision (0.5–5.0); a clear button removes the rating.
- Notes are editable inline and saved on blur.
- Removed the Edit button and the save/cancel edit flow entirely.
- Removed episode-watched, episode-total, and episode-duration controls from the watchlist UI.

## [0.2.0] - 2026-07-12

### Added

- First-run setup flow at `/setup`: on first launch with an empty database every route redirects to `/setup` instead of the login page.
- `AppUser` Prisma model: `id`, `username` (unique), `passwordHash`, timestamps. Migration `app_user_setup` adds the table.
- `src/lib/password.ts`: `hashPassword()` / `verifyPassword()` using `crypto.scrypt` + `crypto.timingSafeEqual` (Node built-ins, no new runtime deps). Stored format: `scrypt:<hex-salt>:<hex-hash>`.
- `src/lib/setup.ts`: `isSetupComplete()` — returns `true` when at least one `AppUser` row exists.
- `POST /api/setup`: creates the first `AppUser` with a hashed password, opens a session, and returns 409 if called when already set up.
- `/setup` page: dark UI consistent with `/login`; fields for username, password, and confirm-password; client-side and server-side validation (username required, password ≥ 8 chars, confirmation match).

### Changed

- `requireAuth()` now calls `isSetupComplete()` first and redirects to `/setup` when no user exists; all auth-protected pages and the login page gain this behaviour automatically.
- Login route (`POST /api/auth/login`) now authenticates against the `AppUser` DB table using `verifyPassword()`. Returns 409 with a hint when called before setup is complete.
- `AUTH_USERNAME` and `AUTH_PASSWORD` environment variables are no longer required or used for authentication. Only `AUTH_SECRET` remains required.
- `docker-compose.yml`: removed `AUTH_USERNAME` and `AUTH_PASSWORD` entries.
- `.env.example`: `AUTH_USERNAME` and `AUTH_PASSWORD` removed; comment explains they have been replaced by the setup flow.
- `package.json`: app package version was advanced for the internal setup build.

## [0.1.0] - 2026-07-12

### Added — Phase 4

- Airing metadata fields on `AnimeShow`: `airingStatus`, `nextEpisodeNum`, `nextAiringAt`, `lastEpisodeNum`, `lastAiredAt`, `airingRefreshedAt`.
- `EpisodeReminder` model: show relation, nullable episode number, `airsAt`, `dismissedAt`, unique on `(animeShowId, airsAt)`.
- Prisma migration `20260713000301_phase4_airing_reminders` applies both schema additions.
- `src/lib/airing.ts`: `refreshShowAiring(showId)` and `refreshAllShowsAiring()` — fetch TMDB airing info, update show fields, auto-create/upsert a reminder for the next episode if it airs in the future. Missing API key, non-TMDB shows, and bad TMDB responses return controlled per-show error objects rather than crashing.
- `TmdbProvider.getAiringDetails(tmdbId)` in `src/lib/tmdb.ts`: fetches `status`, `next_episode_to_air`, `last_episode_to_air` from TMDB TV details endpoint.
- `POST /api/watchlist/[id]/refresh-airing`: authenticated per-show airing refresh.
- `POST /api/airing/refresh`: authenticated bulk airing refresh; reports per-show successes and failures.
- `GET /api/reminders/count`: authenticated count of undismissed reminders.
- `POST /api/reminders/[id]/dismiss`: set `dismissedAt` on a specific reminder.
- `/schedule` route: authenticated server component showing upcoming episodes sorted by `nextAiringAt` ASC, with title, watchlist status badge, episode number, readable air date, and per-reminder dismiss button. Empty state shown when no upcoming episodes are known.
- Schedule link added to the nav bar with an active-reminder badge (red dot showing count, max `9+`).
- Watchlist cards now show next airing date/episode inline when known, plus a "Refresh Schedule" button for TMDB-backed shows.

### Added — Phase 3

- `src/lib/stats.ts`: `computeStats(shows)` helper — computes total shows, counts by status, completion rate, total episodes watched, estimated hours watched, top genres, top studios, and average rating from an `AnimeShow[]`.
- `/dashboard` route (`src/app/dashboard/page.tsx`): authenticated server component showing all stats as summary cards, status breakdown, and bar-chart lists for top genres/studios. Links to `/search` when the watchlist is empty.
- Dashboard link added to the nav bar.
- TMDB live verification performed with real API key: anime-focused and broad searches confirmed; real show imported and updated with episodes/rating/notes; dashboard rendered with non-empty stats.

### Added — Phase 2

- `rating` field on `AnimeShow` (nullable Float/REAL, 0.5–5.0 half-star): displayed as `x/5` inline, editable via watchlist dropdown.
- `notes` field on `AnimeShow` (nullable text): displayed below episode counter, editable via watchlist textarea.
- API validation for rating: rejects values outside 0.5–5.0 and non-half-star increments (400).
- Anime-focused search mode (default ON): filters TMDB results to Animation genre (id 16) or Japanese-origin content; sorted by JP/Animation score. Falls back to full results if filtering gives nothing.
- "Anime-focused" checkbox in search UI; pass `?animeOnly=false` to API for broad TV results.
- `docker-entrypoint.sh`: starts as root to `chown -R nextjs:nodejs /data`, then drops to UID 1001 via `gosu` before running migrations and the web server.
- `gosu` added to Docker runner stage.

### Fixed — Phase 2

- Docker runtime no longer runs the app as root. The entrypoint handles bind-mount ownership prep then execs as the `nextjs` user.

### Added — Phase 1

- Initial project scaffold: Next.js 15 App Router + TypeScript + Tailwind CSS
- SQLite + Prisma ORM with AnimeShow model
- Single-user authentication via signed HTTP-only session cookie (iron-session)
- Protected routes: /watchlist and /search require login
- TMDB TV search provider with provider abstraction layer
- Import anime/shows from TMDB into local SQLite watchlist
- Duplicate prevention by metadataProvider + metadataId
- Watchlist CRUD: view, update tracking fields, delete shows
- Graceful degradation when TMDB_API_KEY is missing
- Dockerfile (multi-stage, standalone Next.js output)
- docker-compose.yml with persistent /data volume
- README with setup, env vars, Docker, and metadata provider notes
- .env.example with safe placeholder values
- .gitignore
- CLAUDE.md with project commands for future Claude Code sessions

### Fixed — Phase 1 verification

- Upgraded Next.js to 15.5.20 to remove high/critical audit findings.
- Switched Docker image to Debian slim with OpenSSL for Prisma compatibility.
- Ensured Docker runtime uses the pinned local Prisma CLI instead of downloading Prisma 7 via npx.
- Removed insecure fallback session secret; AUTH_SECRET is now required.
- Added AUTH_COOKIE_SECURE so HTTP LAN/Docker deployments can keep login sessions while HTTPS deployments can opt into Secure cookies.
