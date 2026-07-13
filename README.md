# LimitList

Personal anime watchlist tracker. Self-hosted, Dockerized, authenticated.

## Stack

- Next.js 15 (App Router, standalone output)
- TypeScript
- Prisma + SQLite
- iron-session (HTTP-only cookie auth)
- Tailwind CSS
- TMDB as tracking/airing metadata provider; AniList powers Discover rankings

## Quick start (local dev)

```bash
cp .env.example .env
# Edit .env with your values

npm install
npm run db:generate
npm run db:migrate      # creates dev.db automatically
npm run dev
```

App runs at http://localhost:3000.

## Docker / Compose

```bash
cp .env.example .env
# Edit .env with your values

docker compose up --build
```

App runs at http://localhost:3000. Data persists in `./data/limitlist.db`.

To stop:
```bash
docker compose down
```

## First-run setup

On first launch with an empty database, every route redirects to `/setup`. Enter a username and password to create your account — credentials are stored in the database with a scrypt hash. After setup, use `/login` with those credentials.

There is no default username or password; you set them during setup.

## Unraid deployment

v1.1.0 runs as a single self-hosted Unraid app container:

- Container name: `limitlist`
- Image/tag: `noplexzone/limitlist:v1.2.0-rc.6`
- Host port: `3020` -> container port `3000`
- Persistent data: `/mnt/user/appdata/limitlist:/data`
- SQLite database: `/data/limitlist.db`
- WebUI: `http://[IP]:[PORT:3020]/`
- Labels: `project=limitlist`, `managed-by=jarvis`

Required environment variables are `AUTH_SECRET` and `DATABASE_URL=file:/data/limitlist.db`. Set `AUTH_COOKIE_SECURE=false` for plain HTTP LAN use and `true` only behind HTTPS. `TMDB_API_KEY` enables metadata search, airing refresh, cast/season enrichment, and TMDB linking for AniList Discover imports. If it is not set in the environment, configure it from Settings after first-run setup.

`AUTH_USERNAME` and `AUTH_PASSWORD` are no longer required — credentials are created through the `/setup` web UI on first launch.


## Environment variables

| Variable | Required | Description |
|---|---|---|
| `AUTH_SECRET` | Yes | Session cookie signing key — use a random 32+ char string |
| `AUTH_COOKIE_SECURE` | No | Set `true` only when serving over HTTPS. Use `false` for plain HTTP LAN/Docker testing. |
| `DATABASE_URL` | Yes | SQLite path. Local: `file:./dev.db`. Docker: `file:/data/limitlist.db` |
| `TMDB_API_KEY` | Recommended | TMDB API key for metadata search, airing refresh, detail-page enrichment, and linking AniList Discover imports to whole-show TMDB records. If omitted here, add it from Settings after setup. |

`AUTH_USERNAME` and `AUTH_PASSWORD` are no longer used. Login credentials are created via the `/setup` page on first launch and stored in the database.

## Ratings and notes

Each show in the watchlist can have an optional rating (0.5–5.0 in half-star increments) and free-text notes. Both are nullable — leaving them blank means unrated/no notes.

- Edit a show in the watchlist and choose a rating from the dropdown (Unrated, 0.5, 1, 1.5, …, 5).
- Type notes in the textarea; they are trimmed and stored as-is.
- Displayed inline: `4.5/5` and the note text below the episode counter.

## Anime-only search

The search page is always restricted to anime-focused results. It filters TMDB results to shows that are:
- tagged with TMDB genre id 16 (Animation), **or**
- originally Japanese (`original_language = "ja"`) or from Japan (`origin_country` contains `"JP"`).

Results within that set are sorted: Japanese/JP-origin first, then other animation. There is no broad all-TV mode in the UI or API because this app only tracks anime.

## Docker runtime model

The container starts as root long enough to fix `/data` ownership (`chown -R nextjs:nodejs /data`), then immediately drops to the `nextjs` user (UID 1001) via `gosu` before running migrations and the web server. This lets bind-mounted directories like `./data:/data` be writable without requiring the host to pre-chown the directory — important for Unraid and other NAS environments where bind mounts are owned by root.

The pinned Prisma 5 CLI is copied into the image; migrations use `node node_modules/prisma/build/index.js migrate deploy` (not `npx prisma`) to avoid downloading Prisma 7 at runtime.

## Prisma / Migrations

```bash
# Generate Prisma client after schema changes
npm run db:generate

# Create and apply a new migration (dev)
npm run db:migrate

# Apply existing migrations (production / Docker)
npm run db:migrate:deploy
```

## Metadata provider note

