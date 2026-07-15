-- AlterTable
ALTER TABLE "AnimeShow" ADD COLUMN "plexRatingKey" TEXT;
ALTER TABLE "AnimeShow" ADD COLUMN "plexSyncedAt" DATETIME;

-- CreateTable
CREATE TABLE "EpisodeWatch" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "animeShowId" TEXT NOT NULL,
    "seasonNumber" INTEGER NOT NULL,
    "episodeNumber" INTEGER NOT NULL,
    "watched" BOOLEAN NOT NULL DEFAULT false,
    "watchedAt" DATETIME,
    "source" TEXT NOT NULL DEFAULT 'plex',
    "plexRatingKey" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "EpisodeWatch_animeShowId_fkey" FOREIGN KEY ("animeShowId") REFERENCES "AnimeShow" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "EpisodeWatch_animeShowId_idx" ON "EpisodeWatch"("animeShowId");

-- CreateIndex
CREATE UNIQUE INDEX "EpisodeWatch_animeShowId_seasonNumber_episodeNumber_key" ON "EpisodeWatch"("animeShowId", "seasonNumber", "episodeNumber");
