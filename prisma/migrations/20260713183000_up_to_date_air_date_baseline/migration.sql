-- Track a monotonic airing-date baseline for UP_TO_DATE so a new season
-- with a lower season-local episode number can still mark the show stale.
ALTER TABLE "AnimeShow" ADD COLUMN "upToDateAiredAt" DATETIME;
