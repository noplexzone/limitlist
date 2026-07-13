-- Track the anime-native discovery source used to create canonical TMDB rows.
ALTER TABLE "AnimeShow" ADD COLUMN "sourceProvider" TEXT;
ALTER TABLE "AnimeShow" ADD COLUMN "sourceId" TEXT;
CREATE UNIQUE INDEX "AnimeShow_sourceProvider_sourceId_key" ON "AnimeShow"("sourceProvider", "sourceId");
