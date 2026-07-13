# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).

## [Unreleased]

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
