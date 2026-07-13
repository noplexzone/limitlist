-- Drop episode progress columns. Status now represents tracking state; upcoming-airing
-- episode numbers remain in the airing/reminder fields.
PRAGMA foreign_keys=OFF;

CREATE TABLE "new_AnimeShow" (
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
    "genres" TEXT,
    "studios" TEXT,
    "rating" REAL,
    "notes" TEXT,
    "airingStatus" TEXT,
    "nextEpisodeNum" INTEGER,
    "nextAiringAt" DATETIME,
    "lastEpisodeNum" INTEGER,
    "lastAiredAt" DATETIME,
    "airingRefreshedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

INSERT INTO "new_AnimeShow" (
    "id", "metadataProvider", "metadataId", "title", "originalTitle",
    "overview", "posterUrl", "firstAiredAt", "status", "episodesTotal",
    "genres", "studios", "rating", "notes", "airingStatus", "nextEpisodeNum",
    "nextAiringAt", "lastEpisodeNum", "lastAiredAt", "airingRefreshedAt",
    "createdAt", "updatedAt"
)
SELECT
    "id", "metadataProvider", "metadataId", "title", "originalTitle",
    "overview", "posterUrl", "firstAiredAt", "status", "episodesTotal",
    "genres", "studios", "rating", "notes", "airingStatus", "nextEpisodeNum",
    "nextAiringAt", "lastEpisodeNum", "lastAiredAt", "airingRefreshedAt",
    "createdAt", "updatedAt"
FROM "AnimeShow";

DROP TABLE "AnimeShow";
ALTER TABLE "new_AnimeShow" RENAME TO "AnimeShow";

CREATE UNIQUE INDEX "AnimeShow_metadataProvider_metadataId_key" ON "AnimeShow"("metadataProvider", "metadataId");

PRAGMA foreign_keys=ON;
