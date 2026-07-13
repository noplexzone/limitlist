-- AlterTable
ALTER TABLE "AnimeShow" ADD COLUMN "airingRefreshedAt" DATETIME;
ALTER TABLE "AnimeShow" ADD COLUMN "airingStatus" TEXT;
ALTER TABLE "AnimeShow" ADD COLUMN "lastAiredAt" DATETIME;
ALTER TABLE "AnimeShow" ADD COLUMN "lastEpisodeNum" INTEGER;
ALTER TABLE "AnimeShow" ADD COLUMN "nextAiringAt" DATETIME;
ALTER TABLE "AnimeShow" ADD COLUMN "nextEpisodeNum" INTEGER;

-- CreateTable
CREATE TABLE "EpisodeReminder" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "animeShowId" TEXT NOT NULL,
    "episodeNumber" INTEGER,
    "airsAt" DATETIME NOT NULL,
    "dismissedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "EpisodeReminder_animeShowId_fkey" FOREIGN KEY ("animeShowId") REFERENCES "AnimeShow" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "EpisodeReminder_animeShowId_airsAt_key" ON "EpisodeReminder"("animeShowId", "airsAt");
