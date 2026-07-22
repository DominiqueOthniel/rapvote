-- CreateTable
CREATE TABLE IF NOT EXISTS "DailyStreamerAward" (
    "id" TEXT NOT NULL,
    "dayKey" TEXT NOT NULL,
    "fanId" TEXT,
    "playCount" INTEGER NOT NULL DEFAULT 0,
    "freeVotesGiven" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "DailyStreamerAward_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "DailyStreamerAward_dayKey_key" ON "DailyStreamerAward"("dayKey");
CREATE INDEX IF NOT EXISTS "DailyStreamerAward_fanId_idx" ON "DailyStreamerAward"("fanId");
CREATE INDEX IF NOT EXISTS "TrackPlayEvent_fanId_createdAt_idx" ON "TrackPlayEvent"("fanId", "createdAt");

DO $$ BEGIN
  ALTER TABLE "DailyStreamerAward" ADD CONSTRAINT "DailyStreamerAward_fanId_fkey" FOREIGN KEY ("fanId") REFERENCES "Fan"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
