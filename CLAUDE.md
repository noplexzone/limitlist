# LimitList — Claude Code Context

## Stack
- Next.js 15 App Router + TypeScript
- Tailwind CSS
- Prisma + SQLite
- iron-session (HTTP-only cookie auth)

## Key commands
```bash
npm install              # install dependencies
npm run db:generate      # generate Prisma client
npm run db:migrate       # create/apply migrations (dev)
npm run db:migrate:deploy # apply migrations (prod/Docker)
npm run dev              # start dev server (localhost:3000)
npm run build            # production build
npm run typecheck        # tsc --noEmit
npm run lint             # eslint
```

## Project layout
```
src/
  app/                   # Next.js App Router pages
    api/                 # API routes (auth, setup, watchlist, search, airing, reminders)
    login/               # Login page
    setup/               # First-run setup page (creates AppUser)
    watchlist/           # Watchlist page
    search/              # Search/import page
    schedule/            # Airing schedule + reminders page
    dashboard/           # Stats dashboard
  lib/
    auth.ts              # iron-session config + helpers; requireAuth() redirects to /setup if no AppUser exists
    db.ts                # Prisma client singleton
    password.ts          # scrypt hash/verify (Node crypto built-ins, no extra deps)
    setup.ts             # isSetupComplete() — counts AppUser rows
    tmdb.ts              # TMDB provider implementation + getAiringDetails()
    providers.ts         # Provider abstraction
    airing.ts            # refreshShowAiring() / refreshAllShowsAiring()
    stats.ts             # computeStats()
prisma/
  schema.prisma          # Database schema
```

## Environment variables
| Variable | Purpose |
|---|---|
| AUTH_SECRET | Session cookie signing secret (32+ chars) — still required |
| AUTH_USERNAME | **Removed** — credentials are now stored in the DB via the setup flow |
| AUTH_PASSWORD | **Removed** — credentials are now stored in the DB via the setup flow |
| DATABASE_URL | SQLite path (file:./dev.db or file:/data/limitlist.db) |
| TMDB_API_KEY | TMDB API key for metadata search |

## Auth / First-run setup

Single-user. On first launch with an empty database, every route redirects to `/setup`.
The setup page creates an `AppUser` record with a `scrypt`-hashed password and starts a session.
After setup, login is via `/login` which verifies credentials against the `AppUser` table.

- `AppUser` model: `id`, `username` (unique), `passwordHash` (`scrypt:<salt>:<hash>`), timestamps
- `src/lib/setup.ts`: `isSetupComplete()` — returns true if any AppUser row exists
- `src/lib/password.ts`: `hashPassword()` / `verifyPassword()` — Node crypto, no deps
- `src/app/api/setup` (`POST`): creates the first user + session; 409 if already set up
- `requireAuth()` in `auth.ts` calls `isSetupComplete()` and redirects to `/setup` if false

## Docker
```bash
docker compose up --build   # build and run
docker compose down         # stop
```
Data persists in Docker volume mapped to ./data on host.

The entrypoint (`docker-entrypoint.sh`) briefly starts as root to chown `/data`, then drops to UID 1001 (`nextjs`) via `gosu` before running migrations and the server. No manual host `chown` required for bind mounts.

Legacy builder required: `DOCKER_BUILDKIT=0 docker build ...` (buildx TCP upgrade is blocked in this environment).

## Dashboard / Stats

- Route: `/dashboard` — auth-protected server component
- Stats helper: `src/lib/stats.ts` — `computeStats(AnimeShow[])` → `WatchStats`
  - Counts by status, completion rate, total episodes watched, estimated hours, top genres/studios, average rating
- Genres and studios are stored as comma-separated strings; stats helper splits and counts case-insensitively
- No charting library — bars are pure CSS `<div>` elements with percentage widths

## Schedule / Airing Reminders (Phase 4)

- Route: `/schedule` — auth-protected server component
- Airing fields on `AnimeShow`: `airingStatus`, `nextEpisodeNum`, `nextAiringAt`, `lastEpisodeNum`, `lastAiredAt`, `airingRefreshedAt`
- `EpisodeReminder` model: unique on `(animeShowId, airsAt)`, has nullable `dismissedAt`
- `src/lib/airing.ts`: `refreshShowAiring(id)` and `refreshAllShowsAiring()` — fetch TMDB, update show, upsert reminder
- `TmdbProvider.getAiringDetails(tmdbId)` uses `cache: 'no-store'` for live data (unlike `getDetails` which revalidates at 300s)
- Bulk refresh (`POST /api/airing/refresh`) never aborts on per-show failure — errors are collected and reported
- Nav badge shows undismissed reminder count, passed as `reminderCount` prop from server page; other pages pass no prop (no badge shown)
- Reminder dismissal is scoped to `(showId, airsAt)` — future episodes produce new reminders on next refresh

### Verification notes
- Missing `TMDB_API_KEY`: per-show error `"TMDB_API_KEY not configured"`, 422 on per-show endpoint, `failed[]` entry on bulk
- Non-TMDB show: per-show error `"Not a TMDB show"`
- Schedule page: empty state if `nextAiringAt` is null for all shows

## Phases
- Phase 1 (complete): Core CRUD + auth + TMDB search + Docker
- Phase 2 (complete): Ratings/notes + anime-focused search + Docker non-root runtime
- Phase 3 (complete): Stats dashboard at /dashboard
- Phase 4 (complete): Airing schedule tracking + in-app reminders at /schedule
- v1.0.1 hotfix (complete): First-run setup flow; credentials stored in DB, AUTH_USERNAME/AUTH_PASSWORD removed
