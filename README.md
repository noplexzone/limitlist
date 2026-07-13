# Anime Tracker

Personal anime watchlist tracker. Self-hosted, Dockerized, authenticated.

## Stack

- Next.js 15 (App Router, standalone output)
- TypeScript
- Prisma + SQLite
- iron-session (HTTP-only cookie auth)
- Tailwind CSS
- TMDB as metadata provider

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

App runs at http://localhost:3000. Data persists in `./data/anime-tracker.db`.

To stop:
```bash
docker compose down
```

## Environment variables

| Variable | Required | Description |
|---|---|---|
| `AUTH_USERNAME` | Yes | Login username |
| `AUTH_PASSWORD` | Yes | Login password |
| `AUTH_SECRET` | Yes | Session cookie signing key — use a random 32+ char string |
| `AUTH_COOKIE_SECURE` | No | Set `true` only when serving over HTTPS. Use `false` for plain HTTP LAN/Docker testing. |
| `DATABASE_URL` | Yes | SQLite path. Local: `file:./dev.db`. Docker: `file:/data/anime-tracker.db` |
| `TMDB_API_KEY` | Recommended | TMDB API key for metadata search. Get one free at https://www.themoviedb.org/settings/api |

## Ratings and notes

Each show in the watchlist can have an optional rating (0.5–5.0 in half-star increments) and free-text notes. Both are nullable — leaving them blank means unrated/no notes.

- Edit a show in the watchlist and choose a rating from the dropdown (Unrated, 0.5, 1, 1.5, …, 5).
- Type notes in the textarea; they are trimmed and stored as-is.
- Displayed inline: `4.5/5` and the note text below the episode counter.

## Anime-focused search

The search page defaults to **Anime-focused** mode, which filters TMDB results to shows that are:
- tagged with TMDB genre id 16 (Animation), **or**
- originally Japanese (`original_language = "ja"`) or from Japan (`origin_country` contains `"JP"`).

Results within that set are sorted: Japanese/JP-origin first, then other animation.

If filtering would return zero results (e.g., TMDB hasn't tagged a show correctly), the full unfiltered results are returned as a fallback.

Uncheck **Anime-focused** in the search UI to get broad all-TV results. The API also accepts `?animeOnly=false` directly.

Non-Japanese animation (e.g., Avatar, Arcane) will still appear in anime-focused mode because TMDB tags it as Animation (genre 16).

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

Search uses the TMDB TV endpoint. In anime-focused mode (default on) results are filtered and ranked for anime-like content; uncheck to see all TV. See [Anime-focused search](#anime-focused-search) above.

Results are stored with `metadataProvider=tmdb` and the TMDB series ID, preventing duplicates. TMDB models shows as a single series with seasons, which matches the preferred data model.

If `TMDB_API_KEY` is not set, the search page will display a configuration message instead of crashing.

## Auth

Single-user. Set `AUTH_USERNAME` and `AUTH_PASSWORD` in your `.env`.
Sessions use signed HTTP-only cookies via iron-session. Logout is available in the nav bar.

## Airing Schedule and Reminders

The `/schedule` route shows your watchlist shows that have known upcoming episodes, sorted by air date (auth-protected):

- **Refresh All Schedules** — calls `POST /api/airing/refresh` which fetches airing info from TMDB for every TMDB-backed show in your watchlist. Requires `TMDB_API_KEY`.
- Per-show refresh — each watchlist card has a **Refresh Schedule** button for individual shows.
- When a next episode date is found, an `EpisodeReminder` is automatically created. Reminders appear on the Schedule page with a **Dismiss** button.
- Dismissed reminders are scoped to the specific show + air date. When the show next airs, a new reminder will be created on the next refresh.
- The nav bar **Schedule** link shows a red badge with the count of undismissed reminders.
- Missing `TMDB_API_KEY` returns a controlled error per show; it does not crash the bulk refresh.
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

The `/dashboard` route shows a summary of your watching habits (auth-protected):

| Stat | Definition |
|---|---|
| Total Shows | All shows in the watchlist |
| Completion Rate | `completed / total` as a percentage |
| Episodes Watched | Sum of `episodesWatched` across all shows |
| Hours Watched | `sum(episodesWatched × episodeDurationMinutes) / 60` |
| Average Rating | Mean of all rated shows (shown only if any shows are rated) |
| Top Genres | Top 10 genres by frequency, split from comma-separated `genres` field |
| Top Studios | Top 10 studios by frequency, split from comma-separated `studios` field |

Empty state is handled gracefully — the dashboard displays a link to search/import if no shows are tracked.

Stats are computed server-side in `src/lib/stats.ts` (`computeStats(shows)`).

## Phases

- **Phase 1** (complete): Core CRUD, auth, TMDB search, Docker
- **Phase 2** (complete): Ratings/notes, anime-focused search, Docker non-root runtime
- **Phase 3** (complete): Stats dashboard (`/dashboard`) with status counts, completion rate, episodes/hours watched, top genres/studios
- **Phase 4** (complete): Airing schedule tracking + in-app reminders
