# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).

## [Unreleased]

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
