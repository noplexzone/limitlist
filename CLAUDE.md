# Anime Tracker — Claude Code Context

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
    api/                 # API routes (auth, watchlist, search)
    login/               # Login page
    watchlist/           # Watchlist page
    search/              # Search/import page
  lib/
    auth.ts              # iron-session config + helpers
    db.ts                # Prisma client singleton
    tmdb.ts              # TMDB provider implementation
    providers.ts         # Provider abstraction
prisma/
  schema.prisma          # Database schema
```

## Environment variables
| Variable | Purpose |
|---|---|
| AUTH_USERNAME | Login username |
| AUTH_PASSWORD | Login password |
| AUTH_SECRET | Session cookie signing secret (32+ chars) |
| DATABASE_URL | SQLite path (file:./dev.db or file:/data/anime-tracker.db) |
| TMDB_API_KEY | TMDB API key for metadata search |

## Docker
```bash
docker compose up --build   # build and run
docker compose down         # stop
```
Data persists in Docker volume mapped to ./data on host.

## Auth
Single-user. Credentials set via env vars. Session via iron-session HTTP-only cookie.

## Phases
- Phase 1 (current): Core CRUD + auth + TMDB search + Docker
- Phase 2: Star ratings (1-5, half-star)
- Phase 3: TBD
- Phase 4: In-app reminders
