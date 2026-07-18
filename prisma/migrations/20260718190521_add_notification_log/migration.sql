-- CreateTable
CREATE TABLE "NotificationLog" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "animeShowId" TEXT NOT NULL,
    "seasonNumber" INTEGER,
    "episodeNumber" INTEGER,
    "trigger" TEXT NOT NULL,
    "channel" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "message" TEXT,
    "sentAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "NotificationLog_animeShowId_fkey" FOREIGN KEY ("animeShowId") REFERENCES "AnimeShow" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "NotificationLog_animeShowId_idx" ON "NotificationLog"("animeShowId");

-- CreateIndex
CREATE UNIQUE INDEX "NotificationLog_animeShowId_seasonNumber_episodeNumber_trigger_channel_key" ON "NotificationLog"("animeShowId", "seasonNumber", "episodeNumber", "trigger", "channel");
