-- CreateTable
CREATE TABLE "AnimeShow" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "metadataProvider" TEXT NOT NULL,
    "metadataId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "originalTitle" TEXT,
    "overview" TEXT,
    "posterUrl" TEXT,
    "firstAiredAt" DATETIME,
    "status" TEXT NOT NULL DEFAULT 'PLAN_TO_WATCH',
    "episodesTotal" INTEGER,
    "episodesWatched" INTEGER NOT NULL DEFAULT 0,
    "episodeDurationMinutes" INTEGER NOT NULL DEFAULT 24,
    "genres" TEXT,
    "studios" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "AnimeShow_metadataProvider_metadataId_key" ON "AnimeShow"("metadataProvider", "metadataId");
