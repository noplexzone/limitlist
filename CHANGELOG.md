# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).

## [Unreleased]

_No unreleased changes._

## [1.1.0] - 2026-07-13

### Added

- **Favicon / app icon**: Purple play-button SVG at `src/app/icon.svg` plus `/favicon.ico` fallback for browser tab/icon requests. Metadata explicitly advertises both icons, and `themeColor` moved to `Viewport` export per Next.js 15.
- **Discover page** (`/discover`): New auth-protected page listing popular and trending anime from TMDB. Tab switcher between "Popular Anime" (`/discover/tv` filtered by Animation + Japanese origin, popularity-sorted) and "Trending This Week" (`/trending/tv/week` filtered for anime). One-click Add to Watchlist with TMDB enrichment. Shows already in the watchlist are marked "In Watchlist". Requires `TMDB_API_KEY`; shows a clear error if not configured.
- **Global reminder badge**: Nav now self-fetches `/api/reminders/count` on every route change — the Schedule badge is visible from any page, not only when the Schedule page passes a prop. `reminderCount` prop removed from Nav.
- **Watchlist episode +1 button**: Episode progress counter ("Ep X/Y") and +1 button appear in the hover overlay on every watchlist card. Incrementing auto-caps at `episodesTotal`; reaching the final episode auto-sets status to Completed.
- **Watchlist title overlay**: Always-visible title strip at the bottom of each poster card so posters are no longer anonymous.
- **Poster image error fallback**: Broken remote poster URLs now show a title placeholder via the new `PosterImage` client component (`src/components/PosterImage.tsx`) used across Watchlist, Search, and Discover.
- **Dashboard shelves**: "Continue Watching" and "Highest Rated" horizontal poster strips at the top of the Dashboard, derived from existing watchlist data. Shelves are hidden when empty.
- **Discover link** added to the Nav bar.

### Changed

- **Nav mobile responsiveness**: Links use smaller padding/text on mobile (`px-2 text-xs`), the link strip is horizontally scrollable, Dashboard link is hidden below the `md` breakpoint, and the brand abbreviates to "AT" below `sm`.
- **Search results** restyled from a vertical list into a responsive poster-grid (2–6 columns) consistent with Watchlist and Discover. "Anime-focused" checkbox label shortened.

## [1.0.3] - 2026-07-13

### Changed

- Watchlist cards are now poster-only tiles. The status dropdown overlays the top of each poster, and the star rating overlay appears at the bottom only while hovering/focusing the poster.

## [1.0.2] - 2026-07-13

### Changed

- Watchlist card redesign: larger poster (120×180), two-column grid on wide screens, bigger title text, more padding.
- Status is now a styled pill-shaped dropdown on each card; changing it PATCHes immediately without entering edit mode.
- Star rating is now clickable directly on each card with half-star precision (0.5–5.0); a clear button removes the rating.
- Notes are editable inline and saved on blur.
- Removed the Edit button and the save/cancel edit flow entirely.
- Removed episode-watched, episode-total, and episode-duration controls from the watchlist UI.

## [1.0.1] - 2026-07-12

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
- `package.json`: version bumped to `1.0.1`.

## [1.0.0] - 2026-07-12

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
