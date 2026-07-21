-- AlterTable
ALTER TABLE "Fan" ADD COLUMN IF NOT EXISTS "streakCount" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "Fan" ADD COLUMN IF NOT EXISTS "lastListenDay" TEXT;
ALTER TABLE "Fan" ADD COLUMN IF NOT EXISTS "freeVotes" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "Fan" ADD COLUMN IF NOT EXISTS "streakBadgeEarned" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE IF NOT EXISTS "FanPlaylistItem" (
    "id" TEXT NOT NULL,
    "fanId" TEXT NOT NULL,
    "trackId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "FanPlaylistItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "FanListenHistory" (
    "id" TEXT NOT NULL,
    "fanId" TEXT NOT NULL,
    "trackId" TEXT NOT NULL,
    "listenedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "FanListenHistory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "TrackPlayEvent" (
    "id" TEXT NOT NULL,
    "trackId" TEXT NOT NULL,
    "fanId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "TrackPlayEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "FanPlaylistItem_fanId_trackId_key" ON "FanPlaylistItem"("fanId", "trackId");
CREATE INDEX IF NOT EXISTS "FanPlaylistItem_fanId_createdAt_idx" ON "FanPlaylistItem"("fanId", "createdAt");
CREATE UNIQUE INDEX IF NOT EXISTS "FanListenHistory_fanId_trackId_key" ON "FanListenHistory"("fanId", "trackId");
CREATE INDEX IF NOT EXISTS "FanListenHistory_fanId_listenedAt_idx" ON "FanListenHistory"("fanId", "listenedAt");
CREATE INDEX IF NOT EXISTS "TrackPlayEvent_createdAt_idx" ON "TrackPlayEvent"("createdAt");
CREATE INDEX IF NOT EXISTS "TrackPlayEvent_trackId_createdAt_idx" ON "TrackPlayEvent"("trackId", "createdAt");

-- AddForeignKey
DO $$ BEGIN
  ALTER TABLE "FanPlaylistItem" ADD CONSTRAINT "FanPlaylistItem_fanId_fkey" FOREIGN KEY ("fanId") REFERENCES "Fan"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "FanPlaylistItem" ADD CONSTRAINT "FanPlaylistItem_trackId_fkey" FOREIGN KEY ("trackId") REFERENCES "PhaseTrack"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "FanListenHistory" ADD CONSTRAINT "FanListenHistory_fanId_fkey" FOREIGN KEY ("fanId") REFERENCES "Fan"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "FanListenHistory" ADD CONSTRAINT "FanListenHistory_trackId_fkey" FOREIGN KEY ("trackId") REFERENCES "PhaseTrack"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "TrackPlayEvent" ADD CONSTRAINT "TrackPlayEvent_trackId_fkey" FOREIGN KEY ("trackId") REFERENCES "PhaseTrack"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "TrackPlayEvent" ADD CONSTRAINT "TrackPlayEvent_fanId_fkey" FOREIGN KEY ("fanId") REFERENCES "Fan"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
