-- CreateTable
CREATE TABLE "TrackDownloadEvent" (
    "id" TEXT NOT NULL,
    "trackId" TEXT NOT NULL,
    "fanId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TrackDownloadEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "TrackDownloadEvent_createdAt_idx" ON "TrackDownloadEvent"("createdAt");

-- CreateIndex
CREATE INDEX "TrackDownloadEvent_trackId_createdAt_idx" ON "TrackDownloadEvent"("trackId", "createdAt");

-- CreateIndex
CREATE INDEX "TrackDownloadEvent_fanId_createdAt_idx" ON "TrackDownloadEvent"("fanId", "createdAt");

-- AddForeignKey
ALTER TABLE "TrackDownloadEvent" ADD CONSTRAINT "TrackDownloadEvent_trackId_fkey" FOREIGN KEY ("trackId") REFERENCES "PhaseTrack"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TrackDownloadEvent" ADD CONSTRAINT "TrackDownloadEvent_fanId_fkey" FOREIGN KEY ("fanId") REFERENCES "Fan"("id") ON DELETE SET NULL ON UPDATE CASCADE;