Search uses the TMDB TV endpoint and is always filtered for anime-like content. See [Anime-only search](#anime-only-search) above.

Discover uses AniList for popular/trending anime rankings so the page loads quickly. TMDB whole-show matching is deferred until import; matched imports are stored with `metadataProvider=tmdb` and the TMDB series ID, while unmatched/no-key imports fall back to AniList metadata.

If `TMDB_API_KEY` is not set, Search and TMDB-backed enrichment display a configuration message instead of crashing. Add the key from Settings unless it is locked by an environment variable.

## Auth

Single-user. On first launch, visit `/setup` to create your account. Credentials are stored in the SQLite database as a `scrypt`-hashed password. Sessions use signed HTTP-only cookies via iron-session. Logout is available in the nav bar.

## Airing Calendar and Reminders

The Dashboard sidebar shows your watchlist shows that have known upcoming episodes, sorted by air date (auth-protected), plus a mini calendar for date filtering:

- **Refresh All Schedules** — calls `POST /api/airing/refresh` which fetches airing info from TMDB for every TMDB-backed show in your watchlist. Requires a configured TMDB API key.
- Per-show refresh — each watchlist card has a **Refresh Schedule** button for individual shows.
- When a next episode date is found, an `EpisodeReminder` is automatically created. Reminders appear on the Dashboard with a **Mark as read** button.
- Dismissed reminders are scoped to the specific show + air date. When the show next airs, a new reminder will be created on the next refresh.
- The standalone `/schedule` page has been removed; release details live on `/dashboard`.
- Missing TMDB configuration returns a controlled error per show; it does not crash the bulk refresh.
- Non-TMDB shows are skipped during refresh with a `"Not a TMDB show"` entry in the failed list.

### Airing refresh behavior

| Scenario | Result |
|---|---|
| `TMDB_API_KEY` not set | Per-show error: `"TMDB_API_KEY not configured"` |
| Non-TMDB show | Per-show error: `"Not a TMDB show"` |
| TMDB returns no data | Per-show error: `"TMDB returned no data"` |
| TMDB fetch error | Per-show error with HTTP status description |
| Success + next episode in future | Show updated, reminder upserted |
| Success + no upcoming episode | Show updated, no reminder created |

## Dashboard

The `/dashboard` route shows a summary of your watching habits plus the airing calendar/release-details sidebar (auth-protected):

| Stat | Definition |
|---|---|
| Total Shows | All shows in the watchlist |
| Completion Rate | `completed / total` as a percentage |
| Average Rating | Mean of all rated shows (shown only if any shows are rated) |
| Top Genres | Top 10 genres by frequency, split from comma-separated `genres` field |
| Top Studios | Top 10 studios by frequency, split from comma-separated `studios` field |

Empty state is handled gracefully — the dashboard displays a link to search/import if no shows are tracked.

Stats are computed server-side in `src/lib/stats.ts` (`computeStats(shows)`) from show status, ratings, genres, and studios.

## Discover

The `/discover` route shows popular and trending anime from AniList (auth-protected):

- **Popular Anime** tab — uses AniList `POPULARITY_DESC` ranking.
- **Trending This Week** tab — uses AniList `TRENDING_DESC` ranking.
- AniList season results are linked to whole-show TMDB records before import so the app continues monitoring TMDB series/seasons.
- One-click **Add to Watchlist** triggers the same TMDB enrichment as Search import.
- Shows already in your watchlist are marked "In Watchlist"; other AniList seasons mapping to the same TMDB show are also marked as added.
- Requires `TMDB_API_KEY` for TMDB linking/import, though rankings come from AniList.
- Results are cached for 1 hour.

## Watchlist status tracking

Episode-progress tracking has been removed from the primary workflow. Use the card status — **Plan to Watch**, **Watching**, **Completed**, or **Dropped** — to track progress at the show level.

## Global reminder badge

The **Schedule** link in the nav bar shows a red badge with the undismissed reminder count regardless of which page you are on. The count refreshes on every route change.

## Phases

- **Phase 1** (complete): Core CRUD, auth, TMDB search, Docker
- **Phase 2** (complete): Ratings/notes, anime-focused search, Docker non-root runtime
- **Phase 3** (complete): Stats dashboard (`/dashboard`) with status counts, completion rate, episodes/hours watched, top genres/studios
- **Phase 4** (complete): Airing schedule tracking + in-app reminders
- **v1.1.0** (complete): Favicon/app icon, /discover page, global nav reminder badge, mobile nav, watchlist title overlay + image fallback + episode +1, poster-grid search, dashboard shelves
