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
| `DATABASE_URL` | Yes | SQLite path. Local: `file:./dev.db`. Docker: `file:/data/anime-tracker.db` |
| `TMDB_API_KEY` | Recommended | TMDB API key for metadata search. Get one free at https://www.themoviedb.org/settings/api |

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

Search uses the TMDB TV endpoint which returns all TV shows, not only anime.
This is an accepted Phase 1 tradeoff: the search is broad, and you select what to import.
Results are stored with `metadataProvider=tmdb` and the TMDB series ID, preventing duplicates.
TMDB models shows as a single series with seasons, which matches the preferred data model.

If `TMDB_API_KEY` is not set, the search page will display a configuration message instead of crashing.

## Auth

Single-user. Set `AUTH_USERNAME` and `AUTH_PASSWORD` in your `.env`.
Sessions use signed HTTP-only cookies via iron-session. Logout is available in the nav bar.

## Phases

- **Phase 1** (current): Core CRUD, auth, TMDB search, Docker
- **Phase 2**: Star ratings (1–5 stars, half-star increments)
- **Phase 3**: TBD
- **Phase 4**: In-app reminders
