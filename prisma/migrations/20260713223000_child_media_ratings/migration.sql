-- CreateTable
CREATE TABLE "AnimeChildRating" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "animeShowId" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "providerName" TEXT,
    "providerId" TEXT,
    "seasonNumber" INTEGER,
    "episodeNumber" INTEGER,
    "title" TEXT NOT NULL,
    "posterUrl" TEXT,
    "airDate" DATETIME,
    "rating" REAL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "AnimeChildRating_animeShowId_fkey" FOREIGN KEY ("animeShowId") REFERENCES "AnimeShow" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "AnimeChildRating_animeShowId_kind_key_key" ON "AnimeChildRating"("animeShowId", "kind", "key");

-- CreateIndex
CREATE INDEX "AnimeChildRating_animeShowId_kind_idx" ON "AnimeChildRating"("animeShowId", "kind");
