-- Add state used by the UP_TO_DATE status. The baseline stores the last known aired
-- episode when the user marks a show up-to-date; refresh jobs flip the stale flag
-- when the provider later reports a newer aired episode.
ALTER TABLE "AnimeShow" ADD COLUMN "upToDateEpisodeNum" INTEGER;
ALTER TABLE "AnimeShow" ADD COLUMN "upToDateStale" BOOLEAN NOT NULL DEFAULT false;
