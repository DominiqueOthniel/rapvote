-- AlterTable
ALTER TABLE "PhaseTrack" ADD COLUMN "playCount" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "PhaseTrack" ADD COLUMN "downloadCount" INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "TrackLike" (
    "id" TEXT NOT NULL,
    "trackId" TEXT NOT NULL,
    "fanId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TrackLike_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "TrackLike_trackId_fanId_key" ON "TrackLike"("trackId", "fanId");

-- AddForeignKey
ALTER TABLE "TrackLike" ADD CONSTRAINT "TrackLike_trackId_fkey" FOREIGN KEY ("trackId") REFERENCES "PhaseTrack"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TrackLike" ADD CONSTRAINT "TrackLike_fanId_fkey" FOREIGN KEY ("fanId") REFERENCES "Fan"("id") ON DELETE CASCADE ON UPDATE CASCADE;
