# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).

## [Unreleased]

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
