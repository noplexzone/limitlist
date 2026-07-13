-- Add account profile image storage and mutable app settings such as TMDB API key fallback.
ALTER TABLE "AppUser" ADD COLUMN "profileImageData" TEXT;

CREATE TABLE "AppSetting" (
    "key" TEXT NOT NULL PRIMARY KEY,
    "value" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
